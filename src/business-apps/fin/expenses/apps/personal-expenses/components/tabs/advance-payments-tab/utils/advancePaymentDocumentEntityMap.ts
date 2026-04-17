import type { AdvancePayment } from '../../../../hooks/useGetAdvancePayments'

export interface AdvancePaymentApproverContext {
  expensePlanApprover?: string
  advancePaymentApprover?: string
  expensePlanApprovalDate?: string
  advancePaymentApprovalDate?: string
}

type PlanTripRow = NonNullable<NonNullable<AdvancePayment['expensePlan']>['expenseRequestTrip']>[number]

function refSuffixToCode(ref: string): string {
  return ref.replace(/^.*:([A-Za-z]{2,4})$/, '$1').toUpperCase()
}

function resolveRecordCurrencyCode(record: AdvancePayment): string {
  if (record.currency?.code) return record.currency.code
  if (typeof record.currencyRef === 'string' && record.currencyRef) {
    return refSuffixToCode(record.currencyRef)
  }
  return ''
}

function readCatalogValue(obj: { value?: string | null } | null | undefined): string | undefined {
  return obj && typeof obj === 'object' && 'value' in obj ? (obj as { value?: string }).value : undefined
}

function pickTripRows(plan: NonNullable<AdvancePayment['expensePlan']>): {
  tripForDoc: PlanTripRow | undefined
  destinationTrip: PlanTripRow | undefined
} {
  const trips = plan.expenseRequestTrip ?? []
  const destinationTrip = trips.find(t => t?.pointType === 'DESTINATION_POINT')
  const tripForDoc = destinationTrip ?? trips[0]
  return { tripForDoc, destinationTrip }
}

function resolveCountryCode(tripForDoc: PlanTripRow | undefined): string {
  const countryValue = readCatalogValue(tripForDoc?.country)
  if (countryValue) return countryValue
  const countryRef = tripForDoc?.countryRef ?? ''
  if (typeof countryRef === 'string' && countryRef) {
    return refSuffixToCode(countryRef)
  }
  return ''
}

function buildExpenseRequestTripEntity(
  tripForDoc: PlanTripRow | undefined,
  destinationTrip: PlanTripRow | undefined
): Record<string, unknown> {
  const travelRegionValue = readCatalogValue(tripForDoc?.travelRegion)
  const countryValue = readCatalogValue(tripForDoc?.country)
  const countryRef = tripForDoc?.countryRef ?? ''
  const countryCode = countryValue ?? resolveCountryCode(tripForDoc)

  return {
    address: tripForDoc?.address ?? '',
    pointType: tripForDoc?.pointType ?? '',
    countryRef,
    countryCode,
    tripDateTime: tripForDoc?.tripDateTime ?? '',
    tripOrder: tripForDoc?.tripOrder ?? '',
    tripDirection: tripForDoc?.tripDirection ?? '',
    travelRegion: travelRegionValue != null ? { value: travelRegionValue } : { value: '' },
    country: countryValue != null ? { value: countryValue } : { value: '' },
    destinationCountry: destinationTrip ? (countryValue ?? '') : '',
    destinationAddress: destinationTrip ? (tripForDoc?.address ?? '') : ''
  }
}

export function buildAdvancePaymentDocumentEntityMap(
  record: AdvancePayment,
  approverData: AdvancePaymentApproverContext,
  supervisorName: string | undefined
): Record<string, Record<string, unknown>> {
  const currencyCode = resolveRecordCurrencyCode(record)

  const map: Record<string, Record<string, unknown>> = {
    adv_payment: {
      ...(record as unknown as Record<string, unknown>),
      currencyCode,
      approvedBy: approverData.advancePaymentApprover || '',
      approvalDate: approverData.advancePaymentApprovalDate || ''
    }
  }

  const plan = record.expensePlan
  if (!plan) {
    return map
  }

  map.expense_plan = {
    ...(plan as unknown as Record<string, unknown>),
    approvedBy: approverData.expensePlanApprover || '',
    approvalDate: approverData.expensePlanApprovalDate || ''
  }

  const emp = plan.employee
  if (emp) {
    const pos = emp.employeePosition
    map.employee_position = {
      firstName: emp.firstName ?? '',
      lastName: emp.lastName ?? '',
      fullName: emp.fullName ?? `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim(),
      jobPosition: pos?.jobPosition ? { name: pos.jobPosition.name ?? '' } : { name: '' },
      organizationalUnit: pos?.organizationalUnit ? { name: pos.organizationalUnit.name ?? '' } : { name: '' },
      supervisorName: supervisorName || ''
    }
  }

  const { tripForDoc, destinationTrip } = pickTripRows(plan)
  map.expense_request_trip = buildExpenseRequestTripEntity(tripForDoc, destinationTrip)

  return map
}
