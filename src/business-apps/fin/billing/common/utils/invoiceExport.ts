/**
 * CSV export/import helpers for invoices and AR reporting.
 *
 * Kept dependency-free and pure so they are easy to test and reuse for both the
 * invoice export and the AR aging report export.
 */
import { calculateOutstanding } from './invoiceCalculations'
import type { BankStatementLine, Invoice } from '../types'

function escapeCsv(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value)
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function invoicesToCsv(invoices: Invoice[]): string {
  const header = [
    'invoiceNumber',
    'status',
    'currency',
    'issueDate',
    'dueDate',
    'netTotal',
    'taxTotal',
    'grossTotal',
    'paidAmount',
    'outstanding'
  ]
  const rows = invoices.map(invoice =>
    [
      invoice.invoiceNumber ?? '',
      invoice.status,
      invoice.currency,
      invoice.issueDate ?? '',
      invoice.dueDate ?? '',
      invoice.totals.netTotal,
      invoice.totals.taxTotal,
      invoice.totals.grossTotal,
      invoice.paidAmount,
      calculateOutstanding(invoice.totals.grossTotal, invoice.paidAmount)
    ]
      .map(escapeCsv)
      .join(',')
  )
  return [header.join(','), ...rows].join('\n')
}

/** Parse a simple bank-statement CSV (date,amount,currency,counterparty,reference). */
export function parseBankStatementCsv(csv: string): BankStatementLine[] {
  const lines = csv
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
  if (lines.length === 0) {
    return []
  }

  const [, ...dataRows] = lines
  return dataRows.map((row, index) => {
    const cells = splitCsvRow(row)
    return {
      id: `import-${index}`,
      bookingDate: cells[0] ?? '',
      amount: Number(cells[1] ?? 0),
      currency: cells[2] ?? 'EUR',
      counterparty: cells[3] ?? null,
      reference: cells[4] ?? null
    }
  })
}

function splitCsvRow(row: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < row.length; i++) {
    const char = row[i]
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result.map(cell => cell.trim())
}

/** Trigger a browser download for a generated CSV. */
export function downloadCsv(filename: string, csv: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  try {
    link.href = url
    link.download = filename
    link.rel = 'noopener'
    link.click()
  } finally {
    URL.revokeObjectURL(url)
  }
}
