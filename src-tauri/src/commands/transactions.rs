use tauri::State;
use crate::db::connection::DbState;
use crate::error::AppResult;
use crate::models::{Transaction, TransactionType, CreateTransactionInput, UpdateTransactionInput, CreateTransferInput};
use crate::utils::generate_id;

#[tauri::command]
pub fn get_transactions(
    account_id: Option<String>,
    transaction_type: Option<String>,
    start_date: Option<String>,
    end_date: Option<String>,
    db: State<'_, DbState>
) -> AppResult<Vec<Transaction>> {
    let conn = db.0.lock().map_err(|_| crate::error::AppError::LockError)?;

    let mut sql = String::from(
        "SELECT id, account_id, date, amount, type, category, note, related_account_id, created_at, updated_at
         FROM transactions WHERE 1=1"
    );
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(acc_id) = account_id {
        sql.push_str(" AND account_id = ?");
        params.push(Box::new(acc_id));
    }

    if let Some(t) = transaction_type {
        sql.push_str(" AND type = ?");
        params.push(Box::new(t));
    }

    if let Some(start) = start_date {
        sql.push_str(" AND date >= ?");
        params.push(Box::new(start));
    }

    if let Some(end) = end_date {
        sql.push_str(" AND date <= ?");
        params.push(Box::new(end));
    }

    sql.push_str(" ORDER BY date DESC");

    let mut stmt = conn.prepare(&sql)?;

    let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    let transactions = stmt.query_map(params_refs.as_slice(), |row| {
        Ok(Transaction {
            id: row.get(0)?,
            account_id: row.get(1)?,
            date: row.get(2)?,
            amount: row.get(3)?,
            transaction_type: TransactionType::from_str(&row.get::<_, String>(4)?).unwrap_or(TransactionType::INCOME),
            category: row.get(5)?,
            note: row.get(6)?,
            related_account_id: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    })?
    .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(transactions)
}

#[tauri::command]
pub fn get_transaction(id: String, db: State<'_, DbState>) -> AppResult<Transaction> {
    let conn = db.0.lock().map_err(|_| crate::error::AppError::LockError)?;

    let mut stmt = conn.prepare(
        "SELECT id, account_id, date, amount, type, category, note, related_account_id, created_at, updated_at
         FROM transactions WHERE id = ?"
    )?;

    let transaction = stmt.query_row([&id], |row| {
        Ok(Transaction {
            id: row.get(0)?,
            account_id: row.get(1)?,
            date: row.get(2)?,
            amount: row.get(3)?,
            transaction_type: TransactionType::from_str(&row.get::<_, String>(4)?).unwrap_or(TransactionType::INCOME),
            category: row.get(5)?,
            note: row.get(6)?,
            related_account_id: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    }).map_err(|_| crate::error::AppError::TransactionNotFound)?;

    Ok(transaction)
}

#[tauri::command]
pub fn create_transaction(input: CreateTransactionInput, db: State<'_, DbState>) -> AppResult<Transaction> {
    let conn = db.0.lock().map_err(|_| crate::error::AppError::LockError)?;

    let id = generate_id();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO transactions (id, account_id, date, amount, type, category, note, related_account_id, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)",
        rusqlite::params![
            &id,
            &input.account_id,
            &input.date,
            input.amount,
            input.transaction_type.as_str(),
            &input.category,
            &input.note,
            &input.related_account_id,
            &now,
        ],
    )?;

    Ok(Transaction {
        id,
        account_id: input.account_id,
        date: input.date,
        amount: input.amount,
        transaction_type: input.transaction_type,
        category: input.category,
        note: input.note,
        related_account_id: input.related_account_id,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_transaction(input: UpdateTransactionInput, db: State<'_, DbState>) -> AppResult<Transaction> {
    let conn = db.0.lock().map_err(|_| crate::error::AppError::LockError)?;

    // First get the existing transaction
    let existing: Transaction = {
        let mut stmt = conn.prepare(
            "SELECT id, account_id, date, amount, type, category, note, related_account_id, created_at, updated_at
             FROM transactions WHERE id = ?"
        )?;
        stmt.query_row([&input.id], |row| {
            Ok(Transaction {
                id: row.get(0)?,
                account_id: row.get(1)?,
                date: row.get(2)?,
                amount: row.get(3)?,
                transaction_type: TransactionType::from_str(&row.get::<_, String>(4)?).unwrap_or(TransactionType::INCOME),
                category: row.get(5)?,
                note: row.get(6)?,
                related_account_id: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        }).map_err(|_| crate::error::AppError::TransactionNotFound)?
    };

    let now = chrono::Utc::now().to_rfc3339();
    let updated = Transaction {
        id: input.id.clone(),
        account_id: input.account_id.unwrap_or(existing.account_id),
        date: input.date.unwrap_or(existing.date),
        amount: input.amount.unwrap_or(existing.amount),
        transaction_type: input.transaction_type.unwrap_or(existing.transaction_type),
        category: input.category.or(existing.category),
        note: input.note.or(existing.note),
        related_account_id: input.related_account_id.or(existing.related_account_id),
        created_at: existing.created_at,
        updated_at: now,
    };

    conn.execute(
        "UPDATE transactions SET account_id = ?1, date = ?2, amount = ?3, type = ?4, category = ?5, note = ?6, related_account_id = ?7, updated_at = ?8 WHERE id = ?9",
        rusqlite::params![
            &updated.account_id,
            &updated.date,
            updated.amount,
            updated.transaction_type.as_str(),
            &updated.category,
            &updated.note,
            &updated.related_account_id,
            &updated.updated_at,
            &updated.id,
        ],
    )?;

    Ok(updated)
}

#[tauri::command]
pub fn delete_transaction(id: String, db: State<'_, DbState>) -> AppResult<()> {
    let conn = db.0.lock().map_err(|_| crate::error::AppError::LockError)?;

    let rows_affected = conn.execute("DELETE FROM transactions WHERE id = ?", [&id])?;

    if rows_affected == 0 {
        return Err(crate::error::AppError::TransactionNotFound);
    }

    Ok(())
}

#[tauri::command]
pub fn create_transfer(input: CreateTransferInput, db: State<'_, DbState>) -> AppResult<Vec<Transaction>> {
    let conn = db.0.lock().map_err(|_| crate::error::AppError::LockError)?;

    // Validate that accounts are different
    if input.from_account_id == input.to_account_id {
        return Err(crate::error::AppError::InvalidInput("Source and destination accounts must be different".to_string()));
    }

    let now = chrono::Utc::now().to_rfc3339();
    let from_id = generate_id();
    let to_id = generate_id();

    let from_note = input.note.clone();
    let to_note = input.note.clone();

    // Create both transactions in a transaction
    conn.execute(
        "INSERT INTO transactions (id, account_id, date, amount, type, note, related_account_id, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 'TRANSFER_OUT', ?5, ?6, ?7, ?7)",
        rusqlite::params![
            &from_id,
            &input.from_account_id,
            &input.date,
            input.from_amount,
            &from_note,
            &input.to_account_id,
            &now,
        ],
    )?;

    conn.execute(
        "INSERT INTO transactions (id, account_id, date, amount, type, note, related_account_id, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 'TRANSFER_IN', ?5, ?6, ?7, ?7)",
        rusqlite::params![
            &to_id,
            &input.to_account_id,
            &input.date,
            input.to_amount,
            &to_note,
            &input.from_account_id,
            &now,
        ],
    )?;

    let from_account_id = input.from_account_id.clone();
    let to_account_id = input.to_account_id.clone();
    let date = input.date.clone();

    Ok(vec![
        Transaction {
            id: from_id,
            account_id: from_account_id.clone(),
            date: date.clone(),
            amount: input.from_amount,
            transaction_type: TransactionType::TRANSFER_OUT,
            category: None,
            note: from_note,
            related_account_id: Some(to_account_id.clone()),
            created_at: now.clone(),
            updated_at: now.clone(),
        },
        Transaction {
            id: to_id,
            account_id: to_account_id.clone(),
            date,
            amount: input.to_amount,
            transaction_type: TransactionType::TRANSFER_IN,
            category: None,
            note: to_note,
            related_account_id: Some(from_account_id),
            created_at: now.clone(),
            updated_at: now,
        },
    ])
}