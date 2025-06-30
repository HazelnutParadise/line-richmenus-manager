# LINE Rich Menu Manager (Go版本)

這是一個美觀且功能完整的LINE Rich Menu管理工具，使用Go + Gin框架開發，完全相容JavaScript版本的功能。

## 🌟 主要特色

### 📱 完整功能覆蓋
- ✅ **Rich Menu 列表管理** - 瀏覽所有已建立的Rich Menu
- ✅ **Rich Menu 詳細檢視** - 查看完整的Rich Menu資訊和互動區域
- ✅ **視覺化編輯器** - 拖拽式區域建立，支援canvas繪圖
- ✅ **圖片上傳處理** - 支援Rich Menu圖片上傳和預覽
- ✅ **JSON 匯入/導出** - 支援直接匯入Rich Menu JSON配置文件和導出當前配置
- ✅ **用戶管理** - Rich Menu與用戶的連結/解除連結操作
- ✅ **預設選單管理** - 設定和重設系統預設Rich Menu

### 🎨 美觀的使用者介面
- 🎯 **現代化設計** - 採用LINE品牌色彩和Material Design風格
- 📱 **響應式布局** - 完美支援桌面和行動裝置
- ⚡ **流暢動畫** - 平滑的過渡效果和互動回饋
- 🔍 **直觀操作** - 清晰的視覺層次和操作流程

### 🚀 高效能實作
- ⚡ **極速啟動** - Go編譯後的單一可執行文件
- 🔄 **即時代理** - 直接轉發所有請求到LINE Bot API
- 💾 **低記憶體佔用** - 比Node.js版本更節省資源
- 🛡️ **穩定可靠** - Go語言的併發安全性

## 🔧 安裝與使用

### 快速開始
```bash
# 編譯程式
cd gin-server
go build -o richmenu-manager.exe main.go

# 運行程式
./richmenu-manager.exe

# 開啟瀏覽器訪問
# http://localhost:3000
```

### 環境設定
```bash
# 自訂端口
set PORT=8080
./richmenu-manager.exe

# 在Linux/Mac上
export PORT=8080
./richmenu-manager
```

## 📖 使用指南

### 1. 初始設定
1. 開啟瀏覽器到 `http://localhost:3000`
2. 點擊「開始使用」或設定按鈕
3. 輸入您的LINE Channel Access Token
4. 點擊「儲存」

### 2. 瀏覽Rich Menu
- 左側邊欄顯示所有已建立的Rich Menu
- 點擊任一項目查看詳細資訊
- 右側顯示Rich Menu的完整資訊和互動區域

### 3. 建立新的Rich Menu
1. 點擊頂部的「新增」按鈕
2. 填寫Rich Menu名稱和聊天列文字
3. 上傳Rich Menu圖片**或**匯入現有的JSON配置文件
4. 在畫布上拖拽建立互動區域
5. 為每個區域設定動作類型和參數
6. 點擊「建立Rich Menu」完成

### 3a. JSON 匯入/導出功能
- **匯入JSON**: 點擊「匯入JSON」按鈕，選擇現有的Rich Menu配置文件快速建立
- **導出JSON**: 在編輯器中點擊「導出JSON」按鈕，將當前配置儲存為JSON文件
- **支援格式**: 標準的LINE Rich Menu JSON格式，包含所有區域和動作配置

### 4. 用戶管理
- **連結到用戶**: 將Rich Menu指派給特定用戶
- **解除連結**: 移除用戶的Rich Menu設定
- **設為預設**: 將Rich Menu設為所有新用戶的預設選單
- **重設預設**: 清除系統預設Rich Menu設定

### 5. 搜尋功能
- 點擊搜尋按鈕開啟搜尋欄
- 輸入用戶ID並按Enter
- 查看該用戶目前的Rich Menu狀態

## 🔌 API 代理功能

本程式作為LINE Bot API的完整代理服務器，支援以下端點：

### Rich Menu 管理
```http
GET    /richmenus                    # 取得Rich Menu列表
GET    /richmenus/{id}               # 取得特定Rich Menu
POST   /richmenus                    # 建立Rich Menu
DELETE /richmenus/{id}               # 刪除Rich Menu
POST   /richmenus/{id}/content       # 上傳Rich Menu圖片
GET    /richmenus/{id}/content       # 下載Rich Menu圖片
```

### 用戶Rich Menu管理
```http
GET    /users/{userId}/richmenu      # 取得用戶的Rich Menu
POST   /users/{userId}/richmenu/{id} # 為用戶設定Rich Menu
DELETE /users/{userId}/richmenu      # 移除用戶的Rich Menu
POST   /user/all/richmenu/{id}       # 設定預設Rich Menu
DELETE /user/all/richmenu            # 移除預設Rich Menu
```

## 🆚 與JavaScript版本比較

| 特性 | JavaScript版本 | Go版本 |
|------|----------------|--------|
| **啟動速度** | ~2-3秒 | <1秒 |
| **記憶體使用** | ~50-100MB | ~10-20MB |
| **編譯部署** | 需要Node.js環境 | 單一可執行文件 |
| **前端界面** | Angular複雜框架 | 純HTML+CSS+JS |
| **性能表現** | 中等 | 優秀 |
| **維護難度** | 較高 | 較低 |

## 🛠️ 技術架構

### 後端技術
- **Go 1.24+** - 高效能程式語言
- **Gin Framework** - 輕量級Web框架
- **HTTP Proxy** - 透明代理所有LINE API請求

### 前端技術  
- **HTML5** - 語意化標記
- **CSS3** - 現代化樣式和動畫
- **Vanilla JavaScript** - 原生JS，無額外依賴
- **Canvas API** - 互動式圖片編輯
- **Fetch API** - 現代化HTTP請求

### 設計特色
- **LINE品牌色彩** - 使用官方綠色 #06C755
- **響應式設計** - 支援各種螢幕尺寸
- **Material Design** - Google設計語言
- **FontAwesome圖示** - 豐富的圖示庫

## 🔒 安全性考量

- **Token安全** - Access Token僅在本地瀏覽器儲存
- **API代理** - 所有請求透過HTTPS轉發到LINE API
- **無資料儲存** - 不在本地儲存任何敏感資料
- **CORS安全** - 適當的跨域請求處理

## 🐛 故障排除

### 常見問題

**Q: 無法載入Rich Menu列表**
A: 請檢查Channel Access Token是否正確設定

**Q: 圖片上傳失敗**
A: 確保圖片格式為JPEG或PNG，且檔案大小小於1MB

**Q: 無法連結到用戶**
A: 請確認用戶ID正確，且用戶已加入您的LINE Bot為好友

**Q: 程式無法啟動**
A: 確認端口3000未被其他程式佔用，或使用環境變數PORT指定其他端口

### 偵錯模式
程式預設在偵錯模式運行，所有HTTP請求都會顯示在終端機中。

在生產環境中可設定：
```bash
export GIN_MODE=release
```

## 📝 授權條款

本專案採用MIT授權條款，歡迎自由使用和修改。

## 🤝 貢獻指南

歡迎提交Issue和Pull Request來改善這個工具！

---

**開發者**: 基於原JavaScript版本重新打造
**版本**: Go v1.0.0
**更新日期**: 2025年7月1日
