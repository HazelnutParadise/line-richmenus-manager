package main

import (
	"fmt"
	"io"
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

	var richMenuRequest messaging_api.RichMenuRequest
	if err := c.ShouldBindJSON(&richMenuRequest); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
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
