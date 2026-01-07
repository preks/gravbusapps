import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Card,
  CardContent,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink
} from '@newwork/nw-design-system'
import { formatDate, getTranslationFromI18nKeyAndLabel as t } from '@/common/utils/windowUtils'
import { ListBulletsIcon, SortAscendingIcon, SortDescendingIcon } from '@phosphor-icons/react'

interface AffectedExpensesTableProps {
  data: Array<{ createdAt: string; title?: string; requestType?: string | null; type: 'Plan' | 'Request' | 'Item' }>
  page: number
  pageSize?: number
  totalCount: number
  onPageChange: (page: number) => void
  sort: { field: 'createdAt' | 'title' | 'requestType' | 'type'; order: 'asc' | 'desc' } | null
  onSortChange: (next: { field: 'createdAt' | 'title' | 'requestType' | 'type'; order: 'asc' | 'desc' } | null) => void
  dataTestId?: string
}

const AffectedExpensesTable: React.FC<AffectedExpensesTableProps> = ({
  data,
  page,
  pageSize = 5,
  totalCount,
  onPageChange,
  sort,
  onSortChange,
  dataTestId = 'affected-expenses'
}) => {
  const columns: Array<{ key: 'createdAt' | 'title' | 'requestType' | 'type'; title: string }> = [
    {
      key: 'createdAt',
      title: t(
        'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.affected_expense_modal.create_date',
        'Create Date'
      )
    },
    {
      key: 'title',
      title: t('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.affected_expense_modal.title', 'Title')
    },
    {
      key: 'requestType',
      title: t(
        'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.affected_expense_modal.request_type',
        'Request Type'
      )
    },
    {
      key: 'type',
      title: t('lowcoder:expense_calculation_rule.expense_calculation_rule_modal.affected_expense_modal.type', 'Type')
    }
  ]

  const handleHeaderClick = (field: 'createdAt' | 'title' | 'requestType' | 'type') => {
    if (!sort || sort.field !== field) return onSortChange({ field, order: 'asc' })
    if (sort.order === 'asc') return onSortChange({ field, order: 'desc' })
    return onSortChange(null)
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const currentPage = Math.min(page, totalPages)

  return (
    <Card className="gba:w-[100%]">
      <CardContent className="gba:p-0 gba:w-[100%]">
        <Table data-testid={`${dataTestId}-table`} className="gba:w-[100%]">
          <TableHeader>
            <TableRow>
              {columns.map(col => (
                <TableHead
                  key={col.key}
                  className={`gba:py-3 gba:px-4 gba:cursor-pointer ${col.key === 'title' ? 'gba:max-w-[360px]' : ''}`}
                  onClick={() => handleHeaderClick(col.key)}
                  data-testid={`${dataTestId}-header-${col.key}`}
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <span>{col.title}</span>
                    <span className="gba:text-gray-400">
                      {sort?.field === col.key ? (
                        sort.order === 'asc' ? (
                          <SortAscendingIcon size={16} />
                        ) : (
                          <SortDescendingIcon size={16} />
                        )
                      ) : (
                        <ListBulletsIcon size={16} />
                      )}
                    </span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="gba:text-center gba:py-6">
                  {t('lowcoder:team_expenses_page.dashboard_tab.no_data_found', 'No data found')}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, idx) => (
                <TableRow key={`${idx}`} data-testid={`${dataTestId}-row-${idx}`}>
                  <TableCell className="gba:py-3 gba:px-4 gba:max-w-[15vw] gba:whitespace-nowrap gba:overflow-hidden gba:text-ellipsis">
                    {formatDate(row.createdAt || '', 'date.long')}
                  </TableCell>
                  <TableCell className="gba:py-3 gba:px-4 gba:max-w-[15vw] gba:whitespace-nowrap gba:overflow-hidden gba:text-ellipsis">
                    {row.title || '-'}
                  </TableCell>
                  <TableCell className="gba:py-3 gba:px-4 gba:max-w-[15vw] gba:whitespace-nowrap gba:overflow-hidden gba:text-ellipsis">
                    {row.requestType || '-'}
                  </TableCell>
                  <TableCell className="gba:py-3 gba:px-4 gba:max-w-[15vw] gba:whitespace-nowrap gba:overflow-hidden gba:text-ellipsis">
                    {row.type}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div
          className="gba:flex gba:justify-between gba:items-center gba:mt-4 gba:px-4"
          data-testid={`${dataTestId}-pagination`}
        >
          {totalCount > pageSize && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationLink
                    aria-label="Prev"
                    className={`gba:w-[100%] gba:px-2 gba:gap-1 ${currentPage <= 1 ? 'gba:pointer-events-none gba:opacity-50' : 'gba:cursor-pointer'}`}
                    onClick={() => onPageChange(currentPage - 1)}
                    data-testid={`${dataTestId}-pagination-prev`}
                  >
                    {t('lowcoder:acknowledge_sick_leave.previous', 'Previous')}
                  </PaginationLink>
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, index, array) => (
                    <React.Fragment key={p}>
                      {index > 0 && array[index - 1] !== p - 1 && (
                        <PaginationItem>
                          <span className="gba:px-2">...</span>
                        </PaginationItem>
                      )}
                      <PaginationItem>
                        <PaginationLink
                          onClick={() => onPageChange(p)}
                          className={p === currentPage ? 'gba:bg-blue-500 gba:text-background' : 'gba:cursor-pointer'}
                          data-testid={`${dataTestId}-pagination-page-${p}`}
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    </React.Fragment>
                  ))}
                <PaginationItem>
                  <PaginationLink
                    aria-label="Next"
                    className={`gba:w-[100%] gba:px-2 gba:gap-1 ${currentPage >= totalPages ? 'gba:pointer-events-none gba:opacity-50' : 'gba:cursor-pointer'}`}
                    onClick={() => onPageChange(currentPage + 1)}
                    data-testid={`${dataTestId}-pagination-next`}
                  >
                    {t('lowcoder:add_items_to_plan.submit_button', 'Next')}
                  </PaginationLink>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default AffectedExpensesTable
