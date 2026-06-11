/**
 * Sample ledger data for the Ledger Admin screen.
 *
 * Used only when the NEWWORK Connect lane is not configured or unreachable, so
 * the UI stays usable in local dev / previews. Mirrors the real client shapes.
 */
import type { Ledger, LedgerAccount, LedgerTransaction } from '../network/ledgerAdminClient'

export const SAMPLE_LEDGERS: Ledger[] = [
  {
    id: 'led-sample-ar',
    ledgerId: 'led-sample-ar',
    name: 'Accounts Receivable',
    metaData: { type: 'AR' },
    createdAt: '2026-01-04T09:00:00Z'
  },
  {
    id: 'led-sample-rev',
    ledgerId: 'led-sample-rev',
    name: 'Revenue',
    metaData: { type: 'REVENUE' },
    createdAt: '2026-01-04T09:00:00Z'
  },
  {
    id: 'led-sample-tax',
    ledgerId: 'led-sample-tax',
    name: 'Tax Payable',
    metaData: { type: 'TAX' },
    createdAt: '2026-01-04T09:00:00Z'
  }
]

export const SAMPLE_ACCOUNTS: LedgerAccount[] = [
  {
    id: 'bln-sample-acme',
    balanceId: 'bln-sample-acme',
    ledgerId: 'led-sample-ar',
    name: 'Acme GmbH (Debtor)',
    currency: 'EUR',
    balance: 4820.5,
    inflightBalance: 0,
    metaData: { name: 'Acme GmbH (Debtor)', customer_id: 'acc-acme' },
    createdAt: '2026-02-01T10:00:00Z'
  },
  {
    id: 'bln-sample-revenue',
    balanceId: 'bln-sample-revenue',
    ledgerId: 'led-sample-rev',
    name: 'Sales Revenue',
    currency: 'EUR',
    balance: 18650,
    inflightBalance: 0,
    metaData: { name: 'Sales Revenue' },
    createdAt: '2026-02-01T10:00:00Z'
  },
  {
    id: 'bln-sample-vat',
    balanceId: 'bln-sample-vat',
    ledgerId: 'led-sample-tax',
    name: 'VAT Output (19%)',
    currency: 'EUR',
    balance: 3543.5,
    inflightBalance: 0,
    metaData: { name: 'VAT Output (19%)' },
    createdAt: '2026-02-01T10:00:00Z'
  }
]

export const SAMPLE_LEDGER_TRANSACTIONS: LedgerTransaction[] = [
  {
    id: 'txn-sample-1',
    transactionId: 'txn-sample-1',
    reference: 'nw-billing:issued:INV-2026-0001',
    amount: 1190,
    currency: 'EUR',
    source: 'Sales Revenue',
    destination: 'Acme GmbH (Debtor)',
    description: 'Invoice INV-2026-0001 issued',
    status: 'APPLIED',
    createdAt: '2026-05-12T08:30:00Z'
  },
  {
    id: 'txn-sample-2',
    transactionId: 'txn-sample-2',
    reference: 'nw-billing:paid:INV-2026-0001',
    amount: 1190,
    currency: 'EUR',
    source: 'Acme GmbH (Debtor)',
    destination: '@World',
    description: 'Payment received for INV-2026-0001',
    status: 'APPLIED',
    createdAt: '2026-05-20T11:15:00Z'
  }
]
