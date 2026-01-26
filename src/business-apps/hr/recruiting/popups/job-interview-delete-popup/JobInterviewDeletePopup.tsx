import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Alert, Spinner } from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form'
import { DeleteLayout } from '@/components/delete-layout'
import { useJobInterview } from '@/common/data/recruiting/hooks/useJobInterview'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface JobInterviewDeletePopupProps extends BusinessAppContextProps {
  onClose: () => void

  onSuccess?: () => void

  'data-testid'?: string
}

export const JobInterviewDeletePopup: React.FC<JobInterviewDeletePopupProps> = ({
  onClose,
  accessToken,
  additionalData,
  onSuccess,
  'data-testid': dataTestId = 'job-interview-delete-popup'
}) => {
  const jobInterviewId =
    additionalData?.jobInterviewId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.jobInterviewId ||
    additionalData?.id

  const { jobInterview, loading, error } = useJobInterview(accessToken || '', jobInterviewId, 'record')

  const handleSubmit = async () => {
    if (!jobInterview?.id) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel(
          'recruiting.jobInterview.delete.error.noData',
          'Job interview data not loaded'
        )
      )
    }

    return {
      jobInterview: {
        id: jobInterview.id,
        ...(jobInterview.version !== null && jobInterview.version !== undefined
          ? { version: jobInterview.version }
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

  if (!jobInterviewId) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" data-testid={`${dataTestId}-missing-id`}>
          {getTranslationFromI18nKeyAndLabel(
            'recruiting.jobInterview.delete.missingId',
            'Job interview ID not found. Cannot delete job interview.'
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
          {getTranslationFromI18nKeyAndLabel('recruiting.jobInterview.delete.loading', 'Loading job interview...')}
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" data-testid={`${dataTestId}-error`}>
          {getTranslationFromI18nKeyAndLabel(
            'recruiting.jobInterview.delete.error',
            'Failed to load job interview. Please try again.'
          )}
        </Alert>
      </div>
    )
  }

  if (!jobInterview) {
    return null
  }

  const interviewTitle = jobInterview.scheduledAt
    ? new Date(jobInterview.scheduledAt).toLocaleString()
    : getTranslationFromI18nKeyAndLabel('recruiting.jobInterview.unnamed', 'Unnamed Interview')
  const itemType = getTranslationFromI18nKeyAndLabel('recruiting.jobInterview', 'Job Interview')

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

export default JobInterviewDeletePopup
