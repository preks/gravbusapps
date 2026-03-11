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

function amountsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) <= TOTAL_MATCH_TOLERANCE
}

function sumItemsTotal(items: any[]): number {
  if (!Array.isArray(items)) return 0
  return items.reduce((sum, item) => sum + (Number(item?.totalPrice) || 0), 0)
}

/**
 * If sum of items !== total, check if sum of items + taxDetails.taxAmount === total.
 * If true, add taxAmount to the first item's totalPrice so the items sum to total.
 */
function foldTaxIntoFirstItem(normalized: any): void {
  const items = normalized.items
  if (!Array.isArray(items) || items.length === 0) return

  const total = normalized.total != null ? Number(normalized.total) : null
  if (total == null || Number.isNaN(total)) return

  const sumOfItems = sumItemsTotal(items)
  if (amountsMatch(sumOfItems, total)) return

  const taxDetails = normalized.taxDetails
  if (!taxDetails || taxDetails.taxAmount == null || typeof taxDetails.taxAmount !== 'number') return

  const taxAmount = taxDetails.taxAmount
  if (!amountsMatch(sumOfItems + taxAmount, total)) return

  const first = items[0]
  const currentTotal = Number(first?.totalPrice) || 0
  first.totalPrice = currentTotal + taxAmount
  if (first.unitPrice != null && first.quantity === 1) {
    first.unitPrice = first.totalPrice
  }
}

/**
 * Normalizes receipt/invoice data from the AI:
 * - Ensures items array exists
 * - If sum of items !== total and sum of items + taxDetails.taxAmount === total, adds taxAmount to the first item so items sum to total
 * - Enriches taxDetails and tipDetails with expense codes when present
 */
export function normalizeReceiptData(data: any): any {
  if (!data) return data

  const normalized = { ...data }

  if (!Array.isArray(normalized.items)) {
    normalized.items = []
  }

  foldTaxIntoFirstItem(normalized)

  const taxDetails = normalized.taxDetails
  if (taxDetails && (taxDetails.taxAmount != null || taxDetails.taxRate != null)) {
    normalized.taxDetails = {
      ...taxDetails,
      ...SERVICE_TAX_EXPENSE
    }
  }

  const tipDetails = normalized.tipDetails
  if (tipDetails && tipDetails.tipAmount != null && tipDetails.tipAmount > 0) {
    normalized.tipDetails = {
      ...tipDetails,
      ...TIP_EXPENSE
    }
  }

  return normalized
}
