# Convert Lead Import Function

## Function Overview

**Name:** `convertLeadImport`  
**Description:** Converts import data using AI-generated field mappings to CustomerLead payload format ready for GraphQL mutations  
**Agent Enabled:** Yes  
**Workflow Enabled:** Yes

## Function Details

### 1. Input Schema

```json
{
  "type": "object",
  "required": ["importData", "fieldMappings"],
  "properties": {
    "importData": {
      "type": "array",
      "description": "Array of raw import objects from CSV/JSON file",
      "items": {
        "type": "object",
        "description": "Raw row object with original field names as keys"
      },
      "minItems": 1
    },
    "fieldMappings": {
      "type": "array",
      "description": "Field mapping configuration from LeadImportAnalyzer agent",
      "items": {
        "type": "object",
        "required": ["sourceField", "targetField", "transformationType"],
        "properties": {
          "sourceField": {
            "type": "string",
            "description": "Original field name from import file"
          },
          "targetField": {
            "type": "string",
            "description": "Target CustomerLead field name"
          },
          "transformationType": {
            "type": "string",
            "enum": ["direct", "catalog", "complex", "composite", "split"],
            "description": "Type of transformation to apply"
          },
          "transformationRule": {
            "type": "string",
            "description": "Transformation rule description (for complex transformations)"
          },
          "catalogIdentifier": {
            "type": "string",
            "description": "Catalog identifier for catalog transformation (e.g., 'Country', 'CompanySize')"
          },
          "compositeSourceFields": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Source fields for composite transformation"
          },
          "splitTargetFields": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Target fields for split transformation"
          }
        }
      }
    },
    "options": {
      "type": "object",
      "properties": {
        "skipInvalidRows": {
          "type": "boolean",
          "description": "Skip rows with validation errors (default: true)",
          "default": true
        },
        "validateEmail": {
          "type": "boolean",
          "description": "Validate email format (default: true)",
          "default": true
        },
        "defaultOwnerEmployeeId": {
          "type": "string",
          "description": "Default owner employee ID for all leads (optional)"
        },
        "defaultLeadStatusRef": {
          "type": "string",
          "description": "Default lead status catalog ID (optional)"
        },
        "defaultLeadSourceRef": {
          "type": "string",
          "description": "Default lead source catalog ID (optional)"
        },
        "trimWhitespace": {
          "type": "boolean",
          "description": "Trim whitespace from string values (default: true)",
          "default": true
        },
        "normalizePhoneNumbers": {
          "type": "boolean",
          "description": "Remove non-numeric characters from phone numbers (default: true)",
          "default": true
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
      "description": "Whether the conversion was successful overall"
    },
    "totalRows": {
      "type": "integer",
      "description": "Total number of rows in import data"
    },
    "processedRows": {
      "type": "integer",
      "description": "Number of rows successfully converted"
    },
    "skippedRows": {
      "type": "integer",
      "description": "Number of rows skipped due to errors"
    },
    "leads": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "lead": {
            "type": "object",
            "description": "CustomerLead payload object ready for GraphQL mutation"
          }
        },
        "required": ["lead"]
      },
      "description": "Array of converted lead payloads ready for import"
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "row": {
            "type": "integer",
            "description": "Row index (0-based) where error occurred"
          },
          "error": {
            "type": "string",
            "description": "Error message describing the issue"
          },
          "errorType": {
            "type": "string",
            "enum": ["validation", "transformation", "required_field", "catalog_mapping"],
            "description": "Type of error that occurred"
          },
          "field": {
            "type": "string",
            "description": "Field name where error occurred (if applicable)"
          },
          "data": {
            "type": "object",
            "description": "Original row data for reference"
          }
        },
        "required": ["row", "error"]
      },
      "description": "Array of errors encountered during conversion"
    },
    "warnings": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "row": {
            "type": "integer",
            "description": "Row index where warning occurred"
          },
          "warning": {
            "type": "string",
            "description": "Warning message"
          },
          "field": {
            "type": "string",
            "description": "Field name related to warning"
          }
        }
      },
      "description": "Non-critical warnings about data quality"
    },
    "statistics": {
      "type": "object",
      "properties": {
        "fieldStatistics": {
          "type": "object",
          "description": "Per-field statistics (populated count, empty count, etc.)",
          "additionalProperties": {
            "type": "object",
            "properties": {
              "populated": {
                "type": "integer"
              },
              "empty": {
                "type": "integer"
              },
              "invalid": {
                "type": "integer"
              }
            }
          }
        },
        "transformationCounts": {
          "type": "object",
          "properties": {
            "direct": {
              "type": "integer"
            },
            "catalog": {
              "type": "integer"
            },
            "complex": {
              "type": "integer"
            },
            "composite": {
              "type": "integer"
            },
            "split": {
              "type": "integer"
            }
          }
        }
      }
    }
  },
  "required": ["success", "totalRows", "processedRows", "skippedRows", "leads", "errors"]
}
```

