import { memo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import type { TraceFrame } from '../../utils/traceModel'
import { traceColor } from './traceColors'
import translations from '../../_i18n'

interface TraceBarProps {
  frame: TraceFrame
  /** Left offset as a fraction of the total lane width (0..1). */
  left: number
  /** Width as a fraction (0..1). Minimum visual width is enforced via CSS. */
  width: number
  isSelected: boolean
  onSelect: (frame: TraceFrame) => void
}

const MIN_BAR_PX = 6

function formatDuration(ms: number | undefined, runningLabel: string): string {
  if (ms == null) return runningLabel
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export const TraceBar: React.FC<TraceBarProps> = memo(({ frame, left, width, isSelected, onSelect }) => {
  const { t } = useTranslation(translations)
  const color = traceColor(frame.kind)
  const opacity = frame.status === 'failed' ? 0.7 : 1
  const runningLabel = t('trace-explorer-bar-running')

  return (
    <button
      type="button"
      onClick={() => onSelect(frame)}
      title={`${frame.title} · ${formatDuration(frame.durationMs, runningLabel)}`}
      className={`gba:absolute gba:top-1.5 gba:bottom-1.5 gba:rounded-sm gba:transition-all gba:cursor-pointer gba:hover:brightness-110 gba:hover:shadow-sm ${color.bar} ${
        isSelected ? 'gba:ring-2 gba:ring-foreground gba:ring-offset-1 gba:z-10' : ''
      }`}
      style={{
        left: `${left * 100}%`,
        width: `max(${MIN_BAR_PX}px, ${width * 100}%)`,
        opacity
      }}
      data-testid={`trace-bar-${frame.id}`}
    />
  )
})

TraceBar.displayName = 'TraceBar'
