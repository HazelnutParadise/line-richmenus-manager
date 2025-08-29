package services

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"strings"

	"github.com/line/line-bot-sdk-go/v8/linebot/messaging_api"
)

type LineService struct {
	messagingApiClient     *messaging_api.MessagingApiAPI
	messagingApiBlobClient *messaging_api.MessagingApiBlobAPI
}

func NewLineService(channelAccessToken string) (*LineService, error) {
	messagingApiClient, err := messaging_api.NewMessagingApiAPI(channelAccessToken)
	if err != nil {
		return nil, err
	}

	messagingApiBlobClient, err := messaging_api.NewMessagingApiBlobAPI(channelAccessToken)
	if err != nil {
		return nil, err
	}

	return &LineService{
		messagingApiClient:     messagingApiClient,
		messagingApiBlobClient: messagingApiBlobClient,
	}, nil
}

func (s *LineService) GetRichMenus() (*messaging_api.RichMenuListResponse, error) {
	return s.messagingApiClient.GetRichMenuList()
}

func (s *LineService) GetRichMenu(richMenuID string) (*messaging_api.RichMenuResponse, error) {
	return s.messagingApiClient.GetRichMenu(richMenuID)
}

func (s *LineService) CreateRichMenu(richMenuRequest *messaging_api.RichMenuRequest) (*messaging_api.RichMenuIdResponse, error) {
	return s.messagingApiClient.CreateRichMenu(richMenuRequest)
}

func (s *LineService) DeleteRichMenu(richMenuID string) error {
	_, err := s.messagingApiClient.DeleteRichMenu(richMenuID)
	return err
}

func (s *LineService) SetRichMenuImage(richMenuID, contentType string, imageData io.Reader) error {
	_, err := s.messagingApiBlobClient.SetRichMenuImage(richMenuID, contentType, imageData)
	return err
}

func (s *LineService) GetRichMenuImage(richMenuID string) (io.ReadCloser, error) {
	res, err := s.messagingApiBlobClient.GetRichMenuImage(richMenuID)
	if err != nil {
		return nil, err
	}
	return res.Body, nil
}

func (s *LineService) GetRichMenuIdOfUser(userID string) (*messaging_api.RichMenuIdResponse, error) {
	return s.messagingApiClient.GetRichMenuIdOfUser(userID)
}

func (s *LineService) LinkRichMenuIdToUser(userID, richMenuID string) error {
	_, err := s.messagingApiClient.LinkRichMenuIdToUser(userID, richMenuID)
	return err
}

func (s *LineService) UnlinkRichMenuIdFromUser(userID string) error {
	_, err := s.messagingApiClient.UnlinkRichMenuIdFromUser(userID)
	return err
}

func (s *LineService) SetDefaultRichMenu(richMenuID string) error {
	_, err := s.messagingApiClient.SetDefaultRichMenu(richMenuID)
	return err
}

func (s *LineService) CancelDefaultRichMenu() error {
	_, err := s.messagingApiClient.CancelDefaultRichMenu()
	return err
}

// NormalizeRichMenuNumbers walks the decoded JSON map and converts numeric
// fields that should be integers into ints. The frontend may send floats
// (e.g. from a JS layout tool) which would fail unmarshalling into the
// SDK structs that expect integer types.
func NormalizeRichMenuNumbers(m map[string]interface{}) {
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

// ValidateImageFile validates the uploaded image file
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

// ParseRichMenuRequest parses and validates rich menu request from raw JSON
func ParseRichMenuRequest(bodyBytes []byte) (*messaging_api.RichMenuRequest, error) {
	if len(bodyBytes) == 0 {
		return nil, fmt.Errorf("empty request body")
	}

	// First unmarshal into a generic map so we can normalize numeric fields
	var raw map[string]interface{}
	if err := json.Unmarshal(bodyBytes, &raw); err != nil {
		log.Printf("ParseRichMenuRequest: invalid JSON when decoding to map: %v\nBody: %s\n", err, string(bodyBytes))
		return nil, fmt.Errorf("invalid JSON: %v", err)
	}

	// Normalize numeric fields that may arrive as floats (from frontend) into integers
	NormalizeRichMenuNumbers(raw)

	normalizedBytes, err := json.Marshal(raw)
	if err != nil {
		log.Printf("ParseRichMenuRequest: failed to re-marshal normalized body: %v\nBody: %s\n", err, string(bodyBytes))
		return nil, fmt.Errorf("failed to normalize request body: %v", err)
	}

	var richMenuRequest messaging_api.RichMenuRequest
	if err := json.Unmarshal(normalizedBytes, &richMenuRequest); err != nil {
		log.Printf("ParseRichMenuRequest: invalid JSON after normalization: %v\nBody: %s\n", err, string(normalizedBytes))
		return nil, fmt.Errorf("invalid JSON after normalization: %v", err)
	}

	return &richMenuRequest, nil
}
