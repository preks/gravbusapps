import { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from '@newwork/nw-design-system'
import { BarChart, Bar, CartesianGrid, XAxis, YAxis } from 'recharts'
import type { ToolTokenStat } from '../types'

const formatNumber = (value: number | null) => {
  if (value == null) return '—'
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value)
}

export interface ToolTokenStatsProps {
  stats: ToolTokenStat[]
  'data-testid'?: string
}

export function ToolTokenStats({
  stats,
  'data-testid': testId = 'flowbot-evals-tool-token-stats'
}: Readonly<ToolTokenStatsProps>) {
  const sorted = useMemo(
    () => [...stats].sort((a, b) => (b.avg_total_tokens || 0) - (a.avg_total_tokens || 0)),
    [stats]
  )

  const chartData = sorted.slice(0, 10).map(item => ({
    tool: item.key,
    avgTokens: item.avg_total_tokens || 0
  }))

  const chartConfig = useMemo<ChartConfig>(() => ({ avgTokens: { label: 'Avg tokens' } }), [])

  return (
    <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:xl:grid-cols-2" data-testid={testId}>
      <Card>
        <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:gap-2">
          <CardTitle className="gba:text-sm">Token cost by tool</CardTitle>
          <Badge variant="secondary">{sorted.length}</Badge>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="gba:h-64 gba:w-full">
            <BarChart data={chartData} layout="vertical" margin={{ left: 24, right: 12 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
              <YAxis
                type="category"
                dataKey="tool"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={11}
                width={180}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="avgTokens" fill="var(--nw-chart-1)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="gba:text-sm">Tool token statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:max-h-64 gba:overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tool</TableHead>
                  <TableHead>Runs</TableHead>
                  <TableHead>Avg tokens</TableHead>
                  <TableHead>P50 tokens</TableHead>
                  <TableHead>P95 tokens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map(item => (
                  <TableRow key={item.key}>
                    <TableCell className="gba:max-w-xs gba:truncate">{item.key}</TableCell>
                    <TableCell>{formatNumber(item.runs)}</TableCell>
                    <TableCell>{formatNumber(item.avg_total_tokens)}</TableCell>
                    <TableCell>{formatNumber(item.p50_total_tokens)}</TableCell>
                    <TableCell>{formatNumber(item.p95_total_tokens)}</TableCell>
                  </TableRow>
                ))}
                {sorted.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="gba:text-center gba:text-muted-foreground">
                      No tool token stats in this time range.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ToolTokenStats
