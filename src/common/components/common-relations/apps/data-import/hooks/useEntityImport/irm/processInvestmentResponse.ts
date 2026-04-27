/**
 * Converts the `createInvestments` batch response into a shared `ImportResult`
 * value. Handles both the singular-response shape (`.investments`) and the
 * multiplexed request shape (`.investmentRequests`) so callers need not
 * branch.
 */

import type { ImportResult } from '@/common/components/common-relations/apps/data-import/types'

export function processInvestmentResponse(response: any): ImportResult {
  const hasErrors = response.validationResponse?.errors?.length > 0
  const createdInvestments = response.investments || response.investmentRequests || []

  return {
    success: !hasErrors && createdInvestments.length > 0,
    successCount: createdInvestments.length,
    errorCount: hasErrors ? response.validationResponse.errors.length : 0,
    errors: hasErrors
      ? response.validationResponse.errors.map((err: any, idx: number) => ({
          rowIndex: idx,
          entityData: {},
          error: `${err.code || 'ERROR'}: ${err.detail || err.title || 'Unknown error'}`
        }))
      : [],
    createdIds: createdInvestments.map((inv: any) => inv.investment?.id).filter(Boolean)
  }
}
