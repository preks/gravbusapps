// Phase 6: compact 7-day credit consumption sparkline for the
// WorkforceAgentConfigView. Reads daily_buckets from the per-agent
// metrics endpoint and draws inline SVG bars — no new chart deps.

import { SpinnerGapIcon } from '@phosphor-icons/react'
import React, { useMemo } from 'react'
import { useWorkforceAgentMetrics } from './useWorkforceMetrics'
import { formatDateOnly } from './runDisplay'
import type { WorkforceMetricsBucket } from './workforceTypes'

interface WorkforceCreditSparklineProps {
  accessToken: string
  agentId: string
  testId?: string
}

const SPARKLINE_WIDTH = 220
const SPARKLINE_HEIGHT = 56
const BAR_GAP = 4

function buildBars(buckets: WorkforceMetricsBucket[]) {
  if (buckets.length === 0)
    return [] as Array<{ x: number; y: number; width: number; height: number; bucket: WorkforceMetricsBucket }>
  const maxCredits = Math.max(...buckets.map(b => b.credits), 1)
  const barWidth = Math.max(1, Math.floor((SPARKLINE_WIDTH - BAR_GAP * (buckets.length - 1)) / buckets.length))
  return buckets.map((bucket, idx) => {
    const heightRatio = bucket.credits / maxCredits
    const height = Math.max(2, Math.round(heightRatio * (SPARKLINE_HEIGHT - 4)))
    return {
      x: idx * (barWidth + BAR_GAP),
      y: SPARKLINE_HEIGHT - height,
      width: barWidth,
      height,
      bucket
    }
  })
}

export const WorkforceCreditSparkline: React.FC<WorkforceCreditSparklineProps> = ({ accessToken, agentId, testId }) => {
  const { metrics, totals, isLoading, error } = useWorkforceAgentMetrics({
    accessToken,
    agentId,
    window: 'week'
  })

  const bars = useMemo(() => buildBars(metrics?.daily_buckets ?? []), [metrics])

  return (
    <section
      className="gba:rounded-lg gba:border gba:border-border gba:bg-card gba:p-4"
      data-testid={testId ?? 'workforce-credit-sparkline'}
    >
      <header className="gba:flex gba:items-baseline gba:justify-between">
        <div>
          <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">Credits used (7d)</h3>
          <p className="gba:text-xs gba:text-muted-foreground">
            {totals.total_credits} credits · {totals.runs} runs
          </p>
        </div>
        {isLoading && <SpinnerGapIcon className="gba:h-3.5 gba:w-3.5 gba:animate-spin gba:text-muted-foreground" />}
      </header>
      {error && (
        <p className="gba:mt-2 gba:text-xs gba:text-destructive" role="alert">
          {error}
        </p>
      )}
      {bars.length > 0 && (
        <svg
          className="gba:mt-3"
          width={SPARKLINE_WIDTH}
          height={SPARKLINE_HEIGHT}
          role="img"
          aria-label="Credit usage by day"
        >
          {bars.map(bar => (
            <rect
              key={bar.bucket.date}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              rx={2}
              className="gba:fill-primary"
            >
              <title>
                {formatDateOnly(bar.bucket.date)}: {bar.bucket.credits} credits
              </title>
            </rect>
          ))}
        </svg>
      )}
    </section>
  )
}
