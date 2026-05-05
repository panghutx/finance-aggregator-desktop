use tauri::State;
use crate::db::connection::DbState;
use crate::error::AppResult;
use crate::models::{Income, IncomeType, CreateIncomeInput, UpdateIncomeInput};
use crate::utils::generate_id;

#[tauri::command]
pub fn get_incomes(account_id: Option<String>, db: State<'_, DbState>) -> AppResult<Vec<Income>> {
    let conn = db.0.lock().map_err(|_| crate::error::AppError::LockError)?;

    let mut incomes = Vec::new();

    if let Some(acc_id) = account_id {
        let mut stmt = conn.prepare(
            "SELECT id, account_id, date, amount, type, note, created_at
             FROM incomes WHERE account_id = ?
             ORDER BY date DESC"
        )?;

        let rows = stmt.query_map([&acc_id], |row| {
            Ok(Income {
                id: row.get(0)?,
                account_id: row.get(1)?,
                date: row.get(2)?,
                amount: row.get(3)?,
                income_type: IncomeType::from_str(&row.get::<_, String>(4)?).unwrap_or(IncomeType::PROFIT),
                note: row.get(5)?,
                created_at: row.get(6)?,
            })
        })?;

        for row in rows {
            incomes.push(row?);
        }
    } else {
        let mut stmt = conn.prepare(
            "SELECT id, account_id, date, amount, type, note, created_at
             FROM incomes
             ORDER BY date DESC"
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(Income {
                id: row.get(0)?,
                account_id: row.get(1)?,
                date: row.get(2)?,
                amount: row.get(3)?,
                income_type: IncomeType::from_str(&row.get::<_, String>(4)?).unwrap_or(IncomeType::PROFIT),
                note: row.get(5)?,
                created_at: row.get(6)?,
            })
        })?;

        for row in rows {
            incomes.push(row?);
        }
    }

    Ok(incomes)
}

#[tauri::command]
pub fn get_income(id: String, db: State<'_, DbState>) -> AppResult<Income> {
    let conn = db.0.lock().map_err(|_| crate::error::AppError::LockError)?;

    let mut stmt = conn.prepare(
        "SELECT id, account_id, date, amount, type, note, created_at FROM incomes WHERE id = ?"
    )?;

    let income = stmt.query_row([&id], |row| {
        Ok(Income {
            id: row.get(0)?,
            account_id: row.get(1)?,
            date: row.get(2)?,
            amount: row.get(3)?,
            income_type: IncomeType::from_str(&row.get::<_, String>(4)?).unwrap_or(IncomeType::PROFIT),
            note: row.get(5)?,
            created_at: row.get(6)?,
        })
    }).map_err(|_| crate::error::AppError::IncomeNotFound)?;

    Ok(income)
}

#[tauri::command]
pub fn create_income(input: CreateIncomeInput, db: State<'_, DbState>) -> AppResult<Income> {
    let conn = db.0.lock().map_err(|_| crate::error::AppError::LockError)?;

    let id = generate_id();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO incomes (id, account_id, date, amount, type, note, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![
            &id,
            &input.account_id,
            &input.date,
            input.amount,
            input.income_type.as_str(),
            &input.note,
            &now,
        ],
    )?;

    Ok(Income {
        id,
        account_id: input.account_id,
        date: input.date,
        amount: input.amount,
        income_type: input.income_type,
        note: input.note,
        created_at: now,
    })
}

#[tauri::command]
pub fn update_income(input: UpdateIncomeInput, db: State<'_, DbState>) -> AppResult<Income> {
    let conn = db.0.lock().map_err(|_| crate::error::AppError::LockError)?;

    // First get the existing income
    let existing: Income = {
        let mut stmt = conn.prepare(
            "SELECT id, account_id, date, amount, type, note, created_at FROM incomes WHERE id = ?"
        )?;
        stmt.query_row([&input.id], |row| {
            Ok(Income {
                id: row.get(0)?,
                account_id: row.get(1)?,
                date: row.get(2)?,
                amount: row.get(3)?,
                income_type: IncomeType::from_str(&row.get::<_, String>(4)?).unwrap_or(IncomeType::PROFIT),
                note: row.get(5)?,
                created_at: row.get(6)?,
            })
        }).map_err(|_| crate::error::AppError::IncomeNotFound)?
    };

    let updated = Income {
        id: input.id.clone(),
        account_id: input.account_id.unwrap_or(existing.account_id),
        date: input.date.unwrap_or(existing.date),
        amount: input.amount.unwrap_or(existing.amount),
        income_type: input.income_type.unwrap_or(existing.income_type),
        note: input.note.or(existing.note),
        created_at: existing.created_at,
    };

    conn.execute(
        "UPDATE incomes SET account_id = ?1, date = ?2, amount = ?3, type = ?4, note = ?5 WHERE id = ?6",
        rusqlite::params![
            &updated.account_id,
            &updated.date,
            updated.amount,
            updated.income_type.as_str(),
            &updated.note,
            &updated.id,
        ],
    )?;

    Ok(updated)
}

#[tauri::command]
pub fn delete_income(id: String, db: State<'_, DbState>) -> AppResult<()> {
    let conn = db.0.lock().map_err(|_| crate::error::AppError::LockError)?;

    let rows_affected = conn.execute("DELETE FROM incomes WHERE id = ?", [&id])?;

    if rows_affected == 0 {
        return Err(crate::error::AppError::IncomeNotFound);
    }

    Ok(())
}