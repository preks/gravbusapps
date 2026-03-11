import type {
  ExpenseItemReport,
  ExpensePlanReport,
  ExpenseRequestReport,
  AdvancePaymentReport,
  ApprovalPayoutCycleReport
} from '../types/reportTypes'
import {
  getExpenseRequestStatusDisplay,
  getExpensePlanStatusDisplay,
  getAdvancePaymentStatusDisplay
} from '../utils/utils'
import { extractCurrencyCode } from '../utils/sharedUtils'
import {
  buildEmployeeDisplayName,
  FORMER_EMPLOYEE_LABEL,
  getSettledAdvancePaidAmount,
  isPaidLikeStatus,
  toUpperText,
  hasStatusTransition,
  hasFromToTransition,
  pickEarliest,
  daysDiff,
  buildSlaStatus,
  evaluatePayoutSlaAgainstRunDay,
  type ExpensesSlaPolicy,
  DEFAULT_EXPENSES_SLA_POLICY
} from './backofficeReportUtils'

type NameResolver = (candidates: Array<string | undefined | null>, employeeNameById: Record<string, string>) => string

type DepartmentResolver = (candidates: Array<string | undefined | null>) => string

const mapSingleRequest = (
  request: any,
  employeeNameById: Record<string, string>,
  resolveDisplayName: NameResolver,
  resolveDepartmentName: DepartmentResolver
): ExpenseRequestReport => {
  const statusDisplay = request.status ? getExpenseRequestStatusDisplay(request.status) : { label: '', type: 'draft' }
  return {
    id: request.id,
    code: request.code || '',
    planCode: request.expensePlan?.code || '',
    title: request.title || '',
    requestDate: request.requestDate || '',
    startDate: request.startDate || '',
    endDate: request.endDate || '',
    createdAt: request.createdAt || '',
    status: statusDisplay.label,
    totalAmount: Number(request.reimbursableAmount ?? 0),
    advancePaidAmount: getSettledAdvancePaidAmount(request?.expensePlan?.advancePayment),
    remainingAmount: Number(request.totalRemainingAmount ?? 0),
    currency: extractCurrencyCode(request.currencyRef),
    employeeName:
      buildEmployeeDisplayName(request.employee) ||
      resolveDisplayName([request.employeeId, request.createdBy], employeeNameById),
    departmentName: resolveDepartmentName([request.employeeId, request.createdBy])
  } as ExpenseRequestReport
}

export const mapRequestsFromOverview = (
  rows: any[],
  employeeNameById: Record<string, string>,
  resolveDisplayName: NameResolver,
  resolveDepartmentName: DepartmentResolver
): ExpenseRequestReport[] => {
  return (rows || []).map((request: any) =>
    mapSingleRequest(request, employeeNameById, resolveDisplayName, resolveDepartmentName)
  )
}

export const mapPlansFromOverview = (
  rows: any[],
  employeeNameById: Record<string, string>,
  resolveDisplayName: NameResolver,
  resolveDepartmentName: DepartmentResolver
): ExpensePlanReport[] => {
  return (rows || []).map((plan: any) => {
    const statusDisplay = plan.status ? getExpensePlanStatusDisplay(plan.status) : { label: '', type: 'draft' }
    return {
      id: plan.id,
      code: plan.code || '',
      title: plan.title || '',
      startDate: plan.startDate || '',
      endDate: plan.endDate || '',
      status: statusDisplay.label,
      totalAmount: Number(plan.totalAmount || 0),
      advancePaidAmount: getSettledAdvancePaidAmount(plan?.advancePayment),
      remainingAmount: Number(plan.totalRemainingAmount ?? 0),
      currency: extractCurrencyCode(plan.currencyRef),
      employeeName:
        buildEmployeeDisplayName(plan.employee) ||
        resolveDisplayName([plan.employeeId, plan.createdBy], employeeNameById),
      departmentName: resolveDepartmentName([plan.employeeId, plan.createdBy]),
      expenseRequestCode:
        Array.isArray(plan.expenseRequest) && plan.expenseRequest.length > 0 ? plan.expenseRequest[0].code || '' : '',
      createdAt: plan.createdAt || ''
    } as ExpensePlanReport
  })
}

export const mapPaymentsFromOverview = (
  rows: any[],
  employeeNameById: Record<string, string>,
  resolveDisplayName: NameResolver,
  resolveDepartmentName: DepartmentResolver
): AdvancePaymentReport[] => {
  return (rows || []).map((p: any) => {
    const statusDisplay = p.status ? getAdvancePaymentStatusDisplay(p.status) : { label: '', type: 'draft' }
    return {
      id: p.id,
      code: p.expensePlan?.code || p.code || '',
      title: p.expensePlan?.title || '',
      requestDate: p.createdAt || '',
      status: statusDisplay.label,
      amount: Number(p.amount || 0),
      employeeName:
        buildEmployeeDisplayName(p.expensePlan?.employee) ||
        buildEmployeeDisplayName(p.employee) ||
        resolveDisplayName([p.expensePlan?.employeeId, p.createdBy], employeeNameById),
      departmentName: resolveDepartmentName([p.expensePlan?.employeeId, p.createdBy, p.expensePlan?.createdBy]),
      paymentMethod: p.paymentMethod || undefined,
      costCenter: p.costCenter?.name || p.costCenter?.code || undefined,
      currency: extractCurrencyCode(p.currencyRef)
    } as AdvancePaymentReport
  })
}