### 3. Source Code

```javascript
// Helper function: Lookup catalog entry via GraphQL
async function lookupCatalogEntry(catalogIdentifier, searchValue, accessToken) {
  if (!catalogIdentifier || !searchValue || !accessToken) {
    return null
  }

  const graphqlEndpoint = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT
  if (!graphqlEndpoint) {
    console.error('NEXT_PUBLIC_GRAPHQL_ENDPOINT not configured')
    return null
  }

  // Sanitize search value for GraphQL (escape quotes)
  const sanitized = String(searchValue).replace(/"/g, '\\"').trim()

  const query = `
    query {
      CatalogEntry(
        limit: 10
        where: { 
          _and: [
            { isDeleted: { _neq: true } },
            { catalog: { 
              _and: [
                { identifier: { _eq: "${catalogIdentifier}" } },
                { version: { _eq: "v1" } }
              ]
            }},
            {
              _or: [
                { value: { _ilike: "%${sanitized}%" } },
                { code: { _ilike: "%${sanitized}%" } },
                { alternativeCode: { _ilike: "%${sanitized}%" } }
              ]
            }
          ]
        }
        orderBy: [{ value: ASC }]
      ) {
        id
        code
        value
        alternativeCode
      }
    }
  `

  try {
    const response = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    })

    if (!response.ok) {
      console.error(`GraphQL request failed: ${response.status}`)
      return null
    }

    const { data } = await response.json()
    const entries = data?.CatalogEntry || []

    if (entries.length === 0) {
      return null
    }

    // Fuzzy matching strategy:
    // 1. Exact match on value or code
    const exact = entries.find(
      e => e.value === searchValue || e.code === searchValue || e.alternativeCode === searchValue
    )
    if (exact) return exact.id

    // 2. Case-insensitive exact match
    const lowerSearch = searchValue.toLowerCase()
    const caseInsensitive = entries.find(
      e =>
        e.value?.toLowerCase() === lowerSearch ||
        e.code?.toLowerCase() === lowerSearch ||
        e.alternativeCode?.toLowerCase() === lowerSearch
    )
    if (caseInsensitive) return caseInsensitive.id

    // 3. Fallback: first result (partial match via ILIKE)
    return entries[0]?.id || null
  } catch (error) {
    console.error(`Catalog lookup error for ${catalogIdentifier}:`, error.message)
    return null
  }
}

module.exports.handler = async event => {
  const { importData, fieldMappings, options = {} } = event

  // Validate input
  if (!importData || !Array.isArray(importData) || importData.length === 0) {
    return {
      success: false,
      totalRows: 0,
      processedRows: 0,
      skippedRows: 0,
      leads: [],
      errors: [{ row: -1, error: 'importData is required and must be a non-empty array' }]
    }
  }

  if (!fieldMappings || !Array.isArray(fieldMappings)) {
    return {
      success: false,
      totalRows: importData.length,
      processedRows: 0,
      skippedRows: importData.length,
      leads: [],
      errors: [{ row: -1, error: 'fieldMappings is required and must be an array' }]
    }
  }

  // Get access token from context (provided by prompt-manager)
  const accessToken = context?.accessToken || ''
  if (!accessToken) {
    console.warn('No access token provided - catalog lookups will fail')
  }

  // Default options
  const {
    skipInvalidRows = true,
    validateEmail = true,
    defaultOwnerEmployeeId,
    defaultLeadStatusRef,
    defaultLeadSourceRef,
    trimWhitespace = true,
    normalizePhoneNumbers = true
  } = options

  const leads = []
  const errors = []
  const warnings = []
  const fieldStatistics = {}
  const transformationCounts = { direct: 0, catalog: 0, complex: 0, composite: 0, split: 0 }

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  // Helper: Trim whitespace from string
  const trimValue = value => {
    if (!trimWhitespace || typeof value !== 'string') return value
    return value.trim()
  }

  // Helper: Normalize phone number
  const normalizePhone = value => {
    if (!normalizePhoneNumbers || typeof value !== 'string') return value
    // Keep only digits, +, and spaces
    return value.replace(/[^\d+\s]/g, '').trim()
  }

  // Helper: Validate email format
  const isValidEmail = email => {
    if (!email || typeof email !== 'string') return false
    return emailRegex.test(email.trim())
  }

  // Helper: Track field statistics
  const trackFieldStat = (field, status) => {
    if (!fieldStatistics[field]) {
      fieldStatistics[field] = { populated: 0, empty: 0, invalid: 0 }
    }
    fieldStatistics[field][status]++
  }

  // Process each row
  for (let rowIndex = 0; rowIndex < importData.length; rowIndex++) {
    const rawRow = importData[rowIndex]
    const leadData = {}
    const rowErrors = []
    const rowWarnings = []

    try {
      // Process each field mapping
      for (const mapping of fieldMappings) {
        const {
          sourceField,
          targetField,
          transformationType,
          catalogIdentifier,
          compositeSourceFields,
          splitTargetFields,
          transformationRule
        } = mapping

        transformationCounts[transformationType]++

        // DIRECT transformation: simple copy
        if (transformationType === 'direct') {
          let value = rawRow[sourceField]

          if (value !== undefined && value !== null && value !== '') {
            // Apply preprocessing
            if (typeof value === 'string') {
              value = trimValue(value)

              // Special handling for phone fields
              if (targetField === 'phoneNumber' || targetField === 'companyPhone') {
                value = normalizePhone(value)
              }
            }

            leadData[targetField] = value
            trackFieldStat(targetField, 'populated')
          } else {
            trackFieldStat(targetField, 'empty')
          }
        }

        // CATALOG transformation: lookup via GraphQL
        else if (transformationType === 'catalog') {
          const sourceValue = rawRow[sourceField]

          if (sourceValue !== undefined && sourceValue !== null && sourceValue !== '') {
            const trimmedValue = trimValue(String(sourceValue))

            if (catalogIdentifier) {
              // Lookup catalog entry via GraphQL
              const catalogId = await lookupCatalogEntry(catalogIdentifier, trimmedValue, accessToken)

              if (catalogId) {
                leadData[targetField] = catalogId
                trackFieldStat(targetField, 'populated')
              } else {
                // No catalog match found
                trackFieldStat(targetField, 'invalid')
                rowWarnings.push({
                  row: rowIndex,
                  warning: `No catalog match found for value "${trimmedValue}" in field "${sourceField}" (catalog: ${catalogIdentifier})`,
                  field: targetField
                })
              }
            } else {
              rowWarnings.push({
                row: rowIndex,
                warning: `Catalog transformation missing catalogIdentifier for field "${sourceField}"`,
                field: targetField
              })
            }
          } else {
            trackFieldStat(targetField, 'empty')
          }
        }

        // COMPLEX transformation: custom logic
        else if (transformationType === 'complex') {
          // Handle addressLine transformation
          if (targetField === 'addressLine') {
            const sourceValue = rawRow[sourceField]
            if (sourceValue !== undefined && sourceValue !== null && sourceValue !== '') {
              try {
                // Parse address into lines array
                const lines = String(sourceValue)
                  .split(/[,\n]/)
                  .map(line => line.trim())
                  .filter(line => line.length > 0)

                if (lines.length > 0) {
                  leadData[targetField] = JSON.stringify({ lines })
                  trackFieldStat(targetField, 'populated')
                } else {
                  trackFieldStat(targetField, 'empty')
                }
              } catch (err) {
                trackFieldStat(targetField, 'invalid')
                rowErrors.push({
                  row: rowIndex,
                  error: `Failed to parse addressLine: ${err.message}`,
                  errorType: 'transformation',
                  field: targetField
                })
              }
            } else {
              trackFieldStat(targetField, 'empty')
            }
          }
          // Handle date transformations
          else if (targetField.includes('Date') || targetField === 'conversionDate') {
            const sourceValue = rawRow[sourceField]
            if (sourceValue !== undefined && sourceValue !== null && sourceValue !== '') {
              try {
                // Parse date and convert to ISO format
                const date = new Date(sourceValue)
                if (!isNaN(date.getTime())) {
                  leadData[targetField] = date.toISOString().split('T')[0]
                  trackFieldStat(targetField, 'populated')
                } else {
                  trackFieldStat(targetField, 'invalid')
                  rowWarnings.push({
                    row: rowIndex,
                    warning: `Invalid date format in field "${sourceField}": ${sourceValue}`,
                    field: targetField
                  })
                }
              } catch (err) {
                trackFieldStat(targetField, 'invalid')
                rowErrors.push({
                  row: rowIndex,
                  error: `Failed to parse date: ${err.message}`,
                  errorType: 'transformation',
                  field: targetField
                })
              }
            } else {
              trackFieldStat(targetField, 'empty')
            }
          }
        }

        // COMPOSITE transformation: combine multiple source fields into one target
        else if (transformationType === 'composite' && compositeSourceFields) {
          const values = compositeSourceFields
            .map(field => rawRow[field])
            .filter(v => v !== undefined && v !== null && v !== '')
            .map(v => trimValue(String(v)))

          if (values.length > 0) {
            leadData[targetField] = values.join(' ')
            trackFieldStat(targetField, 'populated')
          } else {
            trackFieldStat(targetField, 'empty')
          }
        }

        // SPLIT transformation: split one source field into multiple targets
        else if (transformationType === 'split' && splitTargetFields) {
          const sourceValue = rawRow[sourceField]
          if (sourceValue !== undefined && sourceValue !== null && sourceValue !== '') {
            const trimmedValue = trimValue(String(sourceValue))

            // Split on first space: first part = first target, rest = second target
            const parts = trimmedValue.split(' ')
            if (parts.length > 0 && splitTargetFields[0]) {
              leadData[splitTargetFields[0]] = parts[0]
              trackFieldStat(splitTargetFields[0], 'populated')
            }
            if (parts.length > 1 && splitTargetFields[1]) {
              leadData[splitTargetFields[1]] = parts.slice(1).join(' ')
              trackFieldStat(splitTargetFields[1], 'populated')
            }
          } else {
            splitTargetFields.forEach(field => trackFieldStat(field, 'empty'))
          }
        }
      }

      // Apply default values if provided
      if (defaultOwnerEmployeeId && !leadData.ownerEmployeeId) {
        leadData.ownerEmployeeId = defaultOwnerEmployeeId
      }
      if (defaultLeadStatusRef && !leadData.leadStatusRef) {
        leadData.leadStatusRef = defaultLeadStatusRef
      }
      if (defaultLeadSourceRef && !leadData.leadSourceRef) {
        leadData.leadSourceRef = defaultLeadSourceRef
      }

      // Validate email format if present
      if (validateEmail && leadData.email && !isValidEmail(leadData.email)) {
        rowErrors.push({
          row: rowIndex,
          error: `Invalid email format: ${leadData.email}`,
          errorType: 'validation',
          field: 'email',
          data: rawRow
        })
      }

      // Add warnings to global warnings array
      warnings.push(...rowWarnings)

      // Handle errors
      if (rowErrors.length > 0) {
        errors.push(...rowErrors)
        if (!skipInvalidRows) {
          // Stop processing if skipInvalidRows is false
          break
        }
        // Skip this row
        continue
      }

      // Create lead payload
      leads.push({
        lead: leadData
      })
    } catch (err) {
      errors.push({
        row: rowIndex,
        error: `Unexpected error processing row: ${err.message}`,
        errorType: 'transformation',
        data: rawRow
      })

      if (!skipInvalidRows) {
        break
      }
    }
  }

  return {
    success: errors.filter(e => e.errorType === 'required_field' || e.errorType === 'validation').length === 0,
    totalRows: importData.length,
    processedRows: leads.length,
    skippedRows: importData.length - leads.length,
    leads,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
    statistics: {
      fieldStatistics,
      transformationCounts
    }
  }
}
```

