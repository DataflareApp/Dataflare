use crate::command::{Command, CommandOutput};
use crate::{
    CloudflareData, CloudflareKvMetadata, Cursor, GenericValue, Key, Keys, KvDatabase,
    KvDatabaseError, KvInput, KvOutput, NameSpace, Result, async_trait,
};
use connection_config::CloudflareKvConfig;
use reqwest::{Client, Response};
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use std::collections::HashMap;
use url::Url;

#[derive(Debug)]
pub struct CloudflareKv {
    client: Client,
    config: CloudflareKvConfig,
}

impl CloudflareKv {
    pub fn new(config: CloudflareKvConfig) -> Result<Self> {
        Ok(Self {
            client: Client::new(),
            config,
        })
    }

    #[rustfmt::skip]
    fn prefix(&self) -> String {
        format!("https://api.cloudflare.com/client/v4/accounts/{}", self.config.account_id)
    }

    const PAGE_SIZE: usize = 100;

    #[rustfmt::skip]
    fn namespaces_url(&self, page: usize) -> Result<Url> {
        let url = format!("{}/storage/kv/namespaces?order=title&page={}&per_page={}", self.prefix(), page, Self::PAGE_SIZE);
        Ok(url.parse()?)
    }

    #[rustfmt::skip]
    fn keys_url(&self, namespace: String, cursor: Option<String>, limit: usize, prefix: Option<String>) -> Result<Url> {
        let mut url = format!("{}/storage/kv/namespaces/{}/keys?limit={}", self.prefix(), namespace, limit).parse::<Url>()?;
        {
            let mut query = url.query_pairs_mut();
            if let Some(c) = cursor {
                query.append_pair("cursor", &c);
            }
            if let Some(p) = prefix {
                query.append_pair("prefix", &p);
            }
        }
        Ok(url)
    }

    #[rustfmt::skip]
    fn get_url(&self, namespace: String) -> Result<Url> {
        let url = format!("{}/storage/kv/namespaces/{}/bulk/get", self.prefix(), namespace);
        Ok(url.parse()?)
    }

    fn set_url(&self, namespace: String) -> Result<Url> {
        let url = format!("{}/storage/kv/namespaces/{}/bulk", self.prefix(), namespace);
        Ok(url.parse()?)
    }

    #[rustfmt::skip]
    fn delete_url(&self, namespace: String) -> Result<Url> {
        let url = format!("{}/storage/kv/namespaces/{}/bulk/delete", self.prefix(), namespace);
        Ok(url.parse()?)
    }

    async fn data<T: DeserializeOwned>(res: Response) -> Result<T> {
        if !res.status().is_success() {
            let status = res.status();
            let mut res = res.json::<Failure>().await?;
            let msg = match res.errors.pop() {
                Some(err) => format!(
                    "HTTP Status: {}, Code: {}, Message: {}",
                    status, err.code, err.message
                ),
                None => format!("HTTP Status: {}", status),
            };
            return Err(KvDatabaseError::Custom(msg));
        }
        let data = res.json::<T>().await?;
        Ok(data)
    }
}

#[async_trait]
impl KvDatabase for CloudflareKv {
    async fn namespaces(&self) -> Result<Vec<NameSpace>> {
        let mut page = 1;
        let mut namespaces = Vec::new();
        loop {
            let url = self.namespaces_url(page)?;
            let res = self
                .client
                .get(url)
                .bearer_auth(&self.config.api_token)
                .send()
                .await?;
            let items = Self::data::<NameSpacesResponse>(res).await?.result;
            let len = items.len();
            namespaces.extend(items);
            if len < Self::PAGE_SIZE {
                break;
            }
            page += 1;
        }
        NameSpace::try_to_first(&mut namespaces, |item| {
            item.title.as_ref() == Some(&self.config.default_namespace)
        });
        if namespaces.is_empty() {
            return Err(KvDatabaseError::Custom(
                "No namespaces found in Cloudflare KV".into(),
            ));
        }
        Ok(namespaces)
    }

