/**
 * RunSummarizeWithAI
 *
 * "Summarize with AI" button for the Run Detail panel.
 * Fetches content from all completed collection copies, sends to AI, and displays the summary.
 */

import React, { useState, useCallback } from 'react'
import { AiButton, Spinner, useTranslation } from '@newwork/nw-design-system'
import { Sparkles } from 'lucide-react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { getPromptManagerDocumentId } from '../../utils/promptManagerModelId'
import { SpreadsheetApiService } from '../../services/SpreadsheetApiService'
import {
  COLLECTION_SUMMARY_SYSTEM_PROMPT,
  COLLECTION_SUMMARY_USER_PROMPT,
  formatCopiesForPrompt,
  type CollectionSummaryResponse
} from '../../prompts/collection-summary'
import type { SpreadsheetApp } from '../../types/spreadsheet'
import type { ExcelCollectionSummaryResult } from '../../hooks/useExcelCollectionSummary'
import { CollectionSummaryDialog } from './CollectionSummaryDialog'
import { selectPreferredModel } from '../../utils/aiModelSelection'
import translations from '../../_i18n'

export interface SummarizeSubmission {
  id: string
  recipientName: string
  recipientAvatar?: string
  copyAppUrl: string
  status: 'COMPLETED' | 'SENT'
}

interface RunSummarizeWithAIProps {
  accessToken: string
  submissions: SummarizeSubmission[]
  runName?: string
  'data-testid'?: string
}

const MAX_COPIES = 20

function extractAppIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    return parsed.searchParams.get('appId')
  } catch {
    return null
  }
}

function getCompletedSubmissions(submissions: SummarizeSubmission[]): SummarizeSubmission[] {
  return submissions.filter(s => s.status === 'COMPLETED').slice(0, MAX_COPIES)
}

async function hydrateSubmissionCopy(
  submission: SummarizeSubmission
): Promise<{ app: SpreadsheetApp; recipientName: string; avatar?: string } | null> {
  const appId = extractAppIdFromUrl(submission.copyAppUrl) || submission.id
  if (!appId) return null

  const app = await SpreadsheetApiService.getApp(appId)
  if (!app) return null

  if (!app.sheets?.length || !app.sheets.some(s => (s.data?.length ?? 0) > 0)) {
    for (const sheet of app.sheets ?? []) {
      const rows = await SpreadsheetApiService.getAllRows(appId, sheet.id)
      sheet.data = rows
    }
  }

  const hasContent = (app.sheets ?? []).some(sheet => (sheet.data?.length ?? 0) > 0)
  if (!hasContent) return null

  return {
    app,
    recipientName: submission.recipientName,
    avatar: submission.recipientAvatar
  }
}

async function loadCompletedCopies(submissions: SummarizeSubmission[]) {
  const copies: Array<{ app: SpreadsheetApp; recipientName: string; avatar?: string }> = []
  for (const submission of submissions) {
    const copy = await hydrateSubmissionCopy(submission)
    if (copy) copies.push(copy)
  }
  return copies
}

function parseSummaryResponseContent(content: unknown): CollectionSummaryResponse | null {
  try {
    let normalized = typeof content === 'string' ? content : JSON.stringify(content)
    if (normalized.trim().startsWith('```')) {
      normalized = normalized.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
    }
    return JSON.parse(normalized) as CollectionSummaryResponse
  } catch {
    return null
  }
}

function getAvatarByRecipient(copies: Array<{ recipientName: string; avatar?: string }>): Map<string, string> {
  const avatarByRecipient = new Map<string, string>()
  for (const copy of copies) {
    if (copy.avatar) avatarByRecipient.set(copy.recipientName, copy.avatar)
  }
  return avatarByRecipient
}

async function buildSummaryPrompt(copies: Array<{ app: SpreadsheetApp; recipientName: string }>): Promise<string> {
  if (copies.length === 0) {
    return ''
  }

  const formattedData = formatCopiesForPrompt(copies)
  return COLLECTION_SUMMARY_USER_PROMPT.replace('{formattedData}', formattedData)
}

export const RunSummarizeWithAI: React.FC<RunSummarizeWithAIProps> = ({
  accessToken,
  submissions,
  'data-testid': testId = 'run-summarize-ai'
}) => {
  const { t } = useTranslation(translations)
  const [isOpen, setIsOpen] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summary, setSummary] = useState<ExcelCollectionSummaryResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const promptClient = usePromptManagerClient(accessToken)

  const completedCount = submissions.filter(s => s.status === 'COMPLETED').length

  const handleSummarize = useCallback(async () => {
    if (!accessToken) {
      setError(t('summarize-ai-auth-missing'))
      setIsOpen(true)
      return
    }

    setIsSummarizing(true)
    setSummary(null)
    setError(null)
    setIsOpen(true)

    try {
      const completedSubmissions = getCompletedSubmissions(submissions)
      const copies = await loadCompletedCopies(completedSubmissions)

      const prompt = await buildSummaryPrompt(copies)
      if (!prompt) {
        setError(t('summarize-ai-no-submissions'))
        return
      }

      let selectedModel
      try {
        selectedModel = await selectPreferredModel(promptClient)
      } catch {
        setError(t('summarize-ai-no-models'))
        return
      }

      const modelId = getPromptManagerDocumentId(selectedModel)
      if (!modelId) {
        setError(t('summarize-ai-no-models'))
        return
      }

      const formData = new FormData()
      formData.append('model_id', modelId)
      formData.append('system_content', COLLECTION_SUMMARY_SYSTEM_PROMPT)
      formData.append('user_content', prompt)
      formData.append('model_settings', JSON.stringify({}))

      const response = await promptClient.executePrompt(formData)
      if (!response.content) {
        setError(t('summarize-ai-empty-response'))
        return
      }

      const parsed = parseSummaryResponseContent(response.content)
      if (!parsed) {
        setError(t('summarize-ai-parse-failed'))
        return
      }

      const avatarByRecipient = getAvatarByRecipient(copies)

      setSummary({
        executiveSummary: parsed.executiveSummary ?? '',
        perRecipient: (parsed.perRecipient ?? []).map(item => ({
          recipientName: item.recipientName,
          summary: item.summary,
          avatar: avatarByRecipient.get(item.recipientName)
        }))
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('summarize-ai-failed')
      setError(msg)
    } finally {
      setIsSummarizing(false)
    }
  }, [accessToken, submissions, promptClient, t])

  if (completedCount === 0) return null

  return (
    <>
      <AiButton
        size="sm"
        showIcon
        icon={isSummarizing ? <Spinner className="gba:w-4 gba:h-4" /> : <Sparkles className="gba:w-4 gba:h-4" />}
        iconPosition="before"
        onClick={handleSummarize}
        disabled={isSummarizing}
        data-testid={testId}
      >
        {t('automation-toolbar-summarize')}
      </AiButton>

      <CollectionSummaryDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        summary={summary}
        isSummarizing={isSummarizing}
        error={error}
        data-testid={`${testId}-summary-dialog`}
      />
    </>
  )
}

export default RunSummarizeWithAI
