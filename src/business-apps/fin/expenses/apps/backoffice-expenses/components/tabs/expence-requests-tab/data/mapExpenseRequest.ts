import type { ExpenseData, ExpenseRequest } from '../../../../types'
import { buildEmployeeDisplayName } from '../../../../hooks/backofficeReportUtils'

function rawRequestDate(value: string | null | undefined): string {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : ''
}

function toOptionalNumber(value: unknown): number | undefined {
  if (value == null || value === '') {
    return undefined
  }

  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : undefined
}

function formatPayableAmount(
  payableAmount: number | undefined,
  reimbursableAmount: number | undefined,
  currencyCode: string
): string {
  const displayAmount = payableAmount ?? reimbursableAmount
  if (displayAmount === undefined) {
    return '-'
  }
  return `${displayAmount} ${currencyCode}`.trim()
}

export function mapExpenseRequest(item: ExpenseRequest): ExpenseData {
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
    creationDate: rawRequestDate(item.createdAt),
    startDate: rawRequestDate(item.startDate),
    endDate: rawRequestDate(item.endDate),
    requestDate: rawRequestDate(item.requestDate ?? item.createdAt),
    reporter: employeeDisplayName,
    type: item.requestType?.value ?? '-',
    amount: reimbursableAmount === undefined ? String(totalAmount) : `${reimbursableAmount} ${currencyCode}`.trim(),
    advance: advancePaymentPaidAmount ?? '',
    status: item.status ?? '',
    payableAmount: formatPayableAmount(payableAmount, reimbursableAmount, currencyCode),
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