export const processExpenseItemsData = (
  data: any,
  employeeNameById: Record<string, string>,
  resolveDepartmentName: DepartmentResolver
): ExpenseItemReport[] => {
  if (!data?.ExpenseItem?.length) return []
  return data.ExpenseItem.map((item: any) => {
    const expenseGroup =
      item.expensePosition && item.expensePosition.length > 0 && item.expensePosition[0].expenseGroupRef
        ? item.expensePosition[0].expenseGroupRef.replaceAll('ExpenseGroup:v1:', '')
        : 'Uncategorized'
    const statusDisplay = item.expenseRequest?.status
      ? getExpenseRequestStatusDisplay(item.expenseRequest.status)
      : { label: '', type: 'draft' }
    return {
      id: item.id,
      code: item.expenseRequest?.code || '',
      currency: extractCurrencyCode(item.expenseRequest?.currencyRef),
      date:
        item.expenseRequest?.requestTypeRef === 'ExpenseRequestType:v1:TRIP'
          ? item.expenseRequest?.startDate || ''
          : item.expenseDate || '',
      title: item.title || '',
      description: item.description || '',
      category: expenseGroup,
      amount: item.reimbursableAmount ?? 0,
      employeeName:
        buildEmployeeDisplayName(item.employee) ||
        employeeNameById[item.employeeId] ||
        employeeNameById[item.createdBy] ||
        FORMER_EMPLOYEE_LABEL,
      departmentName: resolveDepartmentName([item.employeeId, item.createdBy]),
      status: statusDisplay.label
    }
  })
}

export const processExpensePlansData = (
  data: any,
  employeeNameById: Record<string, string>,
  resolveDisplayName: NameResolver,
  resolveDepartmentName: DepartmentResolver
): ExpensePlanReport[] => {
  if (!data?.ExpensePlan?.length) return []
  return data.ExpensePlan.map((plan: any) => {
    const statusDisplay = plan.status ? getExpensePlanStatusDisplay(plan.status) : { label: '', type: 'draft' }
    return {
      id: plan.id,
      code: plan.code || '',
      title: plan.title || '',
      startDate: plan.startDate || '',
      endDate: plan.endDate || '',
      status: statusDisplay.label,
      totalAmount: plan.totalAmount || 0,
      currency: extractCurrencyCode(plan.currencyRef),
      employeeName: resolveDisplayName([plan.employeeId, plan.createdBy], employeeNameById),
      departmentName: resolveDepartmentName([plan.employeeId, plan.createdBy]),
      expenseRequestCode:
        Array.isArray(plan.expenseRequest) && plan.expenseRequest.length > 0 ? plan.expenseRequest[0].code || '' : '',
      createdAt: plan.createdAt || ''
    }
  })
}

export const processExpenseRequestsData = (
  data: any,
  employeeNameById: Record<string, string>,
  resolveDisplayName: NameResolver,
  resolveDepartmentName: DepartmentResolver
): ExpenseRequestReport[] => {
  if (!data?.ExpenseRequest?.length) return []
  return data.ExpenseRequest.map((request: any) =>
    mapSingleRequest(request, employeeNameById, resolveDisplayName, resolveDepartmentName)
  )
}

export const mapAdvancePaymentToReport = (
  p: any,
  employeeNameById: Record<string, string>,
  resolveDisplayName: NameResolver,
  resolveDepartmentName: DepartmentResolver
): AdvancePaymentReport => {
  const statusDisplay = p.status ? getAdvancePaymentStatusDisplay(p.status) : { label: '', type: 'draft' }
  return {
    id: p.id,
    code: p.expensePlan?.code || p.code || '',
    title: p.expensePlan?.title || '',
    requestDate: p.createdAt || '',
    status: statusDisplay.label,
    amount: p.amount || 0,
    employeeName: resolveDisplayName([p.expensePlan?.employeeId, p.createdBy], employeeNameById),
    departmentName: resolveDepartmentName([p.expensePlan?.employeeId, p.createdBy, p.expensePlan?.createdBy]),
    paymentMethod: p.paymentMethod || undefined,
    costCenter: p.costCenter?.name || p.costCenter?.code || undefined,
    currency: extractCurrencyCode(p.currencyRef)
  }
}

const collectSystemCommentDates = (comments: any[], fromStatuses: string[], toStatuses: string[]) => {
  return comments
    .filter((comment: any) => {
      const text = String(comment?.comment || '')
      const type = toUpperText(comment?.commentType)
      return type === 'SYSTEM_COMMENT' && hasFromToTransition(text, fromStatuses, toStatuses)
    })
    .map((comment: any) => comment?.commentDate)
}

