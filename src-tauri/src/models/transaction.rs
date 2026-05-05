use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TransactionType {
    INCOME,
    DEPOSIT,
    WITHDRAW,
    TRANSFER_IN,
    TRANSFER_OUT,
}

impl TransactionType {
    pub fn as_str(&self) -> &'static str {
        match self {
            TransactionType::INCOME => "INCOME",
            TransactionType::DEPOSIT => "DEPOSIT",
            TransactionType::WITHDRAW => "WITHDRAW",
            TransactionType::TRANSFER_IN => "TRANSFER_IN",
            TransactionType::TRANSFER_OUT => "TRANSFER_OUT",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "INCOME" => Some(TransactionType::INCOME),
            "DEPOSIT" => Some(TransactionType::DEPOSIT),
            "WITHDRAW" => Some(TransactionType::WITHDRAW),
            "TRANSFER_IN" => Some(TransactionType::TRANSFER_IN),
            "TRANSFER_OUT" => Some(TransactionType::TRANSFER_OUT),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub id: String,
    #[serde(rename = "accountId")]
    pub account_id: String,
    pub date: String,
    pub amount: f64,
    #[serde(rename = "type")]
    pub transaction_type: TransactionType,
    pub category: Option<String>,
    pub note: Option<String>,
    #[serde(rename = "relatedAccountId")]
    pub related_account_id: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTransactionInput {
    #[serde(rename = "accountId")]
    pub account_id: String,
    pub date: String,
    pub amount: f64,
    #[serde(rename = "type")]
    pub transaction_type: TransactionType,
    pub category: Option<String>,
    pub note: Option<String>,
    #[serde(rename = "relatedAccountId")]
    pub related_account_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTransactionInput {
    pub id: String,
    #[serde(rename = "accountId")]
    pub account_id: Option<String>,
    pub date: Option<String>,
    pub amount: Option<f64>,
    #[serde(rename = "type")]
    pub transaction_type: Option<TransactionType>,
    pub category: Option<String>,
    pub note: Option<String>,
    #[serde(rename = "relatedAccountId")]
    pub related_account_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTransferInput {
    #[serde(rename = "fromAccountId")]
    pub from_account_id: String,
    #[serde(rename = "toAccountId")]
    pub to_account_id: String,
    #[serde(rename = "fromAmount")]
    pub from_amount: f64,
    #[serde(rename = "toAmount")]
    pub to_amount: f64,
    pub date: String,
    pub note: Option<String>,
}