package handlers

import (
	"fmt"
	"net/http"

	"line-richmenus-manager/internal/middleware"
	"line-richmenus-manager/internal/services"

	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	lineService *services.LineService
}

func NewUserHandler() *UserHandler {
	return &UserHandler{}
}

// Initialize service with token from context
func (h *UserHandler) initService(c *gin.Context) error {
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

func (h *UserHandler) GetUserRichMenu(c *gin.Context) {
	if err := h.initService(c); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	userID := c.Param("userId")
	richMenuID, err := h.lineService.GetRichMenuIdOfUser(userID)
	if err != nil {
		// User has no rich menu
		c.JSON(http.StatusOK, gin.H{})
		return
	}

	c.JSON(http.StatusOK, gin.H{"richMenuId": richMenuID.RichMenuId})
}

func (h *UserHandler) LinkUserRichMenu(c *gin.Context) {
	if err := h.initService(c); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	userID := c.Param("userId")
	richMenuID := c.Param("richMenuId")

	err := h.lineService.LinkRichMenuIdToUser(userID, richMenuID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *UserHandler) UnlinkUserRichMenu(c *gin.Context) {
	if err := h.initService(c); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	userID := c.Param("userId")
	err := h.lineService.UnlinkRichMenuIdFromUser(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *UserHandler) SetDefaultRichMenu(c *gin.Context) {
	if err := h.initService(c); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	richMenuID := c.Param("richMenuId")
	err := h.lineService.SetDefaultRichMenu(richMenuID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *UserHandler) DeleteDefaultRichMenu(c *gin.Context) {
	if err := h.initService(c); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	err := h.lineService.CancelDefaultRichMenu()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}
