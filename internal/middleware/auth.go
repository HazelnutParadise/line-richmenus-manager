package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware extracts the channel access token from the Authorization header
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.GetHeader("Authorization")
		if token == "" || !strings.HasPrefix(token, "Bearer ") {
			c.JSON(401, gin.H{"error": "Missing or invalid authorization header"})
			c.Abort()
			return
		}

		// Extract token without "Bearer " prefix
		channelAccessToken := strings.TrimPrefix(token, "Bearer ")

		// Store token in context for later use
		c.Set("channelAccessToken", channelAccessToken)
		c.Next()
	}
}

// GetChannelAccessToken retrieves the channel access token from the context
func GetChannelAccessToken(c *gin.Context) string {
	if token, exists := c.Get("channelAccessToken"); exists {
		return token.(string)
	}
	return ""
}
