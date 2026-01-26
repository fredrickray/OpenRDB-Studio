use sqlx::PgPool;
use crate::adapters::postgres::models::{TableInfo, ColumnInfo};

pub async fn list_tables(pool: &PgPool) -> Result<Vec<TableInfo>, String> {
    let rows = sqlx::query!(
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
            schema: r.table_schema,
            name: r.table_name,
        })
        .collect())
}

pub async fn list_columns(
    pool: &PgPool,
    schema: &str,
    table: &str,
) -> Result<Vec<ColumnInfo>, String> {
    let rows = sqlx::query!(
        r#"
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
        "#,
        schema,
        table
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows
        .into_iter()
        .map(|r| ColumnInfo {
            name: r.column_name,
            data_type: r.data_type,
            is_nullable: r.is_nullable == "YES",
            default_value: r.column_default,
        })
        .collect())
}
