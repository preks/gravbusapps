# LeadImportConverter - AI Agent Documentation

## Overview

**Agent Name:** `LeadImportConverter`  
**Type:** General (Task Expert)  
**Description:** AI agent that converts CSV/JSON import files directly into CustomerLead payloads ready for GraphQL mutations. Automatically maps fields and handles catalog lookups.

## Agent Structure

The LeadImportConverter:

- **Input**: CSV/JSON data (via file upload or direct text)
- **Processing**: Intelligent field mapping + data conversion
- **Output**: Array of CustomerLead payloads ready to import
- **fileType**: Type of import file ("csv" or "json")
- **sampleSize**: Number of rows to analyze for mapping generation (default: 5, max: 20)

## System Prompt

````text
You are a professional lead import converter that transforms CSV/JSON files into CustomerLead payloads ready for GraphQL mutations.

**Your Task:**
1. Read the import data (from uploaded file OR csvText parameter)
2. Intelligently map source fields to CustomerLead structure
3. Call LeadImportConvert tool to convert the data
4. Return the converted leads

**Input Data Sources:**
- **csvText parameter**: If provided and not empty, use this data directly
- **[UPLOADED FILES] section**: Otherwise, extract data from uploaded files

**CustomerLead Target Structure:**

**Required Fields:**
- firstName: string
- lastName: string
- email: string

**Optional Personal Fields:**
- phoneNumber: string
- salutationRef: string (catalog: Salutation)
- academicTitleRef: string (catalog: AcademicTitle)
- position: string (source: "Job Title", "Position", "Role")

**Company Fields:**
- companyName: string
- companyEmail: string
- companyPhone: string (source: "Office", "HQ Phone")
- companyWebsite: string
- numberOfEmployeesRef: string (catalog: CompanySize, source: "Headcount", "Employees")
- legalFormRef: string (catalog: LegalForm)
- industryRef: string (catalog: IndustryClass, source: "Industry", "Industries")
- annualRevenueRef: string (catalog: AccountAnnualRevenueBand)

**Address Fields:**
- addressLine: { lines: string[] }
- city: string (source: "City", "Town", "Locality")
- postalCode: string (source: "ZIP", "Post Code", "Postal Code")
- regionRef: string (catalog: Region, source: "State", "Province", "Region")
- countryRef: string (catalog: Country)

**Lead Management:**
- code: string
- leadStatusRef: string (catalog: LeadStatus)
- leadSourceRef: string (catalog: LeadSource)
- leadRatingRef: string (catalog: LeadRating)
- description: string
- sensitive: boolean

**Field Mapping Strategy:**

1. **Direct Mapping**: Match common field names
   - "First Name" → firstName
   - "Email" → email
   - "Mobile" / "Phone" → phoneNumber
   - "Job Title" → position
   - "City" → city

2. **Catalog Mapping**: Match values to catalog entries
   - Country names → countryRef (via Country catalog)
   - State/Region → regionRef (via Region catalog)
   - Numeric headcount → numberOfEmployeesRef (via CompanySize catalog)
   - Industry keywords → industryRef (via IndustryClass catalog)

3. **Phone Priority**: Mobile > Direct > Phone > Office (for phoneNumber)

4. **Complex Fields**:
   - Multiple address fields → combine into addressLine.lines array
   - Multiple industries → take first or best match

**Workflow:**

