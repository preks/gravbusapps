// Run-outcome breakdown: a donut of completed / failed / cancelled runs with
// the headline success rate in the center. Gives operators an at-a-glance
// reliability read for the agent over the selected window.

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@newwork/nw-design-system'
import { CheckCircleIcon } from '@phosphor-icons/react'
import React, { useMemo } from 'react'
import { Cell, Pie, PieChart } from 'recharts'
import type { WorkforceMetricsTotals } from '../workforceTypes'

export interface RunOutcomeChartProps {
  totals: WorkforceMetricsTotals
}

const chartConfig = {
  completed: { label: 'Completed', color: 'var(--nw-color-chart-2, var(--primary))' },
  failed: { label: 'Failed', color: 'var(--destructive)' },
  cancelled: { label: 'Cancelled', color: 'var(--muted-foreground)' }
} as const

type OutcomeKey = keyof typeof chartConfig

export const RunOutcomeChart: React.FC<RunOutcomeChartProps> = ({ totals }) => {
  const data = useMemo(() => {
    const rows: Array<{ key: OutcomeKey; name: string; value: number }> = [
      { key: 'completed', name: 'Completed', value: totals.completed_runs },
      { key: 'failed', name: 'Failed', value: totals.failed_runs },
      { key: 'cancelled', name: 'Cancelled', value: totals.cancelled_runs }
    ]
    return rows.filter(row => row.value > 0)
  }, [totals])

  const finished = totals.completed_runs + totals.failed_runs
  const successRate = finished > 0 ? Math.round((totals.completed_runs / finished) * 100) : null

  return (
    <Card data-testid="workforce-run-outcome-chart">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
          <CheckCircleIcon className="gba:h-4 gba:w-4 gba:text-emerald-500" />
          Run outcomes
        </CardTitle>
        <p className="gba:text-xs gba:text-muted-foreground">
          {successRate === null ? 'No finished runs yet' : `${successRate}% success · ${totals.runs} runs`}
        </p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="gba:py-8 gba:text-center gba:text-xs gba:text-muted-foreground">No runs in this window yet.</p>
        ) : (
          <div className="gba:relative">
            <ChartContainer config={chartConfig} className="gba:h-[200px] gba:w-full gba:aspect-auto">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} strokeWidth={2}>
                  {data.map(entry => (
                    <Cell key={entry.key} fill={`var(--color-${entry.key})`} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            {successRate !== null && (
              <div className="gba:pointer-events-none gba:absolute gba:inset-0 gba:flex gba:flex-col gba:items-center gba:justify-center">
                <span className="gba:text-2xl gba:font-semibold gba:text-foreground">{successRate}%</span>
                <span className="gba:text-[10px] gba:uppercase gba:tracking-wide gba:text-muted-foreground">
                  success
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