### 4. Configuration Settings

**Environment Variables Required:**

- `NEXT_PUBLIC_GRAPHQL_ENDPOINT`: GraphQL endpoint URL for catalog lookups (e.g., `https://api.newwork.com/graphql`)

**Runtime Context Required:**

- `context.accessToken`: Bearer token provided by prompt-manager service account for GraphQL authentication

The function operates on the input data and field mappings, using GraphQL to dynamically resolve catalog references at runtime.

### 5. Usage Examples

#### Example 1: Basic Conversion with Defaults

```json
{
  "importData": [
    {
      "First Name": "Tomas",
      "Last Name": "Pfister",
      "Email": "tpfister@itris.ch",
      "Company Name": "ITRIS One AG",
      "City": "Spreitenbach",
      "Country": "Switzerland"
    },
    {
      "First Name": "Sebastian",
      "Last Name": "Mader",
      "Email": "",
      "Company Name": "Schwarz Digits",
      "City": "Hamburg",
      "Country": "Germany"
    }
  ],
  "fieldMappings": [
    {
      "sourceField": "First Name",
      "targetField": "firstName",
      "transformationType": "direct"
    },
    {
      "sourceField": "Last Name",
      "targetField": "lastName",
      "transformationType": "direct"
    },
    {
      "sourceField": "Email",
      "targetField": "email",
      "transformationType": "direct"
    },
    {
      "sourceField": "Company Name",
      "targetField": "companyName",
      "transformationType": "direct"
    },
    {
      "sourceField": "City",
      "targetField": "city",
      "transformationType": "direct"
    },
    {
      "sourceField": "Country",
      "targetField": "countryRef",
      "transformationType": "catalog",
      "catalogIdentifier": "Country"
    }
  ],
  "options": {
    "skipInvalidRows": true,
    "defaultOwnerEmployeeId": "employee-123-uuid",
    "defaultLeadStatusRef": "lead-status-new-uuid"
  }
}
```

