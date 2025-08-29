# Go版本 LINE Rich Menu Manager

這是LINE Rich Menu Manager的Go版本實現，使用Gin框架開發，已進行模組化重構以提高代碼可維護性。

## 專案結構

```
line-richmenus-manager/
├── main.go                 # 應用程式入口點
├── handlers/               # HTTP請求處理器
│   ├── richmenu.go        # Rich Menu相關的處理器
│   └── user.go            # 用戶Rich Menu相關的處理器
├── services/               # 業務邏輯服務層
│   └── line_service.go    # LINE API服務封裝
├── middleware/             # 中間件
│   └── auth.go            # 認證中間件
├── utils/                  # 工具函數
│   └── validation.go      # 驗證工具
├── static/                 # 靜態文件
│   ├── index.html
│   ├── main.js
│   └── style.css
└── go.mod                 # Go模組定義
```

## 功能特點

- **完全代理模式**：與JavaScript版本功能完全一致，作為LINE API的代理服務器
- **支援所有HTTP方法**：GET、POST、DELETE等
- **轉發所有請求**：將請求轉發到 `https://api.line.me/v2/bot`
- **處理特殊內容**：支援base64編碼的圖片上傳和二進制內容下載
- **靜態文件服務**：提供前端界面
- **模組化架構**：清晰的代碼組織結構，便於維護和擴展

## 運行方式

### 編譯並運行
```bash
go build -o main.exe main.go
./main.exe
```

### 直接運行
```bash
go run main.go
```

## 環境設定

服務器默認監聽端口8080，可以通過環境變量 `PORT` 修改：

```bash
set PORT=8080
./main.exe
```

## 與JavaScript版本的差異

- **性能**：Go版本具有更好的性能和更低的內存佔用
- **部署**：Go版本編譯為單一可執行文件，部署更簡便
- **架構**：採用模組化設計，代碼更易於維護
- **功能**：兩版本功能完全一致，都作為LINE API的代理服務器

## API端點

所有API端點都會被代理到LINE Bot API：

### Rich Menu管理
- `GET /richmenus` - 獲取Rich Menu列表
- `GET /richmenus/{richMenuId}` - 獲取特定Rich Menu
- `POST /richmenus` - 創建新的Rich Menu
- `PUT /richmenus/{richMenuId}` - 更新Rich Menu
- `DELETE /richmenus/{richMenuId}` - 刪除Rich Menu
- `POST /richmenus/{richMenuId}/content` - 上傳Rich Menu圖片
- `GET /richmenus/{richMenuId}/content` - 下載Rich Menu圖片

### 用戶Rich Menu管理
- `GET /users/{userId}/richmenu` - 獲取用戶的Rich Menu
- `POST /users/{userId}/richmenu/{richMenuId}` - 為用戶綁定Rich Menu
- `DELETE /users/{userId}/richmenu` - 取消用戶的Rich Menu綁定

### 默認Rich Menu管理
- `POST /user/all/richmenu/{richMenuId}` - 設置默認Rich Menu
- `DELETE /user/all/richmenu` - 取消默認Rich Menu

## 認證

所有API請求都需要在Authorization header中提供Bearer token：

```
Authorization: Bearer YOUR_CHANNEL_ACCESS_TOKEN
```

## 模組說明

### handlers
負責處理HTTP請求，包含業務邏輯的協調和響應格式化。

### services
封裝LINE API調用，提供統一的服務接口。

### middleware
處理跨請求的通用邏輯，如認證。

### utils
提供通用的工具函數，如數據驗證。

## 開發

### 添加新功能
1. 在`services`中實現業務邏輯
2. 在`handlers`中添加請求處理
3. 在`main.go`中註冊路由
4. 如需要，在`middleware`中添加中間件邏輯

### 測試
```bash
go test ./...
```
- `GET /users/{userId}/richmenu` - 獲取用戶的Rich Menu
- `POST /users/{userId}/richmenu/{richMenuId}` - 為用戶設置Rich Menu
- `DELETE /users/{userId}/richmenu` - 移除用戶的Rich Menu

## 授權

請求需要在Header中提供LINE Bot的Channel Access Token：
```
Authorization: Bearer {YOUR_CHANNEL_ACCESS_TOKEN}
```
