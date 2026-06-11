import { invoicesToCsv, parseBankStatementCsv } from '../invoiceExport'
import type { Invoice } from '../../types'

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-0001',
    status: 'ISSUED',
    legalEntityId: 'le-1',
    billingCustomerId: 'bc-1',
    currency: 'EUR',
    accountingCurrency: 'EUR',
    issueDate: '2026-01-01',
    dueDate: '2026-01-15',
    lines: [],
    totals: { netTotal: 100, taxTotal: 19, grossTotal: 119, roundingAdjustment: 0, taxSummary: [] },
    paidAmount: 19,
    ledgerLinks: [],
    payments: [],
    audit: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides
  }
}

describe('invoicesToCsv', () => {
  it('emits a header row plus one row per invoice with computed outstanding', () => {
    const csv = invoicesToCsv([makeInvoice()])
    const rows = csv.split('\n')
    expect(rows[0]).toBe(
      'invoiceNumber,status,currency,issueDate,dueDate,netTotal,taxTotal,grossTotal,paidAmount,outstanding'
    )
    expect(rows[1]).toBe('INV-2026-0001,ISSUED,EUR,2026-01-01,2026-01-15,100,19,119,19,100')
  })

  it('escapes values that contain commas or quotes', () => {
    const csv = invoicesToCsv([makeInvoice({ invoiceNumber: 'INV,"X"' })])
    expect(csv.split('\n')[1]).toContain('"INV,""X"""')
  })
})

describe('parseBankStatementCsv', () => {
  it('parses data rows (skipping the header) into bank statement lines', () => {
    const csv = [
      'date,amount,currency,counterparty,reference',
      '2026-01-12,119,EUR,ACME,INV-2026-0001',
      '2026-01-13,50.50,USD,Globex,REF-2'
    ].join('\n')
    const lines = parseBankStatementCsv(csv)
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatchObject({
      bookingDate: '2026-01-12',
      amount: 119,
      currency: 'EUR',
      counterparty: 'ACME',
      reference: 'INV-2026-0001'
    })
    expect(lines[1].amount).toBe(50.5)
  })

  it('returns an empty array for empty input', () => {
    expect(parseBankStatementCsv('')).toEqual([])
  })

  it('handles quoted fields containing commas', () => {
    const csv = ['date,amount,currency,counterparty,reference', '2026-01-12,100,EUR,"ACME, Inc.",REF'].join('\n')
    const lines = parseBankStatementCsv(csv)
    expect(lines[0].counterparty).toBe('ACME, Inc.')
  })
})
