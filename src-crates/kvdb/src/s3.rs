use crate::{
    Cursor, GenericValue, Key, Keys, KvDatabase, KvDatabaseError, KvInput, KvOutput, NameSpace,
    Result, S3Data, async_trait,
    command::{Command, CommandOutput},
};
use aws_credential_types::Credentials;
use aws_sdk_s3::{
    Client,
    config::{Region, SharedCredentialsProvider, http::HttpResponse},
    error::SdkError,
    operation::get_object::{GetObjectError, GetObjectOutput},
    primitives::ByteStream,
};
use aws_types::SdkConfig;
use connection_config::S3Config;
use std::collections::{BTreeMap, HashMap};
use tokio::fs::File;
use tokio::io::{BufReader, BufWriter};

#[derive(Debug)]
pub struct S3 {
    client: Client,
    list_all_buckets: bool,
    default_bucket: String,
}

impl S3 {
    pub async fn new(config: S3Config) -> Result<Self> {
        if config.endpoint.is_empty() {
            return Err(KvDatabaseError::Custom(
                "S3 endpoint URL cannot be empty".into(),
            ));
        }
        let cred = Credentials::new(
            config.access_key,
            config.secret_key,
            None,
            None,
            "Dataflare",
        );
        // Many S3-compatible services don't use region, but omitting it causes errors; default to us-east-1
        let region = match config.region.is_empty() {
            true => "us-east-1".to_string(),
            false => config.region,
        };
        let mut builder = SdkConfig::builder()
            .credentials_provider(SharedCredentialsProvider::new(cred))
            .region(Region::new(region));
        builder.set_endpoint_url(Some(config.endpoint));
        Ok(Self {
            client: Client::new(&builder.build()),
            list_all_buckets: config.list_all_buckets,
            default_bucket: config.default_bucket,
        })
    }

    async fn list_buckets(&self) -> Result<Vec<NameSpace>> {
        let mut namespaces = Vec::new();
        let mut continuation_token = None;
        loop {
            let res = self
                .client
                .list_buckets()
                .set_continuation_token(continuation_token)
                .send()
                .await
                .map_err(|err| {
                    KvDatabaseError::Custom(format!(
                        "Status: {}, Source: {}",
                        status(err.raw_response()),
                        err.into_source().map(source).unwrap_or_default()
                    ))
                })?;
            if let Some(buckets) = res.buckets {
                for bucket in buckets {
                    let id = bucket.name.ok_or_else(|| {
                        KvDatabaseError::Custom("Bucket name should not be empty".into())
                    })?;
                    namespaces.push(NameSpace::from_id(id));
                }
            }
            if res.continuation_token.is_none() {
                break;
            }
            continuation_token = res.continuation_token;
        }
        Ok(namespaces)
    }

    async fn get_object(&self, bucket: String, key: String) -> Result<GetObjectOutput> {
        self.client
            .get_object()
            .bucket(bucket)
            .key(key)
            .send()
            .await
            .map_err(|err| {
                if let SdkError::ServiceError(err) = &err {
                    if matches!(err.err(), GetObjectError::NoSuchKey(..)) {
                        return KvDatabaseError::KeyNotExist;
                    }
                }
                KvDatabaseError::Custom(format!(
                    "Status: {}, Source: {}",
                    status(err.raw_response()),
                    err.into_source().map(source).unwrap_or_default()
                ))
            })
    }
}

#[async_trait]
impl KvDatabase for S3 {
    async fn namespaces(&self) -> Result<Vec<NameSpace>> {
        if self.list_all_buckets {
            let mut namespaces = self.list_buckets().await?;
            if !namespaces.is_empty() {
                NameSpace::try_to_first(&mut namespaces, |item| item.id == self.default_bucket);
                return Ok(namespaces);
            }
        }
        Ok(vec![NameSpace::from_id(self.default_bucket.clone())])
    }

    async fn keys(
        &self,
        namespace: String,
        cursor: Option<Cursor>,
        limit: usize,
        search: Option<String>,
    ) -> Result<Keys> {
        let mut req = self
            .client
            .list_objects_v2()
            .bucket(namespace)
            .max_keys(limit as i32)
            .set_prefix(search);
        if let Some(cursor) = cursor {
            req = req.continuation_token(cursor.string()?);
        }
        let res = req.send().await.map_err(|err| {
            KvDatabaseError::Custom(format!(
                "Status: {}, Source: {}",
                status(err.raw_response()),
                err.into_source().map(source).unwrap_or_default()
            ))
        })?;
        let mut keys = Vec::with_capacity(res.contents().len());
        for obj in res.contents() {
            let key = obj
                .key()
                .ok_or_else(|| KvDatabaseError::Custom("Key should not be empty".into()))?;
            keys.push(Key::String(key.into()));
        }
        let cursor = res
            .next_continuation_token()
            .map(|s| Cursor::String(s.into()));
        Ok(Keys { keys, cursor })
    }

    async fn get(&self, namespace: String, key: Key) -> Result<KvOutput> {
        let object = self.get_object(namespace, key.into_string()?).await?;
        let raw = raw_response(&object);
        let mut output = KvOutput::empty();
        // For objects smaller than 512KB, read the content directly
        if let Some(len) = object.content_length {
            if len < 1024 * 512 {
                let body = body_bytes(object.body).await?;
                output.value = Some(GenericValue::try_string(body));
            }
        }
        return Ok(output.s3(S3Data {
            content_length: object.content_length,
            content_type: object.content_type,
            metadata: object.metadata.unwrap_or_default(),
            raw,
        }));
    }

