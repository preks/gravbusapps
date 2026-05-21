import React from 'react'
import {
  Button,
  Card,
  CardContent,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@newwork/nw-design-system'
import { ArrowDownIcon, ArrowUpIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]
const SORTABLE_HEAD_CLASS =
  'gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted'

export interface HubDataTableColumn<RowType> {
  key: string
  header: React.ReactNode
  sortableField?: string
  widthClassName?: string
  headerClassName?: string
  cellClassName?: string
  renderCell: (row: RowType) => React.ReactNode
}

interface HubDataTableProps<RowType> {
  columns: HubDataTableColumn<RowType>[]
  rows: RowType[]
  getRowKey: (row: RowType) => string
  loading: boolean
  error: Error | string | null
  total: number
  currentPage: number
  pageSize: number
  onPaginationChange: (page: number, newPageSize?: number) => void
  sortField?: string
  sortOrder?: 'ASC' | 'DESC' | ''
  onSort?: (field: string) => void
  onRowClick?: (row: RowType) => void
  dataTestIdPrefix: string
  rowLabel: string
  emptyMessage: string
}

const renderSortIcon = (field: string, sortField: string, sortOrder: 'ASC' | 'DESC' | '') => {
  if (sortField !== field) return null
  if (sortOrder === 'ASC') return <ArrowUpIcon className="gba:inline gba:ml-1" size={12} />
  if (sortOrder === 'DESC') return <ArrowDownIcon className="gba:inline gba:ml-1" size={12} />
  return null
}

interface RowsPerPageSelectProps {
  pageSize: number
  onChange: (nextPageSize: number) => void
  testId: string
}

const RowsPerPageSelect: React.FC<RowsPerPageSelectProps> = ({ pageSize, onChange, testId }) => (
  <div className="gba:flex gba:items-center gba:space-x-2">
    <p className="gba:text-sm gba:font-medium">
      {getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.rows_per_page', 'Rows per page')}
    </p>
    <select
      value={pageSize}
      onChange={event => onChange(Number(event.target.value))}
      className="gba:h-8 gba:w-20 gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
      data-testid={testId}
    >
      {PAGE_SIZE_OPTIONS.map(option => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </div>
)

interface PaginationIconButtonProps {
  onClick: () => void
  disabled: boolean
  testId: string
  icon: string
  labelKey: string
  fallbackLabel: string
}

const PaginationIconButton: React.FC<PaginationIconButtonProps> = ({
  onClick,
  disabled,
  testId,
  icon,
  labelKey,
  fallbackLabel
}) => (
  <Button
    variant="outline"
    size="sm"
    className="gba:h-8 gba:w-8 gba:p-0"
    onClick={onClick}
    disabled={disabled}
    data-testid={testId}
  >
    <span className="gba:sr-only">{getTranslationFromI18nKeyAndLabel(labelKey, fallbackLabel)}</span>
    <span aria-hidden="true">{icon}</span>
  </Button>
)

export function HubDataTable<RowType>({
  columns,
  rows,
  getRowKey,
  loading,
  error,
  total,
  currentPage,
  pageSize,
  onPaginationChange,
  sortField = '',
  sortOrder = '',
  onSort,
  onRowClick,
  dataTestIdPrefix,
  rowLabel,
  emptyMessage
}: HubDataTableProps<RowType>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const hasMultiplePages = total > pageSize
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const rangeEnd = Math.min(currentPage * pageSize, total)

  if (error) {
    const errorMessage = error instanceof Error ? error.message : error
    return (
      <Card data-testid={`${dataTestIdPrefix}-container`}>
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:py-8">
          <div className="gba:text-center">
            <p className="gba:text-destructive gba:mb-2">{errorMessage}</p>
            <Button onClick={() => globalThis.window.location.reload()}>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.absence_list.retry',
                'Retry'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card data-testid={`${dataTestIdPrefix}-container`}>
        <CardContent className="gba:flex gba:justify-center gba:p-4">
          <Spinner />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid={`${dataTestIdPrefix}-container`}>
      <CardContent className="gba:p-0">
        <div className="gba:w-full gba:overflow-hidden">
          <Table className="gba:w-full gba:table-fixed" data-testid={`${dataTestIdPrefix}-table`}>
            <TableHeader>
              <TableRow className="gba:border-b gba:bg-muted">
                {columns.map(column => {
                  const isSortable = Boolean(column.sortableField && onSort)
                  const headClassName = isSortable
                    ? SORTABLE_HEAD_CLASS
                    : 'gba:font-semibold gba:text-foreground gba:py-4 gba:px-6'

                  return (
                    <TableHead
                      key={column.key}
                      className={`${column.widthClassName || ''} ${headClassName} ${column.headerClassName || ''}`}
                      onClick={isSortable ? () => onSort(column.sortableField as string) : undefined}
                    >
                      <div className="gba:flex gba:items-center">
                        {column.header}
                        {column.sortableField ? renderSortIcon(column.sortableField, sortField, sortOrder) : null}
                      </div>
                    </TableHead>
                  )
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="gba:px-6 gba:py-8 gba:text-center gba:text-muted-foreground"
                    colSpan={columns.length}
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map(row => {
                  const rowKey = getRowKey(row)
                  return (
                    <TableRow
                      key={rowKey}
                      className={`gba:border-b gba:transition-colors ${
                        onRowClick ? 'gba:cursor-pointer hover:gba:bg-muted' : ''
                      }`}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      data-testid={`${dataTestIdPrefix}-row-${rowKey}`}
                    >
                      {columns.map(column => (
                        <TableCell
                          key={`${column.key}-${rowKey}`}
                          className={column.cellClassName || 'gba:py-4 gba:px-6'}
                          data-testid={`${dataTestIdPrefix}-${column.key}-cell-${rowKey}`}
                        >
                          {column.renderCell(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div
          className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4"
          data-testid={
            hasMultiplePages ? `${dataTestIdPrefix}-pagination` : `${dataTestIdPrefix}-pagination-info-single-page`
          }
        >
          <div className="gba:text-sm gba:text-muted-foreground" data-testid={`${dataTestIdPrefix}-pagination-info`}>
            {hasMultiplePages
              ? `${rangeStart}-${rangeEnd} ${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of', 'of')} ${total} ${rowLabel}`
              : `${total} ${rowLabel}`}
          </div>
          <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
            <RowsPerPageSelect
              pageSize={pageSize}
              onChange={nextPageSize => onPaginationChange(1, nextPageSize)}
              testId={
                hasMultiplePages
                  ? `${dataTestIdPrefix}-page-size-select`
                  : `${dataTestIdPrefix}-page-size-select-single`
              }
            />

            {hasMultiplePages && (
              <>
                <div
                  className="gba:flex gba:w-24 gba:items-center gba:justify-center gba:text-sm gba:font-medium"
                  data-testid={`${dataTestIdPrefix}-page-info`}
                >
                  {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.page', 'Page')} {currentPage}{' '}
                  {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of', 'of')} {totalPages}
                </div>
                <div className="gba:flex gba:items-center gba:space-x-2">
                  <PaginationIconButton
                    onClick={() => onPaginationChange(1)}
                    disabled={currentPage === 1}
                    testId={`${dataTestIdPrefix}-first-page-button`}
                    icon="«"
                    labelKey="lowcoder:absence_management_hub_backoffice.absence_list.go_to_first_page"
                    fallbackLabel="Go to first page"
                  />
                  <PaginationIconButton
                    onClick={() => onPaginationChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    testId={`${dataTestIdPrefix}-previous-page-button`}
                    icon="‹"
                    labelKey="lowcoder:absence_management_hub_backoffice.absence_list.go_to_previous_page"
                    fallbackLabel="Go to previous page"
                  />
                  <PaginationIconButton
                    onClick={() => onPaginationChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    testId={`${dataTestIdPrefix}-next-page-button`}
                    icon="›"
                    labelKey="lowcoder:absence_management_hub_backoffice.absence_list.go_to_next_page"
                    fallbackLabel="Go to next page"
                  />
                  <PaginationIconButton
                    onClick={() => onPaginationChange(totalPages)}
                    disabled={currentPage >= totalPages}
                    testId={`${dataTestIdPrefix}-last-page-button`}
                    icon="»"
                    labelKey="lowcoder:absence_management_hub_backoffice.absence_list.go_to_last_page"
                    fallbackLabel="Go to last page"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