#### Example 2: Complex Transformations

```json
{
  "importData": [
    {
      "Full Name": "Tomas Pfister",
      "Email": "tpfister@itris.ch",
      "Company Address": "4 Stelleweg, Chur, 7000",
      "Headcount": "670",
      "Mobile": "+41 79 207 49 59"
    }
  ],
  "fieldMappings": [
    {
      "sourceField": "Full Name",
      "targetField": "firstName",
      "transformationType": "split",
      "splitTargetFields": ["firstName", "lastName"]
    },
    {
      "sourceField": "Email",
      "targetField": "email",
      "transformationType": "direct"
    },
    {
      "sourceField": "Company Address",
      "targetField": "addressLine",
      "transformationType": "complex"
    },
    {
      "sourceField": "Headcount",
      "targetField": "numberOfEmployeesRef",
      "transformationType": "catalog",
      "catalogIdentifier": "CompanySize"
    },
    {
      "sourceField": "Mobile",
      "targetField": "phoneNumber",
      "transformationType": "direct"
    }
  ],
  "options": {
    "normalizePhoneNumbers": true,
    "trimWhitespace": true
  }
}
```

#### Example 3: With Validation Errors

```json
{
  "importData": [
    {
      "First Name": "John",
      "Last Name": "",
      "Email": "invalid-email",
      "Company Name": "ACME Corp"
    }
  ],
  "fieldMappings": [
    {
      "sourceField": "First Name",
      "targetField": "firstName",
      "transformationType": "direct"
    },
    {
      "sourceField": "Last Name",
      "targetField": "lastName",
      "transformationType": "direct"
    },
    {
      "sourceField": "Email",
      "targetField": "email",
      "transformationType": "direct"
    },
    {
      "sourceField": "Company Name",
      "targetField": "companyName",
      "transformationType": "direct"
    }
  ],
  "options": {
    "skipInvalidRows": true,
    "validateEmail": true
  }
}
```

