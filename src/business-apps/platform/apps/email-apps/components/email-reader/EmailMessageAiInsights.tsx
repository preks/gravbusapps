/**
 * On-demand AI summary + suggestions below the message body (single-message reader).
 * Collapsed by default: one subtle row; expands to load and show content.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { SparkleIcon, CaretDownIcon, CaretUpIcon } from '@phosphor-icons/react'
import { Loader2 } from 'lucide-react'
import translations from '../../_i18n'
import { EmailSummarizeSuggestions } from '../EmailSummarizeSuggestions'
import { EmailApiService } from '../../services/EmailApiService'
import type { EmailMessage, EmailSummarizeSuggestion } from '../../types'

interface EmailMessageAiInsightsProps {
  message: EmailMessage
  accessToken: string
  initiatorUserId?: string
  'data-testid'?: string
}

export const EmailMessageAiInsights: React.FC<EmailMessageAiInsightsProps> = ({
  message,
  accessToken,
  initiatorUserId,
  'data-testid': testId = 'email-message-ai-insights'
}) => {
  const messageId = message.id
  const { t } = useTranslation(translations)
  const [open, setOpen] = useState(false)
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [summary, setSummary] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<EmailSummarizeSuggestion[]>([])
  const inFlightRef = useRef(false)

  useEffect(() => {
    setOpen(false)
    setLoadState('idle')
    setSummary(null)
    setSuggestions([])
    inFlightRef.current = false
  }, [messageId])

  const fetchInsights = useCallback(() => {
    if (!accessToken || inFlightRef.current) return
    inFlightRef.current = true
    setLoadState('loading')
    EmailApiService.setAccessToken(accessToken)
    EmailApiService.summarizeMessage(messageId)
      .then(result => {
        setSummary(result.summary ?? '')
        setSuggestions(result.suggestions ?? [])
        setLoadState('ok')
      })
      .catch(() => {
        setLoadState('error')
      })
      .finally(() => {
        inFlightRef.current = false
      })
  }, [accessToken, messageId])

  useEffect(() => {
    if (!open || !messageId || !accessToken) return
    if (loadState !== 'idle') return
    fetchInsights()
  }, [open, messageId, accessToken, loadState, fetchInsights])

  const handleToggle = () => {
    setOpen(prev => !prev)
  }

  const handleRetry = () => {
    setSummary(null)
    setSuggestions([])
    inFlightRef.current = false
    setLoadState('idle')
  }

  return (
    <div className="gba:mt-8 gba:pt-4 gba:border-t gba:border-border/50" data-testid={testId}>
      <div className="gba:flex gba:flex-col gba:gap-1">
        <button
          type="button"
          onClick={handleToggle}
          className="gba:flex gba:w-full gba:items-center gba:gap-2 gba:text-left gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors"
          data-testid={`${testId}-toggle`}
        >
          <SparkleIcon className="gba:w-3.5 gba:h-3.5 gba:flex-shrink-0" weight="fill" />
          <span className="gba:flex-1 gba:font-medium">{t('reader-ai-insights-toggle')}</span>
          {open ? (
            <CaretUpIcon className="gba:w-3.5 gba:h-3.5 gba:flex-shrink-0" />
          ) : (
            <CaretDownIcon className="gba:w-3.5 gba:h-3.5 gba:flex-shrink-0" />
          )}
        </button>
        {open ? null : (
          <p className="gba:pl-7 gba:text-xs gba:text-muted-foreground/75" data-testid={`${testId}-hint`}>
            {t('reader-ai-insights-hint')}
          </p>
        )}
      </div>

      {open && loadState === 'loading' && (
        <div
          className="gba:mt-3 gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground"
          data-testid={`${testId}-loading`}
        >
          <Loader2 className="gba:w-3.5 gba:h-3.5 gba:animate-spin" />
          {t('reader-ai-insights-loading')}
        </div>
      )}

      {open && loadState === 'error' && (
        <div className="gba:mt-3 gba:flex gba:flex-wrap gba:items-center gba:gap-2" data-testid={`${testId}-error`}>
          <p className="gba:text-xs gba:text-destructive">{t('reader-ai-insights-error')}</p>
          <Button variant="ghost" size="sm" onClick={handleRetry} data-testid={`${testId}-retry`}>
            {t('reader-ai-insights-retry')}
          </Button>
        </div>
      )}

      {open && loadState === 'ok' && (
        <div className="gba:mt-3 gba:space-y-3" data-testid={`${testId}-content`}>
          {(summary ?? '').trim().length > 0 ? (
            <p className="gba:text-sm gba:leading-relaxed gba:text-muted-foreground">{summary}</p>
          ) : null}
          <EmailSummarizeSuggestions
            suggestions={suggestions}
            variant="reader"
            createActionContext={{
              message,
              accessToken,
              noSubjectLabel: t('reader-no-subject'),
              initiatorUserId
            }}
            data-testid={`${testId}-suggestions`}
          />
          {suggestions.length === 0 && (summary ?? '').trim().length === 0 ? (
            <p className="gba:text-xs gba:text-muted-foreground gba:italic" data-testid={`${testId}-empty`}>
              {t('reader-ai-insights-empty')}
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}
