import { useState, useCallback } from 'react'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

export interface DeleteConfirmConfig {
  /** The title of the item being deleted */
  itemTitle: string

  /** The type of item being deleted (e.g., "document", "activity", "note", "contact") */
  itemType: string

  /** Custom confirmation message (optional) */
  customMessage?: string

  /** Additional warning text (optional) */
  warningText?: string

  /** Custom button text for confirm action (default: "Delete") */
  confirmButtonText?: string

  /** Custom button text for cancel action (default: "Cancel") */
  cancelButtonText?: string

  /** Data test ID prefix for testing */
  'data-testid'?: string

  // Flow Registry Configuration (Recommended)

  /** Access token for Flow Registry authentication */
  accessToken?: string

  /** Flow context name for the entity (e.g., customerActivityEntity, investmentActivityEntity) */
  flowContextName?: FlowContextName

  /** External context data to pass to the Flow Registry (e.g., { activityId: '123', leadId: '456' }) */
  externalContextData?: Record<string, any>

  /** Callback when Flow Registry deletion is successful */
  onFlowSuccess?: () => void

  /** Callback when Flow Registry deletion fails */
  onFlowError?: (error: any) => void

  // Legacy Configuration (Not recommended for new code)

  /** Function to call when delete is confirmed (legacy mode) */
  onConfirm?: () => void | Promise<void>
}

export interface UseDeleteConfirmReturn {
  /** Whether the delete confirmation popup is open */
  isOpen: boolean

  /** Whether a delete operation is currently in progress */
  isLoading: boolean

  /** Configuration for the delete confirmation popup */
  config: DeleteConfirmConfig | null

  /** Function to show the delete confirmation popup */
  showDeleteConfirm: (config: DeleteConfirmConfig) => void

  /** Function to close the delete confirmation popup */
  closeDeleteConfirm: () => void

  /** Function to handle the delete confirmation (used internally by the popup) */
  handleDeleteConfirm: () => Promise<void>
}

/**
 * Hook for managing delete confirmation popups
 *
 * @example
 * ```tsx
 * const {
 *   isOpen,
 *   isLoading,
 *   config,
 *   showDeleteConfirm,
 *   closeDeleteConfirm,
 *   handleDeleteConfirm
 * } = useDeleteConfirm();
 *
 * const handleDeleteActivity = (activity) => {
 *   showDeleteConfirm({
 *     itemTitle: activity.title,
 *     itemType: 'activity',
 *     onConfirm: async () => {
 *       await deleteActivity(activity.id);
 *       message.success('Activity deleted successfully');
 *     }
 *   });
 * };
 *
 * return (
 *   <>
 *     <Button onClick={() => handleDeleteActivity(activity)}>Delete</Button>
 *
 *     {config && (
 *       <DeleteConfirmPopup
 *         isOpen={isOpen}
 *         isLoading={isLoading}
 *         onClose={closeDeleteConfirm}
 *         onConfirm={handleDeleteConfirm}
 *         {...config}
 *       />
 *     )}
 *   </>
 * );
 * ```
 */
export const useDeleteConfirm = (): UseDeleteConfirmReturn => {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [config, setConfig] = useState<DeleteConfirmConfig | null>(null)

  const showDeleteConfirm = useCallback((newConfig: DeleteConfirmConfig) => {
    setConfig(newConfig)
    setIsOpen(true)
  }, [])

  const closeDeleteConfirm = useCallback(() => {
    if (!isLoading) {
      setIsOpen(false)
      setConfig(null)
    }
  }, [isLoading])

  const handleDeleteConfirm = useCallback(async () => {
    // Only used in legacy mode - Flow Registry mode handles this through AppAction
    if (!config?.onConfirm || isLoading) {
      return
    }

    setIsLoading(true)
    try {
      await config.onConfirm()
      // Close the popup after successful deletion
      setIsOpen(false)
      setConfig(null)
    } catch (error) {
      // Don't close the popup on error - let the parent handle error display
      console.error('Delete confirmation error:', error)
      throw error // Re-throw so parent can handle
    } finally {
      setIsLoading(false)
    }
  }, [config, isLoading])

  return {
    isOpen,
    isLoading,
    config,
    showDeleteConfirm,
    closeDeleteConfirm,
    handleDeleteConfirm
  }
}

export default useDeleteConfirm
