use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Asset {
    pub id: String,
    #[serde(rename = "accountId")]
    pub account_id: String,
    pub date: String,
    pub amount: f64,
    pub currency: String,
    pub note: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAssetInput {
    #[serde(rename = "accountId")]
    pub account_id: String,
    pub date: String,
    pub amount: f64,
    pub currency: String,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateAssetInput {
    pub id: String,
    #[serde(rename = "accountId")]
    pub account_id: Option<String>,
    pub date: Option<String>,
    pub amount: Option<f64>,
    pub currency: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetWithAccount {
    pub id: String,
    #[serde(rename = "accountId")]
    pub account_id: String,
    pub date: String,
    pub amount: f64,
    pub currency: String,
    pub note: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "accountName")]
    pub account_name: String,
    #[serde(rename = "accountPlatform")]
    pub account_platform: String,
}