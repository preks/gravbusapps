# Load Catalogs Function

## Function Overview

**Name:** `loadCatalogs`  
**Description:** Loads one or more catalogs with their entries from the catalog service  
**Agent Enabled:** Yes  
**Workflow Enabled:** Yes

## Function Details

### 1. Input Schema

```json
{
  "type": "object",
  "required": ["catalogs"],
  "properties": {
    "catalogs": {
      "type": "array",
      "description": "Array of catalog specifications to load",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["identifier"],
        "properties": {
          "identifier": {
            "type": "string",
            "description": "Catalog identifier (e.g., 'Country', 'Currency', 'TaskStatus')"
          },
          "version": {
            "type": "string",
            "description": "Catalog version (default: 'v1')",
            "default": "v1"
          },
          "includeEntries": {
            "type": "boolean",
            "description": "Whether to include catalog entries (default: true)",
            "default": true
          },
          "entriesLimit": {
            "type": "integer",
            "description": "Maximum number of entries to fetch per catalog (default: 100, max: 1000)",
            "minimum": 1,
            "maximum": 1000,
            "default": 100
          },
          "entriesOffset": {
            "type": "integer",
            "description": "Offset for pagination of entries (default: 0)",
            "minimum": 0,
            "default": 0
          },
          "entriesSearch": {
            "type": "string",
            "description": "Search term to filter entries within this catalog"
          },
          "entriesParentId": {
            "type": "string",
            "description": "Filter entries by parent entry ID"
          },
          "includeChildEntries": {
            "type": "boolean",
            "description": "Include child catalog entries (default: false)",
            "default": false
          }
        }
      }
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
      "description": "Whether the operation was successful"
    },
    "catalogs": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "identifier": {
            "type": "string",
            "description": "Catalog identifier"
          },
          "version": {
            "type": "string",
            "description": "Catalog version"
          },
          "id": {
            "type": "string",
            "description": "Catalog ID (UUID)"
          },
          "name": {
            "type": "string",
            "description": "Catalog name"
          },
          "description": {
            "type": "string",
            "description": "Catalog description"
          },
          "totalEntries": {
            "type": "integer",
            "description": "Total number of entries in the catalog"
          },
          "entries": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string",
                  "description": "Entry ID"
                },
                "code": {
                  "type": "string",
                  "description": "Entry code"
                },
                "value": {
                  "type": "string",
                  "description": "Entry value (display name)"
                },
                "alternativeCode": {
                  "type": "string",
                  "description": "Alternative code"
                },
                "description": {
                  "type": "string",
                  "description": "Entry description"
                },
                "type": {
                  "type": "string",
                  "description": "Entry type"
                },
                "displayOrder": {
                  "type": "integer",
                  "description": "Display order"
                },
                "additionalValue1": {
                  "type": "string"
                },
                "additionalValue2": {
                  "type": "string"
                },
                "additionalValue3": {
                  "type": "string"
                },
                "parentEntryId": {
                  "type": "string",
                  "description": "Parent entry ID if hierarchical"
                },
                "children": {
                  "type": "array",
                  "description": "Child entries (if includeChildEntries was true)",
                  "items": {
                    "type": "object"
                  }
                }
              },
              "required": ["id", "code", "value", "type"]
            }
          },
          "error": {
            "type": "string",
            "description": "Error message if this catalog failed to load"
          }
        },
        "required": ["identifier", "version"]
      }
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "identifier": {
            "type": "string"
          },
          "version": {
            "type": "string"
          },
          "error": {
            "type": "string"
          }
        }
      }
    }
  },
  "required": ["success", "catalogs"]
}
```

### 3. Source Code

