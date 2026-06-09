import type { CustomerBalance, CustomerInvoice } from './types'
import { isOpenStatus } from '../utils/statusBadge'
import { parseDate } from '../utils/format'

/**
 * Derives the aggregated financial KPIs (open / overdue / lifetime value) from
 * the invoice slice. Returns `undefined` when there are no invoices so the KPI
 * header shows an empty value rather than a misleading zero.
 */
export function deriveBalance(invoices: CustomerInvoice[]): CustomerBalance | undefined {
  if (invoices.length === 0) return undefined

  const now = Date.now()
  let openAmount = 0
  let overdueAmount = 0
  let lifetimeValue = 0
  let currency: string | undefined

  for (const invoice of invoices) {
    const amount = typeof invoice.amount === 'number' ? invoice.amount : 0
    lifetimeValue += amount
    currency = currency ?? invoice.currency

    if (isOpenStatus(invoice.status)) {
      openAmount += amount
      const dueDate = parseDate(invoice.dueDate)
      if (dueDate && dueDate.getTime() < now) {
        overdueAmount += amount
      }
    }
  }

  return { openAmount, overdueAmount, lifetimeValue, currency }
}
