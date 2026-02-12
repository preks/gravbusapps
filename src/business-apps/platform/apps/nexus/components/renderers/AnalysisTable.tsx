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
    <Card data-testid={testId}>
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-sm">{table.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:overflow-x-auto gba:rounded-md gba:border gba:border-border">
          <Table>
            <TableHeader>
              <TableRow>
                {table.headers.map((header, i) => (
                  <TableHead key={i} className="gba:text-xs gba:font-semibold">
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.rows.map((row, rowIdx) => (
                <TableRow key={rowIdx}>
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
