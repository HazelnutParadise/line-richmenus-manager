# Go版本 LINE Rich Menu Manager

這是LINE Rich Menu Manager的Go版本實現，使用Gin框架開發。

## 功能特點

- **完全代理模式**：與JavaScript版本功能完全一致，作為LINE API的代理服務器
- **支援所有HTTP方法**：GET、POST、DELETE等
- **轉發所有請求**：將請求轉發到 `https://api.line.me/v2/bot`
- **處理特殊內容**：支援base64編碼的圖片上傳和二進制內容下載
- **靜態文件服務**：提供前端界面

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

服務器默認監聽端口3000，可以通過環境變量 `PORT` 修改：

```bash
set PORT=8080
./main.exe
```

## 與JavaScript版本的差異

- **性能**：Go版本具有更好的性能和更低的內存佔用
- **部署**：Go版本編譯為單一可執行文件，部署更簡便
- **功能**：兩版本功能完全一致，都作為LINE API的代理服務器

## API端點

所有API端點都會被代理到LINE Bot API：

- `GET /richmenus` - 獲取Rich Menu列表
- `GET /richmenus/{richMenuId}` - 獲取特定Rich Menu
- `POST /richmenus` - 創建新的Rich Menu
- `DELETE /richmenus/{richMenuId}` - 刪除Rich Menu
- `POST /richmenus/{richMenuId}/content` - 上傳Rich Menu圖片
- `GET /richmenus/{richMenuId}/content` - 下載Rich Menu圖片
- `GET /users/{userId}/richmenu` - 獲取用戶的Rich Menu
- `POST /users/{userId}/richmenu/{richMenuId}` - 為用戶設置Rich Menu
- `DELETE /users/{userId}/richmenu` - 移除用戶的Rich Menu

## 授權

請求需要在Header中提供LINE Bot的Channel Access Token：
```
Authorization: Bearer {YOUR_CHANNEL_ACCESS_TOKEN}
```
