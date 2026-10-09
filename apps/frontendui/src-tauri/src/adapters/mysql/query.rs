use chrono::{NaiveDate, NaiveDateTime, NaiveTime};
use sqlx::{Column, Row};

use crate::adapters::models::QueryResult;
use crate::adapters::mysql::connection::MySqlPool;
use crate::adapters::postgres::is_safe_query;

pub async fn execute_query(pool: &MySqlPool, sql: &str) -> Result<QueryResult, String> {
    if !is_safe_query(sql) {
        return Err(
            "Only read queries are allowed (SELECT, WITH, EXPLAIN, SHOW, VALUES)".to_string(),
        );
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
        .map(|column| column.name().to_string())
        .collect::<Vec<_>>();

    let mut result_rows = Vec::new();
    for row in &rows {
        let mut values = Vec::with_capacity(columns.len());
        for index in 0..columns.len() {
            values.push(cell_string(row, index));
        }
        result_rows.push(values);
    }

    Ok(QueryResult {
        columns,
        rows: result_rows,
    })
}

fn cell_string(row: &sqlx::mysql::MySqlRow, index: usize) -> String {
    if let Ok(value) = row.try_get::<Option<String>, _>(index) {
        return value.unwrap_or_else(|| "NULL".to_string());
    }
    if let Ok(value) = row.try_get::<Option<i64>, _>(index) {
        return value.map(|n| n.to_string()).unwrap_or_else(|| "NULL".to_string());
    }
    if let Ok(value) = row.try_get::<Option<i32>, _>(index) {
        return value.map(|n| n.to_string()).unwrap_or_else(|| "NULL".to_string());
    }
    if let Ok(value) = row.try_get::<Option<i16>, _>(index) {
        return value.map(|n| n.to_string()).unwrap_or_else(|| "NULL".to_string());
    }
    if let Ok(value) = row.try_get::<Option<i8>, _>(index) {
        return value.map(|n| n.to_string()).unwrap_or_else(|| "NULL".to_string());
    }
    if let Ok(value) = row.try_get::<Option<u64>, _>(index) {
        return value.map(|n| n.to_string()).unwrap_or_else(|| "NULL".to_string());
    }
    if let Ok(value) = row.try_get::<Option<u32>, _>(index) {
        return value.map(|n| n.to_string()).unwrap_or_else(|| "NULL".to_string());
    }
    if let Ok(value) = row.try_get::<Option<f64>, _>(index) {
        return value.map(|n| n.to_string()).unwrap_or_else(|| "NULL".to_string());
    }
    if let Ok(value) = row.try_get::<Option<f32>, _>(index) {
        return value.map(|n| n.to_string()).unwrap_or_else(|| "NULL".to_string());
    }
    if let Ok(value) = row.try_get::<Option<bool>, _>(index) {
        return match value {
            Some(true) => "true".to_string(),
            Some(false) => "false".to_string(),
            None => "NULL".to_string(),
        };
    }
    if let Ok(value) = row.try_get::<Option<NaiveDateTime>, _>(index) {
        return value
            .map(|n| n.format("%Y-%m-%d %H:%M:%S").to_string())
            .unwrap_or_else(|| "NULL".to_string());
    }
    if let Ok(value) = row.try_get::<Option<NaiveDate>, _>(index) {
        return value
            .map(|n| n.format("%Y-%m-%d").to_string())
            .unwrap_or_else(|| "NULL".to_string());
    }
    if let Ok(value) = row.try_get::<Option<NaiveTime>, _>(index) {
        return value
            .map(|n| n.format("%H:%M:%S").to_string())
            .unwrap_or_else(|| "NULL".to_string());
    }
    if let Ok(value) = row.try_get::<Option<Vec<u8>>, _>(index) {
        return match value {
            Some(bytes) => String::from_utf8_lossy(&bytes).into_owned(),
            None => "NULL".to_string(),
        };
    }
    "NULL".to_string()
}
