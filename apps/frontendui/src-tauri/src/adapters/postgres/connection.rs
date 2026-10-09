use sqlx::{postgres::PgPoolOptions, Pool, Postgres};
use std::time::Duration;

use crate::adapters::models::ConnectionConfig;
use crate::adapters::userinfo::{encode_userinfo, redact_secret};

pub type PgPool = Pool<Postgres>;

/// Maintenance database used to list and create databases on a PostgreSQL server.
pub const MAINTENANCE_DATABASE: &str = "postgres";

/// Build a PostgreSQL connection URL from the shared config.
pub fn connection_string(config: &ConnectionConfig) -> String {
    let ssl_mode = if config.ssl_required { "require" } else { "prefer" };
    format!(
        "postgresql://{}:{}@{}:{}/{}?sslmode={}",
        encode_userinfo(&config.username),
        encode_userinfo(&config.password),
        config.host,
        config.port,
        config.database,
        ssl_mode
    )
}

pub async fn create_pool(config: &ConnectionConfig) -> Result<PgPool, String> {
    let database_url = connection_string(config);
    PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(5))
        .connect(&database_url)
        .await
        .map_err(|e| {
            redact_secret(
                &format!("Failed to connect to PostgreSQL: {}", e),
                &config.password,
            )
        })
}