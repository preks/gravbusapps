/**
 * AI Prompts for Spreadsheet Analysis
 *
 * These prompts are used with the Prompt Manager to analyze Excel files
 * and generate intelligent app configurations.
 */

/**
 * System prompt for the spreadsheet analyzer AI
 */
export const SPREADSHEET_ANALYZER_SYSTEM_PROMPT = `You are an expert business analyst and data architect specializing in transforming spreadsheet data into structured business applications.

Your task is to analyze the structure of spreadsheet data and provide intelligent recommendations for building a business application from it.

When analyzing spreadsheet data, you should:

1. **Detect Column Types**: Identify the most appropriate data type for each column based on:
   - Column headers (naming conventions like "email", "phone", "date", etc.)
   - Sample values (patterns like dates, currencies, percentages)
   - Value distributions (unique values suggest IDs, repeated values suggest categories)

2. **Identify Relationships**: Look for:
   - Foreign key patterns (columns ending in "Id", "ID", "_id")
   - Matching column names across sheets
   - Lookup patterns (one sheet with unique values referenced by another)

3. **Suggest App Structure**: Recommend the best view type based on:
   - Data complexity and column count
   - Presence of status/stage columns (suggests Kanban)
   - Date columns (suggests Calendar or Timeline)
   - Numeric columns with categories (suggests Dashboard with charts)
   - Simple data entry needs (suggests Form + Table)

4. **Infer Business Purpose**: Based on column names and data patterns, identify what business process this spreadsheet serves (e.g., "Sales Pipeline", "Expense Tracker", "Project Plan", "Inventory Management").

Column Type Detection Rules:
- email: Contains "@" and domain pattern
- phone: Numeric with common phone patterns (+, -, spaces, parentheses)
- date: ISO dates, common date formats (MM/DD/YYYY, DD.MM.YYYY, etc.)
- datetime: Dates with time components
- currency: Numbers with currency symbols or "price", "cost", "amount" in header
- percentage: Numbers between 0-1 or 0-100 with "%" or "rate", "percent" in header
- select: Columns with limited unique values (< 20) that repeat
- boolean: true/false, yes/no, 1/0, checkmarks
- url: Strings starting with http://, https://, or www.
- number: Pure numeric values
- text: Default for strings

Always return structured JSON that matches the SpreadsheetAnalysis interface.`

/**
 * User prompt template for spreadsheet analysis
 */
export const SPREADSHEET_ANALYZER_USER_PROMPT = `Analyze the following spreadsheet data and provide recommendations for building a business application.

**File Name**: {fileName}
**Total Sheets**: {sheetCount}

**Sheet Data**:
{sheetData}

Please analyze this data and return a JSON object with the following structure:

\`\`\`json
{
  "suggestedAppName": "string - A descriptive name for the app based on content",
  "suggestedAppType": "data_grid | form_table | dashboard | mixed",
  "confidence": "number 0-1 - How confident you are in the analysis",
  "sheets": [
    {
      "name": "string - Sheet name",
      "purpose": "string - What this sheet is for (e.g., 'Sales Pipeline', 'Expense Records')",
      "isLookupTable": "boolean - Is this a reference/lookup table?",
      "primaryKeyColumn": "string | null - Column that uniquely identifies rows",
      "columns": [
        {
          "name": "string - Column name",
          "detectedType": "text | number | currency | percentage | date | datetime | email | phone | url | select | multiselect | boolean | calculated | reference",
          "isRequired": "boolean - Should this field be required?",
          "isUnique": "boolean - Should values be unique?",
          "selectOptions": ["array of strings if type is select/multiselect"],
          "description": "string - Brief description of what this column represents",
          "validation": {
            "min": "number if applicable",
            "max": "number if applicable",
            "pattern": "regex if applicable"
          }
        }
      ],
      "suggestedViews": [
        {
          "type": "table | form | dashboard | kanban | calendar",
          "name": "string - View name",
          "description": "string - Why this view is recommended",
          "config": {
            "type": "matching view type",
            // Additional config based on view type
          }
        }
      ]
    }
  ],
  "relationships": [
    {
      "fromSheet": "string - Source sheet name",
      "fromColumn": "string - Source column name",
      "toSheet": "string - Target sheet name",
      "toColumn": "string - Target column name",
      "type": "one-to-one | one-to-many | many-to-many"
    }
  ]
}
\`\`\`

Be thorough but practical. Focus on creating a usable business application.`

/**
 * Format sheet data for the AI prompt
 */
export function formatSheetDataForPrompt(
  sheets: Array<{
    name: string
    columns: Array<{ name: string; sampleValues: unknown[] }>
    rowCount: number
  }>
): string {
  return sheets
    .map(sheet => {
      const columnInfo = sheet.columns
        .map(col => {
          const samples = col.sampleValues
            .slice(0, 5)
            .map(v => (v === null || v === undefined ? 'null' : JSON.stringify(v)))
            .join(', ')
          return `  - ${col.name}: [${samples}]`
        })
        .join('\n')

      return `### Sheet: "${sheet.name}" (${sheet.rowCount} rows)
Columns:
${columnInfo}`
    })
    .join('\n\n')
}

/**
 * Prompt for generating form field configuration
 */
export const FORM_FIELD_GENERATOR_PROMPT = `Based on the column analysis, generate form field configurations that provide the best user experience.

Consider:
- Field ordering (most important fields first, related fields grouped)
- Input types that match the data
- Helpful placeholders and descriptions
- Appropriate validation rules
- Conditional visibility (if applicable)

Return a JSON array of form field configurations.`

/**
 * Prompt for generating dashboard widgets
 */
export const DASHBOARD_WIDGET_GENERATOR_PROMPT = `Based on the data columns and sample values, suggest dashboard widgets that would provide valuable insights.

Consider:
- KPIs for numeric totals (sum, average, count)
- Charts for categorical breakdowns
- Trend lines for date-based data
- Tables for top/bottom performers

Return a JSON array of widget configurations with:
- type: 'kpi' | 'chart' | 'table'
- title: Descriptive title
- config: Widget-specific configuration`

/**
 * Prompt for detecting data quality issues
 */
export const DATA_QUALITY_ANALYZER_PROMPT = `Analyze the data quality and identify potential issues:

1. Missing values in required-looking columns
2. Inconsistent formatting (mixed date formats, inconsistent casing)
3. Potential duplicates
4. Outliers in numeric columns
5. Invalid values (emails without @, negative prices, etc.)

Return a JSON object with:
- issues: Array of { column, issueType, description, affectedRows }
- suggestions: Array of { issue, suggestion }
- overallQuality: 'good' | 'fair' | 'poor'`
