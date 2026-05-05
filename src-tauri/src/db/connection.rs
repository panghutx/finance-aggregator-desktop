use std::path::PathBuf;
use std::sync::Mutex;
use rusqlite::Connection;
use tauri::Manager;

pub struct DbState(pub Mutex<Connection>);

pub fn get_db_path(app_handle: &tauri::AppHandle) -> PathBuf {
    let app_data_dir = app_handle.path().app_data_dir()
        .expect("Failed to get app data directory");

    std::fs::create_dir_all(&app_data_dir)
        .expect("Failed to create app data directory");

    app_data_dir.join("finance.db")
}

pub fn init_db(app_handle: &tauri::AppHandle) -> Connection {
    let db_path = get_db_path(app_handle);

    let conn = Connection::open(&db_path)
        .expect("Failed to open database");

    super::schema::create_tables(&conn);

    conn
}