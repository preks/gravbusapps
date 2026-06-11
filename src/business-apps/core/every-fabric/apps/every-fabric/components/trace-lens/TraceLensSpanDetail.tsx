// Trace Lens — selected span detail pane.

import { useState } from 'react'
import { CheckIcon, CopyIcon } from '@phosphor-icons/react'
import { formatMs, prettyValue, SPAN_KIND_ACCENT, SPAN_KIND_LABEL, type TraceSpan } from './traceLensModel'

interface TraceLensSpanDetailProps {
  span: TraceSpan | null
}

function CopyButton({ text }: Readonly<{ text: string }>) {
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
      {copied ? 'Copied' : 'Copy'}
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

function LlmCallStats({ span }: Readonly<{ span: TraceSpan }>) {
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
    <div className="gba:grid gba:grid-cols-3 gba:gap-x-4 gba:gap-y-2 gba:rounded-md gba:bg-muted/60 gba:p-2.5">
      <LlmStat label="Latency" value={formatMs(span.durationMs)} />
      {promptTokens !== undefined && <LlmStat label="Prompt" value={String(promptTokens)} />}
      {completionTokens !== undefined && <LlmStat label="Completion" value={String(completionTokens)} />}
      {cachedTokens !== undefined && <LlmStat label="Cached" value={String(cachedTokens)} />}
      {cacheHitRatio !== undefined && <LlmStat label="Cache hit" value={`${(cacheHitRatio * 100).toFixed(0)}%`} />}
      {costUsd !== undefined && <LlmStat label="Cost" value={`$${costUsd.toFixed(5)}`} />}
      {stage && <LlmStat label="Stage" value={stage} />}
      {finishReason && <LlmStat label="Finish" value={finishReason} />}
    </div>
  )
}

function Section({ title, value }: Readonly<{ title: string; value: string }>) {
  if (!value.trim()) return null
  return (
    <div className="gba:flex gba:flex-col gba:gap-1.5">
      <div className="gba:flex gba:items-center gba:justify-between">
        <span className="gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground">
          {title}
        </span>
        <CopyButton text={value} />
      </div>
      <pre className="gba:max-h-72 gba:overflow-auto gba:rounded-md gba:bg-muted/60 gba:p-2.5 gba:text-[12px] gba:leading-relaxed gba:text-foreground gba:whitespace-pre-wrap gba:break-words">
        {value}
      </pre>
    </div>
  )
}

export const TraceLensSpanDetail: React.FC<TraceLensSpanDetailProps> = ({ span }) => {
  if (!span) {
    return (
      <div className="gba:flex gba:h-full gba:items-center gba:justify-center gba:p-6 gba:text-center gba:text-sm gba:text-muted-foreground">
        Select a step to inspect its input, output, and timing.
      </div>
    )
  }

  const accent = SPAN_KIND_ACCENT[span.kind]
  const detail = span.detail ? { ...span.detail } : undefined
  if (detail) delete (detail as Record<string, unknown>).type

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
            {SPAN_KIND_LABEL[span.kind]}
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
          <span>seq #{span.seq}</span>
          <span>start +{formatMs(span.startMs)}</span>
          {!span.marker && <span>duration {formatMs(span.durationMs)}</span>}
          {span.timestamp && <span>{new Date(span.timestamp).toLocaleTimeString()}</span>}
        </div>
      </div>

      <LlmCallStats span={span} />

      <Section title="Input" value={span.input !== undefined ? prettyValue(span.input) : ''} />
      <Section title="Output" value={span.output ? prettyValue(span.output) : ''} />
      {detail && Object.keys(detail).length > 0 && <Section title="Details" value={prettyValue(detail)} />}
    </div>
  )
}
