/**
 * Normalizes receipt/invoice data from AI processing.
 *
 * Responsibilities:
 * - Ensures items array exists
 * - Folds tax into items when the item sum + tax === receipt total
 * - Merges negative-amount items (discounts) into the first positive item
 *   with the same expense group and type
 * - Enriches taxDetails and tipDetails with expense classification codes
 *
 * Does not mutate the input; returns a new object.
 */

// ─── Constants ──────────────────────────────────────────────────────────────

const TOTAL_MATCH_TOLERANCE = 0.02
const CURRENCY_MULTIPLIER = 100

const SERVICE_TAX_EXPENSE: ReceiptExpenseDetails = {
  expenseCode: 'ST',
  expenseLabel: 'Service Tax',
  expenseGroupCode: 'OTHER',
  expenseGroupLabel: 'Other'
}

const TIP_EXPENSE: ReceiptExpenseDetails = {
  expenseCode: 'TIP',
  expenseLabel: 'Tip',
  expenseGroupCode: 'OTHER',
  expenseGroupLabel: 'Other'
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ReceiptExpenseDetails {
  expenseCode?: string | null
  expenseLabel?: string | null
  expenseGroupCode?: string | null
  expenseGroupLabel?: string | null
}

export interface ReceiptItem {
  description?: string
  quantity?: number
  unitPrice?: number
  totalPrice?: number
  taxRate?: number
  taxAmount?: number | null
  expenseDetails?: ReceiptExpenseDetails | null
}

export interface ReceiptData {
  items?: ReceiptItem[]
  total?: number | null
  taxDetails?: { taxAmount?: number; taxRate?: number } | null
  tipDetails?: { tipAmount?: number } | null
  [key: string]: unknown
}

// ─── Pure helpers ───────────────────────────────────────────────────────────

function toNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function roundCurrency(value: number): number {
  return Math.round(value * CURRENCY_MULTIPLIER) / CURRENCY_MULTIPLIER
}

function amountsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) <= TOTAL_MATCH_TOLERANCE
}

function itemTotal(item: ReceiptItem): number {
  return toNumber(item.totalPrice)
}

function sumItems(items: ReceiptItem[]): number {
  return items.reduce((sum, item) => sum + itemTotal(item), 0)
}

function hasClassification(item: ReceiptItem): boolean {
  const ed = item.expenseDetails
  return !!(ed?.expenseCode && ed?.expenseGroupCode)
}

function sameClassification(a: ReceiptItem, b: ReceiptItem): boolean {
  return (
    hasClassification(a) &&
    hasClassification(b) &&
    a.expenseDetails!.expenseCode === b.expenseDetails!.expenseCode &&
    a.expenseDetails!.expenseGroupCode === b.expenseDetails!.expenseGroupCode
  )
}

function withUpdatedTotal(item: ReceiptItem, newTotal: number): ReceiptItem {
  const rounded = roundCurrency(newTotal)
  const qty = toNumber(item.quantity)
  const canRecalcUnitPrice = qty > 0 && item.unitPrice != null

  return {
    ...item,
    totalPrice: rounded,
    ...(canRecalcUnitPrice && { unitPrice: roundCurrency(rounded / qty) })
  }
}

// ─── Normalization steps (each is a pure function: items in → items out) ──

function foldTaxIntoItems(
  items: ReceiptItem[],
  receiptTotal: number | null,
  taxAmount: number | undefined
): ReceiptItem[] {
  if (items.length === 0 || receiptTotal == null || taxAmount == null) return items
  if (amountsMatch(sumItems(items), receiptTotal)) return items
  if (!amountsMatch(sumItems(items) + taxAmount, receiptTotal)) return items

  const updatedFirst = withUpdatedTotal(items[0], itemTotal(items[0]) + taxAmount)
  return [updatedFirst, ...items.slice(1)]
}

