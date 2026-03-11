import { useCallback, useMemo, useState } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { SpreadsheetColumn } from '../types'
import type { SheetsAIAnalyzeResponse } from '../prompts/sheets-ai-analyze'
import {
  SHEETS_AI_ANALYZE_SYSTEM_PROMPT,
  buildSheetsAIAnalyzeUserPrompt,
  parseSheetsAIAnalyzeResponse
} from '../prompts/sheets-ai-analyze'

const PREFERRED_MODEL_ID = '6799beda3544ce9d4dfaa322'

interface UseSheetsAIAnalyzeParams {
  accessToken: string
  sheetName: string
  columns: SpreadsheetColumn[]
  sheetData: Array<Record<string, unknown>>
}

interface UseSheetsAIAnalyzeResult {
  result: SheetsAIAnalyzeResponse | null
  isLoading: boolean
  error: string | null
  runAnalysis: () => Promise<void>
}

const buildFallbackAnalysis = (
  columns: SpreadsheetColumn[],
  rows: Array<Record<string, unknown>>,
  sheetName: string
): SheetsAIAnalyzeResponse => {
  const totalCells = Math.max(rows.length * Math.max(columns.length, 1), 1)
  let nonEmpty = 0
  rows.forEach(row => {
    columns.forEach(column => {
      const value = row[column.name]
      if (value !== undefined && value !== null && String(value).trim() !== '') nonEmpty += 1
    })
  })
  const completeness = Math.round((nonEmpty / totalCells) * 100)
  const anomalies = []
  if (completeness < 85) {
    anomalies.push({
      title: 'Missing values detected',
      severity: completeness < 60 ? ('high' as const) : ('medium' as const),
      detail: `Approximately ${100 - completeness}% of cells are empty.`
    })
  }
  if (rows.length > 0 && columns.length > 0) {
    const duplicateRate = (() => {
      const firstCol = columns[0].name
      const values = rows.map(row => String(row[firstCol] ?? '')).filter(Boolean)
      if (!values.length) return 0
      return 1 - new Set(values).size / values.length
    })()
    if (duplicateRate > 0.25) {
      anomalies.push({
        title: 'High duplicate ratio',
        severity: duplicateRate > 0.5 ? ('high' as const) : ('medium' as const),
        detail: `Potential duplicate records in ${columns[0].name}.`
      })
    }
  }
  return {
    anomalies,
    narrative: `${sheetName} has ${rows.length} rows and ${columns.length} columns. Basic checks suggest ${anomalies.length > 0 ? 'data quality risks' : 'no severe quality issues'} based on completeness and duplication patterns.`,
    metrics: {
      completeness,
      consistency: Math.max(40, Math.min(100, 100 - anomalies.length * 15)),
      validity: Math.max(35, Math.min(100, 95 - anomalies.length * 12))
    }
  }
}

export const useSheetsAIAnalyze = ({
  accessToken,
  sheetName,
  columns,
  sheetData
}: UseSheetsAIAnalyzeParams): UseSheetsAIAnalyzeResult => {
  const promptClient = usePromptManagerClient(accessToken)
  const [result, setResult] = useState<SheetsAIAnalyzeResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fallback = useMemo(() => buildFallbackAnalysis(columns, sheetData, sheetName), [columns, sheetData, sheetName])

  const runAnalysis = useCallback(async () => {
    setError(null)
    setIsLoading(true)
    try {
      const modelsResponse = await promptClient.getAiModels({
        limit: 10,
        offset: 0,
        returnTotalRecords: false
      })
      const selectedModel =
        modelsResponse.data?.find(model => model._id === PREFERRED_MODEL_ID) ??
        modelsResponse.data?.find(model => model.name.toLowerCase().includes('gpt-4')) ??
        modelsResponse.data?.[0]
      if (!selectedModel) throw new Error('No AI models available')

      const formData = new FormData()
      formData.append('model_id', selectedModel._id)
      formData.append('system_content', SHEETS_AI_ANALYZE_SYSTEM_PROMPT)
      formData.append('user_content', buildSheetsAIAnalyzeUserPrompt(sheetName, columns, sheetData))
      formData.append('model_settings', JSON.stringify({}))

      const response = await promptClient.executePrompt(formData)
      const parsed = parseSheetsAIAnalyzeResponse(response.content)
      setResult(parsed ?? fallback)
      if (!parsed) {
        setError('AI response format was invalid; showing fallback analysis.')
      }
    } catch (aiError) {
      setResult(fallback)
      setError(aiError instanceof Error ? aiError.message : 'Failed to analyze sheet')
    } finally {
      setIsLoading(false)
    }
  }, [columns, fallback, promptClient, sheetData, sheetName])

  return {
    result,
    isLoading,
    error,
    runAnalysis
  }
}
