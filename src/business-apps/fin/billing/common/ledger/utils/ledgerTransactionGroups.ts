import type { LedgerTransaction } from '../network/ledgerAdminClient'

const EPSILON = 1e-9

interface PendingGroup {
  rootId: string
  transactions: LedgerTransaction[]
}

export interface TransactionGroup {
  rootId: string
  root: LedgerTransaction
  transactions: LedgerTransaction[]
  parent: LedgerTransaction
  children: LedgerTransaction[]
  effectiveStatus: string
  committedAmount: number
  voidedAmount: number
  remainingAmount: number
  remainingInflightAmount: number
  actionTargetTransactionId?: string
  latestChild?: LedgerTransaction
}

function normalizedStatus(status: string | undefined): string {
  return (status ?? '').trim().toUpperCase()
}

function absoluteAmount(transaction: LedgerTransaction): number {
  return Math.abs(transaction.amount)
}

function normalizeAmount(amount: number): number {
  return Math.abs(amount) <= EPSILON ? 0 : amount
}

function createdAtTime(transaction: LedgerTransaction): number | null {
  if (!transaction.createdAt) return null
  const value = Date.parse(transaction.createdAt)
  return Number.isNaN(value) ? null : value
}

function byCreatedAtAsc(left: LedgerTransaction, right: LedgerTransaction): number {
  const leftTime = createdAtTime(left)
  const rightTime = createdAtTime(right)
  if (leftTime === null && rightTime === null) return 0
  if (leftTime === null) return 1
  if (rightTime === null) return -1
  return leftTime - rightTime
}

function byCreatedAtDesc(left: LedgerTransaction, right: LedgerTransaction): number {
  return -byCreatedAtAsc(left, right)
}

function flattenTransactions(transactions: LedgerTransaction[]): LedgerTransaction[] {
  const flattened: LedgerTransaction[] = []
  const seen = new Set<string>()

  const push = (transaction: LedgerTransaction) => {
    if (!transaction.transactionId || seen.has(transaction.transactionId)) return
    seen.add(transaction.transactionId)
    const row = { ...transaction }
    delete row.childTransactions
    delete row.groupedTransactions
    flattened.push(row)
    for (const child of [...(transaction.groupedTransactions ?? []), ...(transaction.childTransactions ?? [])]) {
      push(child)
    }
  }

  for (const transaction of transactions) {
    push(transaction)
  }

  return flattened
}

function explicitRootId(transaction: LedgerTransaction): string | null {
  const meta = transaction.metaData ?? {}
  const value =
    meta.QUEUED_PARENT_TRANSACTION ??
    meta.queued_parent_transaction ??
    meta.queuedParentTransaction ??
    meta.parent_queued_transaction ??
    meta.parentQueuedTransaction
  return typeof value === 'string' && value.length > 0 ? value : null
}

function inferredParentReference(reference: string | undefined): string | null {
  if (!reference) return null
  const match = /^(.*)_(?:q|\d+)$/.exec(reference)
  return match?.[1] ?? null
}

function fallbackParentId(transaction: LedgerTransaction, parentIdByReference: Map<string, string>): string | null {
  const parentReference = inferredParentReference(transaction.reference)
  return parentReference ? (parentIdByReference.get(parentReference) ?? parentReference) : null
}

function resolveRootId(
  transaction: LedgerTransaction,
  txById: Map<string, LedgerTransaction>,
  parentIdByReference: Map<string, string>
): string {
  const explicit = explicitRootId(transaction)
  if (explicit) return explicit

  let current = transaction
  const seen = new Set<string>()

  while (current.parentTransaction) {
    if (seen.has(current.transactionId)) break
    seen.add(current.transactionId)

    const parent = txById.get(current.parentTransaction)
    if (!parent) return current.parentTransaction
    current = parent
  }

  return fallbackParentId(current, parentIdByReference) ?? current.transactionId
}

function selectRoot(group: PendingGroup): LedgerTransaction {
  return (
    group.transactions.find(transaction => transaction.transactionId === group.rootId) ??
    [...group.transactions].sort(byCreatedAtAsc)[0]
  )
}

function latestTransaction(transactions: LedgerTransaction[]): LedgerTransaction | undefined {
  return [...transactions].sort(byCreatedAtDesc)[0]
}

function activeInflightTransaction(transactions: LedgerTransaction[]): LedgerTransaction | undefined {
  return [...transactions]
    .filter(transaction => ['INFLIGHT', 'IN_FLIGHT'].includes(normalizedStatus(transaction.status)))
    .sort(byCreatedAtDesc)[0]
}

function childAmountByStatus(transactions: LedgerTransaction[], root: LedgerTransaction, status: string): number {
  return normalizeAmount(
    transactions
      .filter(
        transaction =>
          transaction.transactionId !== root.transactionId && normalizedStatus(transaction.status) === status
      )
      .reduce((total, transaction) => total + absoluteAmount(transaction), 0)
  )
}

function directSettledCommittedAmount(root: LedgerTransaction, transactions: LedgerTransaction[]): number {
  return normalizedStatus(root.status) === 'APPLIED' && transactions.length === 1 ? absoluteAmount(root) : 0
}

function terminalStatus(effectiveStatus: string): boolean {
  return ['settled', 'applied', 'voided', 'void', 'rejected'].includes(effectiveStatus.toLowerCase())
}

