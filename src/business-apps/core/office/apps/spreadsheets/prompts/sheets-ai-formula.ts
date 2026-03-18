import type { SpreadsheetColumn } from '../types'

export interface SheetsAIFormulaResponse {
  formula: string
  explanation: string
}

export const SHEETS_AI_FORMULA_SYSTEM_PROMPT = `You are Sheets AI Formula assistant.
Return ONLY valid JSON with shape:
{"formula":"=...", "explanation":"..."}.
Generate Excel-style formulas using the provided columns and request.
Use exact bounded data ranges (e.g. B2:B41) and NEVER full-column references like B:B.
Do not include markdown or extra keys.`

export const buildSheetsAIFormulaUserPrompt = (
  intent: string,
  columns: SpreadsheetColumn[],
  sampleRows: Array<Record<string, unknown>>
): string =>
  JSON.stringify(
    {
      task: 'Generate spreadsheet formula from user intent',
      intent,
      columns: columns.map(column => ({
        id: column.id,
        name: column.name,
        label: column.label,
        type: column.type
      })),
      sampleRows: sampleRows.slice(0, 40)
    },
    null,
    2
  )

const safeParseJson = <T>(value: unknown): T | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  const jsonCandidate = trimmed.startsWith('```')
    ? trimmed.replaceAll(/^```(?:json)?\s*\n?/g, '').replaceAll(/\n?```\s*$/g, '')
    : trimmed
  try {
    return JSON.parse(jsonCandidate) as T
  } catch {
    return null
  }
}

export const parseSheetsAIFormulaResponse = (value: unknown): SheetsAIFormulaResponse | null => {
  const parsed = safeParseJson<Partial<SheetsAIFormulaResponse>>(
    typeof value === 'string' ? value : JSON.stringify(value ?? null)
  )
  if (!parsed?.formula) return null
  return {
    formula: parsed.formula.trim(),
    explanation: String(parsed.explanation ?? 'Generated formula')
  }
}
