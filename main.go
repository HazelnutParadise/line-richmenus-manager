package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/line/line-bot-sdk-go/v8/linebot/messaging_api"
)

var messagingApiClient *messaging_api.MessagingApiAPI
var messagingApiBlobClient *messaging_api.MessagingApiBlobAPI

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

	// Rich Menu API routes
	r.GET("/richmenus", getRichMenus)
	r.GET("/richmenus/:id", getRichMenu)
	r.POST("/richmenus", createRichMenu)
	r.DELETE("/richmenus/:id", deleteRichMenu)
	r.POST("/richmenus/:id/content", uploadRichMenuImage)
	r.GET("/richmenus/:id/content", getRichMenuImage)

	// User Rich Menu API routes
	r.GET("/users/:userId/richmenu", getUserRichMenu)
	r.POST("/users/:userId/richmenu/:richMenuId", linkUserRichMenu)
	r.DELETE("/users/:userId/richmenu", unlinkUserRichMenu)
	r.POST("/user/all/richmenu/:richMenuId", setDefaultRichMenu)
	r.DELETE("/user/all/richmenu", deleteDefaultRichMenu)

	fmt.Printf("listening on *:%s\n", port)
	r.Run(":" + port)
}

func initClient(channelAccessToken string) error {
	var err error
	messagingApiClient, err = messaging_api.NewMessagingApiAPI(channelAccessToken)
	if err != nil {
		return err
	}
	messagingApiBlobClient, err = messaging_api.NewMessagingApiBlobAPI(channelAccessToken)
	return err
}

func getChannelAccessToken(c *gin.Context) string {
	token := c.GetHeader("Authorization")
	if token != "" && strings.HasPrefix(token, "Bearer ") {
		return strings.TrimPrefix(token, "Bearer ")
	}
	return ""
}

func getRichMenus(c *gin.Context) {
	token := getChannelAccessToken(c)
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing or invalid authorization header"})
		return
	}

	if err := initClient(token); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	richMenus, err := messagingApiClient.GetRichMenuList()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"richmenus": richMenus.Richmenus})
}

func getRichMenu(c *gin.Context) {
	token := getChannelAccessToken(c)
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing or invalid authorization header"})
		return
	}

	if err := initClient(token); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	richMenuID := c.Param("id")
	richMenu, err := messagingApiClient.GetRichMenu(richMenuID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, richMenu)
}

func createRichMenu(c *gin.Context) {
	token := getChannelAccessToken(c)
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing or invalid authorization header"})
		return
	}

	if err := initClient(token); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Read raw body to provide better error messages when JSON is invalid
	bodyBytes, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
		return
	}
	if len(bodyBytes) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Empty request body"})
		return
	}

	// First unmarshal into a generic map so we can normalize numeric fields
	var raw map[string]interface{}
	if err := json.Unmarshal(bodyBytes, &raw); err != nil {
		// Log raw body for easier debugging
		log.Printf("createRichMenu: invalid JSON when decoding to map: %v\nBody: %s\n", err, string(bodyBytes))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON: " + err.Error(), "body": string(bodyBytes)})
		return
	}

	// Normalize numeric fields that may arrive as floats (from frontend) into integers
	normalizeRichMenuNumbers(raw)

	normalizedBytes, err := json.Marshal(raw)
	if err != nil {
		log.Printf("createRichMenu: failed to re-marshal normalized body: %v\nBody: %s\n", err, string(bodyBytes))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to normalize request body"})
		return
	}

	var richMenuRequest messaging_api.RichMenuRequest
	if err := json.Unmarshal(normalizedBytes, &richMenuRequest); err != nil {
		log.Printf("createRichMenu: invalid JSON after normalization: %v\nBody: %s\n", err, string(normalizedBytes))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON after normalization: " + err.Error(), "body": string(normalizedBytes)})
		return
	}

	result, err := messagingApiClient.CreateRichMenu(&richMenuRequest)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"richMenuId": result.RichMenuId})
}

