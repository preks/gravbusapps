import { useCallback, type FC } from 'react'
import {
  ArrowSquareOutIcon,
  CheckCircleIcon,
  CircleIcon,
  CircleDashedIcon,
  CircleHalfIcon,
  WarningCircleIcon
} from '@phosphor-icons/react'
import type { PreviewBlock, PreviewItem, PreviewItemStatus } from '../../types/enterpriseAgent'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'

interface PreviewBlockRendererProps {
  preview: PreviewBlock
  className?: string
}

const STATUS_LABEL: Record<PreviewItemStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  done: 'Done',
  failed: 'Failed',
  skipped: 'Skipped'
}

const STATUS_CHIP_CLASS: Record<PreviewItemStatus, string> = {
  pending: 'gba:bg-muted gba:text-muted-foreground',
  in_progress: 'gba:bg-blue-100 gba:text-blue-700 dark:gba:bg-blue-900/40 dark:gba:text-blue-200',
  done: 'gba:bg-green-100 gba:text-green-700 dark:gba:bg-green-900/40 dark:gba:text-green-200',
  failed: 'gba:bg-red-100 gba:text-red-700 dark:gba:bg-red-900/40 dark:gba:text-red-200',
  skipped: 'gba:bg-muted gba:text-muted-foreground gba:line-through'
}

const StatusIcon: FC<{ status?: PreviewItemStatus }> = ({ status }) => {
  const iconClass = 'gba:h-4 gba:w-4 gba:shrink-0'
  switch (status) {
    case 'done':
      return <CheckCircleIcon weight="fill" className={`${iconClass} gba:text-green-600`} />
    case 'in_progress':
      return <CircleHalfIcon weight="fill" className={`${iconClass} gba:text-blue-600`} />
    case 'failed':
      return <WarningCircleIcon weight="fill" className={`${iconClass} gba:text-red-600`} />
    case 'skipped':
      return <CircleDashedIcon className={`${iconClass} gba:text-muted-foreground`} />
    case 'pending':
    default:
      return <CircleIcon className={`${iconClass} gba:text-muted-foreground`} />
  }
}

