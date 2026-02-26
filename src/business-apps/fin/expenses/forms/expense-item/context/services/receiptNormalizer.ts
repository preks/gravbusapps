/** Matches the exact words "Tip" or "Tax" (case-insensitive), not substrings like "tipping" or "taxi" */
const TAX_TIP_DESCRIPTION_PATTERN = /\b(Tip|Tax)\b/i
/** Descriptions containing these phrases are kept even if they match Tip/Tax (e.g. "City Tax") */
const KEEP_DESCRIPTION_PATTERN = /City Tax/i

const SERVICE_TAX_EXPENSE = {
  expenseCode: 'ST',
  expenseLabel: 'Service Tax',
  expenseGroupCode: 'OTHER',
  expenseGroupLabel: 'Other'
} as const

const TIP_EXPENSE = {
  expenseCode: 'TIP',
  expenseLabel: 'Tip',
  expenseGroupCode: 'OTHER',
  expenseGroupLabel: 'Other'
} as const

const TOTAL_MATCH_TOLERANCE = 0.02

function sumItemsTotal(items: any[]): number {
  if (!Array.isArray(items)) return 0
  return items.reduce((sum, item) => sum + (Number(item?.totalPrice) || 0), 0)
}

/** Add tax position only when sum is strictly less than AI total (tax is a separate line). If sum matches or is bigger, tax is already included. */
function shouldAddTaxPosition(positionsSum: number, aiTotal: number | null | undefined): boolean {
  if (aiTotal == null || typeof aiTotal !== 'number') return false
  return positionsSum < aiTotal - TOTAL_MATCH_TOLERANCE
}

/**
 * Normalizes receipt/invoice data from the AI:
 * - Removes items whose description contains the words "tax" or "tip" (except e.g. "City Tax")
 * - When taxDetails has data: enriches it; adds a tax position only if sum of (filtered) items is strictly less than AI total. If sum matches or exceeds total, tax is already included in item amounts — do not add tax position.
 * - When tipDetails has data: enriches it and always adds a single tip item (no sum check)
 * Handles all cases: both tax and tip, only tax, only tip, or neither.
 */
export function normalizeReceiptData(data: any): any {
  if (!data) return data

  const normalized = { ...data }

  // 1. Filter out items that are tax or tip by description (word match), except e.g. "City Tax"
  if (Array.isArray(normalized.items)) {
    normalized.items = normalized.items.filter((item: any) => {
      const desc = item?.description ?? ''
      if (KEEP_DESCRIPTION_PATTERN.test(desc)) return true
      return !TAX_TIP_DESCRIPTION_PATTERN.test(desc)
    })
  } else {
    normalized.items = []
  }

  const aiTotal = normalized.total != null ? Number(normalized.total) : null
  let positionsSum = sumItemsTotal(normalized.items)

  // 2. Add tax position only when taxDetails has data and sum of items is strictly less than AI total. If sum matches or is bigger, tax is already included — do not add.
  const taxDetails = normalized.taxDetails
  if (taxDetails && (taxDetails.taxAmount != null || taxDetails.taxRate != null)) {
    const enrichedTaxDetails = {
      ...taxDetails,
      ...SERVICE_TAX_EXPENSE
    }
    normalized.taxDetails = enrichedTaxDetails
    const taxAmount = taxDetails.taxAmount ?? 0
    if (taxAmount > 0 && shouldAddTaxPosition(positionsSum, aiTotal)) {
      normalized.items.push({
        description: 'Service Tax',
        quantity: 1,
        unitPrice: taxAmount,
        totalPrice: taxAmount,
        taxRate: taxDetails.taxRate ?? null,
        taxAmount: taxDetails.taxAmount ?? null,
        expenseDetails: { ...SERVICE_TAX_EXPENSE }
      })
      positionsSum += taxAmount
    }
  }

  // 3. Add tip item when tipDetails exists and has tipAmount (no sum vs total check)
  const tipDetails = normalized.tipDetails
  if (tipDetails && tipDetails.tipAmount != null && tipDetails.tipAmount > 0) {
    const enrichedTipDetails = {
      ...tipDetails,
      ...TIP_EXPENSE
    }
    normalized.tipDetails = enrichedTipDetails
    normalized.items.push({
      description: 'Tip',
      quantity: 1,
      unitPrice: tipDetails.tipAmount,
      totalPrice: tipDetails.tipAmount,
      taxRate: null,
      taxAmount: null,
      expenseDetails: { ...TIP_EXPENSE }
    })
  }

  return normalized
}