func deleteRichMenu(c *gin.Context) {
	token := getChannelAccessToken(c)
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing or invalid authorization header"})
		return
	}

	if err := initClient(token); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	richMenuID := c.Param("id")
	_, err := messagingApiClient.DeleteRichMenu(richMenuID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func uploadRichMenuImage(c *gin.Context) {
	token := getChannelAccessToken(c)
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing or invalid authorization header"})
		return
	}

	if err := initClient(token); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	richMenuID := c.Param("id")

	// Handle multipart form data (from form upload)
	file, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No image file provided"})
		return
	}

	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open uploaded file"})
		return
	}
	defer src.Close()

	// Determine content type based on file extension
	var contentType string
	filename := strings.ToLower(file.Filename)
	if strings.HasSuffix(filename, ".jpeg") || strings.HasSuffix(filename, ".jpg") {
		contentType = "image/jpeg"
	} else if strings.HasSuffix(filename, ".png") {
		contentType = "image/png"
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Image file must be jpeg or png"})
		return
	}

	_, err = messagingApiBlobClient.SetRichMenuImage(richMenuID, contentType, src)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func getRichMenuImage(c *gin.Context) {
	token := getChannelAccessToken(c)
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing or invalid authorization header"})
		return
	}

	if err := initClient(token); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	richMenuID := c.Param("id")
	res, err := messagingApiBlobClient.GetRichMenuImage(richMenuID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	defer res.Body.Close()

	// Copy image data to response
	c.Header("Content-Type", "image/jpeg") // Default to jpeg, could be improved
	io.Copy(c.Writer, res.Body)
}

func getUserRichMenu(c *gin.Context) {
	token := getChannelAccessToken(c)
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing or invalid authorization header"})
		return
	}

	if err := initClient(token); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	userID := c.Param("userId")
	richMenuID, err := messagingApiClient.GetRichMenuIdOfUser(userID)
	if err != nil {
		// User has no rich menu
		c.JSON(http.StatusOK, gin.H{})
		return
	}

	c.JSON(http.StatusOK, gin.H{"richMenuId": richMenuID.RichMenuId})
}

func linkUserRichMenu(c *gin.Context) {
	token := getChannelAccessToken(c)
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing or invalid authorization header"})
		return
	}

	if err := initClient(token); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	userID := c.Param("userId")
	richMenuID := c.Param("richMenuId")

	_, err := messagingApiClient.LinkRichMenuIdToUser(userID, richMenuID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func unlinkUserRichMenu(c *gin.Context) {
	token := getChannelAccessToken(c)
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing or invalid authorization header"})
		return
	}

	if err := initClient(token); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	userID := c.Param("userId")
	_, err := messagingApiClient.UnlinkRichMenuIdFromUser(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func setDefaultRichMenu(c *gin.Context) {
	token := getChannelAccessToken(c)
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing or invalid authorization header"})
		return
	}

	if err := initClient(token); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	richMenuID := c.Param("richMenuId")
	_, err := messagingApiClient.SetDefaultRichMenu(richMenuID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func deleteDefaultRichMenu(c *gin.Context) {
	token := getChannelAccessToken(c)
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing or invalid authorization header"})
		return
	}

	if err := initClient(token); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	_, err := messagingApiClient.CancelDefaultRichMenu()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// normalizeRichMenuNumbers walks the decoded JSON map and converts numeric
// fields that should be integers into ints. The frontend may send floats
// (e.g. from a JS layout tool) which would fail unmarshalling into the
// SDK structs that expect integer types.
func normalizeRichMenuNumbers(m map[string]interface{}) {
	// Helper to convert a value to int64 if it's numeric
	toInt := func(v interface{}) interface{} {
		switch n := v.(type) {
		case float64:
			// round to nearest int
			return int64(math.Round(n))
		case float32:
			return int64(math.Round(float64(n)))
		default:
			return v
		}
	}

	// Normalize size.width/height
	if size, ok := m["size"].(map[string]interface{}); ok {
		if w, ok := size["width"]; ok {
			size["width"] = toInt(w)
		}
		if h, ok := size["height"]; ok {
			size["height"] = toInt(h)
		}
	}

	// Normalize areas[*].bounds.{x,y,width,height}
	if areas, ok := m["areas"].([]interface{}); ok {
		for _, a := range areas {
			if areaMap, ok := a.(map[string]interface{}); ok {
				if bounds, ok := areaMap["bounds"].(map[string]interface{}); ok {
					if x, ok := bounds["x"]; ok {
						bounds["x"] = toInt(x)
					}
					if y, ok := bounds["y"]; ok {
						bounds["y"] = toInt(y)
					}
					if w, ok := bounds["width"]; ok {
						bounds["width"] = toInt(w)
					}
					if h, ok := bounds["height"]; ok {
						bounds["height"] = toInt(h)
					}
				}
			}
		}
	}
}
