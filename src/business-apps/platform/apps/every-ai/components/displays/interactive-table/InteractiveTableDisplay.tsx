import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, DataDisplay, DataTable } from '@newwork/nw-design-system'
import type { InteractiveTableData, InteractiveTableColumn } from '../../../types/models'
import { renderInteractiveTableCell } from './interactiveTableCells'
import { ensureDataTableRowIds, type TableRow } from './interactiveTableRowUtils'

export interface InteractiveTableDisplayProps {
  data: InteractiveTableData
  accessToken: string
}

function rowMatchesSearch(row: TableRow, search: string, columns: InteractiveTableColumn[]): boolean {
  const needle = search.trim().toLowerCase()
  if (!needle) {
    return true
  }
  return columns.some(col => {
    const raw = row[col.id]
    if (raw === null || raw === undefined) {
      return false
    }
    if (col.dataType === 'chip' && typeof raw === 'object' && raw !== null && 'label' in raw) {
      return String((raw as { label: string }).label)
        .toLowerCase()
        .includes(needle)
    }
    if (col.dataType === 'chip_list' && Array.isArray(raw)) {
      return raw.some(
        c =>
          typeof c === 'object' &&
          c !== null &&
          String((c as { label?: string }).label ?? '')
            .toLowerCase()
            .includes(needle)
      )
    }
    return String(raw).toLowerCase().includes(needle)
  })
}

export const InteractiveTableDisplay: React.FC<InteractiveTableDisplayProps> = ({ data, accessToken }) => {
  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>(() =>
    data.defaultSort ? [{ id: data.defaultSort.columnId, desc: data.defaultSort.direction === 'desc' }] : []
  )
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => data.columns.map(c => c.id))

  const rowsWithIds = useMemo(
    () =>
      ensureDataTableRowIds(data.rows as TableRow[], {
        rowEntityIdColumn: data.rowEntityIdColumn,
        columns: data.columns
      }),
    [data.rows, data.rowEntityIdColumn, data.columns]
  )

  const filteredRows = useMemo(
    () => rowsWithIds.filter(row => rowMatchesSearch(row, search, data.columns)),
    [rowsWithIds, data.columns, search]
  )

  const columns = useMemo(
    () =>
      data.columns
        .filter(col => visibleColumns.includes(col.id))
        .map(col => ({
          id: col.id,
          accessorFn: (row: TableRow) => row[col.id],
          header: col.header,
          enableSorting: col.sortable !== false,
          meta: { align: col.align ?? (col.dataType === 'number' ? 'right' : 'left') },
          cell: ({ row }: { row: { getValue: (key: string) => unknown } }) =>
            renderInteractiveTableCell(col, row.getValue(col.id), accessToken)
        })),
    [data.columns, visibleColumns, accessToken]
  )

  const availableColumns = useMemo(() => data.columns.map(col => ({ id: col.id, label: col.header })), [data.columns])

  if (data.rows.length === 0) {
    return (
      <Card data-testid="interactive-table-display-empty">
        <CardHeader>
          <CardTitle>{data.title}</CardTitle>
          {data.description ? <p className="gba:text-sm gba:text-muted-foreground">{data.description}</p> : null}
        </CardHeader>
        <CardContent>
          <p className="gba:text-sm gba:text-muted-foreground">No data to display.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="gba:border gba:shadow-sm" data-testid="interactive-table-display">
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-lg">{data.title}</CardTitle>
        {data.description ? <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{data.description}</p> : null}
      </CardHeader>
      <CardContent className="gba:pt-0">
        <DataDisplay
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search table..."
          sorting={sorting}
          onSortingChange={setSorting}
          sortableColumns={data.columns.filter(c => c.sortable !== false).map(c => ({ id: c.id, label: c.header }))}
          availableColumns={availableColumns}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
          toolbarDensity="compact"
        >
          <DataTable<TableRow>
            data={filteredRows}
            columns={columns}
            totalCount={filteredRows.length}
            sorting={sorting}
            onSortingChange={setSorting}
            pagination={pagination}
            onPaginationChange={setPagination}
            enablePagination
            enableSorting
            enableSelection={false}
            rowsPerPageOptions={[10, 20, 50, 100]}
            emptyMessage="No rows match your search."
            data-testid="interactive-table-data-table"
          />
        </DataDisplay>
      </CardContent>
    </Card>
  )
}
