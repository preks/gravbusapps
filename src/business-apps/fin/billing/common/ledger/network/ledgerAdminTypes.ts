/** A ledger: a container/grouping for accounts (balances). */
export interface Ledger {
  /** Stable row id (mirrors ledgerId) required by the data table. */
  id: string
  ledgerId: string
  name: string
  metaData?: Record<string, unknown>
  createdAt?: string
}

/** A balance is the transaction-facing ledger bucket. Amounts are major units. */
export interface LedgerBalance {
  /** Stable row id (mirrors balanceId) required by the data table. */
  id: string
  balanceId: string
  ledgerId: string
  name: string
  currency: string
  balance: number
  inflightBalance: number
  /** Engine-side human reference (e.g. an account number or GL ref) when set. */
  indicator?: string
  metaData?: Record<string, unknown>
  createdAt?: string
}

/** A posted ledger transaction (double-entry money movement). Amount in major units. */
export interface LedgerTransaction {
  /** Stable row id (mirrors transactionId) required by the data table. */
  id: string
  transactionId: string
  reference?: string
  amount: number
  currency: string
  source?: string
  destination?: string
  description?: string
  status?: string
  parentTransaction?: string
  childTransactions?: LedgerTransaction[]
  groupedTransactions?: LedgerTransaction[]
  effectiveStatus?: string
  committedAmount?: number
  voidedAmount?: number
  remainingInflightAmount?: number
  actionTargetTransactionId?: string
  latestChild?: LedgerTransaction
  /** Free-form engine metadata; used to carry NEWWORK billing document snapshots. */
  metaData?: Record<string, unknown>
  createdAt?: string
}

/** @deprecated Use LedgerBalance for transaction-facing ledger buckets. */
export type LedgerAccount = LedgerBalance

export interface CreateLedgerInput {
  name: string
  metaData?: Record<string, unknown>
}

export interface CreateBalanceInput {
  ledgerId: string
  currency: string
  name: string
  metaData?: Record<string, unknown>
}

/** @deprecated Use CreateBalanceInput. */
export type CreateAccountInput = CreateBalanceInput

export interface CreateTransactionInput {
  /** Major units in the UI (e.g. 100.50); MCP payloads send precision-based amounts. */
  amount: number
  preciseAmount?: number | null
  precision?: number
  rate?: number
  overdraftLimit?: number
  currency: string
  /** Balance id for normal balances, or an `@...` indicator for system balances. */
  source: string
  destination: string
  sources?: Array<Record<string, unknown>>
  destinations?: Array<Record<string, unknown>>
  reference?: string
  description?: string
  allowOverdraft?: boolean
  inflight?: boolean
  /** Settle immediately (recommended for interactive use). */
  skipQueue?: boolean
  atomic?: boolean
  scheduledFor?: string
  inflightExpiryDate?: string
  inflightCommitDate?: string
  effectiveDate?: string
  /** Free-form metadata stored on the transaction. */
  metaData?: Record<string, unknown>
}

export interface CreateSplitTransactionInput extends Omit<CreateTransactionInput, 'destination'> {
  destinations: Array<{ identifier: string; amount: number; description?: string }>
}

export interface RefundTransactionInput {
  transactionId: string
  amount?: number
  reason?: string
  reference?: string
  metaData?: Record<string, unknown>
}

export interface UpdateInflightTransactionInput {
  transactionId: string
  status: 'commit' | 'void'
  amount?: number
  preciseAmount?: number
}

export interface ReimburseExpenseInput {
  expenseId: string
  amount: number
  currency: string
  source: string
  destination: string
  reference?: string
  metaData?: Record<string, unknown>
}

export interface LedgerTransfer {
  source: string
  destination: string
  amount: number
  description?: string
}

export interface PostLedgerResult {
  ledgerTransactionRef: string
  transactionIds: string[]
  postedAt: string
}
