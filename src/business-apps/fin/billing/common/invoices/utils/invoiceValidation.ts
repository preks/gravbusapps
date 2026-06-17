/**
 * Invoice draft validation. Runs before issuing so finalized invoices are
 * always complete and consistent. Tenancy/legal-entity presence is required.
 */
import type { InvoiceDraftInput } from '../../queries/billingCoreApi'

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

export function validateInvoiceDraft(draft: InvoiceDraftInput): ValidationResult {
  const errors: ValidationError[] = []

  if (!draft.legalEntityId) {
    errors.push({ field: 'legalEntityId', message: 'A selling legal entity is required.' })
  }
  if (!draft.billingCustomerId) {
    errors.push({ field: 'billingCustomerId', message: 'A billing customer is required.' })
  }
  if (draft.currency?.length !== 3) {
    errors.push({ field: 'currency', message: 'A valid 3-letter currency code is required.' })
  }
  if (!draft.lines || draft.lines.length === 0) {
    errors.push({ field: 'lines', message: 'At least one invoice line is required.' })
  }

  draft.lines?.forEach((line, index) => {
    if (!line.description?.trim()) {
      errors.push({ field: `lines[${index}].description`, message: 'Line description is required.' })
    }
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      errors.push({ field: `lines[${index}].quantity`, message: 'Quantity must be greater than zero.' })
    }
    if (!Number.isFinite(line.unitPrice)) {
      errors.push({ field: `lines[${index}].unitPrice`, message: 'Unit price must be a number.' })
    }
    if (line.discountPercent != null && (line.discountPercent < 0 || line.discountPercent > 100)) {
      errors.push({ field: `lines[${index}].discountPercent`, message: 'Discount must be between 0 and 100.' })
    }
    if (!line.taxCategoryId) {
      errors.push({ field: `lines[${index}].taxCategoryId`, message: 'A tax category is required.' })
    }
  })

  return { valid: errors.length === 0, errors }
}

/** Throws when a draft is not ready to be issued. */
export function assertIssuable(draft: InvoiceDraftInput): void {
  const result = validateInvoiceDraft(draft)
  if (!result.valid) {
    throw new Error(`Invoice cannot be issued: ${result.errors.map(error => error.message).join(' ')}`)
  }
}
