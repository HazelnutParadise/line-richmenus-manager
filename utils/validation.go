package utils

import (
	"fmt"
	"strings"
)

// ValidateImageFile validates the uploaded image file type
func ValidateImageFile(filename string) (string, error) {
	filename = strings.ToLower(filename)
	if strings.HasSuffix(filename, ".jpeg") || strings.HasSuffix(filename, ".jpg") {
		return "image/jpeg", nil
	} else if strings.HasSuffix(filename, ".png") {
		return "image/png", nil
	} else {
		return "", fmt.Errorf("image file must be jpeg or png")
	}
}