### 6. Expected Response Example

```json
{
  "success": true,
  "totalRows": 3,
  "processedRows": 2,
  "skippedRows": 1,
  "leads": [
    {
      "lead": {
        "firstName": "Tomas",
        "lastName": "Pfister",
        "email": "tpfister@itris.ch",
        "companyName": "ITRIS One AG",
        "city": "Spreitenbach",
        "countryRef": "country-ch-uuid",
        "ownerEmployee": "employee-123-uuid",
        "leadStatusRef": "lead-status-new-uuid"
      }
    },
    {
      "lead": {
        "firstName": "Sebastian",
        "lastName": "Mader",
        "email": "sebastian@example.com",
        "companyName": "Schwarz Digits",
        "city": "Hamburg",
        "countryRef": "country-de-uuid",
        "ownerEmployee": "employee-123-uuid",
        "leadStatusRef": "lead-status-new-uuid"
      }
    }
  ],
  "errors": [
    {
      "row": 1,
      "error": "Missing required fields: email",
      "errorType": "required_field",
      "data": {
        "First Name": "Sebastian",
        "Last Name": "Mader",
        "Email": "",
        "Company Name": "Schwarz Digits"
      }
    }
  ],
  "warnings": [
    {
      "row": 2,
      "warning": "No catalog match found for value \"Unknown Country\" in field \"Country\"",
      "field": "countryRef"
    }
  ],
  "statistics": {
    "fieldStatistics": {
      "firstName": { "populated": 3, "empty": 0, "invalid": 0 },
      "lastName": { "populated": 3, "empty": 0, "invalid": 0 },
      "email": { "populated": 2, "empty": 1, "invalid": 0 },
      "companyName": { "populated": 3, "empty": 0, "invalid": 0 },
      "city": { "populated": 3, "empty": 0, "invalid": 0 },
      "countryRef": { "populated": 2, "empty": 0, "invalid": 1 }
    },
    "transformationCounts": {
      "direct": 15,
      "catalog": 3,
      "complex": 0,
      "composite": 0,
      "split": 0
    }
  }
}
```

