import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Button } from '@newwork/nw-design-system'
import { useTranslation } from '@newwork/nw-design-system'
import { getCatalogValue, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import translations from '../../_i18n'

interface EntitlementsTableProps {
  entitlements: any[]
  page: number
  setPage: (updater: number | ((prev: number) => number)) => void
  pageSize: number
  onRowClick: (row: any) => void
}

const EntitlementsTable: React.FC<EntitlementsTableProps> = ({ entitlements, page, setPage, pageSize, onRowClick }) => {
  const { t } = useTranslation(translations)
  const totalItems = (entitlements || []).length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const currentItems = (entitlements || []).slice((page - 1) * pageSize, page * pageSize)
  const formatDate = (value?: string) => {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'
    return date.toLocaleDateString()
  }

  return (
    <div className="gba:mb-8">
      <Table data-testid="entitlements-table">
        <TableHeader>
          <TableRow>
            <TableHead>
              {getTranslationFromI18nKeyAndLabel('lowcoder:manager_expense_request_list.expense_table.type', 'Type')}
            </TableHead>
            <TableHead>
              {getTranslationFromI18nKeyAndLabel('lowcoder:initiate_advance_payment.total', 'Total')}
            </TableHead>
            <TableHead>{t('entitlements-effective-from')}</TableHead>
            <TableHead>{t('entitlements-effective-to')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentItems.map((row: any) => {
            return (
              <TableRow
                key={row.id}
                data-testid={`entitlements-table-row-${row.id}`}
                className="gba:cursor-pointer gba:hover:bg-accent"
                onClick={() => onRowClick(row)}
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onRowClick(row)
                  }
                }}
              >
                <TableCell
                  data-testid={`entitlements-type-${row.id}`}
                  className="gba:cursor-pointer"
                  onClick={() => onRowClick(row)}
                >
                  {getCatalogValue(row.type)}
                </TableCell>
                <TableCell
                  data-testid={`entitlements-total-${row.id}`}
                  className="gba:cursor-pointer"
                  onClick={() => onRowClick(row)}
                >
                  {row.total ?? 0}
                </TableCell>
                <TableCell
                  data-testid={`entitlements-effective-from-${row.id}`}
                  className="gba:cursor-pointer"
                  onClick={() => onRowClick(row)}
                >
                  {formatDate(row.validFrom)}
                </TableCell>
                <TableCell
                  data-testid={`entitlements-effective-to-${row.id}`}
                  className="gba:cursor-pointer"
                  onClick={() => onRowClick(row)}
                >
                  {formatDate(row.validTo)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <div className="gba:flex gba:items-center gba:justify-between gba:mt-3">
        <div className="gba:text-sm">
          {totalItems === 0
            ? '0-0 of 0'
            : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, totalItems)} of ${totalItems}`}
        </div>
        <div className="gba:flex gba:gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPage((p: number) => Math.max(1, p - 1))}
            disabled={page <= 1}
            data-testid="entitlements-prev-page"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.previous', 'Previous')}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            data-testid="entitlements-next-page"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.next', 'Next')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default EntitlementsTable
