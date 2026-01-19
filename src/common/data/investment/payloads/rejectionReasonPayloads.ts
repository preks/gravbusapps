/**
 * Rejection Reason Payloads
 * Payload builders for investment rejection reasons (leads, opportunities)
 * Rejection reasons are managed via the rejectInvestmentProspect backend process
 */

export type RejectionReasonEntityType = 'LEAD' | 'OPPORTUNITY'

/**
 * Form data collected from the rejection reason form
 */
export interface RejectionReasonFormData {
  reasonRefs: string[]
}

/**
 * Existing rejection reason with ID and version (for updates)
 */
export interface ExistingRejectionReason {
  id: string
  version: number
  rejectionReasonRef: string
  description?: string
}

/**
 * Options for building the rejection reason payload
 */
export interface BuildRejectionReasonPayloadOptions {
  entityId: string
  entityVersion: number
  entityType: RejectionReasonEntityType
  formData: RejectionReasonFormData
  existingReasons: ExistingRejectionReason[]
  hasExistingReasons: boolean
}

/**
 * Build rejection reason payload matching RejectInvestmentProspectModelInput structure
 *
 * This payload is used by the rejectInvestmentProspect backend process to:
 * - Add rejection reasons to leads/opportunities
 * - Update existing rejection reasons
 * - Remove rejection reasons (unreject) by sending empty array
 *
 * @param options - Configuration options for building the payload
 * @returns Payload for rejecting/unrejecting investment prospects
 */
export const buildRejectionReasonPayload = (options: BuildRejectionReasonPayloadOptions) => {
  const { entityId, entityVersion, entityType, formData, existingReasons, hasExistingReasons } = options

  // Build rejection reasons array - Send ONLY selected items (with IDs for existing ones)
  // Backend detects deletions by comparing sent items vs DB
  const rejectionReasons = formData.reasonRefs.map(reasonRef => {
    // Find existing rejection reason for this reasonRef
    const existing = existingReasons.find(r => r.rejectionReasonRef === reasonRef)

    if (existing) {
      // Existing association - include ID and version
      return {
        id: existing.id,
        version: existing.version,
        rejectionReasonRef: reasonRef,
        description: existing.description || ''
      }
    }

    // New association - no ID/version needed for new items
    return {
      rejectionReasonRef: reasonRef,
      description: ''
    }
  })

  // Transform to match RejectInvestmentProspectModelInput structure
  return {
    investmentProspect: {
      id: entityId,
      version: entityVersion,
      type: entityType === 'LEAD' ? 'LEAD_PROSPECT_TYPE' : 'OPPORTUNITY_PROSPECT_TYPE',
      rejectionReasons: rejectionReasons
    },
    changeMode: hasExistingReasons ? 'REPLACE' : 'UPSERT'
  }
}