### 7. Error Handling

The function handles:

- Missing or invalid input data
- Missing required fields (firstName, lastName, email)
- Invalid email formats
- Catalog mapping failures
- Transformation errors
- Unexpected processing errors

**Error Types:**

- `validation`: Data format validation failures
- `transformation`: Transformation logic errors
- `required_field`: Missing required fields
- `catalog_mapping`: Catalog reference lookup failures

### 8. Transformation Types

#### Direct Transformation

Simple field copy with optional preprocessing:

- Trim whitespace
- Normalize phone numbers
- Copy value as-is

#### Catalog Transformation

Maps source values to catalog IDs via GraphQL lookups:

- Function queries GraphQL endpoint with source value
- Uses fuzzy matching (exact, case-insensitive, partial)
- Returns catalog entry ID
- Generates warning if no match found

**Required in fieldMapping:**

- `catalogIdentifier`: Name of the catalog (e.g., "Country", "CompanySize")

**Example:**

```json
{
  "sourceField": "Country",
  "targetField": "countryRef",
  "transformationType": "catalog",
  "catalogIdentifier": "Country"
}
```

The function will:

1. Extract value from source field (e.g., "Switzerland")
2. Query GraphQL: `CatalogEntry` where `catalog.identifier = "Country"` and `value ILIKE "%Switzerland%"`
3. Apply fuzzy matching to find best match
4. Return catalog entry ID or null if no match

