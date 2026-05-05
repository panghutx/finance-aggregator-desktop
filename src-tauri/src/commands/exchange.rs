use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ExchangeRates {
    pub base: String,
    pub rates: std::collections::HashMap<String, f64>,
}

#[tauri::command]
pub fn get_exchange_rates() -> AppResult<ExchangeRates> {
    let response = ureq::get("https://api.exchangerate-api.com/v4/latest/USD")
        .timeout(std::time::Duration::from_secs(10))
        .call()
        .map_err(|e| crate::error::AppError::NetworkError(e.to_string()))?;

    let rates: ExchangeRates = response
        .into_json()
        .map_err(|e| crate::error::AppError::NetworkError(e.to_string()))?;

    Ok(rates)
}

#[tauri::command]
pub fn convert_currency(amount: f64, from_currency: String, to_currency: String) -> AppResult<f64> {
    let rates = get_exchange_rates()?;

    let from_rate = rates.rates.get(&from_currency)
        .ok_or_else(|| crate::error::AppError::InvalidInput(format!("Unknown currency: {}", from_currency)))?;

    let to_rate = rates.rates.get(&to_currency)
        .ok_or_else(|| crate::error::AppError::InvalidInput(format!("Unknown currency: {}", to_currency)))?;

    // Convert via USD: amount / from_rate * to_rate
    let usd_amount = amount / from_rate;
    let converted = usd_amount * to_rate;

    Ok(converted)
}

use crate::error::AppResult;
