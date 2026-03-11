/**
 * AI Prompts for Excel Collection Summary
 *
 * Used with the Prompt Manager to generate:
 * 1. Executive summary across all completed submissions
 * 2. Per-recipient breakdown for each team member's submission
 */

import type { SpreadsheetApp, SpreadsheetSheet } from '../types/spreadsheet'

/**
 * Format a single copy's sheet data for the AI prompt.
 * Excludes tracking columns and structures data for summarization.
 */
function formatCopySheetsForPrompt(
  app: SpreadsheetApp,
  maxRowsPerSheet = 50
): string {
  const TRACKING_PREFIX = '_'
  return (app.sheets || [])
    .map((sheet: SpreadsheetSheet) => {
      const columns = (sheet.columns || []).filter(
        c => !c.name.startsWith(TRACKING_PREFIX)
      )
      const data = (sheet.data || []) as Array<Record<string, unknown>>
      const sampleRows = data.slice(0, maxRowsPerSheet)

      const columnInfo = columns
        .map(col => {
          const samples = sampleRows
            .map(row => {
              const v = row[col.name]
              return v === null || v === undefined ? 'null' : JSON.stringify(v)
            })
            .slice(0, 5)
          return `  - ${col.name}: [${samples.join(', ')}]`
        })
        .join('\n')

      const rowCount = data.length
      return `### Sheet: "${sheet.name}" (${rowCount} rows)
Columns:
${columnInfo}

Sample values (first ${Math.min(sampleRows.length, 10)} rows):
${sampleRows.slice(0, 10).map((r, i) => `Row ${i + 1}: ${JSON.stringify(r)}`).join('\n')}`
    })
    .join('\n\n')
}

/**
 * Format all copies for the user prompt, labeled by recipient
 */
export function formatCopiesForPrompt(
  copies: Array<{ app: SpreadsheetApp; recipientName: string }>
): string {
  return copies
    .map(({ app, recipientName }) => {
      const sheetData = formatCopySheetsForPrompt(app)
      return `## Recipient: ${recipientName}

${sheetData}`
    })
    .join('\n\n---\n\n')
}

/**
 * System prompt for the collection summary AI
 */
export const COLLECTION_SUMMARY_SYSTEM_PROMPT = `You are an expert business analyst. Your task is to summarize Excel Collection submissions from multiple team members.

You will receive spreadsheet data from each recipient's completed submission. For each submission, produce:
1. **Per-recipient summary**: A brief (2-4 sentences) summary of that person's submission - key numbers, trends, notable items.
2. **Executive summary**: A high-level overview (3-6 sentences) across ALL submissions - aggregate insights, common patterns, notable outliers, and actionable takeaways for the manager.

Guidelines:
- Be concise and actionable
- Focus on business-relevant insights, not raw data enumeration
- Use clear, professional language
- If data is sparse or unclear, note it briefly
- Do not invent data - only summarize what is provided
- You MAY use lightweight markdown in the summary strings: **bold** for emphasis, bullet points (- item or * item), numbered lists (1. item), and line breaks for paragraph separation

Return a valid JSON object with exactly this structure (no markdown code blocks around the JSON itself):
{
  "executiveSummary": "string - your executive summary across all submissions",
  "perRecipient": [
    {
      "recipientName": "string - exact recipient name from input",
      "summary": "string - brief summary for this recipient's submission"
    }
  ]
}

Ensure every recipient in the input appears exactly once in perRecipient, with matching recipientName.`

/** Parsed AI response structure */
export interface CollectionSummaryResponse {
  executiveSummary: string
  perRecipient: Array<{ recipientName: string; summary: string }>
}

/**
 * User prompt template for collection summary
 */
export const COLLECTION_SUMMARY_USER_PROMPT = `Summarize the following Excel Collection submissions. Each section below is one team member's completed response.

${'{formattedData}'}

Provide the executive summary and per-recipient breakdown as specified.`
