import React, { useState, useMemo, useCallback } from 'react'
import { ActionOption } from '@newwork/nw-design-system'
import { Share2 } from 'lucide-react'
import { ShareEntityDialog, ShareEntityConfig } from './ShareEntityDialog'

export interface UseShareActionProps {
  /** Access token for API calls */
  accessToken: string
  /** Current user's ID (from userInfo) */
  currentUserId: string
  /** Entity configuration */
  entity: ShareEntityConfig
  /** Custom label for the action (default: "Share via Blink") */
  label?: string
}

export interface UseShareActionReturn {
  /** Static action to add to AppActionButton's staticFlowData */
  shareAction: ActionOption
  /** The ShareEntityDialog component - render this in your component */
  ShareDialog: React.ReactNode
  /** Function to programmatically open the share dialog */
  openShareDialog: () => void
  /** Function to programmatically close the share dialog */
  closeShareDialog: () => void
  /** Whether the dialog is currently open */
  isShareDialogOpen: boolean
}

/**
 * Hook to easily add share functionality to any entity record page
 *
 * @example
 * ```tsx
 * // In your record component:
 * const { shareAction, ShareDialog } = useShareAction({
 *   accessToken,
 *   currentUserId: userInfo?.id || '',
 *   entity: {
 *     entityType: 'lead',
 *     entityId: leadId,
 *     entityName: lead.name,
 *     entityUrl: `/platform/crm/lead-record?leadId=${leadId}`
 *   }
 * })
 *
 * // Add shareAction to AppActionButton:
 * <AppActionButton
 *   staticFlowData={[shareAction]}
 *   // ... other props
 * >
 *   Sharing
 * </AppActionButton>
 *
 * // Render the dialog somewhere in your component:
 * {ShareDialog}
 * ```
 */
export const useShareAction = ({
  accessToken,
  currentUserId,
  entity,
  label = 'Share via Blink'
}: UseShareActionProps): UseShareActionReturn => {
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)

  const openShareDialog = useCallback(() => {
    setIsShareDialogOpen(true)
  }, [])

  const closeShareDialog = useCallback(() => {
    setIsShareDialogOpen(false)
  }, [])

  // Create the share action for AppActionButton
  const shareAction: ActionOption = useMemo(
    () => ({
      key: `share-${entity.entityType}-${entity.entityId}`,
      label,
      icon: <Share2 className="gba:w-4 gba:h-4" />,
      onClick: openShareDialog,
      category: 'Sharing'
    }),
    [entity.entityType, entity.entityId, label, openShareDialog]
  )

  // Create the dialog component
  const ShareDialog = useMemo(
    () => (
      <ShareEntityDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        accessToken={accessToken}
        currentUserId={currentUserId}
        entity={entity}
      />
    ),
    [isShareDialogOpen, accessToken, currentUserId, entity]
  )

  return {
    shareAction,
    ShareDialog,
    openShareDialog,
    closeShareDialog,
    isShareDialogOpen
  }
}

export default useShareAction
