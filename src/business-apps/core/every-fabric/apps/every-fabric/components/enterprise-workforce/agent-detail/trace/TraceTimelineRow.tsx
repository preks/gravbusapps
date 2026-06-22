// Single presentational row of the grouped run-trace timeline.
//
// Renders the category badge, title, optional duration, the actor (who) +
// timestamp (when), and — for decisions — the full backtrace block:
// chosen option, rationale (why), alternatives considered, and confidence.
// Every row keeps a "show raw" expander so no debugging data is hidden.

import { ArrowSquareOutIcon, CaretRightIcon, UserCircleIcon } from '@phosphor-icons/react'
import React, { useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { buildPolicyDetailUrl, isPolicyUuid } from '../../policyLink'
import { formatTimeOnly, formatTimestamp } from '../../runDisplay'
import { formatDuration, type TimelineRow, type TraceCategory } from './traceTimelineModel'
import translations from '../../../../_i18n'

export interface TraceTimelineRowProps {
  row: TimelineRow
  isFocused: boolean
}

const CATEGORY_LABEL_KEY: Record<TraceCategory, string> = {
  tool: 'trace-cat-tool',
  decision: 'trace-cat-decision',
  policy: 'trace-cat-policy',
  hitl: 'trace-cat-hitl',
  approval: 'trace-cat-approval',
  cost: 'trace-cat-cost',
  skill: 'trace-cat-skill',
  thinking: 'trace-cat-thinking',
  message: 'trace-cat-message',
  status: 'trace-cat-status',
  system: 'trace-cat-system'
}

const CATEGORY_CLASS: Record<TraceCategory, string> = {
  tool: 'gba:bg-primary/10 gba:text-primary',
  decision: 'gba:bg-violet-500/15 gba:text-violet-700 gba:dark:text-violet-300',
  policy: 'gba:bg-sky-500/15 gba:text-sky-700 gba:dark:text-sky-300',
  hitl: 'gba:bg-amber-500/15 gba:text-amber-700 gba:dark:text-amber-300',
  approval: 'gba:bg-emerald-500/15 gba:text-emerald-700 gba:dark:text-emerald-300',
  cost: 'gba:bg-muted gba:text-muted-foreground',
  skill: 'gba:bg-indigo-500/15 gba:text-indigo-700 gba:dark:text-indigo-300',
  thinking: 'gba:bg-purple-500/10 gba:text-purple-700 gba:dark:text-purple-300',
  message: 'gba:bg-primary/10 gba:text-primary',
  status: 'gba:bg-muted gba:text-muted-foreground',
  system: 'gba:bg-muted gba:text-muted-foreground'
}

const DecisionDetail: React.FC<{ row: TimelineRow }> = ({ row }) => {
  const { t } = useTranslation(translations)
  const decision = row.decision
  if (!decision) return null
  return (
    <div className="gba:mt-2 gba:rounded-md gba:border gba:border-violet-500/20 gba:bg-violet-500/5 gba:p-2.5">
      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-1.5">
        <span className="gba:inline-flex gba:items-center gba:rounded-full gba:bg-muted gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground">
          {decision.category}
        </span>
        {decision.chosen && (
          <span className="gba:inline-flex gba:items-center gba:rounded-full gba:bg-primary/10 gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-primary">
            {t('trace-chose', { choice: decision.chosen })}
          </span>
        )}
        {decision.confidence !== null && (
          <span className="gba:text-[10px] gba:text-muted-foreground">
            {t('trace-confidence', { percent: Math.round(decision.confidence * 100) })}
          </span>
        )}
      </div>
      {decision.rationale && (
        <p className="gba:mt-1.5 gba:text-[12px] gba:leading-snug gba:text-foreground/85">
          <span className="gba:font-semibold">{t('trace-why')} </span>
          {decision.rationale}
        </p>
      )}
      {decision.alternatives.length > 0 && (
        <div className="gba:mt-1.5">
          <p className="gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground">
            {t('trace-alternatives')}
          </p>
          <ul className="gba:mt-1 gba:flex gba:flex-wrap gba:gap-1">
            {decision.alternatives.map(alt => (
              <li
                key={alt}
                className="gba:inline-flex gba:items-center gba:rounded gba:border gba:border-border/60 gba:bg-background gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:text-muted-foreground"
              >
                {alt}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export const TraceTimelineRow: React.FC<TraceTimelineRowProps> = ({ row, isFocused }) => {
  const { t } = useTranslation(translations)
  const [showRaw, setShowRaw] = useState(false)
  const badgeClass = CATEGORY_CLASS[row.category]
  const duration = formatDuration(row.durationMs)

  return (
    <li
      className={`gba:relative gba:rounded-lg gba:border gba:p-3 gba:transition-colors ${
        isFocused ? 'gba:border-primary/40 gba:bg-primary/5' : 'gba:border-border/60 gba:bg-card'
      }`}
      data-testid="workforce-trace-row"
      data-event-category={row.category}
    >
      <div className="gba:flex gba:items-start gba:gap-3">
        <span
          className={`gba:inline-flex gba:items-center gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-medium ${badgeClass}`}
        >
          {t(CATEGORY_LABEL_KEY[row.category])}
        </span>
        <div className="gba:min-w-0 gba:flex-1">
          <div className="gba:flex gba:items-center gba:gap-2">
            <p className="gba:truncate gba:text-xs gba:font-semibold gba:text-foreground">{row.title}</p>
            {duration && (
              <span className="gba:rounded gba:bg-muted gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:text-muted-foreground">
                {duration}
              </span>
            )}
          </div>
          {row.subtitle &&
            (row.category === 'policy' && isPolicyUuid(row.subtitle) ? (
              <a
                href={buildPolicyDetailUrl(row.subtitle)}
                target="_blank"
                rel="noreferrer"
                className="gba:mt-0.5 gba:inline-flex gba:items-center gba:gap-1 gba:truncate gba:text-[11px] gba:text-muted-foreground gba:hover:text-foreground gba:hover:underline"
                title={t('trace-open-policy-title', { id: row.subtitle })}
              >
                <span className="gba:truncate">{row.subtitle}</span>
                <ArrowSquareOutIcon className="gba:h-3 gba:w-3 gba:shrink-0" />
              </a>
            ) : (
              <p className="gba:mt-0.5 gba:truncate gba:text-[11px] gba:text-muted-foreground">{row.subtitle}</p>
            ))}
          {row.actor && (
            <p
              className="gba:mt-0.5 gba:inline-flex gba:items-center gba:gap-1 gba:text-[10px] gba:text-muted-foreground"
              data-testid="workforce-trace-actor"
            >
              <UserCircleIcon className="gba:h-3 gba:w-3" />
              {t('trace-actor-by', { name: row.actor.displayName })}
              {row.actor.kind !== 'agent' ? ` (${row.actor.kind})` : ''}
            </p>
          )}
          {row.body && !row.decision && (
            <p className="gba:mt-1 gba:whitespace-pre-wrap gba:text-[12px] gba:text-foreground/85">{row.body}</p>
          )}
          <DecisionDetail row={row} />
          <button
            type="button"
            onClick={() => setShowRaw(prev => !prev)}
            className="gba:mt-2 gba:inline-flex gba:items-center gba:gap-1 gba:text-[10px] gba:text-muted-foreground gba:hover:text-foreground"
            data-testid="workforce-trace-toggle-raw"
            aria-expanded={showRaw}
          >
            <CaretRightIcon className={`gba:h-3 gba:w-3 gba:transition-transform ${showRaw ? 'gba:rotate-90' : ''}`} />
            {showRaw ? t('trace-hide-raw') : t('trace-show-raw')}
          </button>
          {showRaw && (
            <pre
              className="gba:mt-2 gba:max-h-64 gba:overflow-auto gba:rounded gba:bg-muted/40 gba:p-2 gba:text-[11px] gba:text-muted-foreground"
              data-testid="workforce-trace-raw"
            >
              {JSON.stringify(row.raw, null, 2)}
            </pre>
          )}
        </div>
        {row.startedAt && (
          <span
            className="gba:shrink-0 gba:text-[10px] gba:text-muted-foreground"
            title={formatTimestamp(row.startedAt)}
          >
            {formatTimeOnly(row.startedAt)}
          </span>
        )}
      </div>
    </li>
  )
}
