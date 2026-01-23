import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Alert, Spinner } from '@newwork/nw-design-system'
import { AppActionForm } from '@/components/app-action-form'
import { DeleteLayout } from '@/components/delete-layout'
import { useJobOffer } from '@/common/data/recruiting/hooks/useJobOffer'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface JobOfferDeletePopupProps extends BusinessAppContextProps {
  onClose: () => void

  onSuccess?: () => void
  onError?: (error: any) => void

  'data-testid'?: string
}

export const JobOfferDeletePopup: React.FC<JobOfferDeletePopupProps> = ({
  onClose,
  accessToken,
  additionalData,
  onSuccess,
  'data-testid': dataTestId = 'job-offer-delete-popup'
}) => {
  const jobOfferId =
    additionalData?.jobOfferId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.jobOfferId ||
    additionalData?.id

  const { jobOffer, loading, error } = useJobOffer(accessToken || '', jobOfferId, 'record')

  const handleSubmit = async () => {
    if (!jobOffer || !jobOffer.id) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel('recruiting.jobOffer.delete.error.noData', 'Job offer data not loaded')
      )
    }

    return {
      jobOffer: {
        id: jobOffer.id,
        ...(jobOffer.version !== undefined && jobOffer.version !== null ? { version: jobOffer.version } : {}),
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

  if (!jobOfferId) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" data-testid={`${dataTestId}-missing-id`}>
          {getTranslationFromI18nKeyAndLabel(
            'recruiting.jobOffer.delete.missingId',
            'Job offer ID not found. Cannot delete job offer.'
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
          {getTranslationFromI18nKeyAndLabel('recruiting.jobOffer.delete.loading', 'Loading job offer...')}
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6">
        <Alert variant="destructive" data-testid={`${dataTestId}-error`}>
          {getTranslationFromI18nKeyAndLabel(
            'recruiting.jobOffer.delete.error',
            'Failed to load job offer. Please try again.'
          )}
        </Alert>
      </div>
    )
  }

  if (!jobOffer) {
    return null
  }

  const jobOfferTitle = jobOffer.offerDate
    ? new Date(jobOffer.offerDate).toLocaleDateString()
    : getTranslationFromI18nKeyAndLabel('recruiting.jobOffer.unnamed', 'Unnamed Job Offer')
  const itemType = getTranslationFromI18nKeyAndLabel('recruiting.jobOffer', 'Job Offer')

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
      <DeleteLayout itemType={itemType} itemTitle={jobOfferTitle} data-testid={dataTestId} />
    </AppActionForm>
  )
}

export default JobOfferDeletePopup
