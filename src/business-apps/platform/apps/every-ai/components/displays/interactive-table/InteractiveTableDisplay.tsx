import React, { useMemo, useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, DataDisplay, DataTable } from '@newwork/nw-design-system'
import type { CurrencyCellValue, InteractiveTableData, InteractiveTableColumn } from '../../../types/models'
import { useDisplayDataRequery } from '../../../hooks/useDisplayDataRequery'
import { formatCurrencyCell } from './formatCurrencyCell'
import { formatDateCell, isIsoDateLike } from './formatDateCell'
import { mapGraphqlRowsToExistingColumns } from './graphqlRowsToTableData'
import { renderInteractiveTableCell } from './interactiveTableCells'
import {
  ensureDataTableRowIds,
  dataTableRowId,
  sortableValueForColumn,
  type TableRow
} from './interactiveTableRowUtils'

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
    if (col.dataType === 'currency' && typeof raw === 'object' && raw !== null && 'value' in raw) {
      return formatCurrencyCell(raw as CurrencyCellValue)
        .toLowerCase()
        .includes(needle)
    }
    if (col.dataType === 'date' && typeof raw === 'string') {
      return formatDateCell(raw).toLowerCase().includes(needle)
    }
    if (typeof raw === 'string' && isIsoDateLike(raw)) {
      return formatDateCell(raw).toLowerCase().includes(needle)
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

  const querySpec = data.querySpec ?? null
  const requeryPageSize = querySpec?.pageSize ?? 20
  const {
    run: runRequery,
    loading: requeryLoading,
    error: requeryError
  } = useDisplayDataRequery(accessToken, querySpec)
  const [extraRows, setExtraRows] = useState<TableRow[]>([])
  const [requeryExhausted, setRequeryExhausted] = useState(false)

  const allRows = useMemo(() => [...(data.rows as TableRow[]), ...extraRows], [data.rows, extraRows])

  const knownTotal = data.totalCount ?? querySpec?.totalCount ?? null
  const canLoadMore = Boolean(querySpec) && !requeryExhausted && (knownTotal === null || allRows.length < knownTotal)

  const handleLoadMore = async () => {
    if (!querySpec) {
      return
    }
    const offsetVar = querySpec.offsetVar ?? 'offset'
    const limitVar = querySpec.limitVar ?? 'limit'
    const fetched = await runRequery({ [offsetVar]: allRows.length, [limitVar]: requeryPageSize })
    if (fetched.length < requeryPageSize) {
      setRequeryExhausted(true)
    }
    if (fetched.length > 0) {
      const mapped = mapGraphqlRowsToExistingColumns(fetched, data.columns, data.rowEntityIdColumn) as TableRow[]
      setExtraRows(prev => [...prev, ...mapped])
    }
  }

  const rowsWithIds = useMemo(
    () =>
      ensureDataTableRowIds(allRows, {
        rowEntityIdColumn: data.rowEntityIdColumn,
        columns: data.columns
      }),
    [allRows, data.rowEntityIdColumn, data.columns]
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
          sortingFn: (rowA: { original: TableRow }, rowB: { original: TableRow }) => {
            const a = sortableValueForColumn(col, rowA.original[col.id])
            const b = sortableValueForColumn(col, rowB.original[col.id])
            if (a === b) {
              return 0
            }
            return a < b ? -1 : 1
          },
          meta: {
            align: col.align ?? (col.dataType === 'number' || col.dataType === 'currency' ? 'right' : 'left')
          },
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
          onSearchChange={value => {
            setSearch(value)
            setPagination(prev => ({ ...prev, pageIndex: 0 }))
          }}
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
            getRowId={dataTableRowId}
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
        {querySpec ? (
          <div className="gba:mt-3 gba:flex gba:items-center gba:gap-3" data-testid="interactive-table-requery">
            {canLoadMore ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={requeryLoading}
                data-testid="interactive-table-load-more"
              >
                {requeryLoading ? 'Loading…' : 'Load more'}
              </Button>
            ) : (
              <span className="gba:text-xs gba:text-muted-foreground">All loaded rows shown.</span>
            )}
            <span className="gba:text-xs gba:text-muted-foreground">{allRows.length} rows loaded</span>
            {requeryError ? <span className="gba:text-xs gba:text-destructive">{requeryError}</span> : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
