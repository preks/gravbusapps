/**
 * Invoice numbering: sequence-controlled, immutable numbers per legal entity.
 *
 * Numbers are only assigned at issue time. Formatting is deterministic so the
 * same sequence state always yields the same number (gap-free per period).
 */
import type { InvoiceNumberSequence } from '../types'

export interface FormattedInvoiceNumber {
  invoiceNumber: string
  /** The sequence after consuming this number (immutable update). */
  nextSequence: InvoiceNumberSequence
}

function periodToken(period: InvoiceNumberSequence['period'], date: Date): string {
  switch (period) {
    case 'YEARLY':
      return String(date.getUTCFullYear())
    case 'MONTHLY':
      return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}`
    case 'NEVER':
    default:
      return ''
  }
}

/**
 * Determine whether the running number should reset because the period rolled
 * over relative to the last issued date.
 */
function shouldReset(sequence: InvoiceNumberSequence, lastIssuedAt: string | undefined, issueDate: Date): boolean {
  if (sequence.period === 'NEVER' || !lastIssuedAt) {
    return false
  }
  const last = new Date(lastIssuedAt)
  if (Number.isNaN(last.getTime())) {
    return false
  }
  if (sequence.period === 'YEARLY') {
    return last.getUTCFullYear() !== issueDate.getUTCFullYear()
  }
  return last.getUTCFullYear() !== issueDate.getUTCFullYear() || last.getUTCMonth() !== issueDate.getUTCMonth()
}

/**
 * Format the next invoice number and return the advanced sequence.
 * Pure function: callers persist `nextSequence` to make issuance idempotent.
 */
export function formatNextInvoiceNumber(
  sequence: InvoiceNumberSequence,
  issueDate: Date = new Date(),
  lastIssuedAt?: string
): FormattedInvoiceNumber {
  const reset = shouldReset(sequence, lastIssuedAt, issueDate)
  const current = reset ? 1 : sequence.nextNumber
  const numeric = String(current).padStart(Math.max(1, sequence.padding), '0')
  const token = periodToken(sequence.period, issueDate)

  const parts = [sequence.prefix, token, numeric].filter(part => part !== '')
  const invoiceNumber = parts.join('-')

  return {
    invoiceNumber,
    nextSequence: { ...sequence, nextNumber: current + 1 }
  }
}

/** Validate that an invoice number looks like a finalized, non-empty value. */
export function isValidInvoiceNumber(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}
