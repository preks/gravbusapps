/**
 * usePublishing Hook
 *
 * Reusable hook for publishing workflow across Documents, Notes, and Spreadsheets.
 * Manages draft/in-review/published/archived status transitions.
 *
 * NOTE: This requires backend publishing endpoints to be implemented first.
 */

import { useState, useCallback } from 'react'
import type { PublishStatus, PublishMetadata, PublishInput } from '../types/versioning'

export interface UsePublishingOptions {
  entityId: string
  entityType: 'document' | 'note' | 'spreadsheet_app'
  currentStatus?: PublishStatus
  apiService?: {
    publish: (id: string, input?: PublishInput) => Promise<PublishMetadata | null>
    unpublish: (id: string) => Promise<boolean>
    updateStatus: (id: string, status: PublishStatus) => Promise<PublishMetadata | null>
  }
  onPublished?: (metadata: PublishMetadata) => void
  onUnpublished?: () => void
  onStatusChanged?: (status: PublishStatus) => void
  onError?: (error: Error) => void
}

export interface UsePublishingState {
  metadata: PublishMetadata | null
  isPublishing: boolean
  isUnpublishing: boolean
  isUpdating: boolean
  error: string | null
}

export interface UsePublishingActions {
  publish: (publishNotes?: string, createCheckpoint?: boolean) => Promise<boolean>
  unpublish: () => Promise<boolean>
  updateStatus: (status: PublishStatus) => Promise<boolean>
  moveToReview: () => Promise<boolean>
  archive: () => Promise<boolean>
  unarchive: () => Promise<boolean>
  clearError: () => void
}

export interface UsePublishingReturn extends UsePublishingState, UsePublishingActions {}

/**
 * Hook for managing publishing workflow
 *
 * TODO: Implement once backend publishing API is ready
 */
export function usePublishing(options: UsePublishingOptions): UsePublishingReturn {
  const {
    entityId,
    currentStatus = 'draft',
    apiService,
    onPublished,
    onUnpublished,
    onStatusChanged,
    onError
  } = options

  // State
  const [state, setState] = useState<UsePublishingState>({
    metadata: {
      status: currentStatus
    },
    isPublishing: false,
    isUnpublishing: false,
    isUpdating: false,
    error: null
  })

  /**
   * Publish the document/note/spreadsheet
   */
  const publish = useCallback(
    async (publishNotes?: string, createCheckpoint = true): Promise<boolean> => {
      if (!apiService) {
        console.warn('[usePublishing] Backend API not yet implemented')
        return false
      }

      setState(prev => ({ ...prev, isPublishing: true, error: null }))

      try {
        const metadata = await apiService.publish(entityId, {
          publishNotes,
          createCheckpoint
        })

        if (metadata) {
          setState(prev => ({
            ...prev,
            metadata,
            isPublishing: false
          }))

          if (onPublished) {
            onPublished(metadata)
          }

          if (onStatusChanged) {
            onStatusChanged(metadata.status)
          }

          return true
        }

        setState(prev => ({ ...prev, isPublishing: false }))
        return false
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to publish'
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isPublishing: false
        }))

        if (onError) {
          onError(error instanceof Error ? error : new Error(errorMessage))
        }

        return false
      }
    },
    [entityId, apiService, onPublished, onStatusChanged, onError]
  )

  /**
   * Unpublish (revert to draft)
   */
  const unpublish = useCallback(async (): Promise<boolean> => {
    if (!apiService) {
      console.warn('[usePublishing] Backend API not yet implemented')
      return false
    }

    setState(prev => ({ ...prev, isUnpublishing: true, error: null }))

    try {
      const success = await apiService.unpublish(entityId)

      if (success) {
        setState(prev => ({
          ...prev,
          metadata: { status: 'draft' },
          isUnpublishing: false
        }))

        if (onUnpublished) {
          onUnpublished()
        }

        if (onStatusChanged) {
          onStatusChanged('draft')
        }
      } else {
        setState(prev => ({ ...prev, isUnpublishing: false }))
      }

      return success
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to unpublish'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isUnpublishing: false
      }))

      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage))
      }

      return false
    }
  }, [entityId, apiService, onUnpublished, onStatusChanged, onError])

  /**
   * Update status to any value
   */
  const updateStatus = useCallback(
    async (status: PublishStatus): Promise<boolean> => {
      if (!apiService) {
        console.warn('[usePublishing] Backend API not yet implemented')
        return false
      }

      setState(prev => ({ ...prev, isUpdating: true, error: null }))

      try {
        const metadata = await apiService.updateStatus(entityId, status)

        if (metadata) {
          setState(prev => ({
            ...prev,
            metadata,
            isUpdating: false
          }))

          if (onStatusChanged) {
            onStatusChanged(status)
          }

          return true
        }

        setState(prev => ({ ...prev, isUpdating: false }))
        return false
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update status'
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isUpdating: false
        }))

        if (onError) {
          onError(error instanceof Error ? error : new Error(errorMessage))
        }

        return false
      }
    },
    [entityId, apiService, onStatusChanged, onError]
  )

  /**
   * Move to review status
   */
  const moveToReview = useCallback(async (): Promise<boolean> => {
    return await updateStatus('in_review')
  }, [updateStatus])

  /**
   * Archive the document/note/spreadsheet
   */
  const archive = useCallback(async (): Promise<boolean> => {
    return await updateStatus('archived')
  }, [updateStatus])

  /**
   * Unarchive (revert to previous status or draft)
   */
  const unarchive = useCallback(async (): Promise<boolean> => {
    return await updateStatus('draft')
  }, [updateStatus])

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    // State
    ...state,

    // Actions
    publish,
    unpublish,
    updateStatus,
    moveToReview,
    archive,
    unarchive,
    clearError
  }
}
