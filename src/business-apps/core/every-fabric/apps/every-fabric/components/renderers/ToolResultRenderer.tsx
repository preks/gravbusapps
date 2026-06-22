import { useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import {
  CaretDownIcon,
  CaretRightIcon,
  EnvelopeSimpleIcon,
  PaperPlaneTiltIcon,
  PencilSimpleIcon,
  WarningCircleIcon,
  XIcon
} from '@phosphor-icons/react'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'
import { detectRendererType } from '../../utils/renderUtils'
import { parseComposeEmailToolResult, type ComposeEmailOutcomePayload } from '../../utils/composeEmailTrace'
import { parseActionCardToolResult } from '../../utils/actionCardTrace'
import { ActionCard } from './ActionCard'
import { DeliverableCardsList, parseDeliverableCardPayload } from './DeliverableCards'
import translations from '../../_i18n'

export interface ToolResultRendererProps {
  callId: string
  toolName?: string
  result: unknown
  durationMs: number
  cached: boolean
  /** Required to download session_attachment deliverables (PDFs, etc.). */
  sessionId?: string
  /** Bearer token for authenticated EntityLink / attachment fetches. */
  accessToken?: string
}

const formatTableCellValue = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value)
  return JSON.stringify(value)
}

function getComposeEmailVisuals(
  payload: ComposeEmailOutcomePayload,
  t: (key: string) => string
): { icon: JSX.Element; title: string } {
  const status = payload.status ?? 'unknown'
  const isError = status === 'error' || !!payload.error
  if (isError) {
    return {
      icon: <WarningCircleIcon className="gba:h-4 gba:w-4 gba:text-destructive" weight="fill" />,
      title: t('renderer-tool-email-failed')
    }
  }
  if (status === 'cancelled') {
    return {
      icon: <XIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />,
      title: t('renderer-tool-email-cancelled')
    }
  }
  if (status === 'drafted') {
    return {
      icon: <PencilSimpleIcon className="gba:h-4 gba:w-4 gba:text-primary" />,
      title: t('renderer-tool-email-drafted')
    }
  }
  if (status === 'sent') {
    return {
      icon: <PaperPlaneTiltIcon className="gba:h-4 gba:w-4 gba:text-primary" weight="fill" />,
      title: t('renderer-tool-email-sent')
    }
  }
  return {
    icon: <EnvelopeSimpleIcon className="gba:h-4 gba:w-4 gba:text-primary" />,
    title: t('renderer-tool-email-composed')
  }
}

function ComposeEmailResultCard({
  payload,
  t
}: {
  readonly payload: ComposeEmailOutcomePayload
  t: (key: string) => string
}) {
  const { icon, title } = getComposeEmailVisuals(payload, t)

  const recipients =
    (payload.to ?? [])
      .map(r => r.name || r.address)
      .filter(Boolean)
      .join(', ') || ''

  return (
    <div className="gba:flex gba:items-start gba:gap-2.5">
      <div className="gba:shrink-0 gba:mt-0.5">{icon}</div>
      <div className="gba:flex-1 gba:min-w-0 gba:space-y-0.5">
        <div className="gba:text-[13px] gba:font-semibold gba:text-foreground">{title}</div>
        {payload.subject && (
          <div className="gba:text-[12px] gba:text-muted-foreground gba:truncate">
            <span className="gba:font-medium gba:text-foreground/80">{t('renderer-tool-result-subject')}</span>{' '}
            {payload.subject}
          </div>
        )}
        {recipients && (
          <div className="gba:text-[12px] gba:text-muted-foreground gba:truncate">
            <span className="gba:font-medium gba:text-foreground/80">{t('renderer-tool-result-to')}</span> {recipients}
          </div>
        )}
        {payload.error && <div className="gba:text-[12px] gba:text-destructive gba:truncate">{payload.error}</div>}
      </div>
    </div>
  )
}

