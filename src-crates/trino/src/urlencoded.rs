use reqwest::header::HeaderValue;

pub fn encode_kv(k: &str, v: &str) -> String {
    url::form_urlencoded::Serializer::new(String::new())
        .append_pair(k, v)
        .finish()
}

pub fn url_decode(value: &str) -> String {
    url::form_urlencoded::parse(value.as_bytes())
        .next()
        .map(|(k, _)| k.into_owned())
        .unwrap_or_default()
}

pub fn decode_key(input: &str) -> Option<String> {
    url::form_urlencoded::parse(input.as_bytes())
        .next()
        .map(|(k, _)| k.into_owned())
}

pub fn decode_kv(input: &str) -> Option<(String, String)> {
    url::form_urlencoded::parse(input.as_bytes())
        .next()
        .map(|(k, v)| (k.into_owned(), v.into_owned()))
}

pub fn decode_kv_from_header(input: &HeaderValue) -> Option<(String, String)> {
    input.to_str().ok().and_then(decode_kv)
}

#[cfg(test)]
mod tests {
    use super::*;
    use reqwest::header::HeaderValue;

    #[test]
    fn test_encode_kv() {
        assert_eq!(encode_kv("key", "value"), "key=value");
        assert_eq!(encode_kv("hello world", "foo bar"), "hello+world=foo+bar");
        assert_eq!(encode_kv("a&b", "c=d"), "a%26b=c%3Dd");
    }

    #[test]
    fn test_url_decode() {
        assert_eq!(url_decode("hello+world"), "hello world");
        assert_eq!(url_decode("a%26b"), "a&b");
        assert_eq!(url_decode(""), "");
    }

    #[test]
    fn test_decode_key() {
        assert_eq!(decode_key("key=value"), Some("key".to_string()));
        assert_eq!(
            decode_key("hello+world=foo"),
            Some("hello world".to_string())
        );
        assert_eq!(decode_key(""), None);
    }

    #[test]
    fn test_decode_kv() {
        assert_eq!(
            decode_kv("key=value"),
            Some(("key".to_string(), "value".to_string()))
        );
        assert_eq!(
            decode_kv("a%26b=c%3Dd"),
            Some(("a&b".to_string(), "c=d".to_string()))
        );
        assert_eq!(decode_kv(""), None);
    }

    #[test]
    fn test_decode_kv_from_header() {
        let header = HeaderValue::from_static("key=value");
        assert_eq!(
            decode_kv_from_header(&header),
            Some(("key".to_string(), "value".to_string()))
        );
    }

    #[test]
    fn test_encode_decode_roundtrip() {
        let encoded = encode_kv("hello world", "foo&bar");
        let decoded = decode_kv(&encoded);
        assert_eq!(
            decoded,
            Some(("hello world".to_string(), "foo&bar".to_string()))
        );
    }
}
