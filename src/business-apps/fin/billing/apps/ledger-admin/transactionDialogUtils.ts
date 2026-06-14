import { invoiceCustomerName } from '../../common/utils/customers'
import type { Invoice } from '../../common/types'

export const CURRENCY_OPTIONS = ['EUR', 'USD', 'GBP', 'CHF', 'RON']
export const EXTERNAL_REF = '@World'

export function parseOptionalNumber(value: string, fieldName: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) throw new Error(`${fieldName} must be a valid number`)
  return parsed
}

export function parseOptionalInteger(value: string, fieldName: string): number | undefined {
  const parsed = parseOptionalNumber(value, fieldName)
  if (parsed === undefined) return undefined
  if (!Number.isInteger(parsed)) throw new Error(`${fieldName} must be an integer`)
  return parsed
}

export function toIsoDateTime(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) throw new Error('Date/time fields must contain valid dates')
  return date.toISOString()
}

export function invoiceOptionLabel(invoice: Invoice): string {
  const number = invoice.invoiceNumber ?? invoice.id
  const customer = invoiceCustomerName(invoice)
  return customer ? `${number} · ${customer}` : number
}

export function matchesInvoiceQuery(invoice: Invoice, label: string, query: string): boolean {
  const haystack = [label, invoice.id, invoice.invoiceNumber, invoice.customerName, invoice.crmAccountId]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}
