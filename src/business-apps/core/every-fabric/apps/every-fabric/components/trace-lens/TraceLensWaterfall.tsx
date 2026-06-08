// Trace Lens — waterfall + nested span tree.

import { formatMs, SPAN_KIND_ACCENT, SPAN_KIND_LABEL, type TraceSpan } from './traceLensModel'

interface TraceLensWaterfallProps {
  spans: TraceSpan[]
  totalMs: number
  selectedSeq: number | null
  onSelect: (span: TraceSpan) => void
}

function statusDotClass(span: TraceSpan): string {
  if (span.status === 'failed') return 'gba:bg-rose-500'
  if (span.status === 'running') return 'gba:bg-amber-500 gba:animate-pulse'
  return SPAN_KIND_ACCENT[span.kind].bar
}

export const TraceLensWaterfall: React.FC<TraceLensWaterfallProps> = ({ spans, totalMs, selectedSeq, onSelect }) => {
  const safeTotal = totalMs > 0 ? totalMs : 1

  return (
    <div className="gba:flex gba:flex-col gba:text-[13px]" data-testid="trace-lens-waterfall">
      {spans.map(span => {
        const accent = SPAN_KIND_ACCENT[span.kind]
        const leftPct = Math.min(99, (span.startMs / safeTotal) * 100)
        const widthPct = span.marker
          ? 0
          : Math.max(0.6, Math.min(100 - leftPct, ((span.endMs - span.startMs) / safeTotal) * 100))
        const isSelected = selectedSeq === span.seq

        return (
          <button
            key={`${span.seq}-${span.id}`}
            type="button"
            onClick={() => onSelect(span)}
            className={`gba:group gba:flex gba:items-center gba:gap-3 gba:w-full gba:text-left gba:px-2 gba:py-1.5 gba:border-b gba:border-border/30 gba:transition-colors ${
              isSelected ? 'gba:bg-primary/10' : 'gba:hover:bg-muted/50'
            }`}
            data-testid="trace-lens-span-row"
          >
            {/* Name + kind, indented by tree depth */}
            <div
              className="gba:flex gba:items-center gba:gap-2 gba:min-w-0 gba:shrink-0"
              style={{ width: '46%', paddingLeft: `${span.depth * 14}px` }}
            >
              <span className={`gba:h-2 gba:w-2 gba:rounded-full gba:shrink-0 ${statusDotClass(span)}`} />
              <span className="gba:truncate gba:text-foreground" title={span.name}>
                {span.name}
              </span>
              <span
                className={`gba:shrink-0 gba:rounded gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium ${accent.text} ${accent.bg}`}
              >
                {SPAN_KIND_LABEL[span.kind]}
              </span>
            </div>

            {/* Waterfall bar */}
            <div className="gba:relative gba:flex-1 gba:h-4 gba:min-w-0">
              <div className="gba:absolute gba:inset-y-0 gba:left-0 gba:right-0 gba:my-auto gba:h-px gba:bg-border/40" />
              {span.marker ? (
                <span
                  className={`gba:absolute gba:top-1/2 gba:-translate-y-1/2 gba:-translate-x-1/2 gba:h-2.5 gba:w-2.5 gba:rotate-45 ${accent.bar}`}
                  style={{ left: `${leftPct}%` }}
                />
              ) : (
                <span
                  className={`gba:absolute gba:top-1/2 gba:-translate-y-1/2 gba:h-2.5 gba:rounded-sm ${accent.bar} ${
                    span.status === 'running' ? 'gba:opacity-60' : ''
                  }`}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: '3px' }}
                />
              )}
            </div>

            {/* Duration / offset */}
            <span className="gba:shrink-0 gba:w-16 gba:text-right gba:tabular-nums gba:text-[11px] gba:text-muted-foreground">
              {span.marker ? `@${formatMs(span.startMs)}` : formatMs(span.durationMs)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
