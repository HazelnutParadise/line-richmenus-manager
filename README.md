# Go版本 LINE Rich Menu Manager

這是LINE Rich Menu Manager的Go版本實現，使用Gin框架開發。

網址：https://linebotrm.hazelnut-paradise.com/

![logo](/LineRMManager.png)

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

- **拖拉建立Rich Menu**：通過直觀的UI設計Rich Menu，不用透過LINEbot Designer。
- **Rich Menu管理**：創建、更新、刪除Rich Menu，並上傳圖片。

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
