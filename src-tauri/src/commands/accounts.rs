use tauri::State;
use crate::db::connection::DbState;
use crate::error::AppResult;
use crate::models::{FinancialAccount, AccountType, CreateAccountInput, UpdateAccountInput};
use crate::utils::generate_id;

#[tauri::command]
pub fn get_accounts(db: State<'_, DbState>) -> AppResult<Vec<FinancialAccount>> {
    let conn = db.0.lock().map_err(|_| crate::error::AppError::LockError)?;

    let mut stmt = conn.prepare(
        "SELECT id, name, type, platform, credentials, currency, is_active, created_at, updated_at
         FROM financial_accounts
         ORDER BY created_at DESC"
    )?;

    let accounts = stmt.query_map([], |row| {
        Ok(FinancialAccount {
            id: row.get(0)?,
            name: row.get(1)?,
            account_type: AccountType::from_str(&row.get::<_, String>(2)?).unwrap_or(AccountType::DOMESTIC),
            platform: row.get(3)?,
            credentials: row.get(4)?,
            currency: row.get(5)?,
            is_active: row.get::<_, i32>(6)? == 1,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    })?
    .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(accounts)
}

#[tauri::command]
pub fn get_account(id: String, db: State<'_, DbState>) -> AppResult<FinancialAccount> {
    let conn = db.0.lock().map_err(|_| crate::error::AppError::LockError)?;

    let mut stmt = conn.prepare(
        "SELECT id, name, type, platform, credentials, currency, is_active, created_at, updated_at
         FROM financial_accounts WHERE id = ?"
    )?;

    let account = stmt.query_row([&id], |row| {
        Ok(FinancialAccount {
            id: row.get(0)?,
            name: row.get(1)?,
            account_type: AccountType::from_str(&row.get::<_, String>(2)?).unwrap_or(AccountType::DOMESTIC),
            platform: row.get(3)?,
            credentials: row.get(4)?,
            currency: row.get(5)?,
            is_active: row.get::<_, i32>(6)? == 1,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    }).map_err(|_| crate::error::AppError::AccountNotFound)?;

    Ok(account)
}

#[tauri::command]
pub fn create_account(input: CreateAccountInput, db: State<'_, DbState>) -> AppResult<FinancialAccount> {
    let conn = db.0.lock().map_err(|_| crate::error::AppError::LockError)?;

    let id = generate_id();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO financial_accounts (id, name, type, platform, credentials, currency, is_active, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?7)",
        rusqlite::params![
            &id,
            &input.name,
            input.account_type.as_str(),
            &input.platform,
            &input.credentials,
            &input.currency,
            &now,
        ],
    )?;

    Ok(FinancialAccount {
        id,
        name: input.name,
        account_type: input.account_type,
        platform: input.platform,
        credentials: input.credentials,
        currency: input.currency,
        is_active: true,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_account(input: UpdateAccountInput, db: State<'_, DbState>) -> AppResult<FinancialAccount> {
    let conn = db.0.lock().map_err(|_| crate::error::AppError::LockError)?;

    // First get the existing account
    let existing: FinancialAccount = {
        let mut stmt = conn.prepare(
            "SELECT id, name, type, platform, credentials, currency, is_active, created_at, updated_at
             FROM financial_accounts WHERE id = ?"
        )?;
        stmt.query_row([&input.id], |row| {
            Ok(FinancialAccount {
                id: row.get(0)?,
                name: row.get(1)?,
                account_type: AccountType::from_str(&row.get::<_, String>(2)?).unwrap_or(AccountType::DOMESTIC),
                platform: row.get(3)?,
                credentials: row.get(4)?,
                currency: row.get(5)?,
                is_active: row.get::<_, i32>(6)? == 1,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        }).map_err(|_| crate::error::AppError::AccountNotFound)?
    };

    let now = chrono::Utc::now().to_rfc3339();
    let updated = FinancialAccount {
        id: input.id.clone(),
        name: input.name.unwrap_or(existing.name),
        account_type: input.account_type.unwrap_or(existing.account_type),
        platform: input.platform.unwrap_or(existing.platform),
        credentials: input.credentials.or(existing.credentials),
        currency: input.currency.unwrap_or(existing.currency),
        is_active: input.is_active.unwrap_or(existing.is_active),
        created_at: existing.created_at,
        updated_at: now,
    };

    conn.execute(
        "UPDATE financial_accounts SET name = ?1, type = ?2, platform = ?3, credentials = ?4, currency = ?5, is_active = ?6, updated_at = ?7 WHERE id = ?8",
        rusqlite::params![
            &updated.name,
            updated.account_type.as_str(),
            &updated.platform,
            &updated.credentials,
            &updated.currency,
            if updated.is_active { 1 } else { 0 },
            &updated.updated_at,
            &updated.id,
        ],
    )?;

    Ok(updated)
}

#[tauri::command]
pub fn delete_account(id: String, db: State<'_, DbState>) -> AppResult<()> {
    let conn = db.0.lock().map_err(|_| crate::error::AppError::LockError)?;

    let rows_affected = conn.execute("DELETE FROM financial_accounts WHERE id = ?", [&id])?;

    if rows_affected == 0 {
        return Err(crate::error::AppError::AccountNotFound);
    }

    Ok(())
}