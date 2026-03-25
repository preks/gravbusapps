/**
 * Renders AI-extracted suggestions from email/thread summarization (tasks, dates, follow-ups).
 */

import React from 'react'
import {
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../_i18n'
import type { EmailSummarizeSuggestion } from '../types'
import { formatCompactDate } from '../utils/emailDisplayUtils'
import { formatSuggestionConfidence, stableEmailSuggestionKey } from '../utils/emailSummarizeSuggestionUtils'

const SUGGESTION_TYPE_FLUENT_KEYS: Record<string, string> = {
  TASK: 'email-suggestion-type-task',
  FOLLOW_UP: 'email-suggestion-type-follow-up',
  FOLLOWUP: 'email-suggestion-type-follow-up',
  REMINDER: 'email-suggestion-type-reminder',
  MEETING: 'email-suggestion-type-meeting',
  DEADLINE: 'email-suggestion-type-deadline',
  ACTION_ITEM: 'email-suggestion-type-action-item',
  ACTIONITEM: 'email-suggestion-type-action-item'
}

function normalizeSuggestionType(type: string): string {
  return type
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
}

function suggestionTypeLabel(type: string, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const norm = normalizeSuggestionType(type)
  const fluentKey = SUGGESTION_TYPE_FLUENT_KEYS[norm]
  if (fluentKey) {
    return t(fluentKey)
  }
  return type
}

export interface EmailSummarizeSuggestionsProps {
  suggestions: EmailSummarizeSuggestion[]
  variant: 'thread' | 'crm'
  'data-testid'?: string
}

const EVIDENCE_TRUNCATE = 120

export const EmailSummarizeSuggestions: React.FC<EmailSummarizeSuggestionsProps> = ({
  suggestions,
  variant,
  'data-testid': testId = 'email-summarize-suggestions'
}) => {
  const { t } = useTranslation(translations)

  const sectionTitleClass =
    variant === 'thread'
      ? 'gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-widest gba:text-decorative-foreground/50'
      : 'gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-widest gba:text-muted-foreground'

  const itemTitleClass =
    variant === 'thread'
      ? 'gba:text-sm gba:font-medium gba:text-decorative-foreground/95'
      : 'gba:text-sm gba:font-medium gba:text-foreground'

  const metaClass =
    variant === 'thread' ? 'gba:text-xs gba:text-decorative-foreground/70' : 'gba:text-xs gba:text-muted-foreground'

  const evidenceClass =
    variant === 'thread'
      ? 'gba:text-xs gba:text-decorative-foreground/65 gba:line-clamp-2'
      : 'gba:text-xs gba:text-muted-foreground gba:line-clamp-2'

  if (suggestions.length === 0) {
    return null
  }

  return (
    <TooltipProvider>
      <div className="gba:space-y-2" data-testid={testId}>
        <p className={sectionTitleClass}>{t('email-suggestion-section-title')}</p>
        <ul className="gba:space-y-3 gba:list-none gba:m-0 gba:p-0">
          {suggestions.map(s => {
            const key = stableEmailSuggestionKey(s)
            const typeLabel = suggestionTypeLabel(s.type, t)
            const evidenceNeedsTooltip = (s.evidence?.length ?? 0) > EVIDENCE_TRUNCATE

            return (
              <li
                key={key}
                className="gba:rounded-md gba:border gba:border-border/60 gba:p-2.5 gba:space-y-1"
                data-testid={`${testId}-item`}
              >
                <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                  <Badge variant="secondary" className="gba:text-xs" data-testid={`${testId}-type`}>
                    {typeLabel}
                  </Badge>
                  {s.confidence !== undefined && Number.isFinite(s.confidence) && (
                    <span className={metaClass} data-testid={`${testId}-confidence`}>
                      {t('email-suggestion-confidence', {
                        value: formatSuggestionConfidence(s.confidence)
                      })}
                    </span>
                  )}
                  {variant === 'thread' && s.messageIndex !== undefined && s.messageIndex !== null && (
                    <span className={metaClass} data-testid={`${testId}-message-ref`}>
                      {t('email-suggestion-message-ref', { index: s.messageIndex })}
                    </span>
                  )}
                </div>
                <p className={itemTitleClass}>{s.title}</p>
                {s.details ? <p className={metaClass}>{s.details}</p> : null}
                {s.assignee ? (
                  <p className={metaClass}>
                    <span className="gba:font-medium">{t('email-suggestion-assignee')}:</span> {s.assignee}
                  </p>
                ) : null}
                {s.dueAt ? (
                  <p className={metaClass}>
                    <span className="gba:font-medium">{t('email-suggestion-due')}:</span> {formatCompactDate(s.dueAt)}
                  </p>
                ) : null}
                {s.startAt ? (
                  <p className={metaClass}>
                    <span className="gba:font-medium">{t('email-suggestion-start')}:</span>{' '}
                    {formatCompactDate(s.startAt)}
                  </p>
                ) : null}
                {s.endAt ? (
                  <p className={metaClass}>
                    <span className="gba:font-medium">{t('email-suggestion-end')}:</span> {formatCompactDate(s.endAt)}
                  </p>
                ) : null}
                {s.evidence ? (
                  evidenceNeedsTooltip ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className={`${evidenceClass} gba:cursor-help`} data-testid={`${testId}-evidence`}>
                          {s.evidence}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent className="gba:max-w-sm">{s.evidence}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <p className={evidenceClass} data-testid={`${testId}-evidence`}>
                      {s.evidence}
                    </p>
                  )
                ) : null}
              </li>
            )
          })}
        </ul>
      </div>
    </TooltipProvider>
  )
}
