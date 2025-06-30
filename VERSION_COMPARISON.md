# LINE Rich Menu Manager - Go vs JavaScript 版本對比

本項目提供了兩個功能完全一致的實現版本：

## 功能特點（兩版本相同）

✅ **完全代理模式**：作為LINE Bot API的代理服務器  
✅ **支援所有HTTP方法**：GET、POST、DELETE、PUT等  
✅ **請求轉發**：將所有請求轉發到 `https://api.line.me/v2/bot`  
✅ **特殊內容處理**：支援base64編碼圖片上傳和二進制內容下載  
✅ **靜態文件服務**：提供完整的前端界面  
✅ **動態端口配置**：支援環境變量設置端口  

## 版本對比

| 特性 | JavaScript版本 | Go版本 |
|------|----------------|--------|
| **運行環境** | Node.js | 原生可執行文件 |
| **依賴管理** | npm packages | 單一編譯文件 |
| **啟動時間** | 較慢 | 極快 |
| **內存佔用** | 較高 | 較低 |
| **性能** | 中等 | 高 |
| **部署複雜度** | 需要Node.js環境 | 直接運行 |
| **跨平台** | 需要Node.js | 編譯後跨平台 |

## 運行方式

### JavaScript版本
```bash
# 安裝依賴
npm install

# 運行
node app.js

# 指定端口
set PORT=8080
node app.js
```

### Go版本
```bash
# 編譯
cd gin-server
go build -o main.exe main.go

# 運行
./main.exe

# 指定端口
set PORT=8080
./main.exe
```

## 選擇建議

- **開發環境**：JavaScript版本（熱重載、快速修改）
- **生產環境**：Go版本（性能優越、部署簡便）
- **容器化部署**：Go版本（鏡像更小、啟動更快）
- **現有Node.js環境**：JavaScript版本（環境一致性）

## API使用

兩個版本的API使用方式完全相同：

```bash
# 獲取Rich Menu列表
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/richmenus

# 創建Rich Menu
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"size":{"width":2500,"height":1686},"selected":true,"name":"test"}' \
     http://localhost:3000/richmenus
```

兩個版本都會將這些請求代理到LINE Bot API，確保功能完全一致。
