import { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
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
  name: string
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

    const counts = new Map<string, number>()
    Array.from(byRunId.values()).forEach(run => {
      const key = (run.workflow || 'null').trim() || 'null'
      counts.set(key, (counts.get(key) || 0) + 1)
    })

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [recentRuns, topCostRuns])

  return (
    <Card data-testid={testId}>
      <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:gap-2">
        <CardTitle className="gba:text-sm">Raw workflow names from payload</CardTitle>
        <Badge variant="secondary">{rows.length}</Badge>
      </CardHeader>
      <CardContent>
        <div className="gba:max-h-52 gba:overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workflow name</TableHead>
                <TableHead>Runs in payload</TableHead>
                <TableHead>Contains "monolith"</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(row => (
                <TableRow key={row.name}>
                  <TableCell className="gba:max-w-xl gba:truncate">{row.name}</TableCell>
                  <TableCell>{row.count}</TableCell>
                  <TableCell>{row.name.toLowerCase().includes('monolith') ? 'yes' : 'no'}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="gba:text-center gba:text-muted-foreground">
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
