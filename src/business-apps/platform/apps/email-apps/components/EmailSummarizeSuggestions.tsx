/**
 * Renders AI-extracted suggestions from email/thread summarization (tasks, dates, follow-ups).
 */

import React from 'react'
import { useTranslation, TooltipProvider } from '@newwork/nw-design-system'
import translations from '../_i18n'
import type { EmailSummarizeSuggestion, EmailMessage } from '../types'
import { stableEmailSuggestionKey } from '../utils/emailSummarizeSuggestionUtils'
import { EmailSummarizeSuggestionItem } from './EmailSummarizeSuggestionItem'

export interface EmailSummarizeSuggestionsCreateActionContext {
  message: EmailMessage
  accessToken: string
  noSubjectLabel: string
  threadId?: string
  /** Platform user id (e.g. `userInfo.id`) for custom-flow-engine quick tasks */
  initiatorUserId?: string
}

export interface EmailSummarizeSuggestionsProps {
  suggestions: EmailSummarizeSuggestion[]
  variant: 'thread' | 'crm' | 'reader'
  onJumpToMessageIndex?: (index: number) => void
  createActionContext?: EmailSummarizeSuggestionsCreateActionContext
  'data-testid'?: string
}

function getItemShellClass(variant: EmailSummarizeSuggestionsProps['variant']): string {
  if (variant === 'thread') {
    return 'gba:rounded-md gba:border gba:border-border/60 gba:p-2.5 gba:space-y-1'
  }
  if (variant === 'reader') {
    return 'gba:rounded-md gba:border gba:border-border/40 gba:bg-muted/25 gba:p-2 gba:space-y-1'
  }
  return 'gba:rounded-md gba:border gba:border-border/60 gba:p-2.5 gba:space-y-1'
}

export const EmailSummarizeSuggestions: React.FC<EmailSummarizeSuggestionsProps> = ({
  suggestions,
  variant,
  onJumpToMessageIndex,
  createActionContext,
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

  const itemShellClass = getItemShellClass(variant)

  const showConfidence = variant !== 'reader'

  if (suggestions.length === 0) {
    return null
  }

  return (
    <TooltipProvider>
      <div className="gba:space-y-2" data-testid={testId}>
        <p className={sectionTitleClass}>{t('email-suggestion-section-title')}</p>
        <ul className={`gba:list-none gba:m-0 gba:p-0 ${variant === 'reader' ? 'gba:space-y-2' : 'gba:space-y-3'}`}>
          {suggestions.map(s => (
            <EmailSummarizeSuggestionItem
              key={stableEmailSuggestionKey(s)}
              suggestion={s}
              variant={variant}
              testId={testId}
              itemShellClass={itemShellClass}
              itemTitleClass={itemTitleClass}
              metaClass={metaClass}
              evidenceClass={evidenceClass}
              showConfidence={showConfidence}
              onJumpToMessageIndex={onJumpToMessageIndex}
              createActionContext={createActionContext}
            />
          ))}
        </ul>
      </div>
    </TooltipProvider>
  )
}
