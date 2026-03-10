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
  TableCell
} from '@newwork/nw-design-system'
import type { RunRow } from '../types'

const formatDateTime = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

const formatMaybeNumber = (n: number | null) => (n == null ? '—' : new Intl.NumberFormat().format(n))
const formatMs = (n: number | null) => (n == null ? '—' : `${Math.round(n)} ms`)

const SCOPE_LABELS: Record<string, string> = { monolith: 'Mono tkns', controller: 'Ctrl tkns', prechat: 'Prechat tkns' }
const scopeLabel = (scope: string) => SCOPE_LABELS[scope] ?? `${scope.charAt(0).toUpperCase()}${scope.slice(1)} tkns`

interface RunsTableProps {
  title: string
  rows: RunRow[]
  dataTestId: string
}

function RunsTable({ title, rows, dataTestId }: Readonly<RunsTableProps>) {
  const visible = useMemo(() => rows.slice(0, 10), [rows])

  const scopeNames = useMemo(() => {
    const set = new Set<string>()
    rows.forEach(r => Object.keys(r.token_scopes ?? {}).forEach(s => set.add(s)))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [rows])

  const baseCols = 10
  const totalCols = baseCols + scopeNames.length

  return (
    <Card data-testid={dataTestId}>
      <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:gap-2">
        <CardTitle className="gba:text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:max-h-96 gba:overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>TTFT</TableHead>
                <TableHead>Tokens</TableHead>
                {scopeNames.map(s => (
                  <TableHead key={s}>{scopeLabel(s)}</TableHead>
                ))}
                <TableHead>Tool calls</TableHead>
                <TableHead>Top tool</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map(r => (
                <TableRow key={r.run_id}>
                  <TableCell className="gba:whitespace-nowrap">{formatDateTime(r.created_at)}</TableCell>
                  <TableCell className="gba:w-56 gba:truncate">{r.workflow_display ?? r.workflow ?? '—'}</TableCell>
                  <TableCell className="gba:w-28 gba:truncate">{r.llm_provider ?? '—'}</TableCell>
                  <TableCell className="gba:w-40 gba:truncate">{r.llm_model ?? '—'}</TableCell>
                  <TableCell className="gba:whitespace-nowrap">{formatMs(r.total_ms)}</TableCell>
                  <TableCell className="gba:whitespace-nowrap">{formatMs(r.ttft_ms)}</TableCell>
                  <TableCell className="gba:whitespace-nowrap">{formatMaybeNumber(r.total_tokens)}</TableCell>
                  {scopeNames.map(s => (
                    <TableCell key={s} className="gba:whitespace-nowrap">
                      {formatMaybeNumber(r.token_scopes?.[s]?.total_tokens ?? null)}
                    </TableCell>
                  ))}
                  <TableCell className="gba:whitespace-nowrap">{formatMaybeNumber(r.num_tool_calls)}</TableCell>
                  <TableCell className="gba:w-40 gba:truncate">{r.tool ?? '—'}</TableCell>
                  <TableCell className="gba:w-40 gba:truncate">{r.error_type ?? '—'}</TableCell>
                </TableRow>
              ))}
              {visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={totalCols} className="gba:text-center gba:text-muted-foreground">
                    No runs in this time range.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

export interface RunsTablesProps {
  topCostRuns: RunRow[]
  recentRuns: RunRow[]
  'data-testid'?: string
}

export function RunsTables({
  topCostRuns,
  recentRuns,
  'data-testid': testId = 'flowbot-evals-runs-tables'
}: Readonly<RunsTablesProps>) {
  return (
    <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:xl:grid-cols-2" data-testid={testId}>
      <RunsTable title="Top cost runs" rows={topCostRuns} dataTestId="flowbot-evals-top-cost-runs" />
      <RunsTable title="Recent runs" rows={recentRuns} dataTestId="flowbot-evals-recent-runs" />
    </div>
  )
}

export default RunsTables