const resolveBottleneckStage = (
  pendingAt: string,
  approvedAt: string,
  paidAt: string,
  approvalDays: number | null,
  payoutDays: number | null,
  status?: any
) => {
  const requestStatus = toUpperText(status)
  const hasFullCycle = Boolean(pendingAt && approvedAt && paidAt)
  const isSameDayCycle = hasFullCycle && approvalDays === 0 && payoutDays === 0

  if (isSameDayCycle || ['PAID', 'CLOSED'].includes(requestStatus)) {
    return ''
  }
  if (approvalDays !== null && payoutDays !== null) {
    return approvalDays >= payoutDays ? 'Approval' : 'Payout'
  }
  return approvedAt ? 'Payout' : 'Approval'
}

const mapApprovalPayoutCycleRow = (
  request: any,
  employeeNameById: Record<string, string>,
  slaPolicy: ExpensesSlaPolicy,
  resolveDisplayName: NameResolver,
  resolveDepartmentName: DepartmentResolver
): ApprovalPayoutCycleReport => {
  const comments = Array.isArray(request?.expenseRequestComment) ? request.expenseRequestComment : []
  const paymentRows = Array.isArray(request?.expensePlan?.advancePayment) ? request.expensePlan.advancePayment : []
  const paymentComments = paymentRows.flatMap((payment: any) =>
    Array.isArray(payment?.advancePaymentComment) ? payment.advancePaymentComment : []
  )

  const pendingAt = pickEarliest(collectSystemCommentDates(comments, ['DRAFT', 'CREATED'], ['PENDING']))
  const approvedAt = pickEarliest(collectSystemCommentDates(comments, ['PENDING'], ['APPROVED', 'APPROVAL']))
  const paidFromPayments = paymentRows
    .filter((payment: any) => isPaidLikeStatus(payment?.status))
    .map((payment: any) => payment?.transactionDate || payment?.decisionDate || payment?.createdAt)
  const paidFromPaymentComments = paymentComments
    .filter((comment: any) => hasStatusTransition(String(comment?.comment || ''), ['PAID', 'CLOSED']))
    .map((comment: any) => comment?.commentDate)
  const paidFromSystemComments = collectSystemCommentDates(
    comments,
    ['APPROVED', 'VERIFIED', 'BOOKED', 'TRANSFERRED'],
    ['PAID', 'CLOSED']
  )
  const paidAt = pickEarliest([...paidFromPayments, ...paidFromPaymentComments, ...paidFromSystemComments]) || ''

  const approvalDays = daysDiff(pendingAt, approvedAt)
  const payoutDays = daysDiff(approvedAt, paidAt)
  const totalCycleDays = daysDiff(pendingAt, paidAt)
  const approvalSlaStatus = buildSlaStatus(approvalDays, slaPolicy.approvalSlaBusinessDays)
  const payoutSlaEvaluation = evaluatePayoutSlaAgainstRunDay(
    approvedAt,
    paidAt,
    slaPolicy.payoutRunWeekday,
    approvalDays,
    slaPolicy.totalCycleSlaBusinessDays
  )
  const totalCycleSlaStatus = buildSlaStatus(totalCycleDays, slaPolicy.totalCycleSlaBusinessDays)
  const statusDisplay = request?.status ? getExpenseRequestStatusDisplay(request.status) : { label: '', type: 'draft' }

  return {
    id: request.id,
    code: request.code || '',
    title: request.title || '',
    employeeName: resolveDisplayName([request.employeeId, request.createdBy], employeeNameById),
    departmentName: resolveDepartmentName([request.employeeId, request.createdBy]),
    createdAt: request.createdAt || '',
    pendingAt,
    approvedAt,
    paidAt,
    approvalDays,
    payoutDays,
    totalCycleDays,
    approvalSlaLimitDays: slaPolicy.approvalSlaBusinessDays,
    payoutSlaLimitDays: payoutSlaEvaluation.limitDays,
    totalCycleSlaLimitDays: slaPolicy.totalCycleSlaBusinessDays,
    approvalSlaStatus,
    payoutSlaStatus: payoutSlaEvaluation.status,
    totalCycleSlaStatus,
    bottleneckStage: resolveBottleneckStage(pendingAt, approvedAt, paidAt, approvalDays, payoutDays, request?.status),
    status: statusDisplay.label,
    totalAmount: Number(request.reimbursableAmount ?? 0),
    currency: extractCurrencyCode(request.currencyRef)
  }
}

export const processApprovalPayoutCycleData = (
  data: any,
  employeeNameById: Record<string, string>,
  resolveDisplayName: NameResolver,
  resolveDepartmentName: DepartmentResolver,
  slaPolicy: ExpensesSlaPolicy = DEFAULT_EXPENSES_SLA_POLICY
): ApprovalPayoutCycleReport[] => {
  const rows = Array.isArray(data?.ExpenseRequest) ? data.ExpenseRequest : []
  return rows.map((request: any) =>
    mapApprovalPayoutCycleRow(request, employeeNameById, slaPolicy, resolveDisplayName, resolveDepartmentName)
  )
}
