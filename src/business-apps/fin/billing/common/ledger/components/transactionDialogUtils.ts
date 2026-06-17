import { invoiceCustomerName } from '../../invoices/utils/customers'
import type { Invoice } from '../../invoices/types'
import type { LedgerBalance } from '../network/ledgerAdminClient'

export const CURRENCY_OPTIONS = ['EUR', 'USD', 'GBP', 'CHF', 'RON']
export const EXTERNAL_REF = '@World'
const PARTY_BALANCE_PREFIX = 'balance:'
const PARTY_INDICATOR_PREFIX = 'indicator:'
const PARTY_INPUT_PREFIX = 'input:'

export type LedgerPartySelection =
  | { kind: 'existing_balance'; balanceId: string }
  | { kind: 'system_indicator'; indicator: string }

export function isSystemIndicatorRef(ref?: string | null): boolean {
  return Boolean(ref?.startsWith('@'))
}

export function isSystemIndicatorBalance(balance: LedgerBalance): boolean {
  return isSystemIndicatorRef(balance.indicator)
}

export function balanceSelectionValue(balanceId: string): string {
  return `${PARTY_BALANCE_PREFIX}${balanceId}`
}

export function indicatorSelectionValue(indicator: string): string {
  return `${PARTY_INDICATOR_PREFIX}${indicator}`
}

export function inputSelectionValue(value: string): string {
  return `${PARTY_INPUT_PREFIX}${value}`
}

export function serializeLedgerPartySelection(selection: LedgerPartySelection): string {
  return selection.kind === 'system_indicator'
    ? indicatorSelectionValue(selection.indicator)
    : balanceSelectionValue(selection.balanceId)
}

export function parseLedgerPartySelection(value: string): LedgerPartySelection | null {
  if (!value) return null
  if (value.startsWith(PARTY_BALANCE_PREFIX)) {
    const balanceId = value.slice(PARTY_BALANCE_PREFIX.length)
    return balanceId ? { kind: 'existing_balance', balanceId } : null
  }
  if (value.startsWith(PARTY_INDICATOR_PREFIX)) {
    const indicator = value.slice(PARTY_INDICATOR_PREFIX.length)
    return indicator ? { kind: 'system_indicator', indicator } : null
  }
  if (value.startsWith(PARTY_INPUT_PREFIX)) {
    const input = value.slice(PARTY_INPUT_PREFIX.length)
    if (!input) return null
    return isSystemIndicatorRef(input)
      ? { kind: 'system_indicator', indicator: input }
      : { kind: 'existing_balance', balanceId: input }
  }
  return isSystemIndicatorRef(value)
    ? { kind: 'system_indicator', indicator: value }
    : { kind: 'existing_balance', balanceId: value }
}

export function partySelectionValue(value: string): string {
  const selection = parseLedgerPartySelection(value)
  if (!selection) return ''
  return selection.kind === 'system_indicator' ? selection.indicator : selection.balanceId
}

export function partySelectionInputValue(value: string): string {
  const selection = parseLedgerPartySelection(value)
  return selection ? serializeLedgerPartySelection(selection) : ''
}

export function partySelectionBalanceId(value: string): string | null {
  const selection = parseLedgerPartySelection(value)
  return selection?.kind === 'existing_balance' ? selection.balanceId : null
}

export function partySelectionIndicator(value: string): string | null {
  const selection = parseLedgerPartySelection(value)
  return selection?.kind === 'system_indicator' ? selection.indicator : null
}

export function isInputSelectionValue(value: string): boolean {
  return value.startsWith(PARTY_INPUT_PREFIX)
}

function isBalanceIdRef(value: string): boolean {
  return /^bln[_-]/.test(value)
}

export function toIndicator(value: string): string {
  const normalized = value
    .trim()
    .replace(/^@+/, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(part => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join('')

  return normalized ? `@${normalized}` : ''
}

export function transactionPartyValue(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (!isInputSelectionValue(trimmed)) return partySelectionValue(trimmed)
  const input = trimmed.slice(PARTY_INPUT_PREFIX.length).trim()
  if (!input || input.startsWith('@') || isBalanceIdRef(input)) return input
  return toIndicator(input)
}

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
