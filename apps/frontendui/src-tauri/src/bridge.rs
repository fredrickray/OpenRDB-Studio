//! Local HTTP bridge so Atlas (browser) can open connections in a running Studio.
//! Listens on 127.0.0.1:17345 — works with `tauri:dev` without macOS URL-scheme registration.

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, Runtime};
use tokio::net::TcpListener;

pub const BRIDGE_PORT: u16 = 17345;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AtlasConnectPayload {
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: String,
    pub database: String,
    pub ssl_required: bool,
}

fn cors_headers() -> String {
    [
        "Access-Control-Allow-Origin: *",
        "Access-Control-Allow-Methods: GET, POST, OPTIONS",
        "Access-Control-Allow-Headers: Content-Type",
        "Access-Control-Max-Age: 86400",
    ]
    .join("\r\n")
}

fn http_response(status: &str, body: &str, extra_headers: &str) -> String {
    format!(
        "HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\n{cors}\r\n{extra}\r\n{body}",
        body.len(),
        cors = cors_headers(),
        extra = extra_headers,
        body = body,
        status = status,
    )
}

async fn handle_connection<R: Runtime>(
    mut stream: tokio::net::TcpStream,
    app: AppHandle<R>,
) {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    let mut buf = vec![0u8; 65536];
    let n = match stream.read(&mut buf).await {
        Ok(0) | Err(_) => return,
        Ok(n) => n,
    };

    let request = String::from_utf8_lossy(&buf[..n]);
    let (request_line, rest) = match request.split_once("\r\n") {
        Some(parts) => parts,
        None => return,
    };

    let method_path: Vec<&str> = request_line.split_whitespace().collect();
    let method = method_path.first().copied().unwrap_or("");
    let path = method_path.get(1).copied().unwrap_or("/");

    let response = if method == "OPTIONS" {
        http_response("204 No Content", "", "")
    } else if method == "GET" && path.starts_with("/health") {
        http_response("200 OK", r#"{"ok":true,"service":"openrdb-studio"}"#, "")
    } else if method == "POST" && path.starts_with("/connect") {
        let body = rest
            .rsplit_once("\r\n\r\n")
            .map(|(_, b)| b)
            .unwrap_or("")
            .trim_end_matches('\0')
            .trim();

        match serde_json::from_str::<AtlasConnectPayload>(body) {
            Ok(payload) if !payload.host.is_empty() && !payload.username.is_empty() => {
                // Frontend also accepts snake_case via normalize; emit camelCase-friendly JSON.
                #[derive(Serialize)]
                #[serde(rename_all = "camelCase")]
                struct EmitPayload<'a> {
                    name: &'a str,
                    host: &'a str,
                    port: u16,
                    username: &'a str,
                    password: &'a str,
                    database: &'a str,
                    ssl_required: bool,
                }

                let emit_payload = EmitPayload {
                    name: &payload.name,
                    host: &payload.host,
                    port: payload.port,
                    username: &payload.username,
                    password: &payload.password,
                    database: &payload.database,
                    ssl_required: payload.ssl_required,
                };

                if let Err(e) = app.emit("atlas-connect", &emit_payload) {
                    log::error!("Failed to emit atlas-connect: {e}");
                    http_response(
                        "500 Internal Server Error",
                        r#"{"ok":false,"error":"emit failed"}"#,
                        "",
                    )
                } else {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        let _ = window.unminimize();
                    }
                    http_response("200 OK", r#"{"ok":true}"#, "")
                }
            }
            Ok(_) => http_response(
                "400 Bad Request",
                r#"{"ok":false,"error":"host and username are required"}"#,
                "",
            ),
            Err(e) => {
                log::warn!("Invalid connect payload: {e}");
                http_response(
                    "400 Bad Request",
                    &format!(r#"{{"ok":false,"error":"invalid json"}}"#),
                    "",
                )
            }
        }
    } else {
        http_response("404 Not Found", r#"{"ok":false,"error":"not found"}"#, "")
    };

    let _ = stream.write_all(response.as_bytes()).await;
}

/// Start the Atlas → Studio localhost bridge (non-blocking).
pub fn start_bridge<R: Runtime>(app: AppHandle<R>) {
    tauri::async_runtime::spawn(async move {
        let addr = format!("127.0.0.1:{BRIDGE_PORT}");
        let listener = match TcpListener::bind(&addr).await {
            Ok(l) => l,
            Err(e) => {
                log::warn!(
                    "Atlas bridge could not bind {addr}: {e}. Open in Studio via deep link may still work if registered."
                );
                return;
            }
        };

        log::info!("Atlas bridge listening on http://{addr}");

        loop {
            match listener.accept().await {
                Ok((stream, _)) => {
                    let handle = app.clone();
                    tauri::async_runtime::spawn(async move {
                        handle_connection(stream, handle).await;
                    });
                }
                Err(e) => {
                    log::warn!("Atlas bridge accept error: {e}");
                }
            }
        }
    });
}