export const ToolResultRenderer = ({
  callId,
  toolName,
  result,
  durationMs,
  cached,
  sessionId,
  accessToken
}: ToolResultRendererProps) => {
  const { t } = useTranslation(translations)
  const [expanded, setExpanded] = useState(false)
  const rendererType = detectRendererType(result)

  // Generic action_card: any tool that emits the backend `ui.kind ===
  // 'action_card'` payload renders as a clickable card with a status
  // badge and a deep link. Use-case-agnostic; works for triggered
  // workflows today and is the migration target for compose_email,
  // schedule_meeting, send_notification, etc. Tool-name-specific
  // branches below are kept only until those tools migrate.
  const actionCardPayload = parseActionCardToolResult(result)
  if (actionCardPayload) {
    return <ActionCard payload={actionCardPayload} callId={callId} accessToken={accessToken} />
  }

  // Tools that opt into structured deliverables embed `ui.kind === 'deliverable_card'`
  // alongside their existing JSON. Render the cards inline (no collapse) so the
  // user sees a clickable "Open document" / "Download PDF" affordance rather than
  // a JSON blob.
  const deliverablePayload = parseDeliverableCardPayload(result)
  if (deliverablePayload) {
    return (
      <div className="gba:max-w-3xl gba:space-y-2" data-testid={`enterprise-agent-tool-result-${callId}`}>
        {deliverablePayload.agentSummary && (
          <p className="gba:text-[12px] gba:text-muted-foreground">{deliverablePayload.agentSummary}</p>
        )}
        <DeliverableCardsList items={deliverablePayload.deliverables} sessionId={sessionId} accessToken={accessToken} />
      </div>
    )
  }

  if (toolName === 'compose_email') {
    const payload = parseComposeEmailToolResult(result)
    if (payload) {
      return (
        <div
          className="gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:max-w-3xl"
          data-testid={`enterprise-agent-tool-result-${callId}`}
        >
          <ComposeEmailResultCard payload={payload} t={t} />
        </div>
      )
    }
  }

  return (
    <div
      className="gba:rounded-lg gba:border gba:border-dashed gba:border-border gba:bg-background gba:overflow-hidden gba:max-w-3xl"
      data-testid={`enterprise-agent-tool-result-${callId}`}
    >
      <button
        className="gba:w-full gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-1.5 gba:hover:bg-muted/30 gba:transition-colors gba:text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <span className="gba:text-xs gba:text-muted-foreground gba:font-medium">{t('renderer-tool-result-label')}</span>
        <span className="gba:text-xs gba:text-muted-foreground/70">· {rendererType}</span>
        {cached && <span className="gba:text-xs gba:text-muted-foreground">{t('renderer-tool-call-cached')}</span>}
        <span className="gba:text-xs gba:text-muted-foreground/60 gba:ml-auto">{(durationMs / 1000).toFixed(2)}s</span>
        <div className="gba:shrink-0">
          {expanded ? (
            <CaretDownIcon className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
          ) : (
            <CaretRightIcon className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="gba:border-t gba:border-border gba:p-3">
          <ResultContent toolName={toolName} result={result} rendererType={rendererType} t={t} />
        </div>
      )}
    </div>
  )
}

function ResultContent({
  toolName,
  result,
  rendererType,
  t
}: Readonly<{
  toolName?: string
  result: unknown
  rendererType: ReturnType<typeof detectRendererType>
  t: (key: string, vars?: Record<string, unknown>) => string
}>) {
  if (
    toolName === 'web_search' &&
    result &&
    typeof result === 'object' &&
    'results' in result &&
    Array.isArray((result as { results?: unknown[] }).results)
  ) {
    const parsed = result as {
      source?: string
      results: Array<{ title?: string; url?: string; snippet?: string }>
    }

    return (
      <div className="gba:space-y-3">
        <div className="gba:flex gba:items-center gba:justify-between">
          <p className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wide">
            {t('renderer-tool-result-sources')}
          </p>
          {parsed.source && <span className="gba:text-[11px] gba:text-muted-foreground/70">{parsed.source}</span>}
        </div>

        <div className="gba:grid gba:gap-2">
          {parsed.results.slice(0, 6).map((item, index) => (
            <a
              key={`${item.url ?? item.title ?? 'result'}-${index}`}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="gba:block gba:rounded-xl gba:border gba:border-border gba:bg-card gba:px-3 gba:py-2.5 gba:hover:bg-muted/25 gba:transition-colors"
            >
              <p className="gba:text-sm gba:font-medium gba:text-foreground">
                {item.title || item.url || `Result ${index + 1}`}
              </p>
              {item.snippet && (
                <p className="gba:mt-1 gba:text-xs gba:leading-5 gba:text-muted-foreground">{item.snippet}</p>
              )}
              {item.url && (
                <p className="gba:mt-1 gba:text-[11px] gba:text-muted-foreground/70 gba:truncate">{item.url}</p>
              )}
            </a>
          ))}
        </div>
      </div>
    )
  }

  if (rendererType === 'markdown' && typeof result === 'string') {
    return <MarkdownWithChipsRenderer content={result} />
  }

  if (rendererType === 'table' && Array.isArray(result) && result.length > 0) {
    const rows = result as Record<string, unknown>[]
    const cols = Object.keys(rows[0])
    const shown = rows.slice(0, 10)
    return (
      <div className="gba:overflow-x-auto">
        <table className="gba:w-full gba:text-xs gba:border-collapse">
          <thead>
            <tr>
              {cols.map(col => (
                <th
                  key={col}
                  className="gba:text-left gba:px-2 gba:py-1 gba:bg-muted gba:font-semibold gba:text-muted-foreground gba:border gba:border-border"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map(row => (
              <tr key={JSON.stringify(row)} className="gba:even:bg-muted/30">
                {cols.map(col => (
                  <td
                    key={col}
                    className="gba:px-2 gba:py-1 gba:border gba:border-border gba:truncate gba:max-w-[200px]"
                  >
                    {formatTableCellValue(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 10 && (
          <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
            {t('renderer-tool-result-showing-rows', { total: rows.length })}
          </p>
        )}
      </div>
    )
  }

  if (rendererType === 'text' && typeof result === 'string') {
    return <p className="gba:text-sm gba:text-foreground gba:whitespace-pre-wrap">{result}</p>
  }

  // json fallback
  return (
    <pre className="gba:text-xs gba:font-mono gba:bg-muted gba:rounded gba:p-2 gba:overflow-x-auto gba:whitespace-pre-wrap gba:max-h-64">
      {JSON.stringify(result, null, 2)}
    </pre>
  )
}
