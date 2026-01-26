use sqlx::{Pool, Postgres, postgres::PgPoolOptions};
use std::time::Duration;

pub type PgPool = Pool<Postgres>;

pub async fn create_pool(database_url: &str) -> Result<PgPool, String> {
    PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(5))
        .connect(database_url)
        .await
        .map_err(|e| format!("Failed to connect to PostgreSQL: {}", e))
}

pub async fn test_connection(database_url: &str) -> Result<(), String> {
    let pool = create_pool(database_url).await?;
    pool.acquire()
        .await
        .map_err(|e| format!("Connection test failed: {}", e))?;
    Ok(())
}