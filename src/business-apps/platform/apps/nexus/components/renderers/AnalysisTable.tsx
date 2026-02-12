import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@newwork/nw-design-system'
import type { AnalysisTable as AnalysisTableType } from '../../types/nexus.types'

interface AnalysisTableProps {
  table: AnalysisTableType
  testId?: string
}

export const AnalysisTable = ({ table, testId = 'nexus-table' }: AnalysisTableProps) => {
  return (
    <Card className="gba:overflow-hidden" data-testid={testId}>
      <CardHeader className="gba:pb-2 gba:px-5 gba:pt-5">
        <CardTitle className="gba:text-sm gba:font-semibold">{table.title}</CardTitle>
      </CardHeader>
      <CardContent className="gba:px-5 gba:pb-5">
        <div className="gba:overflow-x-auto gba:rounded-lg gba:border gba:border-border">
          <Table>
            <TableHeader>
              <TableRow className="gba:bg-muted/30">
                {table.headers.map((header, i) => (
                  <TableHead
                    key={i}
                    className="gba:text-[11px] gba:font-bold gba:uppercase gba:tracking-wider gba:text-muted-foreground"
                  >
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.rows.map((row, rowIdx) => (
                <TableRow key={rowIdx} className="gba:hover:bg-muted/20 gba:transition-colors">
                  {row.map((cell, cellIdx) => (
                    <TableCell key={cellIdx} className="gba:text-xs">
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
