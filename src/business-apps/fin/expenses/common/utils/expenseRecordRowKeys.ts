/**
 * Assigns stable, unique Ant Design Table row keys from domain fields.
 * Appends `#n` only when multiple rows share the same composite identity.
 */
export function withUniqueRowKeys<T extends object>(
  items: T[],
  buildBaseKey: (item: T) => string,
  fallbackPrefix: string
): (T & { key: string })[] {
  const seen = new Map<string, number>()

  return items.map((item, index) => {
    const base = buildBaseKey(item).trim() || `${fallbackPrefix}-${index}`
    const occurrence = seen.get(base) ?? 0
    seen.set(base, occurrence + 1)
    const key = occurrence === 0 ? base : `${base}#${occurrence}`
    return { ...item, key }
  })
}

export const advancePaymentRowKey = (item: {
  code: string | null
  amount: number
  transactionNumber: string | null
  decisionDate: string | null
  transactionDate: string | null
  status: string
  paymentMethod: string
  transactionConfirmed: boolean
}): string =>
  [
    item.code,
    item.amount,
    item.transactionNumber,
    item.decisionDate,
    item.transactionDate,
    item.status,
    item.paymentMethod,
    item.transactionConfirmed
  ]
    .map(value => String(value ?? ''))
    .join('|')

export const expenseRecordTripRowKey = (item: {
  tripOrder: number
  tripDateTime: string
  tripDirection: string
  address: string
  pointType: string
}): string =>
  [item.tripOrder, item.tripDateTime, item.tripDirection, item.address, item.pointType]
    .map(value => String(value ?? ''))
    .join('|')

export const expenseRecordAllowanceRowKey = (item: {
  allowanceDate: string
  travelRegion: { value: string }
  dayRate: number
  deductionLimit: number
}): string =>
  [item.allowanceDate, item.travelRegion.value, item.dayRate, item.deductionLimit]
    .map(value => String(value ?? ''))
    .join('|')
