import type { SpreadsheetColumn } from '../types'

export interface SheetsAIAnomaly {
  title: string
  severity: 'low' | 'medium' | 'high'
  detail: string
}

export interface SheetsAIAnalyzeResponse {
  anomalies: SheetsAIAnomaly[]
  narrative: string
  metrics: {
    completeness: number
    consistency: number
    validity: number
  }
}

export const SHEETS_AI_ANALYZE_SYSTEM_PROMPT = `You are Sheets AI Analyze assistant.
Return ONLY valid JSON with this exact shape:
{
  "anomalies":[{"title":"...", "severity":"low|medium|high", "detail":"..."}],
  "narrative":"...",
  "metrics":{"completeness":0-100,"consistency":0-100,"validity":0-100}
}
Focus on data quality and business reporting risk.`

export const buildSheetsAIAnalyzeUserPrompt = (
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

const safeParse = <T>(value: unknown): T | null => {
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

export const parseSheetsAIAnalyzeResponse = (value: unknown): SheetsAIAnalyzeResponse | null => {
  const parsed = safeParse<Partial<SheetsAIAnalyzeResponse>>(typeof value === 'string' ? value : JSON.stringify(value))
  if (!parsed) return null
  return {
    anomalies: Array.isArray(parsed.anomalies)
      ? parsed.anomalies.slice(0, 10).map(anomaly => ({
          title: String((anomaly as SheetsAIAnomaly).title ?? 'Anomaly'),
          severity: (['low', 'medium', 'high'].includes(String((anomaly as SheetsAIAnomaly).severity))
            ? (anomaly as SheetsAIAnomaly).severity
            : 'medium') as 'low' | 'medium' | 'high',
          detail: String((anomaly as SheetsAIAnomaly).detail ?? '')
        }))
      : [],
    narrative: String(parsed.narrative ?? ''),
    metrics: {
      completeness: clamp(Number(parsed.metrics?.completeness ?? 0)),
      consistency: clamp(Number(parsed.metrics?.consistency ?? 0)),
      validity: clamp(Number(parsed.metrics?.validity ?? 0))
    }
  }
}
