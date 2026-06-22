import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Badge } from '@newwork/nw-design-system'
import {
  CheckCircleIcon,
  HeadCircuitIcon,
  SpinnerGapIcon,
  WarningCircleIcon,
  WrenchIcon,
  XIcon
} from '@phosphor-icons/react'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'
import {
  humanizeDelegatedOutput,
  type DelegatedAgentDetail,
  type DelegatedAgentStatus
} from '../../utils/delegatedAgentDetails'

// Sits above the platform chrome (header/nav) so the panel is never clipped,
// matching the artifact viewer overlay convention.
const BACKDROP_Z_INDEX = 9990
const PANEL_Z_INDEX = 9991

interface DelegatedAgentDetailPanelProps {
  detail: DelegatedAgentDetail | null
  onClose: () => void
}

const STATUS_BADGE: Record<DelegatedAgentStatus, { label: string; variant: 'success' | 'destructive' | 'running' }> = {
  done: { label: 'Completed', variant: 'success' },
  failed: { label: 'Failed', variant: 'destructive' },
  running: { label: 'Working', variant: 'running' }
}

const formatDuration = (durationMs?: number): string | null => {
  if (typeof durationMs !== 'number' || durationMs <= 0) return null
  if (durationMs < 1000) return `${durationMs}ms`
  return `${(durationMs / 1000).toFixed(1)}s`
}

const StatusIcon: React.FC<{ status: DelegatedAgentStatus }> = ({ status }) => {
  if (status === 'running') {
    return <SpinnerGapIcon className="gba:h-4 gba:w-4 gba:animate-spin gba:text-sky-600" />
  }
  if (status === 'failed') {
    return <WarningCircleIcon className="gba:h-4 gba:w-4 gba:text-destructive" weight="fill" />
  }
  return <CheckCircleIcon className="gba:h-4 gba:w-4 gba:text-emerald-600" weight="fill" />
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="gba:space-y-1.5">
    <h4 className="gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-[0.12em] gba:text-muted-foreground">
      {title}
    </h4>
    {children}
  </section>
)

const ToolStatusDot: React.FC<{ status: DelegatedAgentStatus }> = ({ status }) => {
  if (status === 'running') return <SpinnerGapIcon className="gba:h-3 gba:w-3 gba:animate-spin gba:text-sky-600" />
  if (status === 'failed') return <XIcon className="gba:h-3 gba:w-3 gba:text-destructive" />
  return <CheckCircleIcon className="gba:h-3 gba:w-3 gba:text-emerald-600" weight="fill" />
}

