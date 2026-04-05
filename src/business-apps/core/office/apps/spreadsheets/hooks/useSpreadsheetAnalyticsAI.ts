import { useCallback, useMemo, useState } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { getPromptManagerDocumentId } from '../utils/promptManagerModelId'
import type { SpreadsheetColumn } from '../types'
import { summarizeColumn, isNumericColumn } from '../utils/analyticsEngine'
import { selectPreferredModel } from '../utils/aiModelSelection'
const SAMPLE_LIMIT = 120

export interface SpreadsheetSummaryCard {
  columnName: string
  count: number
  unique: number
  mode: string
  topValues: Array<{ label: string; count: number }>
}

export interface SpreadsheetSummaryResult {
  overview: string
  cards: SpreadsheetSummaryCard[]
}

export interface UseSpreadsheetAnalyticsAIResult {
  insights: string[]
  summary: SpreadsheetSummaryResult | null
  insightsError: string | null
  summaryError: string | null
  isLoadingInsights: boolean
  isLoadingSummary: boolean
  generateInsights: () => Promise<void>
  generateSummary: () => Promise<void>
}

interface UseSpreadsheetAnalyticsAIParams {
  accessToken: string
  sheetName: string
  columns: SpreadsheetColumn[]
  sheetData: Array<Record<string, unknown>>
}

const INSIGHTS_SYSTEM_PROMPT = `You are a senior business analyst writing for executives.
Return ONLY JSON with shape:
{
  "summary": string,
  "insights": string[],
  "executiveDirection": string[]
}

Rules:
- Focus on business meaning: trends, performance drivers, risk signals, and opportunities.
- Include practical interpretation, not just descriptive stats.
- "summary" must be 2-3 concise sentences.
- "insights" must have up to 5 concrete observations tied to business outcomes.
- "executiveDirection" must have up to 3 clear recommended actions.
- Do NOT focus on data hygiene details (missing cells, completeness scores, empty columns) unless it materially changes a business decision.
- Use neutral, evidence-based language and avoid unsupported claims.`

const SUMMARY_SYSTEM_PROMPT = `You are a spreadsheet analytics assistant.
Return ONLY JSON with shape:
{"overview": string, "cards":[{"columnName":string,"count":number,"unique":number,"mode":string,"topValues":[{"label":string,"count":number}]}]}.
Use objective summaries only.`

const safeJsonParse = <T>(input: unknown): T | null => {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  const raw = trimmed.startsWith('```') ? trimmed.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '') : trimmed
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

const getCellText = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'object') {
    const objectValue = value as { v?: unknown; m?: unknown; f?: unknown }
    if (objectValue.v !== undefined && objectValue.v !== null) return getCellText(objectValue.v)
    if (objectValue.m !== undefined && objectValue.m !== null) return getCellText(objectValue.m)
    if (typeof objectValue.f === 'string') return objectValue.f.trim()
  }
  return ''
}

const hasMeaningfulValue = (value: unknown): boolean => getCellText(value).length > 0

const getPopulatedInsightContext = (
  columns: SpreadsheetColumn[],
  rows: Array<Record<string, unknown>>
): { columns: SpreadsheetColumn[]; rows: Array<Record<string, unknown>> } => {
  const populatedColumns = columns.filter(column => rows.some(row => hasMeaningfulValue(row[column.name])))
  if (populatedColumns.length === 0) return { columns: [], rows: [] }

  const normalizedRows = rows
    .map(row => {
      const next: Record<string, unknown> = {}
      populatedColumns.forEach(column => {
        const raw = row[column.name]
        if (hasMeaningfulValue(raw)) next[column.name] = raw
      })
      return next
    })
    .filter(row => Object.keys(row).length > 0)

  return { columns: populatedColumns, rows: normalizedRows }
}

const formatSampleForPrompt = (
  sheetName: string,
  columns: SpreadsheetColumn[],
  rows: Array<Record<string, unknown>>
): string => {
  const included = rows.slice(0, SAMPLE_LIMIT).map(row => {
    const entry: Record<string, unknown> = {}
    columns.forEach(column => {
      entry[column.name] = row[column.name]
    })
    return entry
  })
  return JSON.stringify(
    {
      sheetName,
      rowCount: rows.length,
      columns: columns.map(c => ({ name: c.name, label: c.label, type: c.type })),
      sampleRows: included
    },
    null,
    2
  )
}

const toNumeric = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.replaceAll(',', '').trim())
    return Number.isFinite(parsed) ? parsed : null
  }
  if (typeof value === 'object' && value && 'v' in value) {
    return toNumeric((value as { v?: unknown }).v)
  }
  return null
}

interface MetricTrend {
  name: string
  firstAvg: number
  secondAvg: number
  deltaPct: number
}

const formatDelta = (deltaPct: number): string => `${deltaPct > 0 ? '+' : ''}${deltaPct.toFixed(1)}%`

const inferBusinessDomain = (sheetName: string, columns: SpreadsheetColumn[]): string => {
  const text = `${sheetName} ${columns.map(col => `${col.label} ${col.name}`).join(' ')}`.toLowerCase()
  if (/sales|revenue|arr|mrr|pipeline|deal|quota/.test(text)) return 'sales performance'
  if (/cost|expense|budget|invoice|margin|profit/.test(text)) return 'financial performance'
  if (/lead|campaign|ctr|conversion|funnel/.test(text)) return 'marketing performance'
  if (/ticket|incident|sla|response|support/.test(text)) return 'support operations'
  if (/employee|hiring|attrition|headcount|absence/.test(text)) return 'workforce performance'
  return 'business performance'
}

const buildBusinessFallbackInsights = (
  sheetName: string,
  columns: SpreadsheetColumn[],
  sheetData: Array<Record<string, unknown>>
): string[] => {
  const numericColumns = columns.filter(isNumericColumn)
  const trends: MetricTrend[] = []

  for (const column of numericColumns) {
    const values = sheetData.map(row => toNumeric(row[column.name])).filter((v): v is number => v !== null)
    if (values.length < 3) continue
    const midpoint = Math.ceil(values.length / 2)
    const firstHalf = values.slice(0, midpoint)
    const secondHalf = values.slice(midpoint)
    const firstAvg = firstHalf.reduce((acc, v) => acc + v, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((acc, v) => acc + v, 0) / secondHalf.length
    if (!Number.isFinite(firstAvg) || !Number.isFinite(secondAvg)) continue
    const denominator = Math.abs(firstAvg) < 0.0001 ? 1 : Math.abs(firstAvg)
    const deltaPct = ((secondAvg - firstAvg) / denominator) * 100
    trends.push({
      name: column.label || column.name,
      firstAvg,
      secondAvg,
      deltaPct
    })
  }

  const sortedByMagnitude = [...trends].sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct))
  const topTrends = sortedByMagnitude.slice(0, 3)
  const positiveCount = trends.filter(trend => trend.deltaPct >= 5).length
  const negativeCount = trends.filter(trend => trend.deltaPct <= -5).length
  const domain = inferBusinessDomain(sheetName, columns)

  const output: string[] = []
  output.push(
    `Executive summary: Based on ${sheetData.length} records, this ${domain} sheet shows ${
      topTrends.length > 0 ? 'meaningful movement in key metrics' : 'no strong directional movement in numeric metrics'
    }. ${
      positiveCount > negativeCount
        ? 'Overall momentum is positive across more indicators than declining ones.'
        : negativeCount > positiveCount
          ? 'More indicators are declining than improving, suggesting pressure on current performance.'
          : 'Performance signals are mixed and should be monitored with targeted follow-up.'
    }`
  )

  if (topTrends.length > 0) {
    topTrends.forEach(trend => {
      output.push(
        `${trend.name} moved from an average of ${trend.firstAvg.toFixed(2)} to ${trend.secondAvg.toFixed(2)} (${formatDelta(trend.deltaPct)}), indicating ${
          trend.deltaPct >= 0 ? 'acceleration in recent periods' : 'softening in recent periods'
        }.`
      )
    })
  } else {
    output.push(
      'No single metric shows a strong directional change yet; current variability suggests a stable baseline rather than a breakout trend.'
    )
  }

  const strongest = topTrends[0]
  if (strongest) {
    if (strongest.deltaPct >= 8) {
      output.push(
        `Executive direction: Double down on what is driving ${strongest.name} upward, and reallocate effort toward segments that best replicate this trend.`
      )
    } else if (strongest.deltaPct <= -8) {
      output.push(
        `Executive direction: Prioritize root-cause analysis for the decline in ${strongest.name}, and launch a short-cycle recovery plan with weekly checkpoints.`
      )
    } else {
      output.push(
        'Executive direction: Keep current strategy but run focused experiments by segment to identify which levers can create clearer upside.'
      )
    }
  } else {
    output.push(
      'Executive direction: Define 1-2 primary KPIs and track them weekly to improve signal quality for strategic decisions.'
    )
  }

  return output.slice(0, 8)
}

export function useSpreadsheetAnalyticsAI({
  accessToken,
  sheetName,
  columns,
  sheetData
}: UseSpreadsheetAnalyticsAIParams): UseSpreadsheetAnalyticsAIResult {
  const promptClient = usePromptManagerClient(accessToken)
  const [insights, setInsights] = useState<string[]>([])
  const [summary, setSummary] = useState<SpreadsheetSummaryResult | null>(null)
  const [isLoadingInsights, setIsLoadingInsights] = useState(false)
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
  const [insightsError, setInsightsError] = useState<string | null>(null)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const populatedContext = useMemo(() => getPopulatedInsightContext(columns, sheetData), [columns, sheetData])

  const localSummary = useMemo<SpreadsheetSummaryResult>(() => {
    const cards = populatedContext.columns
      .slice(0, 8)
      .map(column => summarizeColumn(populatedContext.rows, column.name))
    return {
      overview: `${populatedContext.rows.length} rows across ${populatedContext.columns.length} populated columns.`,
      cards
    }
  }, [populatedContext.columns, populatedContext.rows])

  const localInsights = useMemo<string[]>(() => {
    if (populatedContext.columns.length === 0 || populatedContext.rows.length === 0) {
      return ['Executive summary: There is not enough populated data yet to infer business conclusions.']
    }
    return buildBusinessFallbackInsights(sheetName, populatedContext.columns, populatedContext.rows)
  }, [populatedContext.columns, populatedContext.rows, sheetName])

  const executePrompt = useCallback(
    async (systemPrompt: string, userPrompt: string): Promise<unknown> => {
      const selectedModel = await selectPreferredModel(promptClient)

      const modelId = getPromptManagerDocumentId(selectedModel)
      if (!modelId) {
        throw new Error('Selected AI model has no document id')
      }
      const formData = new FormData()
      formData.append('model_id', modelId)
      formData.append('system_content', systemPrompt)
      formData.append('user_content', userPrompt)
      formData.append('model_settings', JSON.stringify({}))

      const response = await promptClient.executePrompt(formData)
      return response.content
    },
    [promptClient]
  )

  const generateInsights = useCallback(async () => {
    setIsLoadingInsights(true)
    setInsightsError(null)
    try {
      if (populatedContext.columns.length === 0 || populatedContext.rows.length === 0) {
        setInsights(['Executive summary: There is not enough populated data yet to infer business conclusions.'])
        return
      }
      const promptPayload = formatSampleForPrompt(sheetName, populatedContext.columns, populatedContext.rows)
      const content = await executePrompt(
        INSIGHTS_SYSTEM_PROMPT,
        `Generate executive business insights for this sheet.
Ignore empty columns completely and base conclusions only on populated columns and observed values.
${promptPayload}`
      )
      const parsed = safeJsonParse<{
        summary?: string
        insights?: string[]
        executiveDirection?: string[]
        executiveDirections?: string[]
      }>(typeof content === 'string' ? content : JSON.stringify(content))
      const aiInsights = parsed?.insights?.filter(Boolean) ?? []
      const aiSummary = typeof parsed?.summary === 'string' ? parsed.summary.trim() : ''
      const aiDirections = (parsed?.executiveDirection ?? parsed?.executiveDirections ?? []).filter(Boolean)
      const next = [
        ...(aiSummary ? [`Executive summary: ${aiSummary}`] : []),
        ...aiInsights,
        ...aiDirections.map(direction => `Executive direction: ${direction}`)
      ].filter(Boolean)
      setInsights(next.length > 0 ? next.slice(0, 8) : localInsights)
    } catch (error) {
      setInsights(localInsights)
      setInsightsError(error instanceof Error ? error.message : 'Failed to generate AI insights')
    } finally {
      setIsLoadingInsights(false)
    }
  }, [executePrompt, localInsights, populatedContext.columns, populatedContext.rows, sheetName])

  const generateSummary = useCallback(async () => {
    setIsLoadingSummary(true)
    setSummaryError(null)
    try {
      if (populatedContext.columns.length === 0 || populatedContext.rows.length === 0) {
        setSummary(localSummary)
        return
      }
      const promptPayload = formatSampleForPrompt(sheetName, populatedContext.columns, populatedContext.rows)
      const content = await executePrompt(
        SUMMARY_SYSTEM_PROMPT,
        `Generate summary cards for this sheet:\n${promptPayload}`
      )
      const parsed = safeJsonParse<SpreadsheetSummaryResult>(
        typeof content === 'string' ? content : JSON.stringify(content)
      )
      if (!parsed || !Array.isArray(parsed.cards)) {
        setSummary(localSummary)
      } else {
        setSummary({
          overview: parsed.overview || localSummary.overview,
          cards: parsed.cards.slice(0, 8)
        })
      }
    } catch (error) {
      setSummary(localSummary)
      setSummaryError(error instanceof Error ? error.message : 'Failed to generate AI summary')
    } finally {
      setIsLoadingSummary(false)
    }
  }, [executePrompt, localSummary, populatedContext.columns, populatedContext.rows, sheetName])

  return {
    insights,
    summary,
    insightsError,
    summaryError,
    isLoadingInsights,
    isLoadingSummary,
    generateInsights,
    generateSummary
  }
}
