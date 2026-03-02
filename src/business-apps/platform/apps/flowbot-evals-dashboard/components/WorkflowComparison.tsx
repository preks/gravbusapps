import { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import type { RunRow } from '../types'

type WorkflowStats = {
  workflow: string
  runs: number
  avgTotalMs: number | null
  avgTokens: number | null
  avgToolCalls: number | null
}

const formatNumber = (value: number | null, digits = 0) => {
  if (value == null) return '—'
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value)
}

const average = (values: Array<number | null | undefined>): number | null => {
  const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

export interface WorkflowComparisonProps {
  recentRuns: RunRow[]
  topCostRuns: RunRow[]
  'data-testid'?: string
}

export function WorkflowComparison({
  recentRuns,
  topCostRuns,
  'data-testid': testId = 'flowbot-evals-workflow-comparison'
}: Readonly<WorkflowComparisonProps>) {
  const workflowStats = useMemo(() => {
    const mergedById = new Map<string, RunRow>()
    ;[...recentRuns, ...topCostRuns].forEach(run => mergedById.set(run.run_id, run))
    const merged = Array.from(mergedById.values())

    const grouped = new Map<string, RunRow[]>()
    merged.forEach(run => {
      const key = run.workflow_display || run.workflow || 'Unknown workflow'
      const arr = grouped.get(key) || []
      arr.push(run)
      grouped.set(key, arr)
    })

    const rows: WorkflowStats[] = Array.from(grouped.entries()).map(([workflow, runs]) => ({
      workflow,
      runs: runs.length,
      avgTotalMs: average(runs.map(r => r.total_ms)),
      avgTokens: average(runs.map(r => r.total_tokens)),
      avgToolCalls: average(runs.map(r => r.num_tool_calls))
    }))

    return rows.sort((a, b) => b.runs - a.runs)
  }, [recentRuns, topCostRuns])

  const chartConfig = useMemo<ChartConfig>(() => ({ runs: { label: 'Runs' } }), [])
  const chartData = workflowStats.slice(0, 8).map(row => ({ workflow: row.workflow, runs: row.runs }))

  return (
    <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:xl:grid-cols-2" data-testid={testId}>
      <Card>
        <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:gap-2">
          <CardTitle className="gba:text-sm">Workflow run share</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="gba:h-64 gba:w-full">
            <BarChart data={chartData} layout="vertical" margin={{ left: 24, right: 12 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
              <YAxis
                type="category"
                dataKey="workflow"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={11}
                width={180}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="runs" fill="var(--nw-chart-4)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="gba:text-sm">Workflow comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:max-h-64 gba:overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Runs</TableHead>
                  <TableHead>Avg total</TableHead>
                  <TableHead>Avg tokens</TableHead>
                  <TableHead>Avg tool calls</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflowStats.map(row => (
                  <TableRow key={row.workflow}>
                    <TableCell className="gba:max-w-xs gba:truncate">{row.workflow}</TableCell>
                    <TableCell>{formatNumber(row.runs)}</TableCell>
                    <TableCell>{formatNumber(row.avgTotalMs)} ms</TableCell>
                    <TableCell>{formatNumber(row.avgTokens)}</TableCell>
                    <TableCell>{formatNumber(row.avgToolCalls, 1)}</TableCell>
                  </TableRow>
                ))}
                {workflowStats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="gba:text-center gba:text-muted-foreground">
                      No workflow data in this range.
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

export default WorkflowComparison
