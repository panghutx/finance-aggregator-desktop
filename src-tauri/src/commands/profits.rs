use tauri::State;
use serde::{Deserialize, Serialize};
use crate::db::connection::DbState;
use crate::error::AppResult;

#[derive(Debug, Serialize, Deserialize)]
pub struct ProfitSummary {
    #[serde(rename = "totalAssets")]
    pub total_assets: f64,
    #[serde(rename = "totalProfit")]
    pub total_profit: f64,
    #[serde(rename = "profitRate")]
    pub profit_rate: f64,
    #[serde(rename = "netInflow")]
    pub net_inflow: f64,
    #[serde(rename = "assetChange")]
    pub asset_change: f64,
}

#[tauri::command]
pub fn get_profit_summary(
    period: Option<String>,
    start_date: Option<String>,
    end_date: Option<String>,
    db: State<'_, DbState>
) -> AppResult<ProfitSummary> {
    let conn = db.0.lock().map_err(|_| crate::error::AppError::LockError)?;

    // Determine date range based on period
    let (start, end) = match period.as_deref() {
        Some("today") => {
            let today = chrono::Local::now().format("%Y-%m-%d").to_string();
            (today.clone(), today)
        }
        Some("week") => {
            let end = chrono::Local::now().format("%Y-%m-%d").to_string();
            let start = (chrono::Local::now() - chrono::Duration::days(7)).format("%Y-%m-%d").to_string();
            (start, end)
        }
        Some("month") => {
            let end = chrono::Local::now().format("%Y-%m-%d").to_string();
            let start = (chrono::Local::now() - chrono::Duration::days(30)).format("%Y-%m-%d").to_string();
            (start, end)
        }
        Some("year") => {
            let end = chrono::Local::now().format("%Y-%m-%d").to_string();
            let start = (chrono::Local::now() - chrono::Duration::days(365)).format("%Y-%m-%d").to_string();
            (start, end)
        }
        Some("custom") => {
            (start_date.unwrap_or_default(), end_date.unwrap_or_default())
        }
        _ => {
            // All time - use very early start date
            ("2000-01-01".to_string(), chrono::Local::now().format("%Y-%m-%d").to_string())
        }
    };

    // Get latest total assets
    let total_assets: f64 = {
        let mut stmt = conn.prepare(
            "SELECT COALESCE(SUM(amount), 0) FROM (
                SELECT a.account_id, MAX(a.date) as latest_date
                FROM assets a
                JOIN financial_accounts acc ON a.account_id = acc.id
                WHERE acc.is_active = 1
                GROUP BY a.account_id
            ) latest
            JOIN assets a ON latest.account_id = a.account_id AND latest.latest_date = a.date"
        )?;
        stmt.query_row([], |row| row.get(0)).unwrap_or(0.0)
    };

    // Get asset at start of period
    let start_assets: f64 = {
        let mut stmt = conn.prepare(
            "SELECT COALESCE(SUM(amount), 0) FROM (
                SELECT a.account_id, MAX(a.date) as latest_date
                FROM assets a
                JOIN financial_accounts acc ON a.account_id = acc.id
                WHERE acc.is_active = 1 AND a.date <= ?
                GROUP BY a.account_id
            ) latest
            JOIN assets a ON latest.account_id = a.account_id AND latest.latest_date = a.date"
        )?;
        stmt.query_row([&start], |row| row.get(0)).unwrap_or(0.0)
    };

    // Calculate net inflow (deposits + transfers_in - withdrawals - transfers_out)
    let net_inflow: f64 = {
        let mut stmt = conn.prepare(
            "SELECT COALESCE(
                (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type IN ('DEPOSIT', 'TRANSFER_IN') AND date BETWEEN ? AND ?) -
                (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type IN ('WITHDRAW', 'TRANSFER_OUT') AND date BETWEEN ? AND ?),
                0
            )"
        )?;
        stmt.query_row(rusqlite::params![&start, &end, &start, &end], |row| row.get(0)).unwrap_or(0.0)
    };

    // Calculate asset change
    let asset_change = total_assets - start_assets;

    // Calculate real profit: asset change - net inflow
    let total_profit = asset_change - net_inflow;

    // Calculate profit rate
    let profit_rate = if start_assets > 0.0 {
        (total_profit / start_assets) * 100.0
    } else {
        0.0
    };

    Ok(ProfitSummary {
        total_assets,
        total_profit,
        profit_rate,
        net_inflow,
        asset_change,
    })
}