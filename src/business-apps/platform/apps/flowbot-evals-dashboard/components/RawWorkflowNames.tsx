import { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@newwork/nw-design-system'
import type { RunRow } from '../types'

interface RawWorkflowNamesProps {
  recentRuns: RunRow[]
  topCostRuns: RunRow[]
  'data-testid'?: string
}

type WorkflowItem = {
  display: string
  rawNames: string[]
  count: number
}

export function RawWorkflowNames({
  recentRuns,
  topCostRuns,
  'data-testid': testId = 'flowbot-evals-raw-workflow-names'
}: Readonly<RawWorkflowNamesProps>) {
  const rows = useMemo<WorkflowItem[]>(() => {
    const byRunId = new Map<string, RunRow>()
    ;[...recentRuns, ...topCostRuns].forEach(run => {
      if (run.run_id) byRunId.set(run.run_id, run)
    })

    const counts = new Map<string, { count: number; raw: Set<string> }>()
    Array.from(byRunId.values()).forEach(run => {
      const display = (run.workflow_display ?? run.workflow ?? 'null').trim() || 'null'
      const raw = (run.workflow ?? 'null').trim() || 'null'

      const current = counts.get(display) || { count: 0, raw: new Set<string>() }
      current.count += 1
      current.raw.add(raw)
      counts.set(display, current)
    })

    return Array.from(counts.entries())
      .map(([display, { count, raw }]) => ({ display, rawNames: Array.from(raw).sort(), count }))
      .sort((a, b) => b.count - a.count || a.display.localeCompare(b.display))
  }, [recentRuns, topCostRuns])

  return (
    <Card data-testid={testId}>
      <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:gap-2">
        <CardTitle className="gba:text-sm">Workflow names (display vs raw)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:max-h-52 gba:overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workflow (display)</TableHead>
                <TableHead>Workflow (raw)</TableHead>
                <TableHead>Runs in payload</TableHead>
                <TableHead>Contains "monolith"</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(row => (
                <TableRow key={row.display}>
                  <TableCell className="gba:max-w-xs gba:truncate">{row.display}</TableCell>
                  <TableCell className="gba:max-w-xl gba:truncate">{row.rawNames.join(', ')}</TableCell>
                  <TableCell>{row.count}</TableCell>
                  <TableCell>
                    {row.display.toLowerCase().includes('monolith') ||
                    row.rawNames.some(n => n.toLowerCase().includes('monolith'))
                      ? 'yes'
                      : 'no'}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="gba:text-center gba:text-muted-foreground">
                    No workflow names in current payload.
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

export default RawWorkflowNames
