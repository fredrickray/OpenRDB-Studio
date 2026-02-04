use sqlx::{PgPool, Row};
use crate::adapters::postgres::models::{TableInfo, ColumnInfo};

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

pub async fn list_columns(
    pool: &PgPool,
    schema: &str,
    table: &str,
) -> Result<Vec<ColumnInfo>, String> {
    let rows = sqlx::query(
        r#"
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
        "#
    )
    .bind(schema)
    .bind(table)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows
        .into_iter()
        .map(|r| {
            let is_nullable: Option<String> = r.try_get("is_nullable").ok();
            ColumnInfo {
                name: r.try_get("column_name").ok(),
                data_type: r.try_get("data_type").ok(),
                is_nullable: is_nullable.as_deref() == Some("YES"),
                default_value: r.try_get("column_default").ok(),
                is_primary_key: false, // Not queried in this function
                is_foreign_key: false, // Not queried in this function
            }
        })
        .collect())
}
