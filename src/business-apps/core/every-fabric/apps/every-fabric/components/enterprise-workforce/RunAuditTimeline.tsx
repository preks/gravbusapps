// Compliance-grade audit timeline (who / when / why) for a Workforce run.
//
// Reads the generic deep_agent_audit_log via GET /workforce/runs/{id}/audit
// and renders a compact, chronological backtrace of significant events:
// session start/stop, tool calls, RBAC denials, cost-limit hits and HITL
// interrupts. Collapsed by default to keep the drawer focused on the trace.

import { CaretRightIcon, ShieldCheckIcon } from '@phosphor-icons/react'
import { useTranslation } from '@newwork/nw-design-system'
import React, { useCallback, useEffect, useState } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import translations from '../../_i18n'
import type { WorkforceAuditEntry } from './workforceTypes'
import { formatTimestamp } from './runDisplay'

export interface RunAuditTimelineProps {
  sessionId: string
  accessToken: string
}

const OUTCOME_TONE: Record<string, string> = {
  tool_denied: 'gba:text-destructive',
  session_failed: 'gba:text-destructive',
  cost_limit_hit: 'gba:text-amber-600 gba:dark:text-amber-400',
  rate_limited: 'gba:text-amber-600 gba:dark:text-amber-400'
}

function eventTone(eventType: string): string {
  return OUTCOME_TONE[eventType] ?? 'gba:text-foreground'
}

function humanizeEvent(eventType: string): string {
  return eventType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export const RunAuditTimeline: React.FC<RunAuditTimelineProps> = ({ sessionId, accessToken }) => {
  const { t } = useTranslation(translations)
  const client = usePromptManagerClient(accessToken)
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState<WorkforceAuditEntry[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!sessionId || !accessToken) return
    setLoading(true)
    client
      .getWorkforceRunAudit(sessionId)
      .then(page => {
        setEntries(page.data)
        setError(null)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : t('audit-trail-load-fail')))
      .finally(() => setLoading(false))
  }, [client, sessionId, accessToken, t])

  useEffect(() => {
    if (open && entries === null && !loading) load()
  }, [open, entries, loading, load])

  return (
    <section data-testid="workforce-run-detail-audit">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="gba:flex gba:w-full gba:items-center gba:gap-2 gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground gba:hover:text-foreground"
        aria-expanded={open}
        data-testid="workforce-run-audit-toggle"
      >
        <CaretRightIcon className={`gba:h-3.5 gba:w-3.5 gba:transition-transform ${open ? 'gba:rotate-90' : ''}`} />
        <ShieldCheckIcon className="gba:h-3.5 gba:w-3.5" />
        {t('audit-trail-title')}
      </button>

      {open && (
        <div className="gba:mt-2">
          {loading && <p className="gba:text-[11px] gba:text-muted-foreground">{t('audit-trail-loading')}</p>}
          {error && <p className="gba:text-[11px] gba:text-destructive">{error}</p>}
          {!loading && !error && entries && entries.length === 0 && (
            <p className="gba:text-[11px] gba:text-muted-foreground">{t('audit-trail-empty')}</p>
          )}
          {!loading && entries && entries.length > 0 && (
            <ol className="gba:space-y-1.5" data-testid="workforce-run-audit-list">
              {entries.map((entry, index) => (
                <li
                  key={`${entry.timestamp}:${entry.event_type}:${index}`}
                  className="gba:rounded-lg gba:border gba:border-border/60 gba:bg-card gba:px-3 gba:py-2"
                >
                  <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                    <span className={`gba:text-[11px] gba:font-semibold ${eventTone(entry.event_type)}`}>
                      {humanizeEvent(entry.event_type)}
                      {entry.tool_name ? ` · ${entry.tool_name}` : ''}
                    </span>
                    <span className="gba:shrink-0 gba:text-[10px] gba:text-muted-foreground">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  </div>
                  {entry.outcome && (
                    <p className="gba:mt-0.5 gba:text-[11px] gba:text-muted-foreground">{entry.outcome}</p>
                  )}
                  <p className="gba:mt-0.5 gba:text-[10px] gba:text-muted-foreground/80">
                    {t('audit-trail-by', { actor: entry.user_id || t('audit-trail-system') })}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  )
}
