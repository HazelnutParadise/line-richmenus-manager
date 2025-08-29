package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"

	"line-richmenus-manager/internal/middleware"
	"line-richmenus-manager/internal/services"
	"line-richmenus-manager/internal/utils"

	"github.com/gin-gonic/gin"
)

type RichMenuHandler struct {
	lineService *services.LineService
}

func NewRichMenuHandler() *RichMenuHandler {
	return &RichMenuHandler{}
}

// Initialize service with token from context
func (h *RichMenuHandler) initService(c *gin.Context) error {
	token := middleware.GetChannelAccessToken(c)
	if token == "" {
		return fmt.Errorf("missing channel access token")
	}

	service, err := services.NewLineService(token)
	if err != nil {
		return err
	}
	h.lineService = service
	return nil
}

func (h *RichMenuHandler) GetRichMenus(c *gin.Context) {
	if err := h.initService(c); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	richMenus, err := h.lineService.GetRichMenus()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"richmenus": richMenus.Richmenus})
}

func (h *RichMenuHandler) GetRichMenu(c *gin.Context) {
	if err := h.initService(c); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	richMenuID := c.Param("id")
	richMenu, err := h.lineService.GetRichMenu(richMenuID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, richMenu)
}

func (h *RichMenuHandler) CreateRichMenu(c *gin.Context) {
	if err := h.initService(c); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Read raw body to provide better error messages when JSON is invalid
	bodyBytes, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
		return
	}

	richMenuRequest, err := services.ParseRichMenuRequest(bodyBytes)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "body": string(bodyBytes)})
		return
	}

	result, err := h.lineService.CreateRichMenu(richMenuRequest)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"richMenuId": result.RichMenuId})
}

func (h *RichMenuHandler) UpdateRichMenu(c *gin.Context) {
	if err := h.initService(c); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	richMenuID := c.Param("id")

	// Read raw body
	bodyBytes, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
		return
	}

	richMenuRequest, err := services.ParseRichMenuRequest(bodyBytes)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error(), "body": string(bodyBytes)})
		return
	}

	// Check deleteOld flag from raw map
	var raw map[string]interface{}
	json.Unmarshal(bodyBytes, &raw)
	deleteOld := false
	if v, ok := raw["deleteOld"]; ok {
		if b, ok := v.(bool); ok && b {
			deleteOld = true
		}
	}

	// Create new rich menu
	result, err := h.lineService.CreateRichMenu(richMenuRequest)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// If deleteOld is true, delete the old rich menu after creating the new one.
	if deleteOld {
		if err := h.lineService.DeleteRichMenu(richMenuID); err != nil {
			log.Printf("UpdateRichMenu: failed to delete old rich menu %s: %v", richMenuID, err)
		}
	}

	c.JSON(http.StatusOK, gin.H{"richMenuId": result.RichMenuId, "oldRichMenuId": richMenuID})
}

func (h *RichMenuHandler) DeleteRichMenu(c *gin.Context) {

	richMenuID := c.Param("id")
	err := h.lineService.DeleteRichMenu(richMenuID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *RichMenuHandler) UploadRichMenuImage(c *gin.Context) {
	if err := h.initService(c); err != nil {
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
	contentType, err := utils.ValidateImageFile(file.Filename)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = h.lineService.SetRichMenuImage(richMenuID, contentType, src)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *RichMenuHandler) GetRichMenuImage(c *gin.Context) {
	if err := h.initService(c); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	richMenuID := c.Param("id")
	imageReader, err := h.lineService.GetRichMenuImage(richMenuID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	defer imageReader.Close()

	// Copy image data to response
	c.Header("Content-Type", "image/jpeg") // Default to jpeg, could be improved
	io.Copy(c.Writer, imageReader)
}
