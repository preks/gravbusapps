// Transposed Table Component for Investment Reports
import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@newwork/nw-design-system'
import { ColumnDefinition } from './columnDefinitions'

interface TransposedTableProps {
  columns: ColumnDefinition[]
  reports: any[]
  'data-testid'?: string
}

const TransposedTable: React.FC<TransposedTableProps> = ({
  columns,
  reports,
  'data-testid': dataTestId = 'transposed-table'
}) => {
  if (reports.length === 0) {
    return <div className="gba:text-center gba:py-8 gba:text-gray-500">No reports to display</div>
  }

  return (
    <div className="gba:overflow-x-auto">
      <Table data-testid={dataTestId}>
        <TableHeader>
          <TableRow className="gba:bg-gray-50">
            <TableHead className="gba:font-semibold gba:text-gray-700 gba:py-3 gba:px-4 gba:min-w-[200px] gba:sticky gba:left-0 gba:bg-gray-50 gba:z-10 gba:border-r">
              Field
            </TableHead>
            {reports.map(report => (
              <TableHead
                key={report.id}
                className="gba:font-semibold gba:text-gray-700 gba:py-3 gba:px-4 gba:min-w-[150px] gba:text-center"
              >
                {report.date
                  ? new Date(report.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })
                  : '-'}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {columns
            .filter(col => col.key !== 'actions' && col.key !== 'date') // Exclude actions and date columns from transposed view
            .map(column => (
              <TableRow key={column.key} className="gba:border-b gba:hover:gba:bg-gray-50">
                <TableCell className="gba:py-3 gba:px-4 gba:font-medium gba:text-gray-900 gba:bg-gray-50 gba:sticky gba:left-0 gba:z-10 gba:border-r">
                  {column.title}
                </TableCell>
                {reports.map(report => (
                  <TableCell key={`${column.key}-${report.id}`} className="gba:py-3 gba:px-4 gba:text-center">
                    {column.render(report)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default TransposedTable
