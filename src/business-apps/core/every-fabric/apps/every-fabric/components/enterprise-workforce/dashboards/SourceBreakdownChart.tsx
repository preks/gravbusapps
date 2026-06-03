// Where an agent's work comes from, charted as runs-per-trigger-source.
// Replaces the previous inline-style (`style={{ width }}`) progress bars,
// which violated the design-system "no inline styles" rule, with a proper
// DS BarChart.

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@newwork/nw-design-system'
import { TreeStructureIcon } from '@phosphor-icons/react'
import React, { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import type { WorkforceSourceBreakdownEntry } from '../workforceTypes'

export interface SourceBreakdownChartProps {
  entries: readonly WorkforceSourceBreakdownEntry[]
}

const SOURCE_LABELS: Record<string, string> = {
  manual: 'Manual',
  schedule: 'Scheduled',
  webhook: 'Webhook',
  inbound_email: 'Inbound email'
}

const chartConfig = {
  runs: { label: 'Runs', color: 'var(--nw-color-chart-2, var(--primary))' }
} as const

export const SourceBreakdownChart: React.FC<SourceBreakdownChartProps> = ({ entries }) => {
  const data = useMemo(
    () =>
      entries
        .filter(entry => entry.runs > 0)
        .map(entry => ({
          source: entry.source,
          label: SOURCE_LABELS[entry.source] ?? entry.source,
          runs: entry.runs,
          credits: entry.credits
        })),
    [entries]
  )

  return (
    <Card data-testid="workforce-source-breakdown-chart">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
          <TreeStructureIcon className="gba:h-4 gba:w-4 gba:text-primary" />
          Where work comes from
        </CardTitle>
        <p className="gba:text-xs gba:text-muted-foreground">Last 30 days, grouped by trigger source.</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p
            className="gba:py-8 gba:text-center gba:text-xs gba:text-muted-foreground"
            data-testid="workforce-source-breakdown-empty"
          >
            No runs in the last 30 days yet.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="gba:h-[200px] gba:w-full gba:aspect-auto">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} fontSize={11} width={90} />
              <ChartTooltip content={<ChartTooltipContent labelKey="label" />} />
              <Bar dataKey="runs" name="runs" fill="var(--color-runs)" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
