import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from '@newwork/nw-design-system'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts'
import type { TimeseriesPoint } from '../types'

const formatTs = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })
}

export interface TimeseriesChartsProps {
  points: TimeseriesPoint[]
  'data-testid'?: string
}

export function TimeseriesCharts({
  points,
  'data-testid': testId = 'flowbot-evals-timeseries'
}: Readonly<TimeseriesChartsProps>) {
  const data = useMemo(
    () =>
      points.map(p => ({
        ...p,
        tsLabel: formatTs(p.ts),
        errorPct: Math.round((p.error_rate || 0) * 10000) / 100 // 2 decimals
      })),
    [points]
  )

  const latencyConfig = useMemo<ChartConfig>(
    () => ({
      p50_total_ms: { label: 'P50 total (ms)' },
      p95_total_ms: { label: 'P95 total (ms)' }
    }),
    []
  )

  const tokenConfig = useMemo<ChartConfig>(
    () => ({
      p50_tokens: { label: 'P50 tokens' },
      p95_tokens: { label: 'P95 tokens' }
    }),
    []
  )

  const errorConfig = useMemo<ChartConfig>(() => ({ errorPct: { label: 'Error rate (%)' } }), [])
  const runsConfig = useMemo<ChartConfig>(() => ({ runs: { label: 'Runs' } }), [])

  return (
    <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:xl:grid-cols-2" data-testid={testId}>
      <Card>
        <CardHeader>
          <CardTitle className="gba:text-sm">Latency (ms)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={latencyConfig} className="gba:h-64">
            <LineChart data={data} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="tsLabel" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Line dataKey="p50_total_ms" type="monotone" stroke="var(--nw-chart-2)" strokeWidth={2} dot={false} />
              <Line dataKey="p95_total_ms" type="monotone" stroke="var(--nw-chart-5)" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="gba:text-sm">Token usage</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={tokenConfig} className="gba:h-64">
            <LineChart data={data} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="tsLabel" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Line dataKey="p50_tokens" type="monotone" stroke="var(--nw-chart-1)" strokeWidth={2} dot={false} />
              <Line dataKey="p95_tokens" type="monotone" stroke="var(--nw-chart-4)" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="gba:text-sm">Error rate</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={errorConfig} className="gba:h-60">
            <LineChart data={data} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="tsLabel" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Line dataKey="errorPct" type="monotone" stroke="var(--nw-chart-3)" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="gba:text-sm">Run volume</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={runsConfig} className="gba:h-60">
            <BarChart data={data} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="tsLabel" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Bar dataKey="runs" fill="var(--nw-chart-2)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}

export default TimeseriesCharts
