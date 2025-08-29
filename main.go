package main

import (
	"fmt"
	"os"

	"line-richmenus-manager/internal/handlers"
	"line-richmenus-manager/internal/middleware"

	"github.com/gin-gonic/gin"
)

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
		c.HTML(200, "index.html", nil)
	})

	// 初始化handlers
	richMenuHandler := handlers.NewRichMenuHandler()
	userHandler := handlers.NewUserHandler()

	// Rich Menu API routes (with authentication middleware)
	richMenuGroup := r.Group("/richmenus")
	richMenuGroup.Use(middleware.AuthMiddleware())
	{
		richMenuGroup.GET("", richMenuHandler.GetRichMenus)
		richMenuGroup.GET("/:id", richMenuHandler.GetRichMenu)
		richMenuGroup.PUT("/:id", richMenuHandler.UpdateRichMenu)
		richMenuGroup.POST("", richMenuHandler.CreateRichMenu)
		richMenuGroup.DELETE("/:id", richMenuHandler.DeleteRichMenu)
		richMenuGroup.POST("/:id/content", richMenuHandler.UploadRichMenuImage)
		richMenuGroup.GET("/:id/content", richMenuHandler.GetRichMenuImage)
	}

	// User Rich Menu API routes (with authentication middleware)
	userGroup := r.Group("/users")
	userGroup.Use(middleware.AuthMiddleware())
	{
		userGroup.GET("/:userId/richmenu", userHandler.GetUserRichMenu)
		userGroup.POST("/:userId/richmenu/:richMenuId", userHandler.LinkUserRichMenu)
		userGroup.DELETE("/:userId/richmenu", userHandler.UnlinkUserRichMenu)
	}

	// Default Rich Menu API routes (with authentication middleware)
	defaultGroup := r.Group("/user/all/richmenu")
	defaultGroup.Use(middleware.AuthMiddleware())
	{
		defaultGroup.POST("/:richMenuId", userHandler.SetDefaultRichMenu)
		defaultGroup.DELETE("", userHandler.DeleteDefaultRichMenu)
	}

	fmt.Printf("listening on *:%s\n", port)
	r.Run(":" + port)
}