    async fn get_content(&self, namespace: String, key: Key) -> Result<GenericValue> {
        let object = self.get_object(namespace, key.into_string()?).await?;
        let bytes = body_bytes(object.body).await?;
        Ok(GenericValue::try_string(bytes))
    }

    async fn download_content(&self, namespace: String, key: Key, path: String) -> Result<()> {
        let object = self.get_object(namespace, key.into_string()?).await?;
        let input = object.body.into_async_read();
        let output = File::create(path).await?;
        tokio::io::copy(
            &mut BufReader::with_capacity(64 * 1024, input),
            &mut BufWriter::with_capacity(64 * 1024, output),
        )
        .await?;
        Ok(())
    }

    async fn set(&self, namespace: String, key: Key, value: KvInput) -> Result<()> {
        let stream = value.value.into_byte_stream().await?;
        let (mut content_type, mut metadata) = (None, None);
        if let Some(s3) = value.s3 {
            content_type = s3.content_type;
            metadata = Some(s3.metadata);
        }
        self.client
            .put_object()
            .bucket(namespace)
            .key(key.into_string()?)
            .body(ByteStream::from(stream))
            .set_content_type(content_type)
            .set_metadata(metadata)
            .send()
            .await
            .map_err(|err| {
                KvDatabaseError::Custom(format!(
                    "Status: {}, Source: {}",
                    status(err.raw_response()),
                    err.into_source().map(source).unwrap_or_default()
                ))
            })?;
        Ok(())
    }

    async fn delete(&self, namespace: String, key: Key) -> Result<()> {
        self.client
            .delete_object()
            .bucket(namespace)
            .key(key.into_string()?)
            .send()
            .await
            .map_err(|err| {
                KvDatabaseError::Custom(format!(
                    "Status: {}, Source: {}",
                    status(err.raw_response()),
                    err.into_source().map(source).unwrap_or_default()
                ))
            })?;
        Ok(())
    }

    async fn run_command(
        &self,
        namespace: String,
        command: String,
        readonly: bool,
    ) -> Result<CommandOutput> {
        let command = Command::parse(&command)?;
        if readonly && !command.readonly() {
            return Err(KvDatabaseError::ReadOnly);
        }
        let v = match command {
            Command::Search { pattern, filter } => {
                let keys = self.keys(namespace, None, 1000, Some(pattern)).await?;
                CommandOutput::from_keys(keys, filter)
            }
            Command::Get { key } => {
                let output = self.get(namespace, Key::String(key.clone())).await?;
                CommandOutput::Get {
                    key: Key::String(key),
                    output,
                }
            }
            Command::Set { key, value } => {
                let data = S3Data {
                    content_type: Some(value.mime()),
                    content_length: None,
                    metadata: HashMap::new(),
                    raw: BTreeMap::new(),
                };
                self.set(
                    namespace,
                    Key::String(key),
                    KvInput {
                        value,
                        cloudflare: None,
                        redis: None,
                        s3: Some(data),
                    },
                )
                .await?;
                CommandOutput::Done
            }
            Command::Delete { key } => {
                self.delete(namespace, Key::String(key)).await?;
                CommandOutput::Done
            }
        };
        Ok(v)
    }
}

fn status(res: Option<&HttpResponse>) -> String {
    res.map(|r| r.status().to_string())
        .unwrap_or_else(|| "None".into())
}

fn source(source: Box<dyn std::error::Error + Send + Sync + 'static>) -> String {
    format!("{:?}", source)
}

async fn body_bytes(body: ByteStream) -> Result<Vec<u8>> {
    let bytes = body
        .collect()
        .await
        .map_err(|err| {
            KvDatabaseError::Custom(format!("Failed to get content: {}", err.to_string()))
        })?
        .to_vec();
    Ok(bytes)
}

fn raw_response(obj: &GetObjectOutput) -> BTreeMap<String, Option<String>> {
    let mut map = BTreeMap::new();
    macro_rules! insert {
        ($key:ident) => {
            map.insert(
                stringify!($key).into(),
                obj.$key.as_ref().map(|v| v.to_string()),
            );
        };
    }
    insert!(delete_marker);
    insert!(accept_ranges);
    insert!(expiration);
    insert!(restore);
    insert!(last_modified);
    insert!(content_length);
    insert!(e_tag);
    insert!(checksum_crc32);
    insert!(checksum_crc32_c);
    insert!(checksum_crc64_nvme);
    insert!(checksum_sha1);
    insert!(checksum_sha256);
    insert!(checksum_type);
    insert!(missing_meta);
    insert!(version_id);
    insert!(cache_control);
    insert!(content_disposition);
    insert!(content_encoding);
    insert!(content_language);
    insert!(content_range);
    insert!(content_type);
    insert!(website_redirect_location);
    insert!(server_side_encryption);
    // metadata is already returned as an independent field, no need to add it here
    insert!(sse_customer_algorithm);
    insert!(sse_customer_key_md5);
    insert!(ssekms_key_id);
    insert!(bucket_key_enabled);
    insert!(storage_class);
    insert!(request_charged);
    insert!(replication_status);
    insert!(parts_count);
    insert!(tag_count);
    insert!(object_lock_mode);
    insert!(object_lock_retain_until_date);
    insert!(object_lock_legal_hold_status);
    insert!(expires_string);
    map
}
