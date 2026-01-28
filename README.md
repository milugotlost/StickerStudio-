# 🎨 StickerStudio - LINE 貼圖製作工具

![Banner](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)

在瀏覽器中輕鬆繪製並匯出符合 LINE 規格的貼圖包。

## ✨ 功能特色

- **專案管理** - 建立多個貼圖專案，支援 8/16/24/32/40 張貼圖
- **分層繪圖** - 草稿、上色、線稿多圖層編輯
- **繪圖工具** - 筆刷、橡皮擦、文字工具，支援筆刷穩定化
- **即時預覽** - 貼圖縮圖即時更新
- **一鍵匯出** - 直接匯出符合 LINE 規格的 ZIP 貼圖包

## 🚀 快速開始

### 環境需求

- Node.js 18+
- npm 或 yarn

### 安裝與執行

```bash
# 安裝依賴
npm install

# 設定環境變數（選填，用於 AI 功能）
# 編輯 .env.local 設定 GEMINI_API_KEY

# 啟動開發伺服器
npm run dev
```

開啟瀏覽器訪問 http://localhost:3000

### 建置與部署

```bash
# 建置生產版本
npm run build

# 預覽建置結果
npm run preview
```

## 📦 GitHub Pages 部署

專案已設定 GitHub Actions 自動部署：

1. 推送程式碼到 `main` 分支
2. GitHub Actions 自動建置並部署
3. 前往 Repository **Settings > Pages** 確認部署狀態

> 💡 如需使用 Gemini API，請在 Repository **Settings > Secrets** 中新增 `GEMINI_API_KEY`

## 📱 前端轉 APP 規劃

| 階段 | 方案 | 說明 |
|------|------|------|
| Phase 1 | **PWA** | 零修改直接發布，支援手機安裝 |
| Phase 2 | **Capacitor** | 包裝成原生 APP，上架 App Store / Google Play |

### PWA 快速啟用

```bash
npm install vite-plugin-pwa -D
```

### Capacitor 轉換

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npx cap add ios
npx cap add android
```

## 🛠️ 技術棧

- **框架**: React 19 + TypeScript
- **建置工具**: Vite 6
- **樣式**: TailwindCSS (CDN)
- **圖示**: Lucide React
- **儲存**: IndexedDB (本地持久化)
- **匯出**: JSZip + FileSaver.js

## 📄 專案結構

```
├── App.tsx              # 主應用程式
├── pages/
│   ├── Dashboard.tsx    # 專案列表頁
│   └── Editor.tsx       # 貼圖編輯器
├── components/
│   ├── CanvasBoard.tsx  # 繪圖畫布
│   ├── LayerPanel.tsx   # 圖層面板
│   └── Toolbar.tsx      # 工具列
├── services/
│   ├── db.ts            # IndexedDB 操作
│   └── export.ts        # ZIP 匯出功能
└── types.ts             # TypeScript 型別定義
```

## 📝 License

MIT
