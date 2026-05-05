use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum IncomeType {
    PROFIT,
    DIVIDEND,
    INTEREST,
    FEE,
}

impl IncomeType {
    pub fn as_str(&self) -> &'static str {
        match self {
            IncomeType::PROFIT => "PROFIT",
            IncomeType::DIVIDEND => "DIVIDEND",
            IncomeType::INTEREST => "INTEREST",
            IncomeType::FEE => "FEE",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "PROFIT" => Some(IncomeType::PROFIT),
            "DIVIDEND" => Some(IncomeType::DIVIDEND),
            "INTEREST" => Some(IncomeType::INTEREST),
            "FEE" => Some(IncomeType::FEE),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Income {
    pub id: String,
    #[serde(rename = "accountId")]
    pub account_id: String,
    pub date: String,
    pub amount: f64,
    #[serde(rename = "type")]
    pub income_type: IncomeType,
    pub note: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateIncomeInput {
    #[serde(rename = "accountId")]
    pub account_id: String,
    pub date: String,
    pub amount: f64,
    #[serde(rename = "type")]
    pub income_type: IncomeType,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateIncomeInput {
    pub id: String,
    #[serde(rename = "accountId")]
    pub account_id: Option<String>,
    pub date: Option<String>,
    pub amount: Option<f64>,
    #[serde(rename = "type")]
    pub income_type: Option<IncomeType>,
    pub note: Option<String>,
}