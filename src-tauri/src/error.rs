use serde::Serialize;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("Database error: {0}")]
    DatabaseError(String),
    #[error("Account not found")]
    AccountNotFound,
    #[error("Asset not found")]
    AssetNotFound,
    #[error("Transaction not found")]
    TransactionNotFound,
    #[error("Income not found")]
    IncomeNotFound,
    #[error("Invalid input: {0}")]
    InvalidInput(String),
    #[error("Lock error")]
    LockError,
    #[error("Network error: {0}")]
    NetworkError(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = std::result::Result<T, AppError>;