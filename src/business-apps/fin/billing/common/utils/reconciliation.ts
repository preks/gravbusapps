/**
 * Reconciliation matching: suggest links between bank statement lines and
 * outstanding invoices by reference, amount, currency, and recency.
 */
import { calculateOutstanding } from '../invoices/utils/invoiceCalculations'
import type { Invoice } from '../invoices/types'
import type { BankStatementLine, ReconciliationMatch } from '../reconciliation/types'

const AMOUNT_TOLERANCE = 0.01

function referenceMatches(line: BankStatementLine, invoice: Invoice): boolean {
  const reference = (line.reference ?? '').toLowerCase()
  const number = (invoice.invoiceNumber ?? '').toLowerCase()
  return Boolean(number) && reference.includes(number)
}

function scoreMatch(line: BankStatementLine, invoice: Invoice): number {
  if (invoice.currency !== line.currency) {
    return 0
  }
  const outstanding = calculateOutstanding(invoice.totals.grossTotal, invoice.paidAmount)
  if (outstanding <= 0) {
    return 0
  }

  let score = 0
  if (referenceMatches(line, invoice)) {
    score += 0.6
  }
  const amountDelta = Math.abs(outstanding - line.amount)
  if (amountDelta <= AMOUNT_TOLERANCE) {
    score += 0.4
  } else if (line.amount < outstanding && line.amount > 0) {
    // Plausible partial payment.
    score += 0.15
  }
  return Math.min(1, score)
}

/** Suggest the best invoice match for each unmatched bank line (score > 0). */
export function suggestMatches(lines: BankStatementLine[], invoices: Invoice[]): ReconciliationMatch[] {
  const matches: ReconciliationMatch[] = []
  for (const line of lines) {
    if (line.matchedInvoiceId) {
      continue
    }
    let best: { invoice: Invoice; score: number } | null = null
    for (const invoice of invoices) {
      const score = scoreMatch(line, invoice)
      if (score > 0 && (!best || score > best.score)) {
        best = { invoice, score }
      }
    }
    if (best) {
      matches.push({
        bankStatementLineId: line.id,
        invoiceId: best.invoice.id,
        confidence: best.score,
        matchedAmount: Math.min(
          line.amount,
          calculateOutstanding(best.invoice.totals.grossTotal, best.invoice.paidAmount)
        )
      })
    }
  }
  return matches
}

/** Lines with no plausible match, surfaced as exceptions for manual handling. */
export function findExceptions(lines: BankStatementLine[], matches: ReconciliationMatch[]): BankStatementLine[] {
  const matchedIds = new Set(matches.map(match => match.bankStatementLineId))
  return lines.filter(line => !line.matchedInvoiceId && !matchedIds.has(line.id))
}