#### Complex Transformation

Custom transformation logic:

- **addressLine**: Parses address string into JSON `{ lines: [...] }`
- **Date fields**: Converts to ISO 8601 format (YYYY-MM-DD)

#### Composite Transformation

Combines multiple source fields:

- Takes values from compositeSourceFields
- Joins with space separator
- Example: Combine first name + middle name + last name

#### Split Transformation

Splits one source field into multiple targets:

- Splits on first space
- First part → first target field
- Remaining parts → second target field
- Example: "John Doe" → firstName: "John", lastName: "Doe"

### 9. Options Configuration

#### skipInvalidRows (default: true)

- `true`: Skip rows with errors, continue processing
- `false`: Stop processing on first error

#### validateEmail (default: true)

- `true`: Validate email format using regex
- `false`: Accept any email value

#### defaultOwnerEmployeeId

- Sets ownerEmployee field if not provided in data
- Useful for bulk imports where all leads have same owner

#### defaultLeadStatusRef

- Sets leadStatusRef field if not provided in data
- Useful for setting initial status (e.g., "New")

#### defaultLeadSourceRef

- Sets leadSourceRef field if not provided in data
- Useful for tracking import source

#### trimWhitespace (default: true)

- `true`: Trim leading/trailing whitespace from strings
- `false`: Keep whitespace as-is

#### normalizePhoneNumbers (default: true)

- `true`: Remove non-numeric characters (except +)
- `false`: Keep phone numbers as-is

### 10. Integration Notes

#### With LeadImportAnalyzer Agent

```typescript
// Step 1: Analyze import file
const analysis = await leadImportAnalyzerService.analyzeImport({
  fileContent: csvString,
  fileType: 'csv'
})

// Step 2: Parse CSV to objects
const importData = parseCSV(csvString)

// Step 3: Convert using mappings
const result = await convertLeadImportFunction({
  importData,
  fieldMappings: analysis.fieldMappings,
  options: {
    skipInvalidRows: true,
    defaultOwnerEmployeeId: currentUserId,
    defaultLeadStatusRef: 'new-status-uuid'
  }
})

// Step 4: Import leads
if (result.success && result.leads.length > 0) {
  await bulkCreateLeads(result.leads)
}
```

#### With Data Seeder

```javascript
// In data seeder script
const { convertLeadImport } = require('./functions/convertLeadImport')

async function seedLeads() {
  const csvData = fs.readFileSync('import/leads.csv', 'utf-8')
  const importData = parseCSV(csvData)

  // Use pre-generated mappings
  const mappings = require('./config/lead-field-mappings.json')

  const result = await convertLeadImport({
    importData,
    fieldMappings: mappings,
    options: {
      skipInvalidRows: false, // Strict mode for seeding
      validateEmail: true,
      defaultOwnerEmployeeId: systemUserId
    }
  })

  if (!result.success) {
    console.error('Conversion failed:', result.errors)
    process.exit(1)
  }

  // Bulk insert leads
  for (const leadPayload of result.leads) {
    await createLead(leadPayload.lead)
  }

  console.log(`Imported ${result.processedRows} leads`)
}
```

