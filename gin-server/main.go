package main

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

const lineAPIURL = "https://api.line.me/v2/bot"

func main() {
	// 設置端口
	port := "8080"
	if p := os.Getenv("PORT"); p != "" {
		port = p
	}

	r := gin.Default()

	// 設置靜態文件服務
	r.Static("/static", "./static")
	r.LoadHTMLFiles("static/index.html")

	// 根路由返回index.html
	r.GET("/", func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.html", nil)
	})

	// 處理LINE API代理路由 - 使用更具體的路徑避免與靜態文件衝突
	r.Any("/v2/*path", handleRequest)
	r.Any("/oauth2/*path", handleRequest)

	fmt.Printf("listening on *:%s\n", port)
	r.Run(":" + port)
}

func handleRequest(c *gin.Context) {
	// 構建目標URL
	targetURL := lineAPIURL + c.Request.URL.Path
	if c.Request.URL.RawQuery != "" {
		targetURL += "?" + c.Request.URL.RawQuery
	}

	// 讀取請求體
	var body []byte
	var err error
	if c.Request.Body != nil {
		body, err = io.ReadAll(c.Request.Body)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read request body"})
			return
		}
	}

	// 處理特殊的POST請求體（如base64編碼的圖片）
	if c.Request.Method == "POST" && strings.Contains(c.Request.URL.Path, "content") {
		if len(body) > 0 {
			bodyStr := string(body)
			if strings.Contains(bodyStr, ",") {
				// 解碼base64圖片數據
				parts := strings.Split(bodyStr, ",")
				if len(parts) > 1 {
					decoded, err := base64.StdEncoding.DecodeString(parts[1])
					if err == nil {
						body = decoded
					}
				}
			}
		}
	}

	// 創建新的HTTP請求
	req, err := http.NewRequest(c.Request.Method, targetURL, bytes.NewReader(body))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
		return
	}

	// 複製重要的headers
	if auth := c.GetHeader("Authorization"); auth != "" {
		req.Header.Set("Authorization", auth)
	}
	if contentType := c.GetHeader("Content-Type"); contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	if contentLength := c.GetHeader("Content-Length"); contentLength != "" {
		req.Header.Set("Content-Length", contentLength)
	}

	// 發送請求
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send request to LINE API"})
		return
	}
	defer resp.Body.Close()

	// 讀取響應
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read response"})
		return
	}

	// 複製響應headers
	for key, values := range resp.Header {
		for _, value := range values {
			c.Header(key, value)
		}
	}

	// 設置響應狀態碼並返回響應體
	c.Status(resp.StatusCode)

	// 處理特殊的GET content請求（圖片下載）
	if c.Request.Method == "GET" && strings.Contains(c.Request.URL.Path, "content") {
		c.Data(resp.StatusCode, resp.Header.Get("Content-Type"), respBody)
	} else {
		c.Data(resp.StatusCode, resp.Header.Get("Content-Type"), respBody)
	}
}
