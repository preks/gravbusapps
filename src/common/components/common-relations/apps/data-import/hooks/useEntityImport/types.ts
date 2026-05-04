/**
 * Strategy types used by the core `useEntityImport` hook to dispatch
 * domain-specific import behavior. CRM and IRM each provide their own
 * strategy; the core hook never branches on `config.domain` at the behavior
 * level — a strategy is always injected by the caller.
 */

import type { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { useRestClient } from '@/common/network/rest/useRestClient'
import type { ImportConfig, ImportResult } from '@/common/components/common-relations/apps/data-import/types'

export interface ImportSubmissionContext {
  restClient: ReturnType<typeof useRestClient>
  graphQLClient: ReturnType<typeof useGraphQLClient>
  accessToken: string | undefined
  ownerEmployeeId: string | undefined
  config: ImportConfig
}

export interface ImportSubmissionStrategy {
  /**
   * Post-process records after `extract-from-file`. IRM uses this to flatten
   * the hybrid response shape; CRM leaves records untouched.
   */
  postProcessExtractedRecords?: (records: Record<string, unknown>[]) => Record<string, unknown>[]

  /**
   * Transform a single entity before submission. Used for structural
   * reshaping only (e.g. coercing `addressLine` to a string for the CRM
   * lead endpoint). Value-level defaults come from
   * `ImportConfig.enforcedSelects` and are applied before this runs.
   */
  prepareEntityForSubmission?: (entity: Record<string, any>) => Record<string, any>

  /**
   * Actually POSTs the payload and returns an `ImportResult`. The core hook
   * handles the universal success/error plumbing around this call.
   */
  submit: (entities: Record<string, any>[], ctx: ImportSubmissionContext) => Promise<ImportResult>

  /**
   * Maps a raw submission error into a friendlier message. Return
   * `undefined` to let the shared `extractErrorMessage` fallback apply.
   */
  normalizeError?: (error: unknown) => string | undefined
}
