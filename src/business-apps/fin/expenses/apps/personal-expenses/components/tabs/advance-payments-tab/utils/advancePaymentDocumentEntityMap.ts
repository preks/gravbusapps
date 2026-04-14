import type { AdvancePayment } from '../../../../hooks/useGetAdvancePayments'

export interface AdvancePaymentApproverContext {
  expensePlanApprover?: string
  advancePaymentApprover?: string
  expensePlanApprovalDate?: string
  advancePaymentApprovalDate?: string
}

export function buildAdvancePaymentDocumentEntityMap(
  record: AdvancePayment,
  approverData: AdvancePaymentApproverContext,
  supervisorName: string | undefined
): Record<string, Record<string, unknown>> {
  const plan = record.expensePlan
  const currencyCode =
    record.currency?.code ??
    (typeof record.currencyRef === 'string' && record.currencyRef
      ? record.currencyRef.replace(/^.*:([A-Za-z]{2,4})$/, '$1').toUpperCase()
      : '')

  const map: Record<string, Record<string, unknown>> = {
    adv_payment: {
      ...(record as unknown as Record<string, unknown>),
      currencyCode,
      approvedBy: approverData.advancePaymentApprover || '',
      approvalDate: approverData.advancePaymentApprovalDate || ''
    }
  }

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

  const trips = plan.expenseRequestTrip ?? []
  const destinationTrip = trips.find((t: { pointType?: string | null }) => t?.pointType === 'DESTINATION_POINT')
  const tripForDoc = destinationTrip ?? trips[0]
  const travelRegionValue =
    tripForDoc?.travelRegion && typeof tripForDoc.travelRegion === 'object' && 'value' in tripForDoc.travelRegion
      ? (tripForDoc.travelRegion as { value?: string }).value
      : undefined
  const countryValue =
    tripForDoc?.country && typeof tripForDoc.country === 'object' && 'value' in tripForDoc.country
      ? (tripForDoc.country as { value?: string }).value
      : undefined
  const countryRef = tripForDoc?.countryRef ?? ''
  const countryCode =
    countryValue ??
    (typeof countryRef === 'string' && countryRef ? countryRef.replace(/^.*:([A-Za-z]{2,4})$/, '$1').toUpperCase() : '')

  map.expense_request_trip = {
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

  return map
}
