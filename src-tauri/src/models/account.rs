use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AccountType {
    DOMESTIC,
    BANK,
    BROKERAGE,
    OVERSEAS,
}

impl AccountType {
    pub fn as_str(&self) -> &'static str {
        match self {
            AccountType::DOMESTIC => "DOMESTIC",
            AccountType::BANK => "BANK",
            AccountType::BROKERAGE => "BROKERAGE",
            AccountType::OVERSEAS => "OVERSEAS",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "DOMESTIC" => Some(AccountType::DOMESTIC),
            "BANK" => Some(AccountType::BANK),
            "BROKERAGE" => Some(AccountType::BROKERAGE),
            "OVERSEAS" => Some(AccountType::OVERSEAS),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinancialAccount {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub account_type: AccountType,
    pub platform: String,
    pub credentials: Option<String>,
    pub currency: String,
    #[serde(rename = "isActive")]
    pub is_active: bool,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAccountInput {
    pub name: String,
    #[serde(rename = "type")]
    pub account_type: AccountType,
    pub platform: String,
    pub credentials: Option<String>,
    pub currency: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateAccountInput {
    pub id: String,
    pub name: Option<String>,
    #[serde(rename = "type")]
    pub account_type: Option<AccountType>,
    pub platform: Option<String>,
    pub credentials: Option<String>,
    pub currency: Option<String>,
    #[serde(rename = "isActive")]
    pub is_active: Option<bool>,
}