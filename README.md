# 躺盈记账 Desktop

跨平台桌面版个人资产收益追踪工具，支持 Windows、macOS 和 Linux。

## 技术栈

- **前端**: React 19 + TypeScript + Vite + Tailwind CSS
- **桌面框架**: Tauri 2.x
- **数据库**: SQLite (本地存储)
- **图表**: Recharts

## 功能

- 多账户管理 (国内平台、银行理财、券商、海外平台)
- 资产记录 (支持批量录入)
- 流水记录 (存入、取出、转账)
- 收益记录 (收益、分红、利息、费用)
- 收益报表 (真实收益计算)

## 开发

```bash
# 安装依赖
npm install

# 启动开发模式
npm run tauri dev

# 构建发布版本
npm run tauri build
```

## 数据存储

数据存储在本地 SQLite 数据库：
- **Windows**: `%APPDATA%\com.panghux.finance-aggregator\finance.db`
- **macOS**: `~/Library/Application Support/com.panghux.finance-aggregator/finance.db`
- **Linux**: `~/.config/com.panghux.finance-aggregator/finance.db`

## 项目结构

```
src/                    # React 前端
├── components/         # UI 组件
├── pages/              # 页面组件
├── lib/                # 工具函数和 Tauri API 封装
└── contexts/           # React contexts

src-tauri/              # Rust 后端
├── src/
│   ├── commands/       # Tauri 命令
│   ├── db/             # 数据库模块
│   └── models/         # 数据模型
└── Cargo.toml
```

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## 发布流程

本项目使用 GitHub Actions 自动构建跨平台安装包：

1. 创建新版本标签：
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

2. GitHub Actions 自动构建并创建 Release，包含：
   - **Windows**: `.msi` 安装包 + `.exe` 安装程序
   - **macOS**: `.dmg` 安装包 + `.app` 应用（Universal Binary 支持 Intel 和 Apple Silicon）
   - **Linux**: `.deb` + `.AppImage`

## Windows 开发环境设置

如果你需要在 Windows 上本地开发：

1. 安装 [Microsoft Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
2. 安装 [Rust](https://www.rust-lang.org/tools/install)
3. 安装 [Node.js](https://nodejs.org/) (LTS 版本)
4. 运行：
   ```bash
   npm install
   npm run tauri dev
   ```
