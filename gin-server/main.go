package main

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/line/line-bot-sdk-go/linebot"
)

func main() {
	channelToken := os.Getenv("LINE_CHANNEL_ACCESS_TOKEN")
	if channelToken == "" {
		panic("LINE_CHANNEL_ACCESS_TOKEN not set")
	}

	secret := os.Getenv("LINE_CHANNEL_SECRET")
	if secret == "" {
		panic("LINE_CHANNEL_SECRET not set")
	}

	bot, err := linebot.New(secret, channelToken)
	if err != nil {
		panic(err)
	}

	r := gin.Default()
	r.Static("/static", "./static")
	r.LoadHTMLFiles("static/index.html")

	r.GET("/", func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.html", nil)
	})

	api := r.Group("/api")
	{
		api.GET("/richmenus", func(c *gin.Context) {
			res, err := bot.GetRichMenuList().Do()
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, res)
		})

		api.GET("/richmenus/:id", func(c *gin.Context) {
			id := c.Param("id")
			rm, err := bot.GetRichMenu(id).Do()
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, rm)
		})

		api.POST("/richmenus", func(c *gin.Context) {
			var req linebot.RichMenu
			if err := c.BindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			idRes, err := bot.CreateRichMenu(req).Do()
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"richMenuId": idRes.RichMenuID})
		})

		api.DELETE("/richmenus/:id", func(c *gin.Context) {
			id := c.Param("id")
			if _, err := bot.DeleteRichMenu(id).Do(); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.Status(http.StatusNoContent)
		})

		api.GET("/users/:uid/richmenu", func(c *gin.Context) {
			uid := c.Param("uid")
			rm, err := bot.GetUserRichMenu(uid).Do()
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"richMenuId": rm.RichMenuID})
		})

		api.POST("/users/:uid/richmenu/:rid", func(c *gin.Context) {
			uid := c.Param("uid")
			rid := c.Param("rid")
			if _, err := bot.LinkUserRichMenu(uid, rid).Do(); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.Status(http.StatusNoContent)
		})

		api.DELETE("/users/:uid/richmenu", func(c *gin.Context) {
			uid := c.Param("uid")
			if _, err := bot.UnlinkUserRichMenu(uid).Do(); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.Status(http.StatusNoContent)
		})
	}

	r.Run()
}