```javascript
module.exports.handler = async event => {
  const { catalogs } = event

  // Validate input
  if (!catalogs || !Array.isArray(catalogs) || catalogs.length === 0) {
    return {
      success: false,
      catalogs: [],
      errors: [{ error: 'catalogs array is required and must contain at least one catalog specification' }]
    }
  }

  // Get access token from context (provided by function runtime)
  const accessToken = context?.accessToken || context?.config?.ACCESS_TOKEN || ''

  if (!accessToken) {
    return {
      success: false,
      catalogs: [],
      errors: [{ error: 'Access token is required. Ensure ACCESS_TOKEN is configured in function settings.' }]
    }
  }

  // Get catalog API base URL from environment variable
  // NEXT_PUBLIC_CATALOG_API should be set to: ${NEXT_PUBLIC_BASE_URL}/catalog-manager
  const catalogApiBaseUrl = process.env.NEXT_PUBLIC_CATALOG_API

  if (!catalogApiBaseUrl) {
    return {
      success: false,
      catalogs: [],
      errors: [
        {
          error:
            'NEXT_PUBLIC_CATALOG_API environment variable is required. Expected format: ${NEXT_PUBLIC_BASE_URL}/catalog-manager'
        }
      ]
    }
  }

  // Construct full API URL with /api/v1/ path
  // NEXT_PUBLIC_CATALOG_API already contains the base path, we just need to add /api/v1
  const apiBaseUrl = catalogApiBaseUrl.endsWith('/') ? catalogApiBaseUrl + 'api/v1' : catalogApiBaseUrl + '/api/v1'

  const results = []
  const errors = []

  // Fetch all catalogs in parallel
  const fetchPromises = catalogs.map(async catalogSpec => {
    const {
      identifier,
      version = 'v1',
      includeEntries = true,
      entriesLimit = 100,
      entriesOffset = 0,
      entriesSearch,
      entriesParentId,
      includeChildEntries = false
    } = catalogSpec

    try {
      // Build query parameters for entries
      const queryParams = new URLSearchParams()

      if (includeEntries) {
        queryParams.set('limit', String(Math.min(entriesLimit, 1000)))
        queryParams.set('offset', String(entriesOffset))
        queryParams.set('returnTotalRecords', 'true')

        if (entriesSearch) {
          queryParams.set('searchCriteria', entriesSearch)
        }

        if (entriesParentId) {
          queryParams.set('parentEntryId', entriesParentId)
        }

        if (includeChildEntries) {
          queryParams.set('includeChildCatalogEntries', 'true')
        }
      } else {
        // If not including entries, set limit to 0
        queryParams.set('limit', '0')
        queryParams.set('returnTotalRecords', 'true')
      }

      // Fetch catalog entries
      const entriesUrl = `${apiBaseUrl}/catalogs/${encodeURIComponent(identifier)}/${encodeURIComponent(version)}/entries?${queryParams.toString()}`

      const entriesResponse = await fetch(entriesUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!entriesResponse.ok) {
        const errorText = await entriesResponse.text()
        throw new Error(
          `Failed to fetch catalog entries: ${entriesResponse.status} ${entriesResponse.statusText}. ${errorText}`
        )
      }

      const entriesData = await entriesResponse.json()

      // Fetch catalog metadata (optional - can be derived from entries response)
      // For now, we'll extract what we can from the entries response
      // If needed, we can make a separate call to /catalogs endpoint

      const catalogResult = {
        identifier,
        version,
        id: entriesData.data?.[0]?.catalog?.id || null,
        name: entriesData.data?.[0]?.catalog?.name || identifier,
        description: entriesData.data?.[0]?.catalog?.description || null,
        totalEntries: entriesData.paging?.totalRecords || entriesData.data?.length || 0,
        entries: includeEntries
          ? (entriesData.data || []).map(entry => ({
              id: entry.id,
              code: entry.code,
              value: entry.value,
              alternativeCode: entry.alternativeCode,
              description: entry.description,
              type: entry.type,
              displayOrder: entry.displayOrder,
              additionalValue1: entry.additionalValue1,
              additionalValue2: entry.additionalValue2,
              additionalValue3: entry.additionalValue3,
              parentEntryId: entry.parentEntryId,
              children: includeChildEntries ? entry.children || [] : undefined
            }))
          : []
      }

      return catalogResult
    } catch (error) {
      errors.push({
        identifier,
        version,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })

      return {
        identifier,
        version,
        id: null,
        name: identifier,
        description: null,
        totalEntries: 0,
        entries: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  })

  // Wait for all catalog fetches to complete
  const catalogResults = await Promise.all(fetchPromises)

  return {
    success: errors.length === 0,
    catalogs: catalogResults,
    errors: errors.length > 0 ? errors : undefined
  }
}
```

### 4. Configuration Settings

**Required Config Keys:**

