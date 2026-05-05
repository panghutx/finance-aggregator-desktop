mod commands;
mod db;
mod error;
mod models;
mod utils;

use tauri::Manager;

pub use error::{AppError, AppResult};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Initialize database
            let conn = db::connection::init_db(&app.handle());
            app.manage(db::connection::DbState(std::sync::Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Account commands
            commands::accounts::get_accounts,
            commands::accounts::get_account,
            commands::accounts::create_account,
            commands::accounts::update_account,
            commands::accounts::delete_account,
            // Asset commands
            commands::assets::get_assets,
            commands::assets::get_asset,
            commands::assets::create_asset,
            commands::assets::update_asset,
            commands::assets::delete_asset,
            // Transaction commands
            commands::transactions::get_transactions,
            commands::transactions::get_transaction,
            commands::transactions::create_transaction,
            commands::transactions::update_transaction,
            commands::transactions::delete_transaction,
            commands::transactions::create_transfer,
            // Income commands
            commands::incomes::get_incomes,
            commands::incomes::get_income,
            commands::incomes::create_income,
            commands::incomes::update_income,
            commands::incomes::delete_income,
            // Profit commands
            commands::profits::get_profit_summary,
            // Exchange commands
            commands::exchange::get_exchange_rates,
            commands::exchange::convert_currency,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}