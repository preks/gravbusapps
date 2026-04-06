/**
 * EmailThreadSummary - Premium AI-powered thread summary card.
 * Uses the decorative card style for a sleek, modern appearance.
 * Triggered on-demand via the backend AI model.
 * Caches summaries by threadId; invalidates when messageCount increases (new email in thread).
 */

import React, { useState, useCallback, useEffect } from 'react'
import { Button, Card, CardContent, useTranslation } from '@newwork/nw-design-system'
import translations from '../_i18n'
import { SparkleIcon, CaretDownIcon, CaretUpIcon, UsersIcon, LightningIcon } from '@phosphor-icons/react'
import { Loader2 } from 'lucide-react'
import { EmailSummarizeSuggestions } from './EmailSummarizeSuggestions'
import { EmailApiService } from '../services/EmailApiService'
import type { EmailMessage, ThreadSummaryResult } from '../types'
import { stableKeyPointKey } from '../utils/emailSummarizeSuggestionUtils'

/** Cache key: threadId. Value: { summary, messageCount } */
const summaryCache = new Map<string, { summary: ThreadSummaryResult; messageCount: number }>()

interface EmailThreadSummaryProps {
  threadId: string
  messageCount: number
  accessToken?: string
  primaryMessage?: EmailMessage
  initiatorUserId?: string
  onJumpToMessageIndex?: (index: number) => void
  'data-testid'?: string
}

export const EmailThreadSummary: React.FC<EmailThreadSummaryProps> = ({
  threadId,
  messageCount,
  accessToken,
  primaryMessage,
  initiatorUserId,
  onJumpToMessageIndex,
  'data-testid': testId = 'email-thread-summary'
}) => {
  const { t } = useTranslation(translations)
  const cached = summaryCache.get(threadId)
  const isStale = cached && cached.messageCount !== messageCount
  const initialSummary = cached && !isStale ? cached.summary : null

  const [summary, setSummary] = useState<ThreadSummaryResult | null>(initialSummary)
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const generateSummary = useCallback(async () => {
    if (isLoading) return
    setIsLoading(true)
    setError(null)
    try {
      const result = await EmailApiService.summarizeThread(threadId)
      setSummary(result)
      summaryCache.set(threadId, { summary: result, messageCount })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('thread-summary-error'))
    } finally {
      setIsLoading(false)
    }
  }, [threadId, messageCount, isLoading, t])

  // Invalidate cache when a new email arrives in the thread (messageCount increased)
  useEffect(() => {
    if (isStale) {
      summaryCache.delete(threadId)
      setSummary(null)
      setError(null)
    }
  }, [threadId, isStale])

  // Not yet generated - show trigger button
  if (!summary && !isLoading && !error) {
    return (
      <Card
        className="gba:overflow-hidden gba:relative gba:bg-card-decorative gba:border-0 gba:cursor-pointer"
        data-testid={`${testId}-trigger`}
      >
        <CardContent className="gba:p-4" onClick={generateSummary}>
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:w-9 gba:h-9 gba:rounded-lg gba:bg-decorative-foreground/20 gba:flex gba:items-center gba:justify-center">
              <SparkleIcon className="gba:w-4 gba:h-4 gba:text-decorative-foreground" weight="fill" />
            </div>
            <div className="gba:flex-1">
              <p className="gba:text-sm gba:font-semibold gba:tracking-tight gba:text-decorative-foreground">
                {t('thread-summary-trigger')}
              </p>
              <p className="gba:text-xs gba:text-decorative-foreground/70">
                {t('thread-summary-trigger-desc', { count: messageCount })}
              </p>
            </div>
            <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-decorative-foreground/10 gba:flex gba:items-center gba:justify-center">
              <LightningIcon className="gba:w-4 gba:h-4 gba:text-decorative-foreground/80" weight="fill" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <Card
        className="gba:overflow-hidden gba:relative gba:bg-card-decorative gba:border-0"
        data-testid={`${testId}-loading`}
      >
        <CardContent className="gba:p-4">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:w-9 gba:h-9 gba:rounded-lg gba:bg-decorative-foreground/20 gba:flex gba:items-center gba:justify-center">
              <Loader2 className="gba:w-4 gba:h-4 gba:text-decorative-foreground gba:animate-spin" />
            </div>
            <div>
              <p className="gba:text-sm gba:font-semibold gba:tracking-tight gba:text-decorative-foreground">
                {t('thread-summary-analyzing')}
              </p>
              <p className="gba:text-xs gba:text-decorative-foreground/70">
                {t('thread-summary-reading', { count: messageCount })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card
        className="gba:overflow-hidden gba:relative gba:bg-destructive-secondary gba:border-0"
        data-testid={`${testId}-error`}
      >
        <CardContent className="gba:p-4">
          <div className="gba:flex gba:items-center gba:gap-3">
            <SparkleIcon className="gba:w-4 gba:h-4 gba:text-destructive" weight="fill" />
            <p className="gba:text-sm gba:text-destructive-secondary-foreground gba:flex-1">
              {t('thread-summary-error')}
            </p>
            <Button variant="ghost" size="sm" onClick={generateSummary} data-testid={`${testId}-retry`}>
              {t('thread-summary-retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Summary card
  return (
    <Card className="gba:overflow-hidden gba:relative gba:bg-card-decorative gba:border-0" data-testid={testId}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(prev => !prev)}
        className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-4 gba:pt-4 gba:pb-2"
        data-testid={`${testId}-toggle`}
      >
        <div className="gba:w-9 gba:h-9 gba:rounded-lg gba:bg-decorative-foreground/20 gba:flex gba:items-center gba:justify-center">
          <SparkleIcon className="gba:w-4 gba:h-4 gba:text-decorative-foreground" weight="fill" />
        </div>
        <div className="gba:flex-1 gba:text-left">
          <p className="gba:text-sm gba:font-bold gba:tracking-tight gba:text-decorative-foreground">
            {t('thread-summary-ai-label')}
          </p>
        </div>
        {isExpanded ? (
          <CaretUpIcon className="gba:w-4 gba:h-4 gba:text-decorative-foreground/60" />
        ) : (
          <CaretDownIcon className="gba:w-4 gba:h-4 gba:text-decorative-foreground/60" />
        )}
      </button>

      {/* Content */}
      {isExpanded && summary && (
        <div className="gba:px-4 gba:pb-4 gba:space-y-3">
          {/* Summary text */}
          <p className="gba:text-sm gba:leading-relaxed gba:text-decorative-foreground/90">{summary.summary}</p>

          {/* Key points */}
          {summary.keyPoints.length > 0 && (
            <div className="gba:space-y-1.5">
              <p className="gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-widest gba:text-decorative-foreground/50">
                {t('thread-summary-key-points')}
              </p>
              <ul className="gba:space-y-1">
                {summary.keyPoints.map(point => (
                  <li
                    key={stableKeyPointKey(point)}
                    className="gba:flex gba:items-start gba:gap-2 gba:text-sm gba:text-decorative-foreground/90"
                  >
                    <span className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-decorative-foreground/40 gba:mt-1.5 gba:flex-shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <EmailSummarizeSuggestions
            suggestions={summary.suggestions ?? []}
            variant="thread"
            onJumpToMessageIndex={onJumpToMessageIndex}
            createActionContext={
              accessToken && primaryMessage
                ? {
                    message: primaryMessage,
                    accessToken,
                    noSubjectLabel: t('reader-no-subject'),
                    threadId,
                    initiatorUserId
                  }
                : undefined
            }
            data-testid={`${testId}-suggestions`}
          />

          {/* Participants */}
          {summary.participants.length > 0 && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:pt-1 gba:border-t gba:border-decorative-foreground/10">
              <UsersIcon className="gba:w-3.5 gba:h-3.5 gba:text-decorative-foreground/50" />
              <p className="gba:text-xs gba:text-decorative-foreground/60">{summary.participants.join(', ')}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
