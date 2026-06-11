/**
 * Invoice calculation engine: line amounts, tax breakdown, and totals.
 *
 * Pure functions only - no I/O - so they are fully unit-testable. Rounding is
 * applied per line and the grand gross total is reconciled with a rounding
 * adjustment to avoid penny drift.
 */
import { DEFAULT_ROUNDING_MODE } from '../constants'
import { roundMoney } from './money'
import type { InvoiceLine, InvoiceTotals, RoundingMode, TaxCategory, TaxSummaryEntry, TaxTreatment } from '../types'

export interface LineCalculationInput {
  id: string
  description: string
  quantity: number
  unitPrice: number
  discountPercent?: number
  taxCategoryId: string
  revenueAccountCode?: string | null
  costCenterId?: string | null
  projectId?: string | null
}

export interface CalculationContext {
  currency: string
  taxCategories: TaxCategory[]
  roundingMode?: RoundingMode
  precisionOverrides?: Record<string, number>
  /** Resolve the rate for a tax category, e.g. by validity date. Defaults to current. */
  resolveRatePercent?: (category: TaxCategory) => number
}

function resolveCategory(taxCategories: TaxCategory[], taxCategoryId: string): TaxCategory | undefined {
  return taxCategories.find(category => category.id === taxCategoryId)
}

function defaultRatePercent(category: TaxCategory | undefined): number {
  if (!category || category.rates.length === 0) {
    return 0
  }
  // Most recent valid-from wins when no explicit resolver is supplied.
  const sorted = [...category.rates].sort((a, b) => (a.validFrom < b.validFrom ? 1 : -1))
  return sorted[0].ratePercent
}

function treatmentOf(category: TaxCategory | undefined): TaxTreatment {
  return category?.treatment ?? 'STANDARD'
}

/** Compute net/tax/gross for a single line. */
export function calculateLine(input: LineCalculationInput, context: CalculationContext): InvoiceLine {
  const { currency, taxCategories, roundingMode = DEFAULT_ROUNDING_MODE, precisionOverrides } = context
  const category = resolveCategory(taxCategories, input.taxCategoryId)
  const ratePercent = context.resolveRatePercent
    ? context.resolveRatePercent(category as TaxCategory)
    : defaultRatePercent(category)

  const quantity = Number.isFinite(input.quantity) ? input.quantity : 0
  const unitPrice = Number.isFinite(input.unitPrice) ? input.unitPrice : 0
  const discountPercent = clampPercent(input.discountPercent ?? 0)

  const grossLineBeforeTax = quantity * unitPrice
  const discountFactor = 1 - discountPercent / 100
  const netAmount = roundMoney(grossLineBeforeTax * discountFactor, currency, roundingMode, precisionOverrides)
  const taxAmount = roundMoney((netAmount * ratePercent) / 100, currency, roundingMode, precisionOverrides)
  const grossAmount = roundMoney(netAmount + taxAmount, currency, roundingMode, precisionOverrides)

  return {
    id: input.id,
    description: input.description,
    quantity,
    unitPrice,
    discountPercent,
    taxCategoryId: input.taxCategoryId,
    taxRatePercent: ratePercent,
    revenueAccountCode: input.revenueAccountCode ?? null,
    costCenterId: input.costCenterId ?? null,
    projectId: input.projectId ?? null,
    netAmount,
    taxAmount,
    grossAmount
  }
}

/** Aggregate calculated lines into invoice totals with a per-rate tax summary. */
export function calculateTotals(lines: InvoiceLine[], context: CalculationContext): InvoiceTotals {
  const { currency, taxCategories, roundingMode = DEFAULT_ROUNDING_MODE, precisionOverrides } = context

  const netTotal = roundMoney(sum(lines.map(line => line.netAmount)), currency, roundingMode, precisionOverrides)
  const taxTotal = roundMoney(sum(lines.map(line => line.taxAmount)), currency, roundingMode, precisionOverrides)
  const rawGross = netTotal + taxTotal
  const grossTotal = roundMoney(rawGross, currency, roundingMode, precisionOverrides)
  const roundingAdjustment = roundMoney(grossTotal - rawGross, currency, roundingMode, precisionOverrides)

  return {
    netTotal,
    taxTotal,
    grossTotal,
    roundingAdjustment,
    taxSummary: buildTaxSummary(lines, taxCategories, currency, roundingMode, precisionOverrides)
  }
}

/** Convenience: calculate every line and the totals in one pass. */
export function calculateInvoice(
  inputs: LineCalculationInput[],
  context: CalculationContext
): { lines: InvoiceLine[]; totals: InvoiceTotals } {
  const lines = inputs.map(input => calculateLine(input, context))
  const totals = calculateTotals(lines, context)
  return { lines, totals }
}

function buildTaxSummary(
  lines: InvoiceLine[],
  taxCategories: TaxCategory[],
  currency: string,
  roundingMode: RoundingMode,
  precisionOverrides?: Record<string, number>
): TaxSummaryEntry[] {
  const byKey = new Map<string, TaxSummaryEntry>()

  for (const line of lines) {
    const category = resolveCategory(taxCategories, line.taxCategoryId)
    const key = `${line.taxCategoryId}:${line.taxRatePercent}`
    const existing = byKey.get(key)
    if (existing) {
      existing.netAmount += line.netAmount
      existing.taxAmount += line.taxAmount
    } else {
      byKey.set(key, {
        taxCategoryId: line.taxCategoryId,
        taxRatePercent: line.taxRatePercent,
        treatment: treatmentOf(category),
        netAmount: line.netAmount,
        taxAmount: line.taxAmount
      })
    }
  }

  return Array.from(byKey.values()).map(entry => ({
    ...entry,
    netAmount: roundMoney(entry.netAmount, currency, roundingMode, precisionOverrides),
    taxAmount: roundMoney(entry.taxAmount, currency, roundingMode, precisionOverrides)
  }))
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0)
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.min(100, Math.max(0, value))
}

/** Remaining open amount on an invoice given its gross total and paid amount. */
export function calculateOutstanding(grossTotal: number, paidAmount: number): number {
  const outstanding = grossTotal - paidAmount
  return outstanding > 0 ? outstanding : 0
}
