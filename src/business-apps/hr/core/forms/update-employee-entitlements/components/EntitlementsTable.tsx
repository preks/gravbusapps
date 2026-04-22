import React, { useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  useTranslation
} from '@newwork/nw-design-system'
import { formatDate, getCatalogValue, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import translations from '../../_i18n'

interface EntitlementsTableProps {
  entitlements: any[]
  page: number
  setPage: (updater: number | ((prev: number) => number)) => void
  pageSize: number
}

const EntitlementsTable: React.FC<EntitlementsTableProps> = ({ entitlements, page, setPage, pageSize }) => {
  const { t } = useTranslation(translations)
  const sortedEntitlements = useMemo(
    () =>
      [...(entitlements || [])].sort((firstRow, secondRow) => {
        const firstDate = firstRow?.validFrom || ''
        const secondDate = secondRow?.validFrom || ''

        if (firstDate === secondDate) {
          return String(firstRow?.id || '').localeCompare(String(secondRow?.id || ''))
        }

        if (!firstDate) {
          return 1
        }

        if (!secondDate) {
          return -1
        }

        return firstDate > secondDate ? -1 : 1
      }),
    [entitlements]
  )
  const totalItems = sortedEntitlements.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const currentItems = sortedEntitlements.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="gba:mb-8">
      <Table className="gba:w-full gba:table-fixed" data-testid="entitlements-table">
        <TableHeader>
          <TableRow>
            <TableHead className="gba:w-[24%] gba:align-top">
              <div className="gba:whitespace-normal gba:break-words gba:leading-snug">
                {getTranslationFromI18nKeyAndLabel('lowcoder:manager_expense_request_list.expense_table.type', 'Type')}
              </div>
            </TableHead>
            <TableHead className="gba:w-[32%] gba:align-top">
              <div className="gba:whitespace-normal gba:break-words gba:leading-snug">{t('entitlements-total')}</div>
            </TableHead>
            <TableHead className="gba:w-[22%] gba:align-top">
              <div className="gba:whitespace-normal gba:break-words gba:leading-snug">
                {t('entitlements-effective-from')}
              </div>
            </TableHead>
            <TableHead className="gba:w-[22%] gba:align-top">
              <div className="gba:whitespace-normal gba:break-words gba:leading-snug">
                {t('entitlements-effective-to')}
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentItems.map((row: any) => {
            return (
              <TableRow key={row.id} data-testid={`entitlements-table-row-${row.id}`}>
                <TableCell
                  className="gba:whitespace-normal gba:break-words"
                  data-testid={`entitlements-type-${row.id}`}
                >
                  {getCatalogValue(row.type)}
                </TableCell>
                <TableCell data-testid={`entitlements-total-${row.id}`}>{row.total ?? 0}</TableCell>
                <TableCell data-testid={`entitlements-effective-from-${row.id}`}>
                  {formatDate(row.validFrom) || '-'}
                </TableCell>
                <TableCell data-testid={`entitlements-effective-to-${row.id}`}>
                  {formatDate(row.validTo) || '-'}
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