export const DelegatedAgentDetailPanel: React.FC<DelegatedAgentDetailPanelProps> = ({ detail, onClose }) => {
  useEffect(() => {
    if (!detail) return undefined
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [detail, onClose])

  if (!detail) return null

  const status = STATUS_BADGE[detail.status]
  const duration = formatDuration(detail.durationMs)
  const sourceLabel = detail.source === 'expert' ? 'Expert' : 'Sub-agent'
  const readableOutput = humanizeDelegatedOutput(detail.output)

  const overlay = (
    <div data-testid="delegated-agent-detail">
      <button
        type="button"
        aria-label="Close agent detail"
        onClick={onClose}
        className="gba:fixed gba:inset-0 gba:bg-foreground/20 gba:backdrop-blur-[1px] gba:animate-in gba:fade-in gba:duration-150"
        style={{ zIndex: BACKDROP_Z_INDEX }}
        data-testid="delegated-agent-detail-backdrop"
      />
      <aside
        role="dialog"
        aria-label={`${detail.agentName} delegation detail`}
        className="gba:fixed gba:right-0 gba:top-14 gba:bottom-0 gba:flex gba:w-[420px] gba:max-w-[calc(100vw-2rem)] gba:flex-col gba:overflow-hidden gba:border-l gba:border-border/60 gba:bg-card gba:shadow-[0_16px_48px_-16px_rgba(15,23,42,0.35)] gba:animate-in gba:slide-in-from-right gba:duration-200"
        style={{ zIndex: PANEL_Z_INDEX }}
      >
        <header className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:border-b gba:border-border/50 gba:px-5 gba:py-4">
          <div className="gba:flex gba:min-w-0 gba:items-start gba:gap-3">
            <span className="gba:flex gba:h-9 gba:w-9 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:bg-sky-50 gba:text-sky-700 gba:ring-1 gba:ring-sky-500/15 dark:gba:bg-sky-950/40 dark:gba:text-sky-200">
              <HeadCircuitIcon className="gba:h-4.5 gba:w-4.5" weight="duotone" />
            </span>
            <div className="gba:min-w-0">
              <p className="gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-[0.12em] gba:text-muted-foreground">
                {sourceLabel}
              </p>
              <h3
                className="gba:truncate gba:text-[15px] gba:font-semibold gba:text-foreground"
                title={detail.agentName}
              >
                {detail.agentName}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close agent detail"
            className="gba:inline-flex gba:h-8 gba:w-8 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-lg gba:text-muted-foreground gba:transition-colors hover:gba:bg-muted/60 hover:gba:text-foreground"
            data-testid="delegated-agent-detail-close"
          >
            <XIcon className="gba:h-4 gba:w-4" />
          </button>
        </header>

        <div className="gba:flex gba:min-h-0 gba:flex-1 gba:flex-col gba:gap-5 gba:overflow-y-auto gba:px-5 gba:py-5">
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
            <Badge variant={status.variant} className="gba:inline-flex gba:items-center gba:gap-1">
              <StatusIcon status={detail.status} />
              {status.label}
            </Badge>
            {duration ? <span className="gba:text-[11px] gba:text-muted-foreground">Took {duration}</span> : null}
          </div>

          <Section title="What it was asked to do">
            <p className="gba:text-[13px] gba:leading-6 gba:text-foreground/90">{detail.task}</p>
          </Section>

          {detail.description ? (
            <Section title="Why this agent">
              <p className="gba:text-[13px] gba:leading-6 gba:text-muted-foreground">{detail.description}</p>
            </Section>
          ) : null}

          <Section title="What it did">
            {readableOutput ? (
              <div className="gba:rounded-xl gba:border gba:border-border/40 gba:bg-muted/20 gba:px-3.5 gba:py-3 gba:text-[13px] gba:leading-6">
                <MarkdownWithChipsRenderer content={readableOutput} variant="enterprise" />
              </div>
            ) : (
              <p className="gba:text-[13px] gba:italic gba:text-muted-foreground">
                {detail.status === 'running'
                  ? 'Still working — results will appear here once this agent finishes.'
                  : 'No output was recorded for this delegation.'}
              </p>
            )}
          </Section>

          {detail.tools.length > 0 ? (
            <Section title={`Tools used (${detail.tools.length})`}>
              <ul className="gba:space-y-1">
                {detail.tools.map(tool => (
                  <li
                    key={tool.stepId}
                    className="gba:flex gba:items-center gba:gap-2 gba:rounded-lg gba:border gba:border-border/40 gba:px-2.5 gba:py-1.5 gba:text-[12px] gba:text-foreground/85"
                  >
                    <WrenchIcon className="gba:h-3.5 gba:w-3.5 gba:shrink-0 gba:text-muted-foreground" />
                    <span className="gba:min-w-0 gba:flex-1 gba:truncate">{tool.name}</span>
                    <ToolStatusDot status={tool.status} />
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          <details className="gba:group gba:rounded-xl gba:border gba:border-border/40 gba:bg-muted/10">
            <summary className="gba:cursor-pointer gba:list-none gba:px-3.5 gba:py-2.5 gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-[0.1em] gba:text-muted-foreground gba:transition-colors hover:gba:text-foreground">
              Raw trace
            </summary>
            <pre
              className="gba:max-h-64 gba:overflow-auto gba:whitespace-pre-wrap gba:break-words gba:border-t gba:border-border/40 gba:px-3.5 gba:py-3 gba:font-mono gba:text-[11px] gba:leading-relaxed gba:text-foreground/80"
              data-testid="delegated-agent-detail-raw"
            >
              {JSON.stringify(detail, null, 2)}
            </pre>
          </details>
        </div>
      </aside>
    </div>
  )

  if (typeof document === 'undefined') return overlay
  return createPortal(overlay, document.body)
}
