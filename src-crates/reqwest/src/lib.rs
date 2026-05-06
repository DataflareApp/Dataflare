use std::error::Error as _;

pub use reqwest_inner::*;

pub fn format_http_error(err: &Error) -> String {
    let kind = classify(err);
    let cause = primary_cause(err);
    if let Some(url) = err.url() {
        return format!("kind={kind}, cause={cause}, url={url}");
    }
    format!("kind={kind}, cause={cause}")
}

fn classify(err: &Error) -> &'static str {
    if err.is_timeout() {
        return "timeout";
    }
    if err.is_connect() {
        return "connect";
    }
    if err.is_status() {
        return "status";
    }
    if err.is_body() {
        return "body";
    }
    if err.is_decode() {
        return "decode";
    }
    if err.is_redirect() {
        return "redirect";
    }
    if err.is_builder() {
        return "builder";
    }
    if err.is_request() {
        return "request";
    }
    "unknown"
}

fn primary_cause(err: &Error) -> String {
    let mut source = err.source();
    let mut cause = None;
    while let Some(next) = source {
        cause = Some(next.to_string());
        source = next.source();
    }
    let message = cause
        .or_else(|| err.status().map(|status| status.to_string()))
        .unwrap_or_else(|| err.to_string());
    truncate(message)
}

fn truncate(message: String) -> String {
    const MAX_LEN: usize = 200;
    if message.chars().count() <= MAX_LEN {
        return message;
    }
    let trimmed = message.chars().take(MAX_LEN).collect::<String>();
    format!("{trimmed}...")
}

#[cfg(test)]
mod tests {
    use super::format_http_error;

    #[tokio::test]
    async fn format_builder_error() {
        let err = reqwest_inner::Client::new()
            .get("invalid-url")
            .send()
            .await
            .expect_err("request should fail");
        let message = format_http_error(&err);
        assert!(message.contains("kind=builder") || message.contains("kind=request"));
        assert!(message.contains("cause="));
    }
}
