use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::command;

#[derive(Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum Method {
    Get,
    Post,
}

#[derive(Serialize)]
pub struct Response {
    pub status: u16,
    pub body: String,
}

#[command]
pub async fn fetch(
    method: Method,
    url: String,
    headers: Option<HashMap<String, String>>,
    body: Option<String>,
) -> Result<Response, String> {
    // fetch is called very rarely, so we create a new Client each time; if needed in the future, a global Client can be created in LazyLock
    let client = Client::new();

    let mut request = match method {
        Method::Get => client.get(&url),
        Method::Post => client.post(&url),
    };
    if let Some(headers) = headers {
        for (key, value) in headers {
            request = request.header(key, value);
        }
    }

    if let Some(body) = body {
        request = request.body(body);
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {:?}", e))?;

    let status = response.status().as_u16();
    let body = response
        .text()
        .await
        .map_err(|e| format!("Failed to read HTTP response: {:?}", e))?;

    Ok(Response { status, body })
}
