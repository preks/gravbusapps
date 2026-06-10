// Phase A: Inbox tab inside the Workforce Agent detail screen.
//
// Same shape as AgentRunsTab but pre-pinned to source=inbound_email and
// rendered with email-specific columns (from / subject / received).
// Helpful for operators who only care about "what emails arrived and
// what did the agent do with them".

import { ArrowsClockwiseIcon, EnvelopeIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import React, { useMemo, useState } from 'react'
import { useWorkforceAgentRuns } from '../../useWorkforceAgentRuns'
import type { WorkforceRun, WorkforceRunListParams } from '../../workforceTypes'
import { formatTimestamp, runCredits, runStatusVisual, shortenInput } from '../../runDisplay'

export interface AgentInboxTabProps {
  accessToken: string
  agentId: string
  onOpenRun: (run: WorkforceRun) => void
}

const PAGE_SIZE = 25

function readTriggerPayloadField(run: WorkforceRun, field: string): string {
  const payload = run.trigger_payload
  if (payload && typeof payload === 'object') {
    const value = (payload as Record<string, unknown>)[field]
    if (typeof value === 'string' && value.trim()) return value
  }
  return ''
}

export const AgentInboxTab: React.FC<AgentInboxTabProps> = ({ accessToken, agentId, onOpenRun }) => {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)

  const params: WorkforceRunListParams = useMemo(
    () => ({
      source: 'inbound_email',
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      ...(q.trim() ? { q: q.trim() } : {})
    }),
    [page, q]
  )

  const { runs, total, isLoading, error, refetch } = useWorkforceAgentRuns({
    accessToken,
    agentId,
    params
  })

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <section
      className="gba:flex gba:flex-col gba:gap-3 gba:rounded-2xl gba:border gba:border-border/60 gba:bg-card gba:p-5"
      data-testid="workforce-inbox-tab"
    >
      <header className="gba:flex gba:flex-wrap gba:items-center gba:gap-3">
        <div className="gba:flex gba:flex-1 gba:items-center gba:gap-2">
          <div className="gba:relative gba:flex-1">
            <MagnifyingGlassIcon className="gba:absolute gba:left-2.5 gba:top-1/2 gba:h-3.5 gba:w-3.5 gba:-translate-y-1/2 gba:text-muted-foreground" />
            <input
              type="search"
              value={q}
              onChange={event => {
                setPage(0)
                setQ(event.target.value)
              }}
              placeholder="Search subject or sender…"
              className="gba:h-8 gba:w-full gba:rounded-md gba:border gba:border-border gba:bg-background gba:pl-8 gba:pr-3 gba:text-xs gba:text-foreground"
              data-testid="workforce-inbox-search"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="gba:inline-flex gba:h-8 gba:items-center gba:gap-1.5 gba:rounded-md gba:border gba:border-border gba:bg-background gba:px-2.5 gba:text-xs gba:text-muted-foreground gba:hover:text-foreground"
          data-testid="workforce-inbox-refresh"
        >
          <ArrowsClockwiseIcon className="gba:h-3.5 gba:w-3.5" />
          Refresh
        </button>
      </header>

      {error && (
        <div
          className="gba:rounded-lg gba:border gba:border-destructive/30 gba:bg-destructive/5 gba:px-3 gba:py-2 gba:text-xs gba:text-destructive"
          data-testid="workforce-inbox-error"
        >
          {error}
        </div>
      )}

      {isLoading && runs.length === 0 ? (
        <p className="gba:py-6 gba:text-center gba:text-xs gba:text-muted-foreground">Loading inbox…</p>
      ) : runs.length === 0 ? (
        <div
          className="gba:flex gba:flex-col gba:items-center gba:gap-2 gba:py-8 gba:text-center gba:text-xs gba:text-muted-foreground"
          data-testid="workforce-inbox-empty"
        >
          <EnvelopeIcon className="gba:h-5 gba:w-5" />
          <p>No inbound emails for this agent yet.</p>
          <p className="gba:max-w-sm">
            Wire an inbound-email trigger and forward mail to that mailbox to start the queue.
          </p>
        </div>
      ) : (
        <table className="gba:min-w-full gba:text-left gba:text-xs">
          <thead className="gba:text-[10px] gba:font-medium gba:uppercase gba:text-muted-foreground">
            <tr>
              <th className="gba:px-2 gba:py-2">From</th>
              <th className="gba:px-2 gba:py-2">Subject</th>
              <th className="gba:px-2 gba:py-2">Received</th>
              <th className="gba:px-2 gba:py-2">Status</th>
              <th className="gba:px-2 gba:py-2">Credits</th>
            </tr>
          </thead>
          <tbody className="gba:divide-y gba:divide-border/60">
            {runs.map(run => {
              const visual = runStatusVisual(run.status)
              const from = readTriggerPayloadField(run, 'from') || '—'
              const subject = readTriggerPayloadField(run, 'subject') || shortenInput(run.input, 80) || '—'
              return (
                <tr
                  key={run.session_id}
                  onClick={() => onOpenRun(run)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onOpenRun(run)
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Open run details for ${subject}`}
                  className="gba:cursor-pointer gba:transition-colors gba:hover:bg-muted/50 gba:focus:bg-muted/50 gba:focus:outline-none"
                  data-testid="workforce-inbox-row"
                >
                  <td className="gba:max-w-[180px] gba:truncate gba:px-2 gba:py-2 gba:text-foreground">{from}</td>
                  <td className="gba:max-w-[260px] gba:truncate gba:px-2 gba:py-2 gba:text-foreground">{subject}</td>
                  <td className="gba:whitespace-nowrap gba:px-2 gba:py-2 gba:text-muted-foreground">
                    {formatTimestamp(run.created_at)}
                  </td>
                  <td className="gba:px-2 gba:py-2">
                    <span
                      className={`gba:inline-flex gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-medium ${visual.pillClass}`}
                    >
                      {visual.label}
                    </span>
                  </td>
                  <td className="gba:px-2 gba:py-2 gba:text-muted-foreground">{runCredits(run)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {total > PAGE_SIZE && (
        <footer className="gba:flex gba:items-center gba:justify-between gba:pt-2 gba:text-[11px] gba:text-muted-foreground">
          <span>
            Page {page + 1} of {totalPages} · {total} total
          </span>
          <div className="gba:flex gba:gap-1">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage(prev => Math.max(0, prev - 1))}
              className="gba:rounded-md gba:border gba:border-border gba:bg-background gba:px-2 gba:py-1 gba:disabled:opacity-50"
              data-testid="workforce-inbox-prev-page"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage(prev => prev + 1)}
              className="gba:rounded-md gba:border gba:border-border gba:bg-background gba:px-2 gba:py-1 gba:disabled:opacity-50"
              data-testid="workforce-inbox-next-page"
            >
              Next
            </button>
          </div>
        </footer>
      )}
    </section>
  )
}
