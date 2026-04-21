/**
 * Shared response-to-ImportResult processors.
 *
 * `processStandardEntityResponse` is used by every non-investment-group
 * submission (CRM leads / contacts / accounts / opportunities, IRM standard
 * entities). `getStandardEntityCollectionKey` returns the JSON key under
 * which the Java endpoint wraps both request and response collections.
 */

import type { ImportConfig, ImportResult } from '@/common/components/common-relations/apps/data-import/types'

export function processStandardEntityResponse(response: any, entityTypePlural: string): ImportResult {
  const hasErrors = response.validationResponse?.errors?.length > 0
  const createdEntities = response[entityTypePlural] || []

  return {
    success: !hasErrors && createdEntities.length > 0,
    successCount: createdEntities.length,
    errorCount: hasErrors ? response.validationResponse.errors.length : 0,
    errors: hasErrors
      ? response.validationResponse.errors.map((err: any, idx: number) => ({
          rowIndex: idx,
          entityData: {},
          error: `${err.code || 'ERROR'}: ${err.detail || err.title || 'Unknown error'}`
        }))
      : [],
    createdIds: createdEntities.map((entity: any) => entity.id)
  }
}

export function getStandardEntityCollectionKey(entitySuffix: string, domain: ImportConfig['domain']): string {
  return domain === 'investment'
    ? `investment${entitySuffix}`
    : entitySuffix.charAt(0).toLowerCase() + entitySuffix.slice(1)
}