function effectiveStatus(
  root: LedgerTransaction,
  transactions: LedgerTransaction[],
  committedAmount: number,
  voidedAmount: number
): string {
  const statuses = transactions.map(transaction => normalizedStatus(transaction.status))
  const hasRejected = statuses.includes('REJECTED')
  const hasVoid = statuses.includes('VOID')
  const hasInflight = statuses.some(status => status === 'INFLIGHT' || status === 'IN_FLIGHT')
  const rootStatus = normalizedStatus(root.status)
  const rootAmount = absoluteAmount(root)

  if (hasRejected) return 'Rejected'
  if (rootStatus === 'APPLIED' && transactions.length === 1) return 'Settled'
  if (committedAmount >= rootAmount - EPSILON && committedAmount > 0) return 'Settled'
  if (committedAmount > 0 && hasVoid) return 'Partially settled / remaining voided'
  if (committedAmount > 0) return 'Partially settled'
  if (hasVoid || voidedAmount >= rootAmount - EPSILON) return 'Voided'
  if (hasInflight) return 'In-flight'
  if (rootStatus === 'QUEUED') return 'Queued'

  return root.status ?? 'Unknown'
}

function remainingAmount(
  root: LedgerTransaction,
  transactions: LedgerTransaction[],
  effective: string,
  committedAmount: number,
  voidedAmount: number
): number {
  if (terminalStatus(effective)) return 0

  const hasActive =
    transactions.some(transaction =>
      ['INFLIGHT', 'IN_FLIGHT', 'QUEUED'].includes(normalizedStatus(transaction.status))
    ) || ['INFLIGHT', 'IN_FLIGHT', 'QUEUED'].includes(normalizedStatus(root.status))

  if (!hasActive) return 0
  return Math.max(0, normalizeAmount(absoluteAmount(root) - committedAmount - voidedAmount))
}

function actionTargetTransactionId(
  root: LedgerTransaction,
  transactions: LedgerTransaction[],
  effective: string
): string | undefined {
  if (terminalStatus(effective) || effective === 'Partially settled / remaining voided') return undefined
  return activeInflightTransaction(transactions)?.transactionId ?? root.transactionId
}

function bestDisplayTransaction(root: LedgerTransaction, children: LedgerTransaction[]): LedgerTransaction {
  if (normalizedStatus(root.status) !== 'QUEUED') return root
  const withLabels = children.find(
    child =>
      child.metaData?.source_label ||
      child.metaData?.destination_label ||
      child.metaData?.source_balance_id ||
      child.metaData?.destination_balance_id
  )
  return withLabels ?? children.find(child => child.source || child.destination) ?? root
}

function normalizeGroup(group: PendingGroup): TransactionGroup {
  const root = selectRoot(group)
  const transactions = [...group.transactions].sort(byCreatedAtAsc)
  const children = transactions.filter(transaction => transaction.transactionId !== root.transactionId)
  const childCommittedAmount = childAmountByStatus(transactions, root, 'APPLIED')
  const committedAmount = childCommittedAmount || directSettledCommittedAmount(root, transactions)
  const voidedAmount = childAmountByStatus(transactions, root, 'VOID')
  const effective = effectiveStatus(root, transactions, committedAmount, voidedAmount)
  const remaining = remainingAmount(root, transactions, effective, committedAmount, voidedAmount)

  return {
    rootId: group.rootId,
    root,
    parent: root,
    transactions,
    children,
    effectiveStatus: effective,
    committedAmount,
    voidedAmount,
    remainingAmount: remaining,
    remainingInflightAmount: remaining,
    actionTargetTransactionId: actionTargetTransactionId(root, transactions, effective),
    latestChild: latestTransaction(children)
  }
}

export function buildTransactionGroups(transactions: LedgerTransaction[]): TransactionGroup[] {
  const allTransactions = flattenTransactions(transactions)
  const txById = new Map(allTransactions.map(transaction => [transaction.transactionId, transaction]))
  const parentIdByReference = new Map<string, string>()
  const groupsByRoot = new Map<string, PendingGroup>()

  for (const transaction of allTransactions) {
    if (!transaction.parentTransaction && transaction.reference) {
      parentIdByReference.set(transaction.reference, transaction.transactionId)
    }
  }

  for (const transaction of allTransactions) {
    const rootId = resolveRootId(transaction, txById, parentIdByReference)
    const group = groupsByRoot.get(rootId) ?? { rootId, transactions: [] }
    group.transactions.push(transaction)
    groupsByRoot.set(rootId, group)
  }

  return Array.from(groupsByRoot.values()).map(normalizeGroup)
}

export function groupTransactionsForDisplay(transactions: LedgerTransaction[]): LedgerTransaction[] {
  return buildTransactionGroups(transactions).map(group => {
    const displayTransaction = bestDisplayTransaction(group.root, group.children)

    return {
      ...group.root,
      source: displayTransaction.source ?? group.root.source,
      destination: displayTransaction.destination ?? group.root.destination,
      metaData: {
        ...group.root.metaData,
        ...displayTransaction.metaData
      },
      childTransactions: group.children,
      groupedTransactions: group.transactions,
      effectiveStatus: group.effectiveStatus,
      committedAmount: group.committedAmount,
      voidedAmount: group.voidedAmount,
      remainingInflightAmount: group.remainingAmount,
      actionTargetTransactionId: group.actionTargetTransactionId,
      latestChild: group.latestChild
    }
  })
}

export function isEffectiveInflightTransaction(transaction: LedgerTransaction): boolean {
  if (transaction.parentTransaction) return false
  return Boolean(transaction.actionTargetTransactionId)
}
