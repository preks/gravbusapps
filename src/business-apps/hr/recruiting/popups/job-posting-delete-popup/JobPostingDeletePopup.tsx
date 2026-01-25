import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Alert, Spinner } from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form'
import { DeleteLayout } from '@/components/delete-layout'
import { useJobPosting } from '@/common/data/recruiting/hooks/useJobPosting'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface JobPostingDeletePopupProps extends BusinessAppContextProps {
  onClose: () => void

  onSuccess?: () => void

  'data-testid'?: string
}

export const JobPostingDeletePopup: React.FC<JobPostingDeletePopupProps> = ({
  onClose,
  accessToken,
  additionalData,
  onSuccess,
  'data-testid': dataTestId = 'job-posting-delete-popup'
}) => {
  const jobPostingId =
    additionalData?.jobPostingId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.jobPostingId ||
    additionalData?.id

  const { jobPosting, loading, error } = useJobPosting(accessToken || '', jobPostingId, 'record')

  const handleSubmit = async () => {
    if (!jobPosting || !jobPosting.id) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel('recruiting.jobPosting.delete.error.noData', 'Job posting data not loaded')
      )
    }

    return {
      jobPosting: {
        id: jobPosting.id,
        ...(jobPosting.version != null ? { version: jobPosting.version } : {}),
        isDeleted: true
      }
    }
  }

  const handleProcessCompletion = () => {
    if (onSuccess) {
      onSuccess()
    }
    onClose()
  }

  if (!jobPostingId) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" data-testid={`${dataTestId}-missing-id`}>
          {getTranslationFromI18nKeyAndLabel(
            'recruiting.jobPosting.delete.missingId',
            'Job posting ID not found. Cannot delete job posting.'
          )}
        </Alert>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-8" data-testid={`${dataTestId}-loading`}>
        <Spinner size="lg" />
        <span className="gba:ml-2">
          {getTranslationFromI18nKeyAndLabel('recruiting.jobPosting.delete.loading', 'Loading job posting...')}
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" data-testid={`${dataTestId}-error`}>
          {getTranslationFromI18nKeyAndLabel(
            'recruiting.jobPosting.delete.error',
            'Failed to load job posting. Please try again.'
          )}
        </Alert>
      </div>
    )
  }

  if (!jobPosting) {
    return null
  }

  const jobPostingTitle =
    jobPosting.title || getTranslationFromI18nKeyAndLabel('recruiting.jobPosting.unnamed', 'Unnamed Job Posting')
  const itemType = getTranslationFromI18nKeyAndLabel('recruiting.jobPosting', 'Job Posting')

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
      <DeleteLayout itemType={itemType} itemTitle={jobPostingTitle} data-testid={dataTestId} />
    </AppActionForm>
  )
}

export default JobPostingDeletePopup
