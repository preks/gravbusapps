/** A bank/PSP line awaiting reconciliation against invoice payments. */
export interface BankStatementLine {
  id: string
  bookingDate: string
  amount: number
  currency: string
  counterparty?: string | null
  reference?: string | null
  /** Matched invoice id once reconciled. */
  matchedInvoiceId?: string | null
}

export interface ReconciliationMatch {
  bankStatementLineId: string
  invoiceId: string
  /** 0-1 confidence score from the matching heuristic. */
  confidence: number
  matchedAmount: number
}
