import React, { useState, useMemo, useCallback } from 'react'
import { ActionOption } from '@newwork/nw-design-system'
import { Share2 } from 'lucide-react'
import { ShareEntityDialog, ShareEntityConfig } from './ShareEntityDialog'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'

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
  /** Static action to add to AppActionButton's staticFlowData (null when feature disabled) */
  shareAction: ActionOption | null
  /** The ShareEntityDialog component - render this in your component (null when feature disabled) */
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

  // Feature flag check - Share via Blink available when preview.enabled is true or undefined (development)
  const previewFeature = useFeature(Feature.Preview.Enabled.Key)
  const previewEnabled = previewFeature !== false // true if undefined (development) or 'true'

  const openShareDialog = useCallback(() => {
    if (previewEnabled) {
      setIsShareDialogOpen(true)
    }
  }, [previewEnabled])

  const closeShareDialog = useCallback(() => {
    setIsShareDialogOpen(false)
  }, [])

  // Create the share action for AppActionButton (null when feature disabled)
  const shareAction: ActionOption | null = useMemo(
    () =>
      previewEnabled
        ? {
            key: `share-${entity.entityType}-${entity.entityId}`,
            label,
            icon: <Share2 className="gba:w-4 gba:h-4" />,
            onClick: openShareDialog,
            category: 'Sharing'
          }
        : null,
    [entity.entityType, entity.entityId, label, openShareDialog, previewEnabled]
  )

  // Create the dialog component (null when feature disabled)
  const ShareDialog = useMemo(
    () =>
      previewEnabled ? (
        <ShareEntityDialog
          open={isShareDialogOpen}
          onOpenChange={setIsShareDialogOpen}
          accessToken={accessToken}
          currentUserId={currentUserId}
          entity={entity}
        />
      ) : null,
    [isShareDialogOpen, accessToken, currentUserId, entity, previewEnabled]
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
