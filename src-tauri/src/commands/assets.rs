use tauri::State;
use crate::db::connection::DbState;
use crate::error::AppResult;
use crate::models::{Asset, AssetWithAccount, CreateAssetInput, UpdateAssetInput};
use crate::utils::generate_id;

#[tauri::command]
pub fn get_assets(account_id: Option<String>, db: State<'_, DbState>) -> AppResult<Vec<AssetWithAccount>> {
    let conn = db.0.lock().map_err(|_| crate::error::AppError::LockError)?;

    let mut assets = Vec::new();

    if let Some(acc_id) = account_id {
        let mut stmt = conn.prepare(
            "SELECT a.id, a.account_id, a.date, a.amount, a.currency, a.note, a.created_at,
                    acc.name, acc.platform
             FROM assets a
             JOIN financial_accounts acc ON a.account_id = acc.id
             WHERE a.account_id = ?
             ORDER BY a.date DESC"
        )?;

        let rows = stmt.query_map([&acc_id], |row| {
            Ok(AssetWithAccount {
                id: row.get(0)?,
                account_id: row.get(1)?,
                date: row.get(2)?,
                amount: row.get(3)?,
                currency: row.get(4)?,
                note: row.get(5)?,
                created_at: row.get(6)?,
                account_name: row.get(7)?,
                account_platform: row.get(8)?,
            })
        })?;

        for row in rows {
            assets.push(row?);
        }
    } else {
        let mut stmt = conn.prepare(
            "SELECT a.id, a.account_id, a.date, a.amount, a.currency, a.note, a.created_at,
                    acc.name, acc.platform
             FROM assets a
             JOIN financial_accounts acc ON a.account_id = acc.id
             ORDER BY a.date DESC"
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(AssetWithAccount {
                id: row.get(0)?,
                account_id: row.get(1)?,
                date: row.get(2)?,
                amount: row.get(3)?,
                currency: row.get(4)?,
                note: row.get(5)?,
                created_at: row.get(6)?,
                account_name: row.get(7)?,
                account_platform: row.get(8)?,
            })
        })?;

        for row in rows {
            assets.push(row?);
        }
    }

    Ok(assets)
}

#[tauri::command]
pub fn get_asset(id: String, db: State<'_, DbState>) -> AppResult<Asset> {
    let conn = db.0.lock().map_err(|_| crate::error::AppError::LockError)?;

    let mut stmt = conn.prepare(
        "SELECT id, account_id, date, amount, currency, note, created_at FROM assets WHERE id = ?"
    )?;

    let asset = stmt.query_row([&id], |row| {
        Ok(Asset {
            id: row.get(0)?,
            account_id: row.get(1)?,
            date: row.get(2)?,
            amount: row.get(3)?,
            currency: row.get(4)?,
            note: row.get(5)?,
            created_at: row.get(6)?,
        })
    }).map_err(|_| crate::error::AppError::AssetNotFound)?;

    Ok(asset)
}

#[tauri::command]
pub fn create_asset(input: CreateAssetInput, db: State<'_, DbState>) -> AppResult<Asset> {
    let conn = db.0.lock().map_err(|_| crate::error::AppError::LockError)?;

    let id = generate_id();
    let now = chrono::Utc::now().to_rfc3339();

    // Insert new asset record (each record is preserved, no overwriting)
    conn.execute(
        "INSERT INTO assets (id, account_id, date, amount, currency, note, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![
            &id,
            &input.account_id,
            &input.date,
            input.amount,
            &input.currency,
            &input.note,
            &now,
        ],
    )?;

    Ok(Asset {
        id,
        account_id: input.account_id,
        date: input.date,
        amount: input.amount,
        currency: input.currency,
        note: input.note,
        created_at: now,
    })
}

#[tauri::command]
pub fn update_asset(input: UpdateAssetInput, db: State<'_, DbState>) -> AppResult<Asset> {
    let conn = db.0.lock().map_err(|_| crate::error::AppError::LockError)?;

    // First get the existing asset
    let existing: Asset = {
        let mut stmt = conn.prepare(
            "SELECT id, account_id, date, amount, currency, note, created_at FROM assets WHERE id = ?"
        )?;
        stmt.query_row([&input.id], |row| {
            Ok(Asset {
                id: row.get(0)?,
                account_id: row.get(1)?,
                date: row.get(2)?,
                amount: row.get(3)?,
                currency: row.get(4)?,
                note: row.get(5)?,
                created_at: row.get(6)?,
            })
        }).map_err(|_| crate::error::AppError::AssetNotFound)?
    };

    let updated = Asset {
        id: input.id.clone(),
        account_id: input.account_id.unwrap_or(existing.account_id),
        date: input.date.unwrap_or(existing.date),
        amount: input.amount.unwrap_or(existing.amount),
        currency: input.currency.unwrap_or(existing.currency),
        note: input.note.or(existing.note),
        created_at: existing.created_at,
    };

    conn.execute(
        "UPDATE assets SET account_id = ?1, date = ?2, amount = ?3, currency = ?4, note = ?5 WHERE id = ?6",
        rusqlite::params![
            &updated.account_id,
            &updated.date,
            updated.amount,
            &updated.currency,
            &updated.note,
            &updated.id,
        ],
    )?;

    Ok(updated)
}

#[tauri::command]
pub fn delete_asset(id: String, db: State<'_, DbState>) -> AppResult<()> {
    let conn = db.0.lock().map_err(|_| crate::error::AppError::LockError)?;

    let rows_affected = conn.execute("DELETE FROM assets WHERE id = ?", [&id])?;

    if rows_affected == 0 {
        return Err(crate::error::AppError::AssetNotFound);
    }

    Ok(())
}