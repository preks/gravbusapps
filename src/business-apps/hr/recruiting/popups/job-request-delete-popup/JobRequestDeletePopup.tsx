import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Alert, Spinner } from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form'
import { DeleteLayout } from '@/components/delete-layout'
import { useJobRequest } from '@/common/data/recruiting/hooks/useJobRequest'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface JobRequestDeletePopupProps extends BusinessAppContextProps {
  onClose: () => void

  onSuccess?: () => void

  'data-testid'?: string
}

/**
 * JobRequestDeletePopup
 * Delete confirmation popup for job requests using AppActionForm and DeleteLayout
 * - Loads job request to get name and version
 * - Shows confirmation message with job request name
 * - Submits jobRequest object with id and version in payload
 */
export const JobRequestDeletePopup: React.FC<JobRequestDeletePopupProps> = ({
  onClose,
  accessToken,
  additionalData,
  onSuccess,
  'data-testid': dataTestId = 'job-request-delete-popup'
}) => {
  // Extract jobRequestId from additionalData
  const jobRequestId =
    additionalData?.jobRequestId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.jobRequestId ||
    additionalData?.id

  // Load job request to get name and version
  const { jobRequest, loading, error } = useJobRequest(accessToken || '', jobRequestId, 'record')

  // Handle form submission
  const handleSubmit = async () => {
    if (!jobRequest || !jobRequest.id) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel('recruiting.jobRequest.delete.error.noData', 'Job request data not loaded')
      )
    }

    // Return payload with jobRequest object containing id and version
    return {
      jobRequest: {
        id: jobRequest.id,
        ...(jobRequest.version !== null && jobRequest.version !== undefined ? { version: jobRequest.version } : {}),
        isDeleted: true
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

  // Validate jobRequestId exists
  if (!jobRequestId) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" data-testid={`${dataTestId}-missing-id`}>
          {getTranslationFromI18nKeyAndLabel(
            'recruiting.jobRequest.delete.missingId',
            'Job request ID not found. Cannot delete job request.'
          )}
        </Alert>
      </div>
    )
  }

  // Show loading state
  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-8" data-testid={`${dataTestId}-loading`}>
        <Spinner size="lg" />
        <span className="gba:ml-2">
          {getTranslationFromI18nKeyAndLabel('recruiting.jobRequest.delete.loading', 'Loading job request...')}
        </span>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" data-testid={`${dataTestId}-error`}>
          {getTranslationFromI18nKeyAndLabel(
            'recruiting.jobRequest.delete.error',
            'Failed to load job request. Please try again.'
          )}
        </Alert>
      </div>
    )
  }

  // Return null if job request not found
  if (!jobRequest) {
    return null
  }

  const jobRequestTitle =
    jobRequest.name || getTranslationFromI18nKeyAndLabel('recruiting.jobRequest.unnamed', 'Unnamed Job Request')
  const itemType = getTranslationFromI18nKeyAndLabel('recruiting.jobRequest', 'Job Request')

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
      <DeleteLayout itemType={itemType} itemTitle={jobRequestTitle} data-testid={dataTestId} />
    </AppActionForm>
  )
}

export default JobRequestDeletePopup