function mergeDiscounts(items: ReceiptItem[]): ReceiptItem[] {
  if (items.length === 0) return items

  const result = items.map(item => ({ ...item }))
  const merged = new Set<number>()

  for (let i = 0; i < result.length; i++) {
    const total = itemTotal(result[i])
    const classified = hasClassification(result[i])
    // [DEBUG:mergeDiscounts] evaluate each item
    console.log(`[DEBUG:mergeDiscounts] item[${i}] total=${total} hasClassification=${classified}`,
      `code=${result[i].expenseDetails?.expenseCode} group=${result[i].expenseDetails?.expenseGroupCode}`)

    if (total >= 0 || !classified) {
      console.log(`[DEBUG:mergeDiscounts] item[${i}] skipped (total>=0: ${total >= 0}, !classified: ${!classified})`)
      continue
    }

    const targetIndex = result.findIndex(
      (candidate, idx) =>
        idx !== i && !merged.has(idx) && itemTotal(candidate) > 0 && sameClassification(result[i], candidate)
    )
    console.log(`[DEBUG:mergeDiscounts] item[${i}] discount -> targetIndex=${targetIndex}`)
    if (targetIndex === -1) continue

    const adjustedTarget = withUpdatedTotal(result[targetIndex], itemTotal(result[targetIndex]) + itemTotal(result[i]))
    result[targetIndex] = adjustedTarget
    merged.add(i)
    console.log(`[DEBUG:mergeDiscounts] merged item[${i}] into item[${targetIndex}], new total=${adjustedTarget.totalPrice}`)
  }

  console.log(`[DEBUG:mergeDiscounts] merged count: ${merged.size}`)
  return merged.size > 0 ? result.filter((_, idx) => !merged.has(idx)) : items
}

function enrichTaxDetails(data: ReceiptData): ReceiptData['taxDetails'] {
  if (!data.taxDetails) return data.taxDetails
  if (data.taxDetails.taxAmount == null && data.taxDetails.taxRate == null) return data.taxDetails
  return { ...data.taxDetails, ...SERVICE_TAX_EXPENSE }
}

function enrichTipDetails(data: ReceiptData): ReceiptData['tipDetails'] {
  if (!data.tipDetails) return data.tipDetails
  if (!data.tipDetails.tipAmount || data.tipDetails.tipAmount <= 0) return data.tipDetails
  return { ...data.tipDetails, ...TIP_EXPENSE }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function normalizeReceiptData(data: ReceiptData | null | undefined): ReceiptData | null | undefined {
  if (data == null) return data

  const items = Array.isArray(data.items) ? data.items : []
  const receiptTotal = data.total != null ? toNumber(data.total) : null
  const taxAmount = data.taxDetails?.taxAmount

  // [DEBUG:receipt-normalizer] trace normalization pipeline
  console.log('[DEBUG:receipt-normalizer] input items:', JSON.stringify(items.map(i => ({
    desc: i.description, total: i.totalPrice,
    code: i.expenseDetails?.expenseCode, group: i.expenseDetails?.expenseGroupCode
  }))))
  console.log('[DEBUG:receipt-normalizer] receiptTotal:', receiptTotal, 'taxAmount:', taxAmount)

  const afterTaxFold = foldTaxIntoItems(items, receiptTotal, taxAmount)
  console.log('[DEBUG:receipt-normalizer] after foldTaxIntoItems count:', afterTaxFold.length)

  const normalizedItems = mergeDiscounts(afterTaxFold)
  console.log('[DEBUG:receipt-normalizer] after mergeDiscounts count:', normalizedItems.length,
    'items:', JSON.stringify(normalizedItems.map(i => ({
      desc: i.description, total: i.totalPrice,
      code: i.expenseDetails?.expenseCode, group: i.expenseDetails?.expenseGroupCode
    }))))

  return {
    ...data,
    items: normalizedItems,
    taxDetails: enrichTaxDetails(data),
    tipDetails: enrichTipDetails(data)
  }
}
