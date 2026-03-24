import { useCallback, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EXPENSE_REQUESTS } from '../../../queries'
import type { ExpenseRequestQueryData, ExpenseData } from '../../../types'
import { formatNumberFunction } from '@/common/utils/windowUtils'
import { formatDateLocalized } from '../../../utils/dateUtils'
import { getExpenseRequestStatusDisplay, type ExpenseStatus, type TranslateFn } from '../../../utils/utils'
import { downloadCsv, downloadExcel, buildFilename } from '../../../utils/exportUtils'
import { buildEmployeeDisplayName } from '../../../hooks/backofficeReportUtils'
import { toast, useTranslation } from '@newwork/nw-design-system'
import translations from '../../../_i18n'

export const transformExpenseRequest = (item: any, t: TranslateFn): ExpenseData => ({
  id: item.id,
  expenseId: String(item.id ?? '-'),
  code: item.code ?? '-',
  sapNumber: item.employee?.hrReferenceCode ?? '-',
  employee: buildEmployeeDisplayName(item.employee) || '-',
  employeeCode: item.employee?.code ?? '-',
  title: item.title ?? '-',
  department: item.employee?.employeePosition?.costCenter?.name ?? '-',
  startDate: formatDateLocalized(item.startDate, t),
  endDate: formatDateLocalized(item.endDate, t),
  requestDate: formatDateLocalized(item.requestDate, t),
  reporter: buildEmployeeDisplayName(item.employee) || '-',
  type: item.requestType?.value ?? '-',
  amount: String(item.totalAmount ?? 0),
  advance: item.advancePaymentPaidAmount ?? 0,
  payableAmount: String(item.payableAmount ?? 0),
  paymentMethod: item.paymentMethod ?? '-',
  employeeId: item.employee?.id ?? '-',
  version: String(item.version ?? ''),
  currencyRef: item.currencyRef ?? '',
  typeRef: item.typeRef ?? '',
  requestTypeRef: item.requestTypeRef ?? '',
  totalRemainingAmount: item.totalRemainingAmount ?? 0,
  userId: item.userId ?? '-',
  expenseRuleId: item.expenseRuleId ?? '-',
  totalAmount: item.totalAmount ?? 0,
  reimbursableAmount: item.reimbursableAmount,
  currency: { code: item.currency?.code ?? '' },
  status: item.status ?? '',
  creationDate: formatDateLocalized(item.createdAt, t),
  employeeDocumentId: item.employeeDocumentId ?? '-',
  documentData: item.documentData
})

export const getExportColumns = (t: (key: string) => string) => [
  { key: 'employee', title: t('header-employee') },
  { key: 'employeeCode', title: t('header-employee-code') },
  { key: 'sapNumber', title: t('header-sap-number') },
  { key: 'code', title: t('header-request-number') },
  { key: 'title', title: t('header-title') },
  { key: 'startDate', title: t('header-start-date') },
  { key: 'endDate', title: t('header-end-date') },
  { key: 'creationDate', title: t('header-creation-date') },
  { key: 'status', title: t('header-status') },
  { key: 'totalRemainingAmount', title: t('header-remaining-amount') },
  { key: 'totalAmount', title: t('header-total-amount') },
  { key: 'currency', title: t('header-currency') },
  { key: 'department', title: t('header-department') }
]

const formatExpenseForExport = (expense: ExpenseData, t: TranslateFn) => ({
  code: expense.code || '-',
  employee: expense.employee || '-',
  employeeCode: expense.employeeCode || '-',
  sapNumber: expense.sapNumber || '-',
  title: expense.title || '-',
  department: expense.department || '-',
  startDate: expense.startDate,
  endDate: expense.endDate,
  requestDate: expense.requestDate,
  totalRemainingAmount: expense.totalRemainingAmount ? formatNumberFunction(String(expense.totalRemainingAmount)) : '0',
  totalAmount: formatNumberFunction(String(expense.totalAmount ?? 0)),
  currency: expense.currency?.code || '-',
  status: getExpenseRequestStatusDisplay(expense.status as ExpenseStatus, t).label,
  creationDate: expense.creationDate
})

