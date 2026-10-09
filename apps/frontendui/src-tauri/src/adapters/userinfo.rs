/// Percent-encode a username or password for a database URL.
pub fn encode_userinfo(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for byte in value.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(byte as char);
            }
            _ => out.push_str(&format!("%{byte:02X}")),
        }
    }
    out
}

/// Remove a password from a driver error before it reaches the UI or logs.
pub fn redact_secret(message: &str, secret: &str) -> String {
    if secret.is_empty() {
        return message.to_string();
    }
    let encoded = encode_userinfo(secret);
    let mut out = message.replace(secret, "••••••••");
    if encoded != secret {
        out = out.replace(&encoded, "••••••••");
    }
    out
}
