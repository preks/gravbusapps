/**
 * Single AI suggestion row: type/target badges, fields, metadata disclosure, jump + create actions.
 */

import React, { useState } from 'react'
import { Badge, Button, Tooltip, TooltipContent, TooltipTrigger, useTranslation } from '@newwork/nw-design-system'
import translations from '../_i18n'
import type { EmailSummarizeSuggestion } from '../types'
import type { EmailSummarizeSuggestionsCreateActionContext } from './EmailSummarizeSuggestions'
import { formatCompactDate } from '../utils/emailDisplayUtils'
import { formatSuggestionConfidence, stableEmailSuggestionKey } from '../utils/emailSummarizeSuggestionUtils'
import { isSuggestionConfidentEnough } from '../utils/suggestionActivityContext'
import { EmailSuggestionCreateAction } from './EmailSuggestionCreateAction'

const API_TYPE_FLUENT_KEYS: Record<string, string> = {
  task: 'email-suggestion-type-task',
  meeting: 'email-suggestion-type-meeting',
  service_ticket: 'email-suggestion-type-service-ticket',
  sales_activity: 'email-suggestion-type-sales-activity',
  contract: 'email-suggestion-type-contract'
}

const LEGACY_TYPE_FLUENT_KEYS: Record<string, string> = {
  TASK: 'email-suggestion-type-task',
  FOLLOW_UP: 'email-suggestion-type-follow-up',
  FOLLOWUP: 'email-suggestion-type-follow-up',
  REMINDER: 'email-suggestion-type-reminder',
  MEETING: 'email-suggestion-type-meeting',
  DEADLINE: 'email-suggestion-type-deadline',
  ACTION_ITEM: 'email-suggestion-type-action-item',
  ACTIONITEM: 'email-suggestion-type-action-item'
}

const TARGET_FLUENT_KEYS: Record<string, string> = {
  blink: 'email-suggestion-target-blink',
  flow_engine: 'email-suggestion-target-flow-engine',
  customer_relations: 'email-suggestion-target-customer-relations',
  calendar: 'email-suggestion-target-calendar',
  generic: 'email-suggestion-target-generic'
}

function normalizeTypeKey(type: string): string {
  return type
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

function suggestionTypeLabel(type: string, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const apiNorm = normalizeTypeKey(type)
  const apiKey = API_TYPE_FLUENT_KEYS[apiNorm]
  if (apiKey) return t(apiKey)

  const legacyNorm = type
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
  const legacyKey = LEGACY_TYPE_FLUENT_KEYS[legacyNorm]
  if (legacyKey) return t(legacyKey)

  return type
}

function integrationTargetLabel(
  target: string,
  t: (key: string, vars?: Record<string, string | number>) => string
): string {
  const norm = normalizeTypeKey(target)
  const key = TARGET_FLUENT_KEYS[norm]
  if (key) return t(key)
  return target
}

const EVIDENCE_TRUNCATE = 120

export interface EmailSummarizeSuggestionItemProps {
  suggestion: EmailSummarizeSuggestion
  variant: 'thread' | 'crm' | 'reader'
  testId: string
  itemShellClass: string
  itemTitleClass: string
  metaClass: string
  evidenceClass: string
  showConfidence: boolean
  onJumpToMessageIndex?: (index: number) => void
  createActionContext?: EmailSummarizeSuggestionsCreateActionContext
}

export const EmailSummarizeSuggestionItem: React.FC<EmailSummarizeSuggestionItemProps> = ({
  suggestion: s,
  variant,
  testId,
  itemShellClass,
  itemTitleClass,
  metaClass,
  evidenceClass,
  showConfidence,
  onJumpToMessageIndex,
  createActionContext
}) => {
  const { t } = useTranslation(translations)
  const [metaOpen, setMetaOpen] = useState(false)
  const key = stableEmailSuggestionKey(s)
  const typeLabel = suggestionTypeLabel(s.type, t)
  const evidenceNeedsTooltip = (s.evidence?.length ?? 0) > EVIDENCE_TRUNCATE
  const confidenceLow = showConfidence && s.confidence !== undefined && !isSuggestionConfidentEnough(s)

  const target = s.integrationTarget && String(s.integrationTarget).trim() ? String(s.integrationTarget).trim() : null

  const metaEntries = s.metadata ? Object.entries(s.metadata) : []
  const hasMeta = metaEntries.length > 0

  return (
    <li className={itemShellClass} data-testid={`${testId}-item`}>
      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
        <Badge variant="secondary" className="gba:text-xs" data-testid={`${testId}-type`}>
          {typeLabel}
        </Badge>
        {target ? (
          <Badge variant="outline" className="gba:text-xs gba:font-normal" data-testid={`${testId}-target`}>
            {integrationTargetLabel(target, t)}
          </Badge>
        ) : null}
        {showConfidence && s.confidence !== undefined && Number.isFinite(s.confidence) && (
          <span
            className={`${metaClass}${confidenceLow ? ' gba:opacity-60' : ''}`}
            data-testid={`${testId}-confidence`}
          >
            {t('email-suggestion-confidence', {
              value: formatSuggestionConfidence(s.confidence)
            })}
          </span>
        )}
        {variant === 'thread' && s.messageIndex !== undefined && s.messageIndex !== null && onJumpToMessageIndex ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gba:h-7 gba:px-2 gba:text-xs"
            onClick={() => onJumpToMessageIndex(s.messageIndex!)}
            data-testid={`${testId}-jump`}
          >
            {t('email-suggestion-jump-message')}
          </Button>
        ) : variant === 'thread' && s.messageIndex !== undefined && s.messageIndex !== null ? (
          <span className={metaClass} data-testid={`${testId}-message-ref`}>
            {t('email-suggestion-message-ref', { index: s.messageIndex })}
          </span>
        ) : null}
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
          <span className="gba:font-medium">{t('email-suggestion-start')}:</span> {formatCompactDate(s.startAt)}
        </p>
      ) : null}
      {s.endAt ? (
        <p className={metaClass}>
          <span className="gba:font-medium">{t('email-suggestion-end')}:</span> {formatCompactDate(s.endAt)}
        </p>
      ) : null}
      {hasMeta ? (
        <div className="gba:pt-1">
          <button
            type="button"
            className="gba:text-xs gba:text-muted-foreground gba:underline-offset-2 hover:gba:underline"
            onClick={() => setMetaOpen(o => !o)}
            data-testid={`${testId}-metadata-toggle`}
          >
            {metaOpen ? t('email-suggestion-metadata-hide') : t('email-suggestion-metadata-show')}
          </button>
          {metaOpen ? (
            <ul
              className="gba:mt-1.5 gba:list-none gba:space-y-1 gba:rounded-md gba:bg-muted/40 gba:p-2 gba:text-xs gba:text-muted-foreground"
              data-testid={`${testId}-metadata-list`}
            >
              {metaEntries.map(([mk, mv]) => (
                <li key={`${key}-meta-${mk}`}>
                  <span className="gba:font-medium gba:text-foreground/80">{mk}:</span> {mv}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
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
      {createActionContext ? (
        <div className="gba:pt-1">
          <EmailSuggestionCreateAction
            suggestion={s}
            message={createActionContext.message}
            accessToken={createActionContext.accessToken}
            noSubjectLabel={createActionContext.noSubjectLabel}
            threadId={createActionContext.threadId}
            initiatorUserId={createActionContext.initiatorUserId}
            variant={variant}
            data-testid={`${testId}-create`}
          />
        </div>
      ) : null}
    </li>
  )
}
