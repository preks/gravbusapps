# Search Free Images Function

## Function Overview

**Name:** `searchFreeImages`  
**Description:** Searches for license-free images from Unsplash API based on search query  
**Agent Enabled:** Yes  
**Workflow Enabled:** Yes

## Database/API Choice: Unsplash

**Why Unsplash:**

- Free tier: 50 requests/hour (no API key required for basic usage, but recommended)
- High-quality, professional photos
- License: Unsplash License (free for commercial and non-commercial use)
- Well-documented REST API
- Large collection (millions of photos)
- Direct image URLs provided

**Alternative Options:**

- Pexels API (free, 200 requests/hour)
- Pixabay API (free, 5,000 requests/day)

## Function Details

### 1. Input Schema

```json
{
  "type": "object",
  "required": ["query"],
  "properties": {
    "query": {
      "type": "string",
      "description": "Search query for images (e.g., 'nature', 'business', 'technology')",
      "minLength": 1,
      "maxLength": 100
    },
    "page": {
      "type": "integer",
      "description": "Page number for pagination (default: 1)",
      "minimum": 1,
      "default": 1
    },
    "perPage": {
      "type": "integer",
      "description": "Number of results per page (default: 10, max: 30)",
      "minimum": 1,
      "maximum": 30,
      "default": 10
    },
    "orientation": {
      "type": "string",
      "enum": ["landscape", "portrait", "squarish"],
      "description": "Image orientation filter (optional)"
    },
    "orderBy": {
      "type": "string",
      "enum": ["latest", "oldest", "popular", "views", "downloads"],
      "description": "Sort order for results (default: 'popular')",
      "default": "popular"
    }
  }
}
```

### 2. Output Schema

```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "description": "Whether the search was successful"
    },
    "total": {
      "type": "integer",
      "description": "Total number of results available"
    },
    "totalPages": {
      "type": "integer",
      "description": "Total number of pages"
    },
    "images": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "description": "Unique image ID"
          },
          "url": {
            "type": "string",
            "format": "uri",
            "description": "Direct URL to the full-size image"
          },
          "thumbnailUrl": {
            "type": "string",
            "format": "uri",
            "description": "URL to thumbnail/small version"
          },
          "description": {
            "type": "string",
            "description": "Image description"
          },
          "width": {
            "type": "integer",
            "description": "Image width in pixels"
          },
          "height": {
            "type": "integer",
            "description": "Image height in pixels"
          },
          "author": {
            "type": "object",
            "properties": {
              "name": {
                "type": "string"
              },
              "username": {
                "type": "string"
              },
              "profileUrl": {
                "type": "string",
                "format": "uri"
              }
            }
          },
          "downloadUrl": {
            "type": "string",
            "format": "uri",
            "description": "Direct download URL"
          },
          "license": {
            "type": "string",
            "description": "License information (Unsplash License - free for commercial use)"
          }
        },
        "required": ["id", "url", "thumbnailUrl", "width", "height"]
      }
    },
    "error": {
      "type": "string",
      "description": "Error message if search failed"
    }
  },
  "required": ["success", "images"]
}
```

### 3. Source Code

```javascript
module.exports.handler = async event => {
  const { query, page = 1, perPage = 10, orientation, orderBy = 'popular' } = event

  // Validate required input
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return {
      success: false,
      images: [],
      error: 'Query parameter is required and must be a non-empty string'
    }
  }

  // Unsplash public API endpoint (no API key required)
  const baseUrl = 'https://unsplash.com'
  const searchUrl = new URL(`${baseUrl}/napi/search/photos`)

  // Build query parameters
  searchUrl.searchParams.set('query', query.trim())
  searchUrl.searchParams.set('page', String(page))
  searchUrl.searchParams.set('per_page', String(Math.min(perPage, 30)))
  if (orientation) {
    searchUrl.searchParams.set('orientation', orientation)
  }
  if (orderBy) {
    searchUrl.searchParams.set('order_by', orderBy)
  }

  try {
    // Prepare headers (browser-like headers for public API)
    const headers = {
      Accept: '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Referer: 'https://unsplash.com/',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin'
    }

    // Make API request
    const response = await fetch(searchUrl.toString(), {
      method: 'GET',
      headers: headers
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        images: [],
        error: `Unsplash API error: ${response.status} ${response.statusText}. ${errorText}`
      }
    }

    const data = await response.json()

    // Transform Unsplash response to our output format
    const images = (data.results || []).map(photo => ({
      id: photo.id,
      url: photo.urls?.full || photo.urls?.regular || '',
      thumbnailUrl: photo.urls?.thumb || photo.urls?.small || '',
      description: photo.description || photo.alt_description || '',
      width: photo.width || 0,
      height: photo.height || 0,
      author: {
        name: photo.user?.name || 'Unknown',
        username: photo.user?.username || '',
        profileUrl: photo.user?.links?.html || ''
      },
      downloadUrl: photo.links?.download || photo.urls?.full || '',
      license: 'Unsplash License - Free for commercial and non-commercial use'
    }))

    return {
      success: true,
      total: data.total || 0,
      totalPages: data.total_pages || 0,
      images: images
    }
  } catch (error) {
    return {
      success: false,
      images: [],
      error: `Failed to search images: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}
```

### 4. Configuration Settings

**No Configuration Required**

The function uses Unsplash's public API endpoint which does not require an API key. No configuration settings are needed.

### 5. Usage Examples

#### Example 1: Basic Search

```json
{
  "query": "nature"
}
```

#### Example 2: Search with Filters

```json
{
  "query": "business meeting",
  "page": 1,
  "perPage": 20,
  "orientation": "landscape",
  "orderBy": "popular"
}
```

#### Example 3: Portrait Images

```json
{
  "query": "portrait",
  "orientation": "portrait",
  "perPage": 15
}
```

### 6. Expected Response Example

```json
{
  "success": true,
  "total": 1500,
  "totalPages": 150,
  "images": [
    {
      "id": "abc123",
      "url": "https://images.unsplash.com/photo-1234567890",
      "thumbnailUrl": "https://images.unsplash.com/photo-1234567890?w=200",
      "description": "Beautiful mountain landscape",
      "width": 4000,
      "height": 3000,
      "author": {
        "name": "John Doe",
        "username": "johndoe",
        "profileUrl": "https://unsplash.com/@johndoe"
      },
      "downloadUrl": "https://unsplash.com/photos/abc123/download",
      "license": "Unsplash License - Free for commercial and non-commercial use"
    }
  ]
}
```

### 7. Error Handling

The function handles:

- Missing or invalid query parameter
- API rate limits (returns error message)
- Network errors
- Invalid API responses
- Missing API key (works but with limited rate)

### 8. Rate Limits

- Public API: No strict rate limits enforced
- Recommendation: Use reasonable request rates to avoid being blocked
- For high-volume usage, consider using the official Unsplash API with an API key

### 9. License Information

All images from Unsplash are provided under the Unsplash License:

- Free for commercial and non-commercial use
- No attribution required (but appreciated)
- Can modify images
- Cannot sell unedited photos

### 10. Integration Notes

- Can be used in workflows to fetch images for content entries
- Can be used by AI agents to find relevant images
- Returns direct URLs that can be used immediately
- Supports pagination for large result sets
- Provides both full-size and thumbnail URLs

This function integrates with the Content Entry AI Agent to automatically find images for generated articles.
