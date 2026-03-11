/**
 * useExcelCollectionSummary Hook
 *
 * Orchestrates: extract copy IDs → fetch each copy → format payload →
 * call Prompt Manager → parse response.
 */

import { useState, useCallback } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { SpreadsheetApiService } from '../services/SpreadsheetApiService'
import { extractCopyAppIdsFromRows } from '../utils/collectionSummaryUtils'
import {
  COLLECTION_SUMMARY_SYSTEM_PROMPT,
  COLLECTION_SUMMARY_USER_PROMPT,
  formatCopiesForPrompt,
  type CollectionSummaryResponse
} from '../prompts/collection-summary'
import type { SpreadsheetColumn } from '../types/spreadsheet'
import type { SpreadsheetApp } from '../types/spreadsheet'

const MAX_COPIES = 20
const PREFERRED_MODEL_ID = '6799beda3544ce9d4dfaa322'

const parseSummaryContent = (content: unknown): CollectionSummaryResponse => {
  let normalized = typeof content === 'string' ? content : JSON.stringify(content)
  if (normalized.trim().startsWith('```')) {
    normalized = normalized.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
  }
  return JSON.parse(normalized) as CollectionSummaryResponse
}

export interface ExcelCollectionSummaryResult {
  executiveSummary: string
  perRecipient: Array<{ recipientName: string; summary: string; avatar?: string }>
}

export interface UseExcelCollectionSummaryParams {
  accessToken: string
  sheetData: Record<string, unknown>[]
  columns: SpreadsheetColumn[]
}

export type SummarizeResult =
  | { success: true; result: ExcelCollectionSummaryResult }
  | { success: false; error: string }

export interface UseExcelCollectionSummaryResult {
  summarize: () => Promise<SummarizeResult>
  isSummarizing: boolean
  summary: ExcelCollectionSummaryResult | null
  error: string | null
  hasEligibleRows: boolean
}

export function useExcelCollectionSummary({
  accessToken,
  sheetData,
  columns
}: UseExcelCollectionSummaryParams): UseExcelCollectionSummaryResult {
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summary, setSummary] = useState<ExcelCollectionSummaryResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const promptClient = usePromptManagerClient(accessToken)

  const copyInfos = extractCopyAppIdsFromRows(sheetData, columns)
  const hasEligibleRows = copyInfos.length > 0

  const summarize = useCallback(async (): Promise<SummarizeResult> => {
    const fail = (message: string): SummarizeResult => {
      setError(message)
      setIsSummarizing(false)
      return { success: false, error: message }
    }

    if (!accessToken || copyInfos.length === 0) {
      const err = 'No completed submissions with responses to summarize'
      setError(err)
      return { success: false, error: err }
    }

    if (copyInfos.length > MAX_COPIES) {
      const err = `Too many submissions (${copyInfos.length}). Maximum ${MAX_COPIES} can be summarized at once.`
      setError(err)
      return { success: false, error: err }
    }

    setIsSummarizing(true)
    setError(null)

    try {
      const copiesToFetch = copyInfos.slice(0, MAX_COPIES)
      const copies: Array<{ app: SpreadsheetApp; recipientName: string }> = []

      for (const { copyAppId, recipientName } of copiesToFetch) {
        const app = await SpreadsheetApiService.getApp(copyAppId)
        if (!app) {
          return fail(`Could not load response for ${recipientName}`)
        }

        if (!app.sheets?.length || !app.sheets.some(s => (s.data?.length ?? 0) > 0)) {
          for (const sheet of app.sheets ?? []) {
            const rows = await SpreadsheetApiService.getRows(copyAppId, sheet.id)
            sheet.data = rows
          }
        }

        copies.push({ app, recipientName })
      }

      const formattedData = formatCopiesForPrompt(copies)
      const userPrompt = COLLECTION_SUMMARY_USER_PROMPT.replace('{formattedData}', formattedData)

      let modelsResponse
      try {
        modelsResponse = await promptClient.getAiModels({
          limit: 10,
          offset: 0,
          returnTotalRecords: false
        })
      } catch {
        return fail('AI service unavailable')
      }

      if (!modelsResponse.data?.length) {
        return fail('No AI models available')
      }

      const preferredModel = modelsResponse.data.find(m => m._id === PREFERRED_MODEL_ID)
      const gpt4Model = modelsResponse.data.find(m => m.name.toLowerCase().includes('gpt-4'))
      const selectedModel = preferredModel || gpt4Model || modelsResponse.data[0]
      const modelId = selectedModel._id

      const formData = new FormData()
      formData.append('model_id', modelId)
      formData.append('system_content', COLLECTION_SUMMARY_SYSTEM_PROMPT)
      formData.append('user_content', userPrompt)
      formData.append('model_settings', JSON.stringify({}))

      const response = await promptClient.executePrompt(formData)

      if (!response.content) {
        return fail('No response from AI')
      }

      let parsed: CollectionSummaryResponse
      try {
        parsed = parseSummaryContent(response.content)
      } catch {
        return fail('Failed to parse AI response')
      }

      const avatarByRecipient = new Map<string, string>()
      for (const info of copiesToFetch) {
        if (info.avatar) {
          avatarByRecipient.set(info.recipientName, info.avatar)
        }
      }

      const enrichedPerRecipient = (parsed.perRecipient ?? []).map(item => ({
        recipientName: item.recipientName,
        summary: item.summary,
        avatar: avatarByRecipient.get(item.recipientName)
      }))

      const result: ExcelCollectionSummaryResult = {
        executiveSummary: parsed.executiveSummary ?? '',
        perRecipient: enrichedPerRecipient
      }

      setSummary(result)
      setIsSummarizing(false)
      return { success: true, result }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to summarize'
      setError(message)
      setIsSummarizing(false)
      return { success: false, error: message }
    }
  }, [accessToken, copyInfos, promptClient])

  return {
    summarize,
    isSummarizing,
    summary,
    error,
    hasEligibleRows
  }
}