const StatusChip: FC<{ status?: PreviewItemStatus }> = ({ status }) => {
  if (!status) return null
  return (
    <span
      className={`gba:inline-flex gba:items-center gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-medium gba:tracking-wide ${STATUS_CHIP_CLASS[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

const MetaChips: FC<{ meta?: Record<string, string> }> = ({ meta }) => {
  if (!meta) return null
  const entries = Object.entries(meta).filter(([, v]) => v != null && v !== '')
  if (entries.length === 0) return null
  return (
    <div className="gba:flex gba:flex-wrap gba:gap-1.5">
      {entries.map(([key, value]) => (
        <span
          key={key}
          className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:border gba:border-border/60 gba:bg-background gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-muted-foreground"
          title={`${key}: ${value}`}
        >
          <span className="gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground/70">
            {key}
          </span>
          <span className="gba:text-foreground">{value}</span>
        </span>
      ))}
    </div>
  )
}

const ChecklistRows: FC<{ items: PreviewItem[] }> = ({ items }) => (
  <ul className="gba:space-y-2">
    {items.map((item, idx) => (
      <li
        key={item.id ?? `${idx}-${item.label}`}
        className="gba:flex gba:items-start gba:gap-2.5 gba:rounded-lg gba:bg-muted/30 gba:px-3 gba:py-2"
      >
        <div className="gba:mt-0.5">
          <StatusIcon status={item.status} />
        </div>
        <div className="gba:flex-1 gba:min-w-0 gba:space-y-1">
          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
            <span className="gba:text-[13px] gba:font-medium gba:text-foreground">{item.label}</span>
            <StatusChip status={item.status} />
          </div>
          {item.detail && (
            <p className="gba:text-[12px] gba:text-muted-foreground gba:leading-relaxed">{item.detail}</p>
          )}
          <MetaChips meta={item.meta} />
        </div>
      </li>
    ))}
  </ul>
)

const TimelineRows: FC<{ items: PreviewItem[] }> = ({ items }) => (
  <ol className="gba:relative gba:space-y-3 gba:before:absolute gba:before:left-[7px] gba:before:top-1 gba:before:bottom-1 gba:before:w-px gba:before:bg-border/70">
    {items.map((item, idx) => (
      <li key={item.id ?? `${idx}-${item.label}`} className="gba:relative gba:pl-6">
        <span className="gba:absolute gba:left-0 gba:top-0.5">
          <StatusIcon status={item.status} />
        </span>
        <div className="gba:space-y-1">
          <div className="gba:flex gba:items-baseline gba:gap-2 gba:flex-wrap">
            <span className="gba:text-[13px] gba:font-semibold gba:text-foreground">{item.label}</span>
            <StatusChip status={item.status} />
          </div>
          {item.detail && (
            <p className="gba:text-[12px] gba:text-muted-foreground gba:leading-relaxed">{item.detail}</p>
          )}
          <MetaChips meta={item.meta} />
        </div>
      </li>
    ))}
  </ol>
)

const KeyValueRows: FC<{ items: PreviewItem[] }> = ({ items }) => (
  <dl className="gba:grid gba:grid-cols-[max-content_1fr] gba:gap-x-3 gba:gap-y-1.5">
    {items.map((item, idx) => (
      <div key={item.id ?? `${idx}-${item.label}`} className="gba:contents">
        <dt className="gba:text-[12px] gba:font-medium gba:text-muted-foreground">{item.label}</dt>
        <dd className="gba:text-[12px] gba:text-foreground gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
          <span>{item.detail ?? ''}</span>
          <StatusChip status={item.status} />
          <MetaChips meta={item.meta} />
        </dd>
      </div>
    ))}
  </dl>
)

const RendererBody: FC<{ preview: PreviewBlock }> = ({ preview }) => {
  const items = preview.items ?? []
  const hasItems = items.length > 0

  if (preview.kind === 'markdown') {
    if (!preview.markdown) return null
    return <MarkdownWithChipsRenderer content={preview.markdown} variant="enterprise" />
  }

  return (
    <>
      {hasItems && preview.kind === 'timeline' && <TimelineRows items={items} />}
      {hasItems && preview.kind === 'checklist' && <ChecklistRows items={items} />}
      {hasItems && preview.kind === 'key_values' && <KeyValueRows items={items} />}
      {preview.markdown && (
        <div className="gba:mt-3">
          <MarkdownWithChipsRenderer content={preview.markdown} variant="enterprise" />
        </div>
      )}
    </>
  )
}

/**
 * Renders the optional `preview` block above a HITL form. Generic across
 * use cases — driven entirely by the backend `PreviewBlock` payload from
 * `ask_human_structured(preview=...)`. Supports four kinds:
 *
 *   - `timeline`   ordered steps with owner / due meta chips
 *   - `checklist`  unordered list with status icons
 *   - `key_values` definition list for resolved-entity summaries
 *   - `markdown`   free-form prose via the chat markdown renderer
 *
 * Designed to render nothing (and consume zero layout space) when handed
 * an empty preview, so existing HITL forms remain unaffected.
 */
export const PreviewBlockRenderer: FC<PreviewBlockRendererProps> = ({ preview, className }) => {
  const items = preview.items ?? []
  const hasContent =
    preview.kind === 'markdown'
      ? Boolean(preview.markdown?.trim())
      : items.length > 0 || Boolean(preview.markdown?.trim())

  if (!hasContent) return null

  return (
    <section
      className={`gba:rounded-xl gba:border gba:border-border/60 gba:bg-card/40 gba:px-4 gba:py-3 gba:space-y-2.5 ${className ?? ''}`}
      data-testid="preview-block"
      data-preview-kind={preview.kind}
      data-case-id={preview.case_id}
    >
      {preview.title && (
        <header className="gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-[0.08em] gba:text-muted-foreground">
          {preview.title}
        </header>
      )}
      <RendererBody preview={preview} />
      {preview.case_id && <CasePanelDeepLink caseId={preview.case_id} />}
    </section>
  )
}

/**
 * Renders a "View live in side panel" link inside a HITL preview when
 * the same `case_id` has been declared via `case_panel_open`. Clicking
 * scrolls the right-rail CasePanel card into view and briefly highlights
 * it so the operator's eye lands on the live timeline instead of the
 * historical bubble snapshot.
 */
const CasePanelDeepLink: FC<{ caseId: string }> = ({ caseId }) => {
  const handleClick = useCallback(() => {
    const target = document.querySelector(`[data-case-id="${caseId}"][id^="case-panel-"]`)
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    target.classList.add('gba:ring-2', 'gba:ring-blue-400', 'gba:rounded-xl')
    globalThis.setTimeout(() => {
      target.classList.remove('gba:ring-2', 'gba:ring-blue-400', 'gba:rounded-xl')
    }, 1800)
  }, [caseId])
  return (
    <button
      type="button"
      onClick={handleClick}
      className="gba:inline-flex gba:items-center gba:gap-1 gba:text-[11px] gba:font-medium gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors"
      title="Open the live Case Panel in the side bar"
    >
      <span>View live in side panel</span>
      <ArrowSquareOutIcon className="gba:h-3 gba:w-3" />
    </button>
  )
}

export default PreviewBlockRenderer
