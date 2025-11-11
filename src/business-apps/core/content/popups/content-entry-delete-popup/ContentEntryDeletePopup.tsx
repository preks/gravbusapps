import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DeleteConfirmPopup } from '@/common/components/common-relations/popups/delete-confirm-popup'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

export interface ContentEntryDeletePopupProps extends BusinessAppContextProps {
  isOpen: boolean
  onClose: () => void
  contentEntryId: string
  contentEntryTitle: string
  contentEntryVersion?: number

  onSuccess?: () => void
  onError?: (error: any) => void

  'data-testid'?: string
}

/**
 * ContentEntryDeletePopup
 * Thin wrapper around the universal DeleteConfirmPopup configured for Content Entries.
 * - Routes delete through Flow Registry with contentEntryDelete context
 * - Passes contentEntryId into externalContextData
 */
export const ContentEntryDeletePopup: React.FC<ContentEntryDeletePopupProps> = ({
  isOpen,
  onClose,
  contentEntryId,
  contentEntryTitle,
  contentEntryVersion,
  accessToken,
  onSuccess,
  onError,
  'data-testid': dataTestId = 'content-entry-delete-popup'
}) => {
  const externalContextData: Record<string, any> = {
    contentEntryId,
    contentEntry: {
      id: contentEntryId,
      ...(typeof contentEntryVersion === 'number' ? { version: contentEntryVersion } : {})
    }
  }

  return (
    <DeleteConfirmPopup
      isOpen={isOpen}
      onClose={onClose}
      itemTitle={contentEntryTitle}
      itemType="content entry"
      accessToken={accessToken}
      flowContextName={FlowContextName.contentEntryDelete}
      externalContextData={externalContextData}
      onFlowSuccess={onSuccess}
      onFlowError={onError}
      data-testid={dataTestId}
    />
  )
}

export default ContentEntryDeletePopup
