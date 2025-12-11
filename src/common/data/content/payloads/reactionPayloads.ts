/**
 * Payload builders for content entry reactions
 */

export interface BuildReactionPayloadParams {
  contentEntryId: string
  catalogEntryId: string
  employeeId: string
  existingReactionId?: string
  existingCatalogEntryId?: string // The catalog entry ID of the user's current reaction
  existingVersion?: number // The version from the database
}

/**
 * Build payload for inserting a new reaction
 */
export const buildInsertReactionPayload = (params: BuildReactionPayloadParams) => {
  return {
    changeMode: 'INSERT',
    contentEntryReaction: {
      contentEntry: params.contentEntryId,
      contentReactionRef: params.catalogEntryId,
      creatorEmployee: params.employeeId
    }
  }
}

/**
 * Build payload for updating an existing reaction
 * If user clicks the same emoji again, set contentReactionRef to empty string (remove reaction)
 * If user clicks a different emoji, set contentReactionRef to the new catalogEntryId (change reaction)
 */
export const buildUpdateReactionPayload = (params: BuildReactionPayloadParams) => {
  if (!params.existingReactionId) {
    throw new Error('existingReactionId is required for UPDATE')
  }

  if (params.existingVersion === undefined || params.existingVersion === null) {
    throw new Error('existingVersion is required for UPDATE')
  }

  // If user clicks the same emoji they already have, remove it (empty string)
  // Otherwise, change to the new emoji
  const isSameEmoji = params.existingCatalogEntryId === params.catalogEntryId
  const contentReactionRef = isSameEmoji ? '' : params.catalogEntryId

  return {
    changeMode: 'UPDATE',
    contentEntryReaction: {
      id: params.existingReactionId,
      version: params.existingVersion,
      contentReactionRef
    }
  }
}

/**
 * Build reaction payload based on whether user already has a reaction
 */
export const buildReactionPayload = (params: BuildReactionPayloadParams) => {
  if (params.existingReactionId) {
    return buildUpdateReactionPayload(params)
  } else {
    return buildInsertReactionPayload(params)
  }
}
