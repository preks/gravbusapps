import {
  buildTransactionGroups,
  groupTransactionsForDisplay,
  isEffectiveInflightTransaction
} from '../ledgerTransactionGroups'
import type { LedgerTransaction } from '../../network/ledgerAdminClient'

function transaction(partial: Partial<LedgerTransaction>): LedgerTransaction {
  const transactionId = partial.transactionId ?? partial.id ?? 'txn-1'
  return {
    id: transactionId,
    transactionId,
    amount: 100,
    currency: 'EUR',
    source: 'bln-source',
    destination: 'bln-destination',
    ...partial
  }
}

describe('buildTransactionGroups', () => {
  it('groups a queued parent with its processing child and uses the latest child status', () => {
    const parent = transaction({ transactionId: 'txn-parent', reference: 'ref-1', status: 'QUEUED' })
    const child = transaction({
      transactionId: 'txn-child',
      reference: 'ref-1_q',
      parentTransaction: 'txn-parent',
      status: 'APPLIED',
      createdAt: '2026-01-01T10:00:00.000Z'
    })

    const [group] = buildTransactionGroups([child, parent])

    expect(group.parent).toEqual(parent)
    expect(group.children).toEqual([child])
    expect(group.effectiveStatus).toBe('Settled')
  })

  it('groups queued _q children by reference when the parent id is missing from the child row', () => {
    const [row] = groupTransactionsForDisplay([
      transaction({ transactionId: 'txn-child', reference: 'asdasd_q', status: 'INFLIGHT' }),
      transaction({ transactionId: 'txn-parent', reference: 'asdasd', status: 'QUEUED' })
    ])

    expect(row.reference).toBe('asdasd')
    expect(row.effectiveStatus).toBe('In-flight')
    expect(row.childTransactions?.map(child => child.reference)).toEqual(['asdasd_q'])
  })

  it('uses an available transaction as the root when the referenced parent is missing', () => {
    const orphan = transaction({
      transactionId: 'txn-orphan',
      parentTransaction: 'missing-parent',
      status: 'APPLIED'
    })

    const [group] = buildTransactionGroups([orphan])
    const [row] = groupTransactionsForDisplay([orphan])

    expect(group.rootId).toBe('missing-parent')
    expect(group.root.transactionId).toBe('txn-orphan')
    expect(row.transactionId).toBe('txn-orphan')
  })

  it('uses a reference-suffix child as fallback root when the referenced parent is missing', () => {
    const [row] = groupTransactionsForDisplay([transaction({ transactionId: 'txn-orphan', reference: 'missing_q' })])

    expect(row.transactionId).toBe('txn-orphan')
    expect(row.reference).toBe('missing_q')
  })

  it('marks a full inflight commit as settled', () => {
    const rows = groupTransactionsForDisplay([
      transaction({ transactionId: 'txn-child', parentTransaction: 'txn-parent', status: 'APPLIED', amount: 100 }),
      transaction({ transactionId: 'txn-parent', status: 'INFLIGHT', amount: 100 })
    ])

    expect(rows).toHaveLength(1)
    expect(rows[0].effectiveStatus).toBe('Settled')
    expect(rows[0].committedAmount).toBe(100)
    expect(rows[0].remainingInflightAmount).toBe(0)
    expect(isEffectiveInflightTransaction(rows[0])).toBe(false)
  })

  it('groups commit grandchildren back to the queued root parent using BLNK metadata', () => {
    const [row] = groupTransactionsForDisplay([
      transaction({ transactionId: 'txn-root', reference: 'ref-root', status: 'QUEUED', amount: 100 }),
      transaction({
        transactionId: 'txn-processing',
        parentTransaction: 'txn-root',
        reference: 'ref-root_q',
        status: 'INFLIGHT',
        amount: 100,
        createdAt: '2026-06-16T13:17:35.405Z'
      }),
      transaction({
        transactionId: 'txn-commit',
        parentTransaction: 'txn-processing',
        reference: 'ref-commit',
        status: 'APPLIED',
        amount: 100,
        createdAt: '2026-06-16T13:18:35.405Z',
        metaData: {
          QUEUED_PARENT_TRANSACTION: 'txn-root'
        }
      })
    ])

    expect(row.transactionId).toBe('txn-root')
    expect(row.effectiveStatus).toBe('Settled')
    expect(row.childTransactions?.map(child => child.transactionId)).toEqual(['txn-processing', 'txn-commit'])
    expect(row.committedAmount).toBe(100)
    expect(row.remainingInflightAmount).toBe(0)
    expect(row.actionTargetTransactionId).toBeUndefined()
  })

  it('groups commit grandchildren when the queued parent metadata key is normalized', () => {
    const [row] = groupTransactionsForDisplay([
      transaction({ transactionId: 'txn-root', reference: 'ref-root', status: 'QUEUED', amount: 100 }),
      transaction({
        transactionId: 'txn-processing',
        parentTransaction: 'txn-root',
        reference: 'ref-root_q',
        status: 'INFLIGHT',
        amount: 100
      }),
      transaction({
        transactionId: 'txn-commit',
        parentTransaction: 'txn-processing',
        reference: 'ref-commit',
        status: 'APPLIED',
        amount: 100,
        metaData: {
          queued_parent_transaction: 'txn-root'
        }
      })
    ])

    expect(row.transactionId).toBe('txn-root')
    expect(row.childTransactions?.map(child => child.transactionId)).toEqual(['txn-processing', 'txn-commit'])
    expect(row.effectiveStatus).toBe('Settled')
  })

  it('treats direct settled transactions as fully committed with no remaining amount', () => {
    const [row] = groupTransactionsForDisplay([
      transaction({ transactionId: 'txn-direct-settled', status: 'APPLIED', amount: 1034 })
    ])

    expect(row.effectiveStatus).toBe('Settled')
    expect(row.committedAmount).toBe(1034)
    expect(row.voidedAmount).toBe(0)
    expect(row.remainingInflightAmount).toBe(0)
  })

  it('does not calculate remaining amount for direct voided or rejected transactions', () => {
    const rows = groupTransactionsForDisplay([
      transaction({ transactionId: 'txn-voided', status: 'VOID', amount: 1034 }),
      transaction({ transactionId: 'txn-rejected', status: 'REJECTED', amount: 1034 })
    ])

    expect(rows.map(row => row.effectiveStatus)).toEqual(['Voided', 'Rejected'])
    expect(rows.map(row => row.remainingInflightAmount)).toEqual([0, 0])
  })

  it('tracks partial inflight commits and remaining amount', () => {
    const [row] = groupTransactionsForDisplay([
      transaction({ transactionId: 'txn-child', parentTransaction: 'txn-parent', status: 'APPLIED', amount: 40 }),
      transaction({ transactionId: 'txn-parent', status: 'INFLIGHT', amount: 100 })
    ])

    expect(row.effectiveStatus).toBe('Partially settled')
    expect(row.committedAmount).toBe(40)
    expect(row.remainingInflightAmount).toBe(60)
    expect(row.actionTargetTransactionId).toBe('txn-parent')
    expect(isEffectiveInflightTransaction(row)).toBe(true)
  })

  it('targets the active inflight child for queued groups', () => {
    const [row] = groupTransactionsForDisplay([
      transaction({ transactionId: 'txn-root', reference: 'hold', status: 'QUEUED', amount: 100 }),
      transaction({
        transactionId: 'txn-processing',
        parentTransaction: 'txn-root',
        reference: 'hold_q',
        status: 'INFLIGHT',
        amount: 100
      })
    ])

    expect(row.effectiveStatus).toBe('In-flight')
    expect(row.actionTargetTransactionId).toBe('txn-processing')
    expect(isEffectiveInflightTransaction(row)).toBe(true)
  })

  it('marks pure inflight voids as voided', () => {
    const [row] = groupTransactionsForDisplay([
      transaction({ transactionId: 'txn-child', parentTransaction: 'txn-parent', status: 'VOID', amount: 100 }),
      transaction({ transactionId: 'txn-parent', status: 'INFLIGHT', amount: 100 })
    ])

    expect(row.effectiveStatus).toBe('Voided')
    expect(row.voidedAmount).toBe(100)
    expect(row.remainingInflightAmount).toBe(0)
  })

  it('distinguishes partial commits with the remaining amount voided', () => {
    const [row] = groupTransactionsForDisplay([
      transaction({ transactionId: 'txn-commit', parentTransaction: 'txn-parent', status: 'APPLIED', amount: 40 }),
      transaction({ transactionId: 'txn-void', parentTransaction: 'txn-parent', status: 'VOID', amount: 60 }),
      transaction({ transactionId: 'txn-parent', status: 'INFLIGHT', amount: 100 })
    ])

    expect(row.effectiveStatus).toBe('Partially settled / remaining voided')
    expect(row.committedAmount).toBe(40)
    expect(row.voidedAmount).toBe(60)
    expect(row.remainingInflightAmount).toBe(0)
  })

  it('groups split child rows under the parent transaction', () => {
    const [row] = groupTransactionsForDisplay([
      transaction({ transactionId: 'txn-parent', reference: 'split-ref', status: 'APPLIED', amount: 100 }),
      transaction({
        transactionId: 'txn-child-1',
        reference: 'split-ref_1',
        parentTransaction: 'txn-parent',
        status: 'APPLIED',
        amount: 70
      }),
      transaction({
        transactionId: 'txn-child-2',
        reference: 'split-ref_2',
        parentTransaction: 'txn-parent',
        status: 'APPLIED',
        amount: 30
      })
    ])

    expect(row.reference).toBe('split-ref')
    expect(row.childTransactions?.map(child => child.reference)).toEqual(['split-ref_1', 'split-ref_2'])
  })

  it('keeps the raw parent status while exposing effective display status', () => {
    const [row] = groupTransactionsForDisplay([
      transaction({ transactionId: 'txn-child', parentTransaction: 'txn-parent', status: 'APPLIED' }),
      transaction({ transactionId: 'txn-parent', status: 'QUEUED' })
    ])

    expect(row.status).toBe('QUEUED')
    expect(row.effectiveStatus).toBe('Settled')
  })
})
