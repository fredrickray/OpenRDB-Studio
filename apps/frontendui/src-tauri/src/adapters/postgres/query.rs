use sqlx::{PgPool, Row, Column};
use crate::adapters::postgres::models::QueryResult;

fn is_safe_query(sql: &str) -> bool {
    let normalized = sql.trim().to_lowercase();
    normalized.starts_with("select")
}

pub async fn execute_query(
    pool: &PgPool,
    sql: &str,
) -> Result<QueryResult, String> {
    if !is_safe_query(sql) {
        return Err("Only SELECT queries are allowed".to_string());
    }

    let rows = sqlx::query(sql)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    if rows.is_empty() {
        return Ok(QueryResult {
            columns: vec![],
            rows: vec![],
        });
    }

    let columns = rows[0]
        .columns()
        .iter()
        .map(|c| c.name().to_string())
        .collect::<Vec<_>>();

    let mut result_rows = Vec::new();

    for row in rows {
        let mut values = Vec::new();
        for i in 0..columns.len() {
            let value: Option<String> = row.try_get(i).unwrap_or(None);
            values.push(value.unwrap_or("NULL".to_string()));
        }
        result_rows.push(values);
    }

    Ok(QueryResult {
        columns,
        rows: result_rows,
    })
}