#### Output Format

The function returns lead payloads in the exact format expected by:

- GraphQL `createLead` mutation
- GraphQL `bulkCreateLeads` mutation
- `buildCustomerLeadPayload()` TypeScript utility
- Data seeder scripts

Each lead payload has structure:

```javascript
{
  lead: {
    firstName: "string",
    lastName: "string",
    email: "string",
    // ... other CustomerLead fields
  }
}
```

This matches the GraphQL mutation input format:

```graphql
mutation CreateLead($input: CreateLeadInput!) {
  createLead(input: $input) {
    id
  }
}
```

Where `$input` has shape: `{ lead: { ...fields } }`

### 11. Performance Notes

- Processes rows sequentially for error handling
- Minimal memory footprint (no data buffering)
- Efficient for datasets up to 10,000 rows
- For larger datasets, consider batching:
  - Split import data into chunks
  - Process each chunk separately
  - Aggregate results

### 12. Validation Rules

#### Required Fields

- `firstName`: Must be non-empty string
- `lastName`: Must be non-empty string
- `email`: Must be non-empty string and valid email format (if validateEmail: true)

#### Optional Field Validation

- Phone numbers: Normalized format (if normalizePhoneNumbers: true)
- Email: Regex validation (if validateEmail: true)
- Dates: Valid date string parseable by Date constructor
- Catalog references: Must have matching catalogId in catalogMapping

### 13. Error Recovery

#### Handling Skipped Rows

```javascript
const result = await convertLeadImport(input)

if (result.skippedRows > 0) {
  console.log(`Skipped ${result.skippedRows} rows due to errors`)

  // Review errors
  result.errors.forEach(error => {
    console.error(`Row ${error.row}: ${error.error}`)

    // Optionally retry with corrected data
    if (error.errorType === 'catalog_mapping') {
      // Update catalog mappings and retry
    }
  })
}
```

#### Handling Warnings

```javascript
if (result.warnings && result.warnings.length > 0) {
  console.warn(`${result.warnings.length} warnings generated`)

  result.warnings.forEach(warning => {
    console.warn(`Row ${warning.row}: ${warning.warning}`)
  })

  // Warnings are non-critical, leads are still created
  // Review warnings to improve data quality for future imports
}
```

### 14. Testing

#### Unit Test Example

```javascript
const { handler } = require('./convertLeadImport')

describe('convertLeadImport', () => {
  it('should convert simple direct mappings', async () => {
    const result = await handler({
      importData: [{ 'First Name': 'John', 'Last Name': 'Doe', Email: 'john@example.com' }],
      fieldMappings: [
        { sourceField: 'First Name', targetField: 'firstName', transformationType: 'direct' },
        { sourceField: 'Last Name', targetField: 'lastName', transformationType: 'direct' },
        { sourceField: 'Email', targetField: 'email', transformationType: 'direct' }
      ]
    })

    expect(result.success).toBe(true)
    expect(result.processedRows).toBe(1)
    expect(result.leads[0].lead.firstName).toBe('John')
  })

  it('should skip rows with missing required fields', async () => {
    const result = await handler({
      importData: [{ 'First Name': 'John', 'Last Name': '', Email: 'john@example.com' }],
      fieldMappings: [
        { sourceField: 'First Name', targetField: 'firstName', transformationType: 'direct' },
        { sourceField: 'Last Name', targetField: 'lastName', transformationType: 'direct' },
        { sourceField: 'Email', targetField: 'email', transformationType: 'direct' }
      ],
      options: { skipInvalidRows: true }
    })

    expect(result.success).toBe(false)
    expect(result.skippedRows).toBe(1)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})
```

This function completes the lead import system by converting analyzed data into CustomerLead payloads ready for database insertion.
