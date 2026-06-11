/**
 * Accounts-receivable aging report.
 *
 * Buckets outstanding invoice amounts by how overdue they are. Pure function so
 * the reports screen and exports can both rely on it.
 */
import { calculateOutstanding } from './invoiceCalculations'
import type { Invoice } from '../types'

export type AgingBucketKey = 'current' | 'days1_30' | 'days31_60' | 'days61_90' | 'days90Plus'

export interface AgingBucket {
  key: AgingBucketKey
  label: string
  amount: number
  count: number
}

const BUCKET_LABELS: Record<AgingBucketKey, string> = {
  current: 'Not yet due',
  days1_30: '1-30 days',
  days31_60: '31-60 days',
  days61_90: '61-90 days',
  days90Plus: '90+ days'
}

function bucketForDaysOverdue(daysOverdue: number): AgingBucketKey {
  if (daysOverdue <= 0) return 'current'
  if (daysOverdue <= 30) return 'days1_30'
  if (daysOverdue <= 60) return 'days31_60'
  if (daysOverdue <= 90) return 'days61_90'
  return 'days90Plus'
}

function daysBetween(due: Date, now: Date): number {
  const ms = now.getTime() - due.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

/** Compute aging buckets for the given (open) invoices in a single currency. */
export function computeArAging(invoices: Invoice[], now: Date = new Date()): AgingBucket[] {
  const totals: Record<AgingBucketKey, { amount: number; count: number }> = {
    current: { amount: 0, count: 0 },
    days1_30: { amount: 0, count: 0 },
    days31_60: { amount: 0, count: 0 },
    days61_90: { amount: 0, count: 0 },
    days90Plus: { amount: 0, count: 0 }
  }

  for (const invoice of invoices) {
    const outstanding = calculateOutstanding(invoice.totals.grossTotal, invoice.paidAmount)
    if (outstanding <= 0 || invoice.status === 'CANCELLED' || invoice.status === 'DRAFT') {
      continue
    }
    const due = invoice.dueDate ? new Date(invoice.dueDate) : null
    const daysOverdue = due && !Number.isNaN(due.getTime()) ? daysBetween(due, now) : 0
    const key = bucketForDaysOverdue(daysOverdue)
    totals[key].amount += outstanding
    totals[key].count += 1
  }

  return (Object.keys(totals) as AgingBucketKey[]).map(key => ({
    key,
    label: BUCKET_LABELS[key],
    amount: totals[key].amount,
    count: totals[key].count
  }))
}
