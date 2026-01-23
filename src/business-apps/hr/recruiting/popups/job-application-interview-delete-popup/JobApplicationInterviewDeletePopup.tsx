import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Alert, Spinner } from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form'
import { DeleteLayout } from '@/components/delete-layout'
import { useJobApplicationInterview } from '@/common/data/recruiting/hooks/useJobApplicationInterview'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface JobApplicationInterviewDeletePopupProps extends BusinessAppContextProps {
  onClose: () => void

  onSuccess?: () => void
  onError?: (error: any) => void

  'data-testid'?: string
}

export const JobApplicationInterviewDeletePopup: React.FC<JobApplicationInterviewDeletePopupProps> = ({
  onClose,
  accessToken,
  additionalData,
  onSuccess,
  'data-testid': dataTestId = 'job-application-interview-delete-popup'
}) => {
  const jobApplicationInterviewId =
    additionalData?.jobApplicationInterviewId ||
    additionalData?.jobInterviewId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.jobApplicationInterviewId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.jobInterviewId ||
    additionalData?.id

  const { jobApplicationInterview, loading, error } = useJobApplicationInterview(
    accessToken || '',
    jobApplicationInterviewId,
    'record'
  )

  const handleSubmit = async () => {
    if (!jobApplicationInterview || !jobApplicationInterview.id) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel(
          'recruiting.jobApplicationInterview.delete.error.noData',
          'Job application interview data not loaded'
        )
      )
    }

    return {
      jobApplicationInterview: {
        id: jobApplicationInterview.id,
        ...(jobApplicationInterview.version !== undefined && jobApplicationInterview.version !== null
          ? { version: jobApplicationInterview.version }
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

  if (!jobApplicationInterviewId) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" data-testid={`${dataTestId}-missing-id`}>
          {getTranslationFromI18nKeyAndLabel(
            'recruiting.jobApplicationInterview.delete.missingId',
            'Job application interview ID not found. Cannot delete job application interview.'
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
          {getTranslationFromI18nKeyAndLabel(
            'recruiting.jobApplicationInterview.delete.loading',
            'Loading job application interview...'
          )}
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" data-testid={`${dataTestId}-error`}>
          {getTranslationFromI18nKeyAndLabel(
            'recruiting.jobApplicationInterview.delete.error',
            'Failed to load job application interview. Please try again.'
          )}
        </Alert>
      </div>
    )
  }

  if (!jobApplicationInterview) {
    return null
  }

  const interviewTitle = jobApplicationInterview.scheduledAt
    ? new Date(jobApplicationInterview.scheduledAt).toLocaleString()
    : getTranslationFromI18nKeyAndLabel('recruiting.jobApplicationInterview.unnamed', 'Unnamed Interview')
  const itemType = getTranslationFromI18nKeyAndLabel('recruiting.jobApplicationInterview', 'Job Application Interview')

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
      <DeleteLayout itemType={itemType} itemTitle={interviewTitle} data-testid={dataTestId} />
    </AppActionForm>
  )
}

export default JobApplicationInterviewDeletePopup
