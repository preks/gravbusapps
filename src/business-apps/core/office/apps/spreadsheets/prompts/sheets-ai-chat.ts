import type { SpreadsheetColumn } from '../types'

export const SHEETS_AI_CHAT_SYSTEM_PROMPT = `You are Sheets AI Chat assistant.
Answer questions using only the sheet context provided.
Be concise, practical, and mention assumptions when data is incomplete.`

export const buildSheetsAIChatUserPrompt = (
  question: string,
  sheetName: string,
  columns: SpreadsheetColumn[],
  rows: Array<Record<string, unknown>>
): string =>
  JSON.stringify(
    {
      sheetName,
      question,
      rowCount: rows.length,
      columns: columns.map(column => ({
        name: column.name,
        label: column.label,
        type: column.type
      })),
      sampleRows: rows.slice(0, 80)
    },
    null,
    2
  )
