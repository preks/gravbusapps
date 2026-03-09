import { useCallback, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EXPENSE_REQUESTS } from '../../../queries'
import type { ExpenseRequestQueryData, ExpenseData } from '../../../types'
import { getTranslationFromI18nKeyAndLabel, formatNumberFunction } from '@/common/utils/windowUtils'
import { formatDateLocalized } from '../../../utils/dateUtils'
import { getExpenseRequestStatusDisplay, type ExpenseStatus } from '../../../utils/utils'
import { downloadCsv, downloadExcel, buildFilename } from '../../../utils/exportUtils'
import { buildEmployeeDisplayName } from '../../../hooks/backofficeReportUtils'
import { toast } from '@newwork/nw-design-system'

export const transformExpenseRequest = (item: any): ExpenseData => ({
  id: item.id,
  expenseId: String(item.id ?? '-'),
  code: item.code ?? '-',
  sapNumber: item.employee?.hrReferenceCode ?? '-',
  employee: buildEmployeeDisplayName(item.employee) || '-',
  employeeCode: item.employee?.code ?? '-',
  title: item.title ?? '-',
  department: item.employee?.employeePosition?.costCenter?.name ?? '-',
  startDate: formatDateLocalized(item.startDate),
  endDate: formatDateLocalized(item.endDate),
  requestDate: formatDateLocalized(item.requestDate),
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
  creationDate: formatDateLocalized(item.createdAt),
  employeeDocumentId: item.employeeDocumentId ?? '-',
  documentData: item.documentData
})

export const getExportColumns = () => [
  {
    key: 'employee',
    title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee')
  },
  {
    key: 'employeeCode',
    title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_table.employee_code', 'Employee Code')
  },
  {
    key: 'sapNumber',
    title: getTranslationFromI18nKeyAndLabel(
      'lowcoder:expense_config_calculation_rule_list.expense_table.sap_number',
      'SAP Number'
    )
  },
  {
    key: 'code',
    title: getTranslationFromI18nKeyAndLabel(
      'lowcoder:expense_request_list.expense_request_filter.request_number_input',
      'Request Number'
    )
  },
  {
    key: 'title',
    title: getTranslationFromI18nKeyAndLabel('lowcoder:manager_expense_request_list.expense_table.title', 'Title')
  },
  {
    key: 'startDate',
    title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.expense_plan_table.start_date', 'Start Date')
  },
  {
    key: 'endDate',
    title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.expense_plan_table.end_date', 'End Date')
  },
  {
    key: 'requestDate',
    title: getTranslationFromI18nKeyAndLabel(
      'lowcoder:manager_expense_request_list.expense_table.creation_date',
      'Creation Date'
    )
  },
  {
    key: 'status',
    title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status')
  },
  {
    key: 'totalRemainingAmount',
    title: getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_plan.remaining', 'Remaining Amount')
  },
  {
    key: 'totalAmount',
    title: getTranslationFromI18nKeyAndLabel(
      'lowcoder:expense_request_list.expense_plan_table.total_amount',
      'Total Amount'
    )
  },
  { key: 'currency', title: getTranslationFromI18nKeyAndLabel('lowcoder:cards.currency_label', 'Currency') },
  {
    key: 'department',
    title: getTranslationFromI18nKeyAndLabel('lowcoder:cards.department_label', 'Department')
  },
  {
    key: 'requestDate',
    title: getTranslationFromI18nKeyAndLabel(
      'lowcoder:confirm_transfer_advance_payment.request_date_label',
      'Request Date'
    )
  }
]

const formatExpenseForExport = (expense: ExpenseData) => ({
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
  totalAmount: expense.reimbursableAmount ? formatNumberFunction(String(expense.reimbursableAmount)) : '0',
  currency: expense.currency?.code || '-',
  status: getExpenseRequestStatusDisplay(expense.status as ExpenseStatus).label,
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

      allExpenses.push(...responseData.ExpenseRequest.map(transformExpenseRequest))

      if (responseData.ExpenseRequest.length < batchLimit) break
      offset += batchLimit
    }

    return allExpenses
  }, [graphqlClient, buildQueryConditions])

  const handleExport = useCallback(
    async (format: 'csv' | 'excel', e?: React.MouseEvent) => {
      e?.preventDefault()
      e?.stopPropagation()

      if (isExporting || totalItems === 0) {
        if (totalItems === 0) {
          toast.error('No Data Available', { description: 'No expense data available to export' })
        }
        return
      }

      setIsExporting(true)
      const formatLabel = format === 'csv' ? 'CSV' : 'Excel'

      try {
        const allExpenses = await fetchAllForExport()
        if (!allExpenses || allExpenses.length === 0) {
          toast.error('No Data Available', { description: 'No expense data available to export' })
          return
        }

        const formattedData = allExpenses.map(formatExpenseForExport)
        const columns = getExportColumns()
        const filename = buildFilename('expense-requests', format === 'csv' ? 'csv' : 'xlsx')

        if (format === 'csv') {
          downloadCsv(formattedData, columns, filename)
        } else {
          await downloadExcel(formattedData, columns, filename)
        }

        toast.success('Export Successful', {
          description: `Exported ${formattedData.length} expense requests to ${formatLabel}`
        })
      } catch (err) {
        console.error(`[EXPORT ${formatLabel}] Error during export:`, err)
        toast.error('Export Failed', {
          description:
            `Failed to export ${formatLabel}: ` +
            (err instanceof Error ? err.message : typeof err === 'string' ? err : String(err))
        })
      } finally {
        setIsExporting(false)
      }
    },
    [isExporting, totalItems, fetchAllForExport]
  )

  const handleExportCsv = useCallback((e?: React.MouseEvent) => handleExport('csv', e), [handleExport])
  const handleExportExcel = useCallback((e?: React.MouseEvent) => handleExport('excel', e), [handleExport])

  const getExportCsvTitle = useCallback((): string => {
    if (isExporting) return 'Exporting all pages...'
    if (totalItems === 0) return 'No expenses to export'
    return `Export all ${totalItems} expense requests to CSV`
  }, [isExporting, totalItems])

  const getExportExcelTitle = useCallback((): string => {
    if (isExporting) return 'Exporting all pages...'
    if (totalItems === 0) return 'No expenses to export'
    return `Export all ${totalItems} expense requests to Excel`
  }, [isExporting, totalItems])

  return {
    isExporting,
    handleExportCsv,
    handleExportExcel,
    getExportCsvTitle,
    getExportExcelTitle
  }
}
