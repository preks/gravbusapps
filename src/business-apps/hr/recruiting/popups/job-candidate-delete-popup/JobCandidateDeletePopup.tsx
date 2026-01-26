import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Alert, Spinner } from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form'
import { DeleteLayout } from '@/components/delete-layout'
import { useJobCandidate } from '@/common/data/recruiting/hooks/useJobCandidate'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface JobCandidateDeletePopupProps extends BusinessAppContextProps {
  onClose: () => void

  onSuccess?: () => void

  'data-testid'?: string
}

export const JobCandidateDeletePopup: React.FC<JobCandidateDeletePopupProps> = ({
  onClose,
  accessToken,
  additionalData,
  onSuccess,
  'data-testid': dataTestId = 'job-candidate-delete-popup'
}) => {
  const jobCandidateId =
    additionalData?.jobCandidateId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.jobCandidateId ||
    additionalData?.id

  const { jobCandidate, loading, error } = useJobCandidate(accessToken || '', jobCandidateId, 'record')

  const handleSubmit = async () => {
    if (!jobCandidate?.id) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel(
          'recruiting.jobCandidate.delete.error.noData',
          'Job candidate data not loaded'
        )
      )
    }

    return {
      jobCandidate: {
        id: jobCandidate.id,
        ...(jobCandidate.version !== null && jobCandidate.version !== undefined
          ? { version: jobCandidate.version }
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

  if (!jobCandidateId) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" data-testid={`${dataTestId}-missing-id`}>
          {getTranslationFromI18nKeyAndLabel(
            'recruiting.jobCandidate.delete.missingId',
            'Job candidate ID not found. Cannot delete job candidate.'
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
          {getTranslationFromI18nKeyAndLabel('recruiting.jobCandidate.delete.loading', 'Loading job candidate...')}
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" data-testid={`${dataTestId}-error`}>
          {getTranslationFromI18nKeyAndLabel(
            'recruiting.jobCandidate.delete.error',
            'Failed to load job candidate. Please try again.'
          )}
        </Alert>
      </div>
    )
  }

  if (!jobCandidate) {
    return null
  }

  const jobCandidateTitle =
    jobCandidate.displayName ||
    `${jobCandidate.firstName || ''} ${jobCandidate.lastName || ''}`.trim() ||
    getTranslationFromI18nKeyAndLabel('recruiting.jobCandidate.unnamed', 'Unnamed Candidate')
  const itemType = getTranslationFromI18nKeyAndLabel('recruiting.jobCandidate', 'Job Candidate')

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
      <DeleteLayout itemType={itemType} itemTitle={jobCandidateTitle} data-testid={dataTestId} />
    </AppActionForm>
  )
}

export default JobCandidateDeletePopup
