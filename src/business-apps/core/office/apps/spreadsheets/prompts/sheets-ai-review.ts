import type { SpreadsheetColumn } from '../types'

export interface SheetsAIReviewDimension {
  label: string
  score: number
  insight: string
}

export interface SheetsAIReviewResponse {
  overallScore: number
  summary: string
  dimensions: SheetsAIReviewDimension[]
}

export const SHEETS_AI_REVIEW_SYSTEM_PROMPT = `You are Sheets AI review assistant.
Return ONLY valid JSON with shape:
{
  "overallScore": 0-100,
  "summary":"...",
  "dimensions":[{"label":"Tone|Structure|Consistency|Accuracy","score":0-100,"insight":"..."}]
}
Scores should reflect quality and reporting readiness.`

export const buildSheetsAIReviewUserPrompt = (
  sheetName: string,
  columns: SpreadsheetColumn[],
  rows: Array<Record<string, unknown>>
): string =>
  JSON.stringify(
    {
      sheetName,
      rowCount: rows.length,
      columns: columns.map(column => ({
        name: column.name,
        label: column.label,
        type: column.type
      })),
      sampleRows: rows.slice(0, 120)
    },
    null,
    2
  )

const clamp = (value: number): number => Math.max(0, Math.min(100, Math.round(value)))

export const parseSheetsAIReviewResponse = (value: unknown): SheetsAIReviewResponse | null => {
  const raw = typeof value === 'string' ? value.trim() : JSON.stringify(value ?? null)
  const jsonCandidate = raw.startsWith('```')
    ? raw.replaceAll(/^```(?:json)?\s*\n?/g, '').replaceAll(/\n?```\s*$/g, '')
    : raw
  let parsed: Partial<SheetsAIReviewResponse> | null = null
  try {
    parsed = JSON.parse(jsonCandidate) as Partial<SheetsAIReviewResponse>
  } catch {
    parsed = null
  }
  if (!parsed) return null
  return {
    overallScore: clamp(Number(parsed.overallScore ?? 0)),
    summary: String(parsed.summary ?? ''),
    dimensions: Array.isArray(parsed.dimensions)
      ? parsed.dimensions.slice(0, 8).map(d => ({
          label: String((d as SheetsAIReviewDimension).label ?? 'Dimension'),
          score: clamp(Number((d as SheetsAIReviewDimension).score ?? 0)),
          insight: String((d as SheetsAIReviewDimension).insight ?? '')
        }))
      : []
  }
}
