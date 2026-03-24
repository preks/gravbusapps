import type { ExpenseData, ExpenseRequest } from '../../../../types'
import type { TranslateFn } from '../../../../utils/utils'
import { formatDateLocalized } from '../../../../utils/dateUtils'
import { buildEmployeeDisplayName } from '../../../../hooks/backofficeReportUtils'

function toOptionalNumber(value: unknown): number | undefined {
  if (value == null || value === '') {
    return undefined
  }

  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : undefined
}

export function mapExpenseRequest(item: ExpenseRequest, t: TranslateFn): ExpenseData {
  const reimbursableAmount = toOptionalNumber(item.reimbursableAmount)
  const totalAmount = toOptionalNumber(item.totalAmount) ?? 0
  const payableAmount = toOptionalNumber((item as { payableAmount?: unknown }).payableAmount)
  const advancePaymentPaidAmount = toOptionalNumber(
    (item as { advancePaymentPaidAmount?: unknown }).advancePaymentPaidAmount
  )
  const employeeDisplayName = buildEmployeeDisplayName(item.employee) || '-'
  const currencyCode = item.currency?.code ?? ''

  return {
    id: item.id,
    expenseId: String(item.id ?? '-'),
    employeeCode: item.employee?.code ?? '-',
    code: item.code ?? '-',
    sapNumber: item.employee?.hrReferenceCode ?? '-',
    employee: employeeDisplayName,
    title: item.title ?? '-',
    creationDate: formatDateLocalized(item.createdAt, t),
    startDate: formatDateLocalized(item.startDate, t),
    endDate: formatDateLocalized(item.endDate, t),
    requestDate: formatDateLocalized(item.requestDate ?? item.createdAt, t),
    reporter: employeeDisplayName,
    type: item.requestType?.value ?? '-',
    amount: reimbursableAmount != null ? `${reimbursableAmount} ${currencyCode}`.trim() : String(totalAmount),
    advance: advancePaymentPaidAmount ?? '',
    status: item.status ?? '',
    payableAmount:
      payableAmount != null
        ? `${payableAmount} ${currencyCode}`.trim()
        : reimbursableAmount != null
          ? `${reimbursableAmount} ${currencyCode}`.trim()
          : '-',
    paymentMethod: (item as { paymentMethod?: string }).paymentMethod ?? '-',
    employeeId: String(item.employee?.id ?? '-'),
    version: String(item.version ?? ''),
    currency: { code: currencyCode },
    currencyRef: item.currencyRef ?? '',
    typeRef: (item as { typeRef?: string }).typeRef ?? '',
    requestTypeRef: item.requestTypeRef ?? '',
    totalRemainingAmount: item.totalRemainingAmount ?? '-',
    userId: (item as { userId?: string }).userId ?? '',
    expenseRuleId: item.expenseRuleId ?? '',
    reimbursableAmount,
    totalAmount,
    employeeDocumentId: item.employeeDocumentId ?? null,
    documentData: (item as { documentData?: unknown }).documentData ?? null,
    employeeDocument: item.employeeDocument,
    department: item.employee?.employeePosition?.costCenter?.name ?? 'N/A',
    nonReimbursableAmount: item.nonReimbursableAmount,
    expensePlan: item.expensePlan
  }
}