1. Parse input data (CSV or JSON)
2. Identify all source fields
3. Create field mappings internally (don't output them)
4. **MANDATORY**: Call LeadImportConvert tool with:
   ```json
   {
     "importData": [{ "First Name": "John", ... }],
     "fieldMappings": [{ "sourceField": "First Name", "targetField": "firstName", ... }]
   }
   ```
5. Return only the tool's output (convertedLeads + summary)

**CRITICAL**: You MUST call the LeadImportConvert tool. Do NOT manually convert data.

Response Format:
Return only the LeadImportConvert tool's output as your response.
````

CustomerLead Field Structure:

**Personal Information:**

- firstName: string (required)
- lastName: string (required)
- email: string (required)
- phoneNumber: string
- salutationRef: string (catalog: Salutation)
- academicTitleRef: string (catalog: AcademicTitle)
- jobPosition: string (GraphQL field name: "position")

**Company Information:**

- companyName: string
- companyEmail: string
- companyPhone: string
- companyWebsite: string
- companySizeRef: string (catalog: CompanySize, GraphQL field name: "numberOfEmployeesRef")
- legalFormRef: string (catalog: LegalForm)
- industryClassRef: string (catalog: IndustryClass, GraphQL field name: "industryRef")
- accountAnnualRevenueBandRef: string (catalog: AccountAnnualRevenueBand, GraphQL field name: "annualRevenueRef")

**Address Information:**

- addressLine: object { lines: string[] } (stored as JSON string in GraphQL)
- locality: string (GraphQL field name: "city")
- postalCode: string
- regionRef: string (catalog: Region)
- countryRef: string (catalog: Country)

**Lead Management:**

- code: string (lead identifier)
- leadStatusRef: string (catalog: LeadStatus)
- leadSourceRef: string (catalog: LeadSource)
- leadRatingRef: string (catalog: LeadRating)
- description: string
- sensitive: boolean

**Ownership & Conversion:**

- ownerEmployeeId: string (references Employee)
- conversionDate: string (ISO date)
- convertedAccountId: string
- convertedContactId: string
- convertedOpportunityId: string

**Source Information:**

- sourceCompanyName: string
- sourceIndividualName: string

**Relations (not mappable from flat import):**

- activities, documents, notes, tasks, account, contact, salesCampaignId

Available Operations:

1. ANALYZE IMPORT DATA:
   - If csvText parameter is provided, use that data directly
   - Otherwise, read the file content from the [UPLOADED FILES] section
   - Automatically detect if it's CSV or JSON format
   - Identify all column names/keys and their data patterns
   - Match columns to CustomerLead fields using semantic understanding
   - Detect data types and formats from sample rows
   - Generate field mappings with confidence scores

2. CONVERT IMPORT DATA (via LeadImportConvert Tool):
   - **MANDATORY**: After generating field mappings, you MUST use the LeadImportConvert tool to convert the data
   - NEVER attempt to convert data manually - always use the LeadImportConvert tool
   - The tool takes your generated fieldMappings and the raw importData
   - Returns converted CustomerLead payloads ready for GraphQL mutations
   - Handles all transformation types (direct, catalog, complex, composite, split)
   - Applies catalog mappings automatically
   - Validates required fields

Mapping Guidelines:

**Field Name Matching:**

- Use semantic understanding to match field names (e.g., "First Name" → firstName, "Email Address" → email)
- Handle common variations (e.g., "Job Title" → jobPosition, "City" → locality)
- Consider camelCase, snake_case, Title Case, and space-separated variations
- Map phone fields intelligently: "Mobile" → phoneNumber, "Direct" → phoneNumber, "Office" → companyPhone

**Catalog Field Mapping:**
You have access to catalog data through the Knowledge Base. For catalog reference fields (fields ending in Ref):

- Search the corresponding catalog in the Knowledge Base for matching values
- Match source values to catalog entries by code or value
- Generate catalogMapping with sourceValue → catalogId matches
- Include confidence scores based on match quality (1.0 = exact, 0.9 = close, 0.7 = fuzzy)
- Use catalog codes for matching when available (e.g., "DE" → Germany, "USD" → US Dollar)

**Transformation Types:**

- "direct": Simple field copy (e.g., firstName → firstName)
- "catalog": Catalog reference lookup (e.g., "Germany" → countryRef with catalogId)
- "complex": Requires transformation (e.g., full address → addressLine JSON object)
- "composite": Multiple source fields → single target (e.g., "Full Name" → firstName + lastName)
- "split": Single source field → multiple targets (e.g., "Name" → firstName + lastName)

**Confidence Scoring:**

- 1.0: Exact match (same field name, exact catalog code match)
- 0.95: Very high confidence (clear semantic match, e.g., "First Name" → firstName)
- 0.9: High confidence (common variation, close catalog match)
- 0.85: Good confidence (reasonable match, fuzzy catalog match)
- 0.8: Medium confidence (possible match, requires validation)
- 0.7: Low confidence (uncertain match, multiple possibilities)

**Data Quality Analysis:**

- Detect missing values in required fields (firstName, lastName, email)
- Identify data format inconsistencies
- Check for duplicate values in unique fields
- Validate email formats, phone number patterns
- Assess completeness percentage for each field

**Catalog Integration (from Knowledge Base):**
The following catalogs are available in the Knowledge Base:

- Salutation (Mr, Ms, Mrs, Dr, Prof, etc.)
- AcademicTitle (Dr, Prof, PhD, etc.)
- LeadStatus (New, Contacted, Qualified, Unqualified, Converted, etc.)
- LeadSource (Website, Referral, Cold Call, Trade Show, etc.)
- LeadRating (Hot, Warm, Cold, etc.)
- Country (ISO country codes and names)
- Region (States, provinces, regions)
- LegalForm (GmbH, AG, LLC, Inc, etc.)
- IndustryClass (Technology, Healthcare, Finance, etc.)
- CompanySize (1-10, 11-50, 51-200, 201-500, 501-1000, 1001+, etc.)
- AccountAnnualRevenueBand (revenue ranges)

For each catalog field in the import data:

1. Extract unique values from the sample rows
2. Search the corresponding catalog in the Knowledge Base
3. Match each unique value to a catalog entry (by code or value)
4. Include catalogMapping in the field mapping with all matches
5. Set confidence based on match quality

**Special Field Handling:**

1. **addressLine**:
   - If multiple address fields exist (address1, address2, street, etc.), combine into addressLine
   - Format: { lines: ["line1", "line2", ...] }
   - transformationType: "complex"
   - transformationRule: "Combine address fields into JSON object with lines array"

2. **Full Name Split**:
   - If "Full Name" or "Name" field exists without separate firstName/lastName
   - transformationType: "split"
   - transformationRule: "Split on first space: first part = firstName, rest = lastName"

3. **Phone Number Selection**:
   - Prioritize: Mobile > Direct > Phone > Office (for phoneNumber)
   - Map "Office" or "HQ" to companyPhone if available
   - transformationType: "direct" with note about source priority

4. **Industry/Company Size**:
   - Parse numeric headcount values to CompanySize catalog ranges
   - Parse industry keywords or codes to IndustryClass catalog
   - transformationType: "catalog" with parsing note

5. **Date Fields**:
   - Detect date formats (MM/DD/YYYY, DD.MM.YYYY, ISO, etc.)
   - transformationType: "direct" with format note
   - transformationRule: "Convert to ISO 8601 format (YYYY-MM-DD)"

**Unmapped Fields Strategy:**

- List source fields that don't match any CustomerLead field in unmappedSourceFields
- List CustomerLead fields that weren't found in the source in unmappedTargetFields
- Prioritize mapping required fields (firstName, lastName, email)
- Don't force-map fields that don't make semantic sense

LeadImportConvert Tool Usage:
**MANDATORY**: After generating field mappings, you MUST use the LeadImportConvert tool to convert the import data. NEVER attempt manual conversion.

**Tool Name**: LeadImportConvert

**When to Call**:

- ALWAYS call this tool after generating fieldMappings
- The tool converts raw import data to CustomerLead payloads
- Required for completing the import workflow

**How to Call**:

1. Parse the uploaded file content from [UPLOADED FILES] into an array of objects (importData)
2. Generate your fieldMappings array (as described above)
3. Call LeadImportConvert with both importData and fieldMappings
4. Return the tool's output in your response

**Tool Input Structure**:

```json
{
  "importData": [
    { "First Name": "John", "Last Name": "Doe", "Email": "john@example.com", ... },
    { "First Name": "Jane", "Last Name": "Smith", "Email": "jane@example.com", ... }
  ],
  "fieldMappings": [
    {
      "sourceField": "First Name",
      "targetField": "firstName",
      "transformationType": "direct",
      "confidence": 1.0
    },
    ...
  ]
}
```

**Tool Output**:
The tool returns a JSON object with:

```json
{
  "success": true,
  "convertedLeads": [
    /* array of CustomerLead payloads */
  ],
  "summary": {
    "totalRecords": 100,
    "successfulConversions": 98,
    "failedConversions": 2,
    "validationErrors": []
  }
}
```

**Critical Rules**:

1. ALWAYS call LeadImportConvert after generating mappings
2. NEVER manually convert the data yourself
3. If the tool returns success: false, include the error in your response
4. Include the tool's output in your response for the user to review

Response Format:
Always respond with valid JSON matching the specified output schema.

````

## User Prompt Template

```text
Convert the provided import data into CustomerLead payloads ready for import.

**Data Source:**
- If csvText is provided below, use that
- Otherwise, use the uploaded file from [UPLOADED FILES] section

**Optional CSV/JSON Text Input:**
{csvText}

**Instructions:**
1. Parse the import data (CSV or JSON format)
2. Map all fields to CustomerLead structure
3. Call LeadImportConvert tool with the data and mappings
4. Return the converted leads
```

## Response Schema

```json
{
  "type": "object",
  "required": ["success", "convertedLeads", "summary"],
  "properties": {
    "success": {
      "type": "boolean",
      "description": "Whether the conversion was successful"
    },
    "convertedLeads": {
      "type": "array",
      "description": "Array of CustomerLead payloads ready for GraphQL import",
      "items": {
        "type": "object",
        "description": "CustomerLead payload with all mapped fields"
      }
    },
    "summary": {
      "type": "object",
      "required": ["totalRecords", "successfulConversions", "failedConversions"],
      "properties": {
        "totalRecords": {
          "type": "number",
          "description": "Total number of records in import file"
        },
        "successfulConversions": {
          "type": "number",
          "description": "Number of successfully converted leads"
        },
        "failedConversions": {
          "type": "number",
          "description": "Number of records that failed conversion"
        },
        "validationErrors": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "row": {"type": "number"},
              "field": {"type": "string"},
              "error": {"type": "string"}
            }
          },
          "description": "Validation errors encountered during conversion"
        },
        "mappedFields": {
          "type": "number",
          "description": "Number of source fields successfully mapped"
        },
        "catalogMappings": {
          "type": "number",
          "description": "Number of catalog reference fields mapped"
        }
      }
    },
    "warnings": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Non-critical warnings about the import"
    }
  }
}
```

## Registration Details

### Prompt Manager Configuration

```typescript
{
  name: 'LeadImportAnalyzer',
  description: 'AI agent for analyzing import files and generating field mappings to CustomerLead structure',
  type: 'completion',
  workspaceId: 'your-workspace-id',
  modelId: 'gpt-4o',
  userContent: LEAD_IMPORT_ANALYZER_USER_PROMPT,
  systemContent: LEAD_IMPORT_ANALYZER_SYSTEM_PROMPT,
  tools: ['convertLeadImport'],  // Enable LeadImportConvert function
  responseSchema: LEAD_IMPORT_ANALYZER_OUTPUT_SCHEMA,
  modelSettings: {
    response_format: {
      type: 'json_object'
    }
  }
}
```

**Important:**
- `modelSettings.response_format` is required when `responseSchema` is set
- **LeadImportConvert tool MUST be configured** in the Task Expert tools array
- Tool code must match the function identifier: `convertLeadImport`

## Service Implementation

### TypeScript Interfaces

```typescript
// No input interface needed - file is uploaded directly via FormData

export interface FieldMapping {
  sourceField: string
  targetField: string
  confidence: number
  transformationType: 'direct' | 'catalog' | 'complex' | 'composite' | 'split'
  transformationRule?: string
  required: boolean
  catalogIdentifier?: string
  catalogMapping?: {
    sourceValues: string[]
    catalogMatches: Array<{
      sourceValue: string
      catalogId: string | null
      catalogCode?: string
      catalogValue?: string
      confidence: number
      matchReason?: string
    }>
  }
  compositeSourceFields?: string[]
  splitTargetFields?: string[]
  dataType?: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array'
  sampleValues?: string[]
}

export interface DataQualityIssue {
  field: string
  issue: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  affectedRows?: number
  recommendation?: string
}

export interface LeadImportAnalyzerOutput {
  fieldMappings: FieldMapping[]
  unmappedSourceFields: string[]
  unmappedTargetFields: string[]
  dataQualityIssues?: DataQualityIssue[]
  summary: {
    totalSourceFields: number
    mappedFields: number
    catalogFields: number
    requiredFieldsCoverage?: number
    confidence: number
    estimatedSuccessRate?: number
    recommendedAction: string
    warnings?: string[]
  }
}
```

### Service Class

```typescript
import { promptManagerClient } from '@/common/network/ai/prompt-manager/PromptManagerClient'

export class LeadImportAnalyzerService {
  private accessToken: string
  private readonly PROMPT_ID = 'LeadImportAnalyzer'

  constructor(accessToken: string) {
    this.accessToken = accessToken
    promptManagerClient.setAccessToken(accessToken)
  }

  /**
   * Analyze import from uploaded file
   */
  async analyzeImport(
    file: File
  ): Promise<LeadImportAnalyzerOutput> {
    // Create FormData with file upload
    const formData = new FormData()
    formData.append('files', file)
    formData.append('system_params', JSON.stringify({}))
    formData.append('user_params', JSON.stringify({}))

    const response = await promptManagerClient.executePromptById(this.PROMPT_ID, formData)
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

    return JSON.parse(content) as LeadImportAnalyzerOutput
  }

  /**
   * Analyze import from CSV/JSON text directly (no file upload)
   */
  async analyzeFromText(
    csvText: string
  ): Promise<LeadImportAnalyzerOutput> {
    const response = await promptManagerClient.executePromptByIdJson(this.PROMPT_ID, {
      system_params: {},
      user_params: {
        csvText: csvText
      }
    })
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

    return JSON.parse(content) as LeadImportAnalyzerOutput
  }

  /**
   * Analyze from document link (for already uploaded files)
   */
  async analyzeFromLink(
    documentLink: string
  ): Promise<LeadImportAnalyzerOutput> {
    const response = await promptManagerClient.executePromptByIdJson(this.PROMPT_ID, {
      system_params: {},
      user_params: {},
      document_links: [documentLink]
    })
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

    return JSON.parse(content) as LeadImportAnalyzerOutput
  }
}
```

## Usage Examples

### Example 1: Analyze CSV File from File Input

```typescript
const service = new LeadImportAnalyzerService(accessToken)

// From file input element
const fileInput = document.querySelector('input[type="file"]')
const file = fileInput.files[0]

const result = await service.analyzeImport(file)

// Result includes:
// - fieldMappings: Array of mapped fields with confidence scores
// - unmappedSourceFields: Fields that couldn't be mapped
// - dataQualityIssues: Missing required fields, format issues
// - summary: Overall analysis and recommended action
```

### Example 2: Analyze from CSV/JSON Text Directly

```typescript
const service = new LeadImportAnalyzerService(accessToken)

// Directly pass CSV text without file upload
const csvText = `First Name,Last Name,Email,Company Name,City,Country
Tomas,Pfister,tpfister@itris.ch,ITRIS One AG,Spreitenbach,Switzerland
Sebastian,Mader,,Schwarz Digits,Hamburg,Germany`

const result = await service.analyzeFromText(csvText)

// Or with JSON text
const jsonText = `[
  { "First Name": "John", "Last Name": "Doe", "Email": "john@example.com" },
  { "First Name": "Jane", "Last Name": "Smith", "Email": "jane@example.com" }
]`

const result2 = await service.analyzeFromText(jsonText)
```

### Example 3: Analyze from Already Uploaded File

```typescript
// If file is already uploaded to document manager
const documentLink = 'https://example.com/api/documents/abc-123/download'

const result = await service.analyzeFromLink(documentLink)
```

### Example 4: Analyze with File Object

```typescript
// Create file from CSV string (for testing or data seeding)
const csvContent = `First Name,Last Name,Email,Company Name,City,Country
Tomas,Pfister,tpfister@itris.ch,ITRIS One AG,Spreitenbach,Switzerland
Sebastian,Mader,,Schwarz Digits,Hamburg,Germany`

const file = new File([csvContent], 'leads.csv', { type: 'text/csv' })
const result = await service.analyzeImport(file)
```

### Example 5: Handle Analysis Result

```typescript
const result = await service.analyzeImport(input)

// Check if ready to import
if (result.summary.requiredFieldsCoverage === 100 && result.summary.confidence >= 0.8) {
  console.log('Ready to import:', result.summary.estimatedSuccessRate + '% success rate')
  // Proceed to conversion step
} else {
  console.log('Review required:', result.summary.recommendedAction)
  // Show warnings to user
  result.summary.warnings?.forEach(warning => console.warn(warning))
}

// Review catalog mappings
result.fieldMappings
  .filter(m => m.transformationType === 'catalog')
  .forEach(mapping => {
    console.log(`Catalog field: ${mapping.sourceField} → ${mapping.targetField}`)
    mapping.catalogMapping?.catalogMatches.forEach(match => {
      console.log(`  ${match.sourceValue} → ${match.catalogValue} (${match.confidence})`)
    })
  })
```

## Input Parameters

The agent accepts data in three ways:

### 1. Direct CSV/JSON Text Input (via User Prompt Parameter)

**Parameter:** `csvText` (optional string in user_params)

When provided, the agent uses this text directly instead of uploaded files.

**Use Cases:**
- Programmatic data import from API responses
- Testing with sample data
- Data seeding scripts
- Integration with other systems that provide CSV/JSON strings

**Example:**
```typescript
const response = await promptManagerClient.executePromptByIdJson('LeadImportAnalyzer', {
  system_params: {},
  user_params: {
    csvText: `First Name,Last Name,Email
John,Doe,john@example.com
Jane,Smith,jane@example.com`
  }
})
```

### 2. File Upload (via FormData)

The agent accepts files via FormData upload:

**Supported File Types:**
- CSV files (.csv) - with headers in first row
- JSON files (.json) - array of objects

**File Size Limits:**
- Maximum 5 files per request
- Each file should be < 10MB for optimal performance
- Backend max text file size: 2MB (see FileProcessor)

**File Format Requirements:**

**CSV Format:**
- Must have header row as first line
- Use comma (,) as delimiter
- Optional: Values can be quoted for special characters

**JSON Format:**
- Must be an array of objects
- Each object represents one lead
- All objects should have consistent keys

**Example CSV:**
```csv
First Name,Last Name,Email,Company Name,City,Country
John,Doe,john@example.com,ACME Corp,New York,USA
```

**Example JSON:**
```json
[
  {
    "First Name": "John",
    "Last Name": "Doe",
    "Email": "john@example.com",
    "Company Name": "ACME Corp",
    "City": "New York",
    "Country": "USA"
  }
]
```

### 3. Document Links

The agent can also process already uploaded files via document links:

**Use Cases:**
- Files already stored in document management system
- Integration with file storage services

**Example:**
```typescript
const response = await promptManagerClient.executePromptByIdJson('LeadImportAnalyzer', {
  system_params: {},
  user_params: {},
  document_links: ['https://example.com/api/documents/abc-123/download']
})
```

**Priority:**
1. If `csvText` parameter is provided → use csvText
2. Else if files uploaded via FormData → use uploaded files
3. Else if document_links provided → download and use linked files

## Response Format

### Field Mappings

Each mapping includes:
- **sourceField**: Original column/key name
- **targetField**: CustomerLead field name
- **confidence**: 0-1 score
- **transformationType**: How to transform the data
- **catalogMapping**: For catalog fields, includes all value matches
- **sampleValues**: Example values from source data

### Summary

Provides:
- Coverage statistics
- Overall confidence
- Estimated success rate
- Recommended action
- Warnings about potential issues

## Important Notes

- **Agent name:** `LeadImportAnalyzer` (must match exactly in Prompt Manager)
- `response_format` in `modelSettings` is required when `responseSchema` is set
- **LeadImportConvert tool MUST be configured** in the Task Expert tools array
- Tool code must match the function identifier: `convertLeadImport`
- **Catalogs must be configured as Knowledge Sources** in Task Expert Editor
- Required Knowledge Sources:
  - Salutation catalog (identifier: "Salutation", version: "v1")
  - AcademicTitle catalog (identifier: "AcademicTitle", version: "v1")
  - LeadStatus catalog (identifier: "LeadStatus", version: "v1")
  - LeadSource catalog (identifier: "LeadSource", version: "v1")
  - LeadRating catalog (identifier: "LeadRating", version: "v1")
  - Country catalog (identifier: "Country", version: "v1")
  - Region catalog (identifier: "Region", version: "v1")
  - LegalForm catalog (identifier: "LegalForm", version: "v1")
  - IndustryClass catalog (identifier: "IndustryClass", version: "v1")
  - CompanySize catalog (identifier: "CompanySize", version: "v1")
  - AccountAnnualRevenueBand catalog (identifier: "AccountAnnualRevenueBand", version: "v1")
- Agent generates field mappings and uses LeadImportConvert tool for actual data conversion
- Handles both CSV and JSON input formats
- Generates catalog mappings with confidence scores
- Detects data quality issues automatically

## Error Handling

```typescript
try {
  const result = await service.analyzeImport(input)
  // Use result
} catch (error) {
  console.error('Lead Import Analyzer Error:', error)
  // Handle error - check if it's a parsing error, API error, etc.
}
```

## Catalog Integration Details

### Knowledge Sources Configuration

**Important:** All lead-related catalogs must be configured as Knowledge Sources in the Task Expert Editor.

1. **Add Catalog Knowledge Sources:**
   - In Task Expert Editor, go to Knowledge Sources panel
   - Add catalogs with type `catalog`:
     - **Salutation Catalog**: `catalogIdentifier: "Salutation"`, `catalogVersion: "v1"`
     - **AcademicTitle Catalog**: `catalogIdentifier: "AcademicTitle"`, `catalogVersion: "v1"`
     - **LeadStatus Catalog**: `catalogIdentifier: "LeadStatus"`, `catalogVersion: "v1"`
     - **LeadSource Catalog**: `catalogIdentifier: "LeadSource"`, `catalogVersion: "v1"`
     - **LeadRating Catalog**: `catalogIdentifier: "LeadRating"`, `catalogVersion: "v1"`
     - **Country Catalog**: `catalogIdentifier: "Country"`, `catalogVersion: "v1"`
     - **Region Catalog**: `catalogIdentifier: "Region"`, `catalogVersion: "v1"`
     - **LegalForm Catalog**: `catalogIdentifier: "LegalForm"`, `catalogVersion: "v1"`
     - **IndustryClass Catalog**: `catalogIdentifier: "IndustryClass"`, `catalogVersion: "v1"`
     - **CompanySize Catalog**: `catalogIdentifier: "CompanySize"`, `catalogVersion: "v1"`
     - **AccountAnnualRevenueBand Catalog**: `catalogIdentifier: "AccountAnnualRevenueBand"`, `catalogVersion: "v1"`

2. **Automatic Loading:**
   - Catalogs are automatically loaded by the backend when the prompt is executed
   - Catalog data is injected into the System Prompt under `[KNOWLEDGE BASE]` section
   - The AI agent can access all catalog entries from this section

3. **Catalog Matching Strategy:**
   - Agent searches catalogs by code (primary) and value (secondary)
   - Generates confidence scores based on match quality
   - Handles fuzzy matching for common variations
   - Returns catalogId for use in conversion step

## Setup Instructions

### 1. Configure Knowledge Sources

Before using the LeadImportAnalyzer agent, you must add all required catalogs as Knowledge Sources:

1. Open Task Expert Studio
2. Edit the LeadImportAnalyzer Task Expert
3. Navigate to Knowledge Sources panel
4. Add all 11 catalogs listed above

### 2. Catalog Data Access

- Catalogs are automatically loaded when the prompt is executed
- Catalog entries are injected into the System Prompt under `[KNOWLEDGE BASE]`
- The AI agent can search and reference catalog entries from this section
- Catalog entries have the structure: `{ id, code, value, description, type, ... }`

## Integration with Conversion Function

This agent is designed to work with the `convertLeadImport` function:

1. **Analysis Phase**: LeadImportAnalyzer generates field mappings from uploaded file
2. **Review Phase**: User reviews/adjusts mappings (optional)
3. **Conversion Phase**: convertLeadImport function uses mappings to transform data
4. **Import Phase**: Transformed data is imported via GraphQL mutations

Example workflow:

```typescript
// Step 1: Upload and analyze file
const fileInput = document.querySelector('input[type="file"]')
const file = fileInput.files[0]

const analysis = await analyzerService.analyzeImport(file)

// Step 2: Review (optional)
// UI shows mappings, user can override catalog matches or confidence thresholds

// Step 3: Parse original file data
const fileText = await file.text()
const importData = file.name.endsWith('.csv')
  ? parseCSV(fileText)
  : JSON.parse(fileText)

// Step 4: Convert using mappings
const conversion = await convertLeadImportFunction({
  importData,
  fieldMappings: analysis.fieldMappings,
  options: {
    skipInvalidRows: true,
    defaultOwnerEmployeeId: currentUserId
  }
})

// Step 5: Import leads
await bulkCreateLeads(conversion.leads)
```
````