interface UseExpenseRequestExportOptions {
  readonly accessToken: string
  readonly totalItems: number
  readonly buildQueryConditions: () => any
}

export function useExpenseRequestExport({
  accessToken,
  totalItems,
  buildQueryConditions
}: UseExpenseRequestExportOptions) {
  const { t } = useTranslation(translations)
  const [isExporting, setIsExporting] = useState(false)
  const graphqlClient = useGraphqlClient(accessToken)

  const fetchAllForExport = useCallback(async (): Promise<ExpenseData[]> => {
    const batchLimit = 1000
    const allExpenses: ExpenseData[] = []
    let offset = 0

    while (true) {
      const variables = {
        where: buildQueryConditions(),
        limit: batchLimit,
        offset,
        orderBy: [{ createdAt: 'DESC' }]
      }

      const response = await graphqlClient.request(GET_EXPENSE_REQUESTS, variables)
      const responseData = response as ExpenseRequestQueryData

      if (!responseData?.ExpenseRequest || responseData.ExpenseRequest.length === 0) break

      allExpenses.push(...responseData.ExpenseRequest.map((item: any) => transformExpenseRequest(item, t)))

      if (responseData.ExpenseRequest.length < batchLimit) break
      offset += batchLimit
    }

    return allExpenses
  }, [graphqlClient, buildQueryConditions, t])

  const handleExport = useCallback(
    async (format: 'csv' | 'excel', e?: React.MouseEvent) => {
      e?.preventDefault()
      e?.stopPropagation()

      if (isExporting || totalItems === 0) {
        if (totalItems === 0) {
          toast.error(t('export-no-data-title'), { description: t('export-no-data-description') })
        }
        return
      }

      setIsExporting(true)
      const formatLabel = format === 'csv' ? 'CSV' : 'Excel'

      try {
        const allExpenses = await fetchAllForExport()
        if (!allExpenses || allExpenses.length === 0) {
          toast.error(t('export-no-data-title'), { description: t('export-no-data-description') })
          return
        }

        const formattedData = allExpenses.map(expense => formatExpenseForExport(expense, t))
        const columns = getExportColumns(t)
        const filename = buildFilename('expense-requests', format === 'csv' ? 'csv' : 'xlsx')

        if (format === 'csv') {
          downloadCsv(formattedData, columns, filename)
        } else {
          await downloadExcel(formattedData, columns, filename)
        }

        toast.success(t('export-success-title'), {
          description: t('export-success-description', { count: formattedData.length, format: formatLabel })
        })
      } catch (err) {
        console.error(`[EXPORT ${formatLabel}] Error during export:`, err)
        toast.error(t('export-failed-title'), {
          description: t('export-failed-description', {
            format: formatLabel,
            error: err instanceof Error ? err.message : String(err)
          })
        })
      } finally {
        setIsExporting(false)
      }
    },
    [isExporting, totalItems, fetchAllForExport, t]
  )

  const handleExportCsv = useCallback((e?: React.MouseEvent) => handleExport('csv', e), [handleExport])
  const handleExportExcel = useCallback((e?: React.MouseEvent) => handleExport('excel', e), [handleExport])

  const getExportCsvTitle = useCallback((): string => {
    if (isExporting) return t('export-csv-tooltip-exporting')
    if (totalItems === 0) return t('export-csv-tooltip-no-data')
    return t('export-csv-tooltip', { count: totalItems })
  }, [isExporting, totalItems, t])

  const getExportExcelTitle = useCallback((): string => {
    if (isExporting) return t('export-csv-tooltip-exporting')
    if (totalItems === 0) return t('export-csv-tooltip-no-data')
    return t('export-excel-tooltip', { count: totalItems })
  }, [isExporting, totalItems, t])

  return {
    isExporting,
    handleExportCsv,
    handleExportExcel,
    getExportCsvTitle,
    getExportExcelTitle
  }
}
