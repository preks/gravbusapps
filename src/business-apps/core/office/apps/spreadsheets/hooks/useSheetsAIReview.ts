import { useCallback, useMemo, useState } from 'react'
import type { PromptManagerClient } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { getPromptManagerDocumentId } from '../utils/promptManagerModelId'
import type { SpreadsheetColumn } from '../types'
import type { SheetsAIReviewResponse } from '../prompts/sheets-ai-review'
import {
  SHEETS_AI_REVIEW_SYSTEM_PROMPT,
  buildSheetsAIReviewUserPrompt,
  parseSheetsAIReviewResponse
} from '../prompts/sheets-ai-review'
import { selectPreferredModel } from '../utils/aiModelSelection'

interface UseSheetsAIReviewParams {
  promptClient: PromptManagerClient
  sheetName: string
  columns: SpreadsheetColumn[]
  sheetData: Array<Record<string, unknown>>
}

interface UseSheetsAIReviewResult {
  review: SheetsAIReviewResponse | null
  lastReviewedAt: string | null
  isRunning: boolean
  error: string | null
  runReview: () => Promise<void>
}

const fallbackReview = (
  sheetName: string,
  columns: SpreadsheetColumn[],
  rows: Array<Record<string, unknown>>
): SheetsAIReviewResponse => {
  const missingRatio = (() => {
    const total = Math.max(1, rows.length * Math.max(columns.length, 1))
    let empty = 0
    rows.forEach(row => {
      columns.forEach(column => {
        const value = row[column.name]
        if (value === undefined || value === null || String(value).trim() === '') empty += 1
      })
    })
    return empty / total
  })()

  const score = Math.max(40, Math.min(95, Math.round((1 - missingRatio) * 100)))
  return {
    overallScore: score,
    summary: `${sheetName} review completed from local checks. Data quality is ${score >= 80 ? 'generally good' : 'mixed'} based on completeness.`,
    dimensions: [
      {
        label: 'Tone',
        score: Math.max(50, score - 8),
        insight: 'Mostly neutral/tabular values with limited free-text ambiguity.'
      },
      {
        label: 'Structure',
        score: score,
        insight: 'Columns appear structurally consistent for transactional reporting.'
      },
      {
        label: 'Consistency',
        score: Math.max(45, score - 10),
        insight: 'Potential inconsistency increases when many cells are empty.'
      },
      {
        label: 'Accuracy',
        score: Math.max(45, score - 12),
        insight: 'Accuracy confidence is moderate without source-of-truth validation.'
      }
    ]
  }
}

export const useSheetsAIReview = ({
  promptClient,
  sheetName,
  columns,
  sheetData
}: UseSheetsAIReviewParams): UseSheetsAIReviewResult => {
  const [review, setReview] = useState<SheetsAIReviewResponse | null>(null)
  const [lastReviewedAt, setLastReviewedAt] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fallback = useMemo(() => fallbackReview(sheetName, columns, sheetData), [columns, sheetData, sheetName])

  const runReview = useCallback(async () => {
    setError(null)
    setIsRunning(true)
    try {
      const selectedModel = await selectPreferredModel(promptClient)
      const modelId = getPromptManagerDocumentId(selectedModel)
      if (!modelId) {
        throw new Error('Selected AI model has no document id')
      }

      const formData = new FormData()
      formData.append('model_id', modelId)
      formData.append('system_content', SHEETS_AI_REVIEW_SYSTEM_PROMPT)
      formData.append('user_content', buildSheetsAIReviewUserPrompt(sheetName, columns, sheetData))
      formData.append('model_settings', JSON.stringify({}))

      const response = await promptClient.executePrompt(formData)
      const parsed = parseSheetsAIReviewResponse(response.content)
      setReview(parsed ?? fallback)
      if (!parsed) {
        setError('AI response format was invalid; showing fallback review.')
      }
    } catch (reviewError) {
      setReview(fallback)
      setError(reviewError instanceof Error ? reviewError.message : 'Failed to run smart review')
    } finally {
      setLastReviewedAt(new Date().toISOString())
      setIsRunning(false)
    }
  }, [columns, fallback, promptClient, sheetData, sheetName])

  return {
    review,
    lastReviewedAt,
    isRunning,
    error,
    runReview
  }
}
