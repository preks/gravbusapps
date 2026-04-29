import { useCallback, useMemo, useState } from 'react'
import type { PromptManagerClient } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { getPromptManagerDocumentId } from '../utils/promptManagerModelId'
import type { SpreadsheetColumn } from '../types'
import type { SheetsAIAnalyzeResponse } from '../prompts/sheets-ai-analyze'
import {
  SHEETS_AI_ANALYZE_SYSTEM_PROMPT,
  buildSheetsAIAnalyzeUserPrompt,
  parseSheetsAIAnalyzeResponse
} from '../prompts/sheets-ai-analyze'
import { selectPreferredModel } from '../utils/aiModelSelection'
import { withLanguageDirective } from '../utils/aiResponseLanguage'

interface UseSheetsAIAnalyzeParams {
  promptClient: PromptManagerClient
  sheetName: string
  columns: SpreadsheetColumn[]
  sheetData: Array<Record<string, unknown>>
  locale?: string
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
  promptClient,
  sheetName,
  columns,
  sheetData,
  locale
}: UseSheetsAIAnalyzeParams): UseSheetsAIAnalyzeResult => {
  const [result, setResult] = useState<SheetsAIAnalyzeResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fallback = useMemo(() => buildFallbackAnalysis(columns, sheetData, sheetName), [columns, sheetData, sheetName])

  const runAnalysis = useCallback(async () => {
    setError(null)
    setIsLoading(true)
    try {
      const selectedModel = await selectPreferredModel(promptClient)
      const modelId = getPromptManagerDocumentId(selectedModel)
      if (!modelId) {
        throw new Error('Selected AI model has no document id')
      }

      const formData = new FormData()
      formData.append('model_id', modelId)
      formData.append('system_content', withLanguageDirective(SHEETS_AI_ANALYZE_SYSTEM_PROMPT, locale))
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
  }, [columns, fallback, locale, promptClient, sheetData, sheetName])

  return {
    result,
    isLoading,
    error,
    runAnalysis
  }
}