    async fn keys(
        &self,
        namespace: String,
        cursor: Option<Cursor>,
        limit: usize,
        search: Option<String>,
    ) -> Result<Keys> {
        let cursor = cursor.map(|s| s.string()).transpose()?;
        let res = self
            .client
            .get(self.keys_url(namespace, cursor, limit, search)?)
            .bearer_auth(&self.config.api_token)
            .send()
            .await?;
        let data = Self::data::<KeysResponse>(res).await?;
        let keys = data
            .result
            .into_iter()
            .map(|item| Key::String(item.name))
            .collect::<Vec<_>>();
        let cursor = if data.result_info.cursor.is_empty() {
            None
        } else {
            Some(Cursor::String(data.result_info.cursor))
        };
        Ok(Keys { keys, cursor })
    }

    async fn get(&self, namespace: String, key: Key) -> Result<KvOutput> {
        let key = key.into_string()?;
        let res = self
            .client
            .post(self.get_url(namespace)?)
            .bearer_auth(&self.config.api_token)
            .json(&GetParams {
                keys: vec![key.clone()],
                with_metadata: true,
            })
            .send()
            .await?;
        let v = Self::data::<GetResponse>(res)
            .await?
            .result
            .values
            .remove(&key)
            .ok_or_else(|| KvDatabaseError::Custom("Key not found in response".into()))?
            .ok_or_else(|| KvDatabaseError::KeyNotExist)?;
        Ok(KvOutput::empty()
            .value(GenericValue::String(v.value))
            .cloudflare(CloudflareData {
                expiration: v.expiration,
                metadata: v.metadata,
            }))
    }

    async fn get_content(&self, _namespace: String, _key: Key) -> Result<GenericValue> {
        Err(KvDatabaseError::NoSupportedGetContent)
    }

    async fn download_content(&self, _namespace: String, _key: Key, _path: String) -> Result<()> {
        Err(KvDatabaseError::NoSupportedDownloadContent)
    }

    async fn set(&self, namespace: String, key: Key, value: KvInput) -> Result<()> {
        let url = self.set_url(namespace)?;
        let (content, base64) = value.value.into_cloudflare_kv_value().await?;
        let res = self
            .client
            .put(url)
            .bearer_auth(&self.config.api_token)
            .json(&vec![SetParams {
                key: key.into_string()?,
                value: content,
                base64,
                expiration: value.cloudflare.as_ref().map(|v| v.expiration).flatten(),
                metadata: value.cloudflare.map(|v| v.metadata).flatten(),
            }])
            .send()
            .await?;
        Self::data::<DeleteResult>(res).await?;
        Ok(())
    }

    async fn delete(&self, namespace: String, key: Key) -> Result<()> {
        let res = self
            .client
            .post(self.delete_url(namespace)?)
            .bearer_auth(&self.config.api_token)
            .json::<Vec<String>>(&vec![key.into_string()?])
            .send()
            .await?;
        Self::data::<DeleteResult>(res).await?;
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
                self.set(
                    namespace,
                    Key::String(key),
                    KvInput {
                        value,
                        cloudflare: None,
                        redis: None,
                        s3: None,
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

#[derive(Deserialize, Debug)]
struct NameSpacesResponse {
    result: Vec<NameSpace>,
}

#[derive(Deserialize, Debug)]
struct KeysResponse {
    result: Vec<KeyItem>,
    result_info: KeyInfo,
}

#[derive(Deserialize, Debug)]
struct KeyItem {
    name: String,
}
#[derive(Deserialize, Debug)]
struct KeyInfo {
    cursor: String,
}

#[derive(Serialize, Debug)]
struct GetParams {
    keys: Vec<String>,
    #[serde(rename = "withMetadata")]
    with_metadata: bool,
}

#[derive(Deserialize, Debug)]
struct GetResponse {
    result: GetResult,
}
#[derive(Deserialize, Debug)]
struct GetResult {
    values: HashMap<String, Option<GetData>>,
}
#[derive(Deserialize, Debug)]
struct GetData {
    value: String,
    metadata: Option<CloudflareKvMetadata>,
    expiration: Option<u64>,
}

#[derive(Serialize, Debug)]
struct SetParams {
    key: String,
    value: String,
    base64: bool,
    expiration: Option<u64>,
    metadata: Option<CloudflareKvMetadata>,
}

#[derive(Deserialize, Debug)]
struct DeleteResult {}

#[derive(Debug, Deserialize)]
struct Failure {
    errors: Vec<Message>,
}

#[derive(Debug, Deserialize)]
struct Message {
    code: i32,
    message: String,
}
