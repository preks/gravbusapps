import React, { useEffect, useRef } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Spinner
} from '@newwork/nw-design-system'
import { AlertTriangleIcon } from 'lucide-react'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

export interface DeleteConfirmPopupProps {
  /** Whether the popup is visible */
  isOpen: boolean

  /** Function to call when popup should be closed */
  onClose: () => void

  /** The title of the item being deleted */
  itemTitle: string

  /** The type of item being deleted (e.g., "document", "activity", "note", "contact") */
  itemType: string

  /** Custom dialog title (optional, will generate "Delete {ItemType}" if not provided) */
  customTitle?: string

  /** Custom confirmation message (optional, will generate default if not provided) */
  customMessage?: string

  /** Additional warning text (optional) */
  warningText?: string

  /** Custom button text for confirm action (default: "Delete") */
  confirmButtonText?: string

  /** Custom button text for cancel action (default: "Cancel") */
  cancelButtonText?: string

  /** Data test ID prefix for testing */
  'data-testid'?: string

  // Flow Registry Configuration (Use this for Flow Registry-based deletion)

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

  // Legacy API Configuration (Use this for direct API calls - not recommended for new code)

  /** Whether the delete operation is currently in progress (legacy mode) */
  isLoading?: boolean

  /** Function to call when delete is confirmed (legacy mode) */
  onConfirm?: () => void | Promise<void>
}

export const DeleteConfirmPopup: React.FC<DeleteConfirmPopupProps> = ({
  isOpen,
  onClose,
  itemTitle,
  itemType,
  customTitle,
  customMessage,
  warningText = 'This action cannot be undone.',
  confirmButtonText = 'Delete',
  cancelButtonText = 'Cancel',
  'data-testid': dataTestId = 'delete-confirm-popup',
  // Flow Registry props
  accessToken,
  flowContextName,
  externalContextData,
  onFlowSuccess,
  onFlowError,
  // Legacy props
  isLoading = false,
  onConfirm
}) => {
  const defaultTitle = `Delete ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`
  const displayTitle = customTitle || defaultTitle
  const defaultMessage = `Are you sure you want to delete the ${itemType} "${itemTitle}"?`
  const displayMessage = customMessage || defaultMessage

  // Determine if we're using Flow Registry or legacy mode
  const isFlowRegistryMode = Boolean(accessToken && flowContextName)

  const handleLegacyConfirm = async () => {
    if (!onConfirm) return
    try {
      await onConfirm()
    } catch (error) {
      // Error handling should be done in the parent component
      console.error('Delete confirmation error:', error)
    }
  }

  const handleFlowProcessCompletion = () => {
    // Flow completed successfully
    if (onFlowSuccess) {
      onFlowSuccess()
    }
    onClose() // Close the popup
  }

  const handleFlowProcessError = (error: any) => {
    // Flow failed
    if (onFlowError) {
      onFlowError(error)
    }
    // Don't close popup on error, let user try again or manually close
  }

  // Close the dialog automatically when a process completes successfully
  // This mirrors how other timelines listen for completion events
  const hasHandledRef = useRef(false)
  useEffect(() => {
    if (!isFlowRegistryMode || !isOpen) {
      return
    }

    hasHandledRef.current = false

    const onAnyProcessCompletion = (event: any) => {
      try {
        if (hasHandledRef.current) return
        const resolution = event?.detail?.resolution
        if (resolution === 'success') {
          hasHandledRef.current = true
          handleFlowProcessCompletion()
        }
      } catch {
        // no-op
      }
    }

    const eventNames = [
      'com.newwork.process.taskCompletion',
      'com.newwork.process.completion',
      'com.newwork.process.continue',
      'com.newwork.process.processCompletion',
      'processCompletion',
      'taskCompletion',
      'taskCompleted',
      'processCompleted',
      'task-completion',
      'process-completion'
    ]

    eventNames.forEach(name => window.addEventListener(name, onAnyProcessCompletion as EventListener))
    return () => {
      eventNames.forEach(name => window.removeEventListener(name, onAnyProcessCompletion as EventListener))
    }
  }, [isFlowRegistryMode, isOpen])

  return (
    <AlertDialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <AlertDialogContent data-testid={dataTestId}>
        <AlertDialogHeader>
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-full gba:bg-red-100">
              <AlertTriangleIcon
                className="gba:w-5 gba:h-5 gba:text-red-600"
                data-testid={`${dataTestId}-warning-icon`}
              />
            </div>
            <AlertDialogTitle data-testid={`${dataTestId}-title`}>{displayTitle}</AlertDialogTitle>
          </div>
        </AlertDialogHeader>

        <AlertDialogDescription>
          <div>
            <p className="gba:text-gray-700 gba:mb-2" data-testid={`${dataTestId}-message`}>
              {displayMessage}
            </p>
            {warningText && (
              <p className="gba:text-sm gba:text-red-600 gba:font-medium" data-testid={`${dataTestId}-warning`}>
                {warningText}
              </p>
            )}
          </div>
        </AlertDialogDescription>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isLoading} data-testid={`${dataTestId}-cancel-button`}>
            {cancelButtonText}
          </AlertDialogCancel>

          {/* Flow Registry Mode - Use AppAction for delete */}
          {isFlowRegistryMode ? (
            <AppAction
              contextsArray={[flowContextName!]}
              externalContextData={externalContextData}
              accessToken={accessToken!}
              emptyStateBehavior="enable"
              deferMainContextRequestsUntilClick
              onProcessCompletion={handleFlowProcessCompletion}
              onProcessError={handleFlowProcessError}
              data-testid={`${dataTestId}-confirm-action`}
            >
              <AlertDialogAction
                className="gba:bg-red-600 gba:hover:bg-red-700"
                data-testid={`${dataTestId}-confirm-button`}
              >
                {confirmButtonText}
              </AlertDialogAction>
            </AppAction>
          ) : (
            /* Legacy Mode - Direct function call */
            <AlertDialogAction
              className="gba:bg-red-600 gba:hover:bg-red-700"
              onClick={handleLegacyConfirm}
              disabled={isLoading}
              data-testid={`${dataTestId}-confirm-button`}
            >
              {isLoading && <Spinner className="gba:w-4 gba:h-4 gba:mr-2" />}
              {confirmButtonText}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default DeleteConfirmPopup
