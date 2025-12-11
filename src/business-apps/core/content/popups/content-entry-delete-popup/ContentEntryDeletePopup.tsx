import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Alert, Spinner } from '@newwork/nw-design-system'
import { AlertTriangle } from 'lucide-react'
import { AppActionForm } from '@/components/app-action-form'
import { useContentEntry } from '@/common/data/content/hooks/useContentEntry'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface ContentEntryDeletePopupProps extends BusinessAppContextProps {
  onClose: () => void

  onSuccess?: () => void
  onError?: (error: any) => void

  'data-testid'?: string
}

/**
 * ContentEntryDeletePopup
 * Delete confirmation popup for content entries using AppActionForm
 * - Loads content entry to get title and version
 * - Shows confirmation message with content entry name
 * - Submits contentEntry object with id and version in payload
 */
export const ContentEntryDeletePopup: React.FC<ContentEntryDeletePopupProps> = ({
  onClose,
  accessToken,
  additionalData,
  onSuccess,
  'data-testid': dataTestId = 'content-entry-delete-popup'
}) => {
  // Extract contentEntryId from additionalData
  const contentEntryId =
    additionalData?.contentEntryId || additionalData?.psi_taskPayload?.psi_initialParameters?.contentEntryId

  // Memoize query options to prevent infinite re-renders
  const queryOptions = useMemo(
    () => ({
      fields: ['id', 'title', 'version'] as Array<'id' | 'title' | 'version'>
    }),
    []
  )

  // Load content entry to get title and version
  const { entry, isLoading, error } = useContentEntry(contentEntryId || '', {
    accessToken,
    queryOptions
  })

  // Handle form submission
  const handleSubmit = async () => {
    if (!entry || !entry.id) {
      throw new Error('Content entry not loaded')
    }

    // Return payload with contentEntry object containing id and version (exactly as from response)
    return {
      contentEntry: {
        id: entry.id,
        ...(entry.version !== undefined && entry.version !== null ? { version: entry.version } : {})
      }
    }
  }

  // Handle process completion
  const handleProcessCompletion = () => {
    if (onSuccess) {
      onSuccess()
    }
    onClose()
  }

  // Validate contentEntryId exists
  if (!contentEntryId) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" data-testid={`${dataTestId}-missing-id`}>
          {getTranslationFromI18nKeyAndLabel(
            'content.delete.missingId',
            'Content entry ID not found. Cannot delete content entry.'
          )}
        </Alert>
      </div>
    )
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-8" data-testid={`${dataTestId}-loading`}>
        <Spinner size="lg" />
        <span className="gba:ml-2">
          {getTranslationFromI18nKeyAndLabel('content.loading', 'Loading content entry...')}
        </span>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" data-testid={`${dataTestId}-error`}>
          {getTranslationFromI18nKeyAndLabel('content.delete.error', 'Failed to load content entry. Please try again.')}
        </Alert>
      </div>
    )
  }

  // Return null if entry not found
  if (!entry) {
    return null
  }

  const contentEntryTitle = entry.title || getTranslationFromI18nKeyAndLabel('content.unknown', 'Unknown')

  return (
    <AppActionForm
      processType="delete"
      onSubmit={handleSubmit}
      onCancel={onClose}
      formData={{}}
      onProcessCompletion={handleProcessCompletion}
      submitButtonText={getTranslationFromI18nKeyAndLabel('common.delete', 'Delete')}
      submitButtonVariant="destructive"
      cancelButtonText={getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
      data-testid={`${dataTestId}-form`}
    >
      <div className="gba:space-y-4" data-testid={`${dataTestId}-content`}>
        {/* Warning Icon and Message */}
        <div className="gba:flex gba:items-center gba:gap-3 gba:p-4 gba:bg-destructive/10 gba:rounded-lg gba:border gba:border-destructive/20">
          <div className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-full gba:bg-destructive/20">
            <AlertTriangle className="gba:w-5 gba:h-5 gba:text-destructive" />
          </div>
          <div className="gba:flex-1">
            <p className="gba:text-sm gba:font-medium gba:text-foreground">
              {`Are you sure you want to delete ${contentEntryTitle}?`}
            </p>
          </div>
        </div>

        {/* Warning Text */}
        <Alert variant="destructive" data-testid={`${dataTestId}-warning`}>
          <AlertTriangle className="gba:h-4 gba:w-4" />
          <div>
            <p className="gba:font-medium gba:mb-1">
              {getTranslationFromI18nKeyAndLabel('content.delete.warning', 'This action cannot be undone')}
            </p>
            <p className="gba:text-sm">
              {getTranslationFromI18nKeyAndLabel(
                'content.delete.warningDescription',
                'The content entry and all its data will be permanently deleted.'
              )}
            </p>
          </div>
        </Alert>
      </div>
    </AppActionForm>
  )
}

export default ContentEntryDeletePopup
