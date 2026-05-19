# 設備線上報修系統

設備線上報修系統（Equipment Repair Management System）

🔗 **線上網址：** https://begin0808.github.io/repair/

---

## 功能說明

### 一般使用者（全校師生）
- 使用學校 Google 帳號（@gm.tntcsh.tn.edu.tw）登入
- 瀏覽所有報修單（含狀態篩選、類別篩選、關鍵字搜尋）
- 提交新報修單（選擇地點、類別、優先級、填寫說明）
- 取消自己提交的待處理報修單

### 總務人員（Admin）
- 接受報修（待處理 → 處理中）
- 標記完成（填寫完成說明）
- 刪除報修單
- 查看歷史封存紀錄
- 報修統計儀表板（狀態分佈、月趨勢、類別分析）
- 匯出 CSV 報表

### 超級管理員（Super Admin）
- 以上所有功能
- 地點管理（新增、編輯、啟用/停用、刪除）
- 管理員帳號管理（新增總務人員、變更角色、移除權限）

---

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | React 18 + Vite + Tailwind CSS |
| 路由 | React Router v6（HashRouter） |
| 資料庫 | Firebase Firestore |
| 驗證 | Firebase Authentication（Google OAuth） |
| 後端邏輯 | Firebase Cloud Functions（Node.js 20） |
| 郵件通知 | Nodemailer + Gmail SMTP |
| 部署 | GitHub Pages（GitHub Actions 自動部署） |

---

## 角色權限

| 操作 | 一般使用者 | 總務人員 | 超級管理員 |
|------|:---------:|:-------:|:---------:|
| 查看報修清單 | ✅ | ✅ | ✅ |
| 提交報修單 | ✅ | ✅ | ✅ |
| 取消自己的報修 | ✅ | ✅ | ✅ |
| 更新報修狀態 | ❌ | ✅ | ✅ |
| 刪除報修單 | ❌ | ✅ | ✅ |
| 統計儀表板 | ❌ | ✅ | ✅ |
| CSV 匯出 | ❌ | ✅ | ✅ |
| 歷史封存紀錄 | ❌ | ✅ | ✅ |
| 地點管理 | ❌ | ❌ | ✅ |
| 管理員帳號管理 | ❌ | ❌ | ✅ |

---

## 自動化功能

- **Email 通知**：新報修單建立時自動寄信給所有總務人員；報修完成時自動寄信給提交者
- **自動封存**：已完成超過 12 個月的報修單，每週日自動封存（Cloud Functions 排程）
- **Client-side 封存**：管理員開啟報修清單時，同步觸發封存檢查

---

## 本地開發

### 環境需求
- Node.js 20+
- npm 9+

### 安裝與啟動

```bash
# 複製專案
git clone https://github.com/begin0808/repair.git
cd repair

# 安裝依賴
npm install

# 建立環境設定檔
cp .env.example .env
# 編輯 .env，填入 Firebase 專案設定值

# 啟動開發伺服器
npm run dev
```

### 環境變數（.env）

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

> ⚠️ `.env` 檔案已加入 `.gitignore`，請勿將真實金鑰提交到版本控制。

---

## 部署

### GitHub Pages（自動）
推送到 `main` 分支後，GitHub Actions 自動執行 build 並部署。

需在 GitHub repo → Settings → Secrets → Actions 設定以下 5 個 Secrets：
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

### Firebase Cloud Functions（手動部署）

```bash
# 設定郵件帳號
firebase functions:config:set email.user="gmail@gmail.com" email.pass="AppPassword"
firebase functions:config:set app.url="https://begin0808.github.io/repair"

# 安裝 functions 依賴
cd functions && npm install && cd ..

# 部署
firebase deploy --only functions
```

> 需要 Firebase Blaze（付費）方案，但免費額度對學校規模足夠。

---

## Firestore 資料結構

```
repairs/{repairId}
  title, locationId, locationName, category, priority
  description, status, archived
  submittedBy, submitterName, submitterEmail, submittedAt
  inProgressAt, assignedTo
  completedAt, completedBy, completionNote
  cancelledAt

locations/{locationId}
  name, building, floor, room, active, createdAt

admins/{uid}
  role ('admin' | 'superadmin'), email, displayName
```

---

## 開發階段

- [x] **Phase 1**：登入驗證、報修清單、提交報修、詳情頁、狀態管理、地點管理
- [x] **Phase 2**：搜尋篩選、歷史封存頁、自動封存、Email 通知
- [x] **Phase 3**：統計儀表板、管理員帳號管理、CSV 匯出

---

## 授權

本系統僅限學校 Google Workspace 帳號登入。
