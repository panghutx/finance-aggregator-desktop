use rusqlite::Connection;

pub fn create_tables(conn: &Connection) {
    conn.execute_batch(r#"
        -- 账户表
        CREATE TABLE IF NOT EXISTS financial_accounts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('DOMESTIC', 'BANK', 'BROKERAGE', 'OVERSEAS')),
            platform TEXT NOT NULL,
            credentials TEXT,
            currency TEXT DEFAULT 'CNY',
            is_active BOOLEAN DEFAULT true,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 资产快照表 (移除 UNIQUE 约束，允许同一天多条记录)
        CREATE TABLE IF NOT EXISTS assets (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            date DATE NOT NULL,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'CNY',
            note TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (account_id) REFERENCES financial_accounts(id) ON DELETE CASCADE
        );

        -- 交易记录表
        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            date DATE NOT NULL,
            amount REAL NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('INCOME', 'DEPOSIT', 'WITHDRAW', 'TRANSFER_IN', 'TRANSFER_OUT')),
            category TEXT,
            note TEXT,
            related_account_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (account_id) REFERENCES financial_accounts(id) ON DELETE CASCADE
        );

        -- 收益记录表
        CREATE TABLE IF NOT EXISTS incomes (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            date DATE NOT NULL,
            amount REAL NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('PROFIT', 'DIVIDEND', 'INTEREST', 'FEE')),
            note TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (account_id) REFERENCES financial_accounts(id) ON DELETE CASCADE
        );

        -- 同步日志表
        CREATE TABLE IF NOT EXISTS sync_logs (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('SUCCESS', 'FAILED', 'PENDING')),
            message TEXT,
            synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (account_id) REFERENCES financial_accounts(id) ON DELETE CASCADE
        );

        -- 创建索引
        CREATE INDEX IF NOT EXISTS idx_assets_account_id ON assets(account_id);
        CREATE INDEX IF NOT EXISTS idx_assets_date ON assets(date);
        CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
        CREATE INDEX IF NOT EXISTS idx_incomes_account_id ON incomes(account_id);
        CREATE INDEX IF NOT EXISTS idx_incomes_date ON incomes(date);
    "#).expect("Failed to create tables");

    // 迁移：如果 assets 表有 UNIQUE 约束，重建表移除约束
    migrate_assets_remove_unique_constraint(conn);
}

fn migrate_assets_remove_unique_constraint(conn: &Connection) {
    // 检查是否存在 UNIQUE 约束
    let has_unique: bool = conn
        .query_row(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='assets'",
            [],
            |row| row.get::<_, String>(0),
        )
        .map(|sql| sql.contains("UNIQUE(account_id, date)"))
        .unwrap_or(false);

    if has_unique {
        conn.execute_batch(r#"
            -- 备份旧数据
            CREATE TABLE assets_backup AS SELECT * FROM assets;

            -- 删除旧表
            DROP TABLE assets;

            -- 创建新表（无 UNIQUE 约束）
            CREATE TABLE assets (
                id TEXT PRIMARY KEY,
                account_id TEXT NOT NULL,
                date DATE NOT NULL,
                amount REAL NOT NULL,
                currency TEXT DEFAULT 'CNY',
                note TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (account_id) REFERENCES financial_accounts(id) ON DELETE CASCADE
            );

            -- 恢复数据
            INSERT INTO assets SELECT * FROM assets_backup;

            -- 删除备份表
            DROP TABLE assets_backup;

            -- 重建索引
            CREATE INDEX IF NOT EXISTS idx_assets_account_id ON assets(account_id);
            CREATE INDEX IF NOT EXISTS idx_assets_date ON assets(date);
        "#).expect("Failed to migrate assets table");
    }
}