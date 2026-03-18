import { useCallback, useMemo, useState } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { SpreadsheetColumn } from '../types'
import { summarizeColumn, isNumericColumn } from '../utils/analyticsEngine'

const PREFERRED_MODEL_ID = '6799beda3544ce9d4dfaa322'
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

const INSIGHTS_SYSTEM_PROMPT = `You are a spreadsheet analytics assistant.
Return ONLY JSON with shape: {"insights": string[]}.
Provide max 6 concise insights based on trends, anomalies, and category skews.`

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

  const localSummary = useMemo<SpreadsheetSummaryResult>(() => {
    const cards = columns.slice(0, 8).map(column => summarizeColumn(sheetData, column.name))
    return {
      overview: `${sheetData.length} rows across ${columns.length} columns.`,
      cards
    }
  }, [columns, sheetData])

  const localInsights = useMemo<string[]>(() => {
    const numeric = columns.filter(isNumericColumn)
    const suggestions: string[] = []

    for (const column of numeric.slice(0, 4)) {
      const values = sheetData
        .map(row => row[column.name])
        .map(value => (typeof value === 'number' ? value : Number(String(value ?? '').replaceAll(',', ''))))
        .filter(v => Number.isFinite(v))

      if (values.length < 2) continue
      const firstHalf = values.slice(0, Math.ceil(values.length / 2))
      const secondHalf = values.slice(Math.ceil(values.length / 2))
      const firstAvg = firstHalf.reduce((acc, v) => acc + v, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((acc, v) => acc + v, 0) / secondHalf.length
      const delta = firstAvg === 0 ? 0 : ((secondAvg - firstAvg) / Math.abs(firstAvg)) * 100

      if (Math.abs(delta) >= 8) {
        suggestions.push(
          `${column.label}: ${delta > 0 ? 'increasing' : 'decreasing'} trend (${delta.toFixed(1)}%) between early and later rows.`
        )
      }
    }

    if (suggestions.length === 0) {
      suggestions.push('No strong directional trend detected in numeric columns with current data sample.')
    }
    return suggestions.slice(0, 6)
  }, [columns, sheetData])

  const executePrompt = useCallback(
    async (systemPrompt: string, userPrompt: string): Promise<unknown> => {
      const modelsResponse = await promptClient.getAiModels({
        limit: 10,
        offset: 0,
        returnTotalRecords: false
      })
      if (!modelsResponse.data?.length) throw new Error('No AI models available')

      const preferredModel = modelsResponse.data.find(m => m._id === PREFERRED_MODEL_ID)
      const gpt4Model = modelsResponse.data.find(m => m.name.toLowerCase().includes('gpt-4'))
      const selectedModel = preferredModel || gpt4Model || modelsResponse.data[0]

      const formData = new FormData()
      formData.append('model_id', selectedModel._id)
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
      const promptPayload = formatSampleForPrompt(sheetName, columns, sheetData)
      const content = await executePrompt(INSIGHTS_SYSTEM_PROMPT, `Generate insights for this sheet:\n${promptPayload}`)
      const parsed = safeJsonParse<{ insights?: string[] }>(
        typeof content === 'string' ? content : JSON.stringify(content)
      )
      const next = parsed?.insights?.filter(Boolean) ?? []
      setInsights(next.length > 0 ? next.slice(0, 6) : localInsights)
    } catch (error) {
      setInsights(localInsights)
      setInsightsError(error instanceof Error ? error.message : 'Failed to generate AI insights')
    } finally {
      setIsLoadingInsights(false)
    }
  }, [columns, executePrompt, localInsights, sheetData, sheetName])

  const generateSummary = useCallback(async () => {
    setIsLoadingSummary(true)
    setSummaryError(null)
    try {
      const promptPayload = formatSampleForPrompt(sheetName, columns, sheetData)
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
  }, [columns, executePrompt, localSummary, sheetData, sheetName])

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
