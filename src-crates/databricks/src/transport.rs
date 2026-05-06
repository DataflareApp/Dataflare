use crate::codec::ThriftMessage;
use crate::config::Config;
use crate::error::{Error, Result};
use reqwest::{Client, Proxy};
use std::time::Duration;
use thrift::protocol::{
    TBinaryInputProtocol, TBinaryOutputProtocol, TFieldIdentifier, TInputProtocol,
    TMessageIdentifier, TMessageType, TOutputProtocol, TStructIdentifier, TType,
};
use thrift::transport::TBufferChannel;

#[derive(Debug)]
pub struct ThriftHttpTransport {
    client: Client,
    endpoint_url: String,
    token: String,
    seq: std::sync::atomic::AtomicI32,
}

impl ThriftHttpTransport {
    pub fn new(config: &Config, proxy: Option<proxy::ProxyConfig>) -> Result<Self> {
        let mut builder = Client::builder()
            .danger_accept_invalid_certs(config.allow_invalid_certs)
            .timeout(Duration::from_secs(60));

        if let Some(proxy) = proxy {
            builder = builder.proxy(Proxy::all(proxy.into_http_connector())?);
        }

        let client = builder.build()?;

        Ok(Self {
            client,
            endpoint_url: config.endpoint_url(),
            token: config.token.clone(),
            seq: std::sync::atomic::AtomicI32::new(1),
        })
    }

    /// Send a Thrift RPC call over HTTP.
    ///
    /// Frames the request as:
    ///   MessageBegin(method, Call, seqid)
    ///   StructBegin(method + "_args")  ← args wrapper
    ///   FieldBegin("req", Struct, 1)   ← single-arg convention
    ///   <req struct>
    ///   FieldEnd, FieldStop, StructEnd
    ///   MessageEnd
    ///
    /// And reads the response as:
    ///   MessageBegin → validates type
    ///   StructBegin(method + "_result")
    ///   loop fields → id=0 is the success value
    ///   StructEnd, MessageEnd
    pub async fn call<Req: ThriftMessage, Resp: ThriftMessage>(
        &self,
        method: &'static str,
        req: &Req,
    ) -> Result<Resp> {
        let seqid = self.seq.fetch_add(1, std::sync::atomic::Ordering::Relaxed);

        // Encode request
        let mut channel = TBufferChannel::with_capacity(0, 1 << 20);
        {
            let mut o: TBinaryOutputProtocol<&mut TBufferChannel> =
                TBinaryOutputProtocol::new(&mut channel, true);
            o.write_message_begin(&TMessageIdentifier::new(method, TMessageType::Call, seqid))
                .map_err(|e| Error::Thrift(e.to_string()))?;

            // args wrapper struct
            o.write_struct_begin(&TStructIdentifier::new(format!("{method}_args")))
                .map_err(|e| Error::Thrift(e.to_string()))?;
            o.write_field_begin(&TFieldIdentifier::new("req", TType::Struct, Some(1i16)))
                .map_err(|e| Error::Thrift(e.to_string()))?;
            req.write_to_out_protocol(&mut o)
                .map_err(|e| Error::Thrift(e.to_string()))?;
            o.write_field_end()
                .map_err(|e| Error::Thrift(e.to_string()))?;
            o.write_field_stop()
                .map_err(|e| Error::Thrift(e.to_string()))?;
            o.write_struct_end()
                .map_err(|e| Error::Thrift(e.to_string()))?;

            o.write_message_end()
                .map_err(|e| Error::Thrift(e.to_string()))?;
        }

        let request_bytes = channel.write_bytes().to_vec();

        // HTTP POST with retry for warehouse warm-up (503 TEMPORARILY_UNAVAILABLE)
        let response_bytes = self.send_with_retry(&request_bytes).await?;

        // Decode response
        let mut channel = TBufferChannel::with_capacity(response_bytes.len(), 0);
        channel.set_readable_bytes(&response_bytes);
        let mut i: TBinaryInputProtocol<&mut TBufferChannel> =
            TBinaryInputProtocol::new(&mut channel, true);

        let msg_ident = i
            .read_message_begin()
            .map_err(|e| Error::Thrift(format!("read message begin: {e}")))?;

        if msg_ident.message_type == TMessageType::Exception {
            let msg = read_application_exception(&mut i).unwrap_or_default();
            return Err(Error::Thrift(format!(
                "server exception for {method}: {msg}"
            )));
        }

        // result wrapper struct — find field id=0 (success)
        i.read_struct_begin()
            .map_err(|e| Error::Thrift(e.to_string()))?;
        let mut result: Option<Resp> = None;
        loop {
            let field_ident = i
                .read_field_begin()
                .map_err(|e| Error::Thrift(e.to_string()))?;
            if field_ident.field_type == TType::Stop {
                break;
            }
            match field_ident.id {
                Some(0) => {
                    result = Some(
                        Resp::read_from_in_protocol(&mut i)
                            .map_err(|e| Error::Thrift(e.to_string()))?,
                    );
                    i.read_field_end()
                        .map_err(|e| Error::Thrift(e.to_string()))?;
                }
                _ => {
                    i.skip(field_ident.field_type)
                        .map_err(|e| Error::Thrift(e.to_string()))?;
                    i.read_field_end()
                        .map_err(|e| Error::Thrift(e.to_string()))?;
                }
            }
        }
        i.read_struct_end()
            .map_err(|e| Error::Thrift(e.to_string()))?;
        i.read_message_end()
            .map_err(|e| Error::Thrift(e.to_string()))?;

        result.ok_or_else(|| Error::Thrift(format!("no success field in response for {method}")))
    }

    /// POST the bytes and retry on 503 (warehouse waking up from autosuspend).
    async fn send_with_retry(&self, body: &[u8]) -> Result<Vec<u8>> {
        const MAX_ATTEMPTS: u32 = 60;
        const RETRY_DELAY_MS: u64 = 5_000;

        for _attempt in 0..MAX_ATTEMPTS {
            let response = self
                .client
                .post(&self.endpoint_url)
                .header("Content-Type", "application/x-thrift")
                .header("Authorization", format!("Bearer {}", self.token))
                .body(body.to_vec())
                .send()
                .await?;

            let status = response.status();
            if status.is_success() {
                return Ok(response.bytes().await?.to_vec());
            }

            let body_bytes = response.bytes().await.unwrap_or_default();

            if status.as_u16() == 503 {
                let body_text = String::from_utf8_lossy(&body_bytes);
                if body_text.contains("TEMPORARILY_UNAVAILABLE") {
                    tokio::time::sleep(tokio::time::Duration::from_millis(RETRY_DELAY_MS)).await;
                    continue;
                }
            }

            return Err(Error::HttpStatus(format!(
                "HTTP {}: {}",
                status,
                String::from_utf8_lossy(&body_bytes)
            )));
        }

        Err(Error::HttpStatus(
            "warehouse did not become available within the retry window".to_string(),
        ))
    }
}

fn read_application_exception(i: &mut dyn TInputProtocol) -> thrift::Result<String> {
    let mut message = String::new();
    i.read_struct_begin()?;
    loop {
        let field_ident = i.read_field_begin()?;
        if field_ident.field_type == TType::Stop {
            break;
        }
        match field_ident.id {
            Some(1) => {
                message = i.read_string()?;
                i.read_field_end()?;
            }
            _ => {
                i.skip(field_ident.field_type)?;
                i.read_field_end()?;
            }
        }
    }
    i.read_struct_end()?;
    Ok(message)
}
