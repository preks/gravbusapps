// Trace Lens — selected span detail pane.

import { useState } from 'react'
import { CheckIcon, CopyIcon } from '@phosphor-icons/react'
import { useTranslation } from '@newwork/nw-design-system'
import {
  copyTextForValue,
  detailWithoutLlmMeta,
  isStructuredDisplayable,
  StructuredValueView
} from './traceLensDetailView'
import { formatMs, SPAN_KIND_ACCENT, type TraceSpan } from './traceLensModel'
import { spanKindLabel } from './traceLensSpanKind'
import translations from '../../_i18n'

interface TraceLensSpanDetailProps {
  span: TraceSpan | null
}

function CopyButton({ text, t }: Readonly<{ text: string; t: (key: string) => string }>) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
      }}
      className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded gba:border gba:border-border/60 gba:px-1.5 gba:py-0.5 gba:text-[11px] gba:text-muted-foreground gba:hover:bg-muted/60"
    >
      {copied ? <CheckIcon className="gba:h-3 gba:w-3" /> : <CopyIcon className="gba:h-3 gba:w-3" />}
      {copied ? t('trace-lens-copied') : t('trace-lens-copy')}
    </button>
  )
}

function detailNum(detail: Record<string, unknown> | undefined, key: string): number | undefined {
  const value = detail?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function detailStr(detail: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = detail?.[key]
  return typeof value === 'string' && value ? value : undefined
}

const LlmStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="gba:flex gba:flex-col">
    <span className="gba:text-[10px] gba:uppercase gba:tracking-wide gba:text-muted-foreground">{label}</span>
    <span className="gba:text-[12px] gba:font-medium gba:text-foreground gba:tabular-nums">{value}</span>
  </div>
)

function LlmCallStats({ span, t }: Readonly<{ span: TraceSpan; t: (key: string) => string }>) {
  if (span.kind !== 'llm') return null
  const detail = span.detail
  const promptTokens = detailNum(detail, 'prompt_tokens')
  const cachedTokens = detailNum(detail, 'cached_prompt_tokens')
  const completionTokens = detailNum(detail, 'completion_tokens')
  const cacheHitRatio = detailNum(detail, 'cache_hit_ratio')
  const costUsd = detailNum(detail, 'cost_usd')
  const stage = detailStr(detail, 'stage')
  const finishReason = detailStr(detail, 'finish_reason')
  return (
    <div className="gba:grid gba:grid-cols-3 gba:gap-x-4 gba:gap-y-2 gba:rounded-md gba:border gba:border-border/40 gba:bg-muted/40 gba:p-2.5">
      <LlmStat label={t('trace-lens-llm-latency')} value={formatMs(span.durationMs)} />
      {promptTokens !== undefined && <LlmStat label={t('trace-lens-llm-prompt')} value={String(promptTokens)} />}
      {completionTokens !== undefined && (
        <LlmStat label={t('trace-lens-llm-completion')} value={String(completionTokens)} />
      )}
      {cachedTokens !== undefined && <LlmStat label={t('trace-lens-llm-cached')} value={String(cachedTokens)} />}
      {cacheHitRatio !== undefined && (
        <LlmStat label={t('trace-lens-llm-cache-hit')} value={`${(cacheHitRatio * 100).toFixed(0)}%`} />
      )}
      {costUsd !== undefined && <LlmStat label={t('trace-lens-llm-cost')} value={`$${costUsd.toFixed(5)}`} />}
      {stage && <LlmStat label={t('trace-lens-llm-stage')} value={stage} />}
      {finishReason && <LlmStat label={t('trace-lens-llm-finish')} value={finishReason} />}
    </div>
  )
}

function ReadableSection({ title, value, t }: Readonly<{ title: string; value: unknown; t: (key: string) => string }>) {
  const copyText = copyTextForValue(value)
  if (!copyText.trim()) return null

  const structured = isStructuredDisplayable(value)

  return (
    <div className="gba:flex gba:flex-col gba:gap-1.5">
      <div className="gba:flex gba:items-center gba:justify-between">
        <span className="gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground">
          {title}
        </span>
        <CopyButton text={copyText} t={t} />
      </div>
      {structured ? (
        <StructuredValueView value={value} t={t} />
      ) : (
        <pre className="gba:max-h-72 gba:overflow-auto gba:rounded-md gba:border gba:border-border/40 gba:bg-muted/40 gba:p-2.5 gba:text-[12px] gba:leading-relaxed gba:text-foreground gba:whitespace-pre-wrap gba:break-words">
          {copyText}
        </pre>
      )}
    </div>
  )
}

export const TraceLensSpanDetail: React.FC<TraceLensSpanDetailProps> = ({ span }) => {
  const { t } = useTranslation(translations)

  if (!span) {
    return (
      <div className="gba:flex gba:h-full gba:items-center gba:justify-center gba:p-6 gba:text-center gba:text-sm gba:text-muted-foreground">
        {t('trace-lens-span-select')}
      </div>
    )
  }

  const accent = SPAN_KIND_ACCENT[span.kind]
  const detail =
    span.kind === 'llm'
      ? detailWithoutLlmMeta(span.detail)
      : span.detail
        ? (() => {
            const copy = { ...span.detail }
            delete copy.type
            return Object.keys(copy).length > 0 ? copy : undefined
          })()
        : undefined

  return (
    <div
      className="gba:flex gba:flex-col gba:gap-4 gba:p-4 gba:overflow-auto gba:h-full"
      data-testid="trace-lens-span-detail"
    >
      <div className="gba:flex gba:flex-col gba:gap-1.5">
        <div className="gba:flex gba:items-center gba:gap-2">
          <span
            className={`gba:rounded gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium ${accent.text} ${accent.bg}`}
          >
            {spanKindLabel(span.kind, t)}
          </span>
          <span
            className={`gba:rounded gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium ${
              span.status === 'failed'
                ? 'gba:bg-rose-500/10 gba:text-rose-600'
                : span.status === 'running'
                  ? 'gba:bg-amber-500/10 gba:text-amber-600'
                  : 'gba:bg-muted gba:text-muted-foreground'
            }`}
          >
            {span.status}
          </span>
          {span.errorType && (
            <span className="gba:rounded gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:bg-rose-500/10 gba:text-rose-600">
              {span.errorType}
            </span>
          )}
        </div>
        <h3 className="gba:text-[15px] gba:font-semibold gba:text-foreground gba:break-words">{span.name}</h3>
        <div className="gba:flex gba:flex-wrap gba:gap-x-4 gba:gap-y-1 gba:text-[12px] gba:text-muted-foreground gba:tabular-nums">
          <span>{t('trace-lens-span-seq', { seq: span.seq })}</span>
          <span>{t('trace-lens-span-start', { ms: formatMs(span.startMs) })}</span>
          {!span.marker && <span>{t('trace-lens-span-duration', { ms: formatMs(span.durationMs) })}</span>}
          {span.timestamp && <span>{new Date(span.timestamp).toLocaleTimeString()}</span>}
        </div>
      </div>

      <LlmCallStats span={span} t={t} />

      <ReadableSection title={t('trace-lens-span-input')} value={span.input} t={t} />
      <ReadableSection title={t('trace-lens-span-output')} value={span.output} t={t} />
      {detail && <ReadableSection title={t('trace-lens-span-details')} value={detail} t={t} />}
    </div>
  )
}
