use sqlx::{PgPool, Row};
use crate::adapters::postgres::models::TableInfo;

pub async fn list_tables(pool: &PgPool) -> Result<Vec<TableInfo>, String> {
    let rows = sqlx::query(
        r#"
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_type = 'BASE TABLE'
          AND table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY table_schema, table_name
        "#
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows
        .into_iter()
        .map(|r| TableInfo {
            schema: r.try_get("table_schema").ok(),
            name: r.try_get("table_name").ok(),
        })
        .collect())
}
