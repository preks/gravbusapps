/**
 * Type definitions for Investment Rejection Reasons
 * These types match the GraphQL schema and database structure
 */

import type { CatalogEntry, BaseEntity } from '@/common/network/graphql/commonTypes'

/**
 * Source types for rejection reasons
 * Must match the ProspectType enum in the backend
 */
export type RejectionReasonSource = 'LEAD_PROSPECT_TYPE' | 'OPPORTUNITY_PROSPECT_TYPE'

/**
 * Base rejection reason interface matching database schema
 */
export interface RejectionReasonBase extends BaseEntity {
  id: string
  version: number
  businessKey?: string
  recordState?: string
  activeTo?: string

  /** Source entity type */
  source: RejectionReasonSource

  /** Optional additional description */
  description?: string

  /** Catalog reference ID */
  rejectionReasonRef: string

  /** UUID references to parent entities */
  lead?: string
  opportunity?: string

  /** Additional properties JSON */
  additionalProperties?: any
}

/**
 * Extended rejection reason with catalog entry details
 */
export interface RejectionReason extends RejectionReasonBase {
  /** Full catalog entry with display value */
  rejectionReason?: CatalogEntry
}