- `ACCESS_TOKEN` (optional if provided via context)
  - Description: Access token for catalog API authentication
  - Note: Usually provided automatically by the function runtime context

**Environment Variables:**

- `NEXT_PUBLIC_CATALOG_API` (required)
  - Description: Catalog API base URL
  - Format: `${NEXT_PUBLIC_BASE_URL}/catalog-manager`
  - Example: `https://newwork-dev.newwork.com/catalog-manager`
  - Note: The function will automatically append `/api/v1` to this URL

### 5. Usage Examples

**Important:** The `catalogs` property must be an **array**, not a string. When using these examples in the function editor, ensure `catalogs` is set as an array value, not a JSON string.

#### Example 1: Load Single Catalog with Entries

**Input Object Structure:**

```javascript
{
  catalogs: [
    {
      identifier: 'Country',
      version: 'v1',
      includeEntries: true,
      entriesLimit: 50
    }
  ]
}
```

**JSON Format (for reference):**

```json
{
  "catalogs": [
    {
      "identifier": "Country",
      "version": "v1",
      "includeEntries": true,
      "entriesLimit": 50
    }
  ]
}
```

#### Example 2: Load Multiple Catalogs

**Input Object Structure:**

```javascript
{
  catalogs: [
    {
      identifier: 'Country',
      version: 'v1',
      includeEntries: true,
      entriesLimit: 100
    },
    {
      identifier: 'Currency',
      version: 'v1',
      includeEntries: true,
      entriesLimit: 50
    },
    {
      identifier: 'TaskStatus',
      version: 'v1',
      includeEntries: true,
      entriesLimit: 20
    }
  ]
}
```

#### Example 3: Load Catalogs with Search and Filters

**Input Object Structure:**

```javascript
{
  catalogs: [
    {
      identifier: 'Country',
      version: 'v1',
      includeEntries: true,
      entriesSearch: 'Germany',
      entriesLimit: 10
    },
    {
      identifier: 'TaskStatus',
      version: 'v1',
      includeEntries: true,
      entriesParentId: 'some-parent-id',
      includeChildEntries: true
    }
  ]
}
```

#### Example 4: Load Catalog Metadata Only (No Entries)

**Input Object Structure:**

```javascript
{
  catalogs: [
    {
      identifier: 'Country',
      version: 'v1',
      includeEntries: false
    }
  ]
}
```

### 6. Expected Response Example

```json
{
  "success": true,
  "catalogs": [
    {
      "identifier": "Country",
      "version": "v1",
      "id": "uuid-here",
      "name": "Country",
      "description": "List of countries",
      "totalEntries": 195,
      "entries": [
        {
          "id": "entry-uuid-1",
          "code": "DE",
          "value": "Germany",
          "alternativeCode": "DEU",
          "description": "Federal Republic of Germany",
          "type": "country",
          "displayOrder": 1,
          "additionalValue1": null,
          "additionalValue2": null,
          "additionalValue3": null,
          "parentEntryId": null
        }
      ]
    },
    {
      "identifier": "Currency",
      "version": "v1",
      "id": "uuid-here-2",
      "name": "Currency",
      "description": "List of currencies",
      "totalEntries": 180,
      "entries": [
        {
          "id": "entry-uuid-2",
          "code": "EUR",
          "value": "Euro",
          "type": "currency",
          "displayOrder": 1,
          "parentEntryId": null
        }
      ]
    }
  ]
}
```

### 7. Error Handling

The function handles:

- Missing or invalid catalogs array
- Missing access token
- Individual catalog fetch failures (continues with others)
- Invalid catalog identifiers
- Network errors
- API rate limits

**Partial Success:** If some catalogs fail, the function still returns successful catalogs and lists errors separately.

### 8. Performance Notes

- **Parallel Fetching:** All catalogs are fetched in parallel using `Promise.all`
- **Efficient:** Single API call per catalog
- **Scalable:** Can handle multiple catalogs efficiently
- **Pagination:** Supports pagination for large catalogs

### 9. Integration Notes

- Can be used in workflows to load catalog data for dropdowns/selects
- Can be used by AI agents to access catalog information
- Supports hierarchical catalogs with parent/child relationships
- Returns structured data ready for UI components
- Handles partial failures gracefully

This function enables loading multiple catalogs in a single function call, which is useful for workflows and AI agents that need catalog data.
