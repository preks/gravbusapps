/**
 * Common Communication Channel Fragment (REF)
 *
 * Base communication channel fields shared between CRM and IRM.
 * Does NOT include entity relations to avoid recursive loops.
 * Catalog entries are always safe to include.
 */

import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'

/**
 * COMMUNICATION_CHANNEL_REF
 * Core fields with catalog entries, no entity relations
 */
export const COMMUNICATION_CHANNEL_REF = `
  id
  value
  valueExtension
  ${AUDIT_FIELDS}
  
  communicationChannel {
    ${CATALOG_ENTRY}
  }
  communicationChannelRef
`
