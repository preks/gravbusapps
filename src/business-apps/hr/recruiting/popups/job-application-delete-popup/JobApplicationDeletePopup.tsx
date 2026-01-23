import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Alert, Spinner } from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form'
import { DeleteLayout } from '@/components/delete-layout'
import { useJobApplication } from '@/common/data/recruiting/hooks/useJobApplication'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface JobApplicationDeletePopupProps extends BusinessAppContextProps {
  onClose: () => void

  onSuccess?: () => void
  onError?: (error: any) => void

  'data-testid'?: string
}

export const JobApplicationDeletePopup: React.FC<JobApplicationDeletePopupProps> = ({
  onClose,
  accessToken,
  additionalData,
  onSuccess,
  'data-testid': dataTestId = 'job-application-delete-popup'
}) => {
  const jobApplicationId =
    additionalData?.jobApplicationId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.jobApplicationId ||
    additionalData?.id

  const { jobApplication, loading, error } = useJobApplication(accessToken || '', jobApplicationId, 'record')

  const handleSubmit = async () => {
    if (!jobApplication || !jobApplication.id) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel(
          'recruiting.jobApplication.delete.error.noData',
          'Job application data not loaded'
        )
      )
    }

    return {
      jobApplication: {
        id: jobApplication.id,
        ...(jobApplication.version !== undefined && jobApplication.version !== null
          ? { version: jobApplication.version }
          : {}),
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

  if (!jobApplicationId) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" data-testid={`${dataTestId}-missing-id`}>
          {getTranslationFromI18nKeyAndLabel(
            'recruiting.jobApplication.delete.missingId',
            'Job application ID not found. Cannot delete job application.'
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
          {getTranslationFromI18nKeyAndLabel('recruiting.jobApplication.delete.loading', 'Loading job application...')}
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" data-testid={`${dataTestId}-error`}>
          {getTranslationFromI18nKeyAndLabel(
            'recruiting.jobApplication.delete.error',
            'Failed to load job application. Please try again.'
          )}
        </Alert>
      </div>
    )
  }

  if (!jobApplication) {
    return null
  }

  const jobApplicationTitle = jobApplication.jobCandidate
    ? jobApplication.jobCandidate.displayName ||
      `${jobApplication.jobCandidate.firstName || ''} ${jobApplication.jobCandidate.lastName || ''}`.trim() ||
      getTranslationFromI18nKeyAndLabel('recruiting.jobCandidate.unnamed', 'Unnamed Candidate')
    : getTranslationFromI18nKeyAndLabel('recruiting.jobApplication.unnamed', 'Unnamed Job Application')
  const itemType = getTranslationFromI18nKeyAndLabel('recruiting.jobApplication', 'Job Application')

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
      <DeleteLayout itemType={itemType} itemTitle={jobApplicationTitle} data-testid={dataTestId} />
    </AppActionForm>
  )
}

export default JobApplicationDeletePopup
