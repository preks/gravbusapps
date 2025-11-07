import React, { useState } from 'react'
import { Alert, AlertDescription, Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppActionForm } from '@/components/app-action-form'
import { useLeadData } from '../../records/lead-record/hooks/useLeadData'

const prefixDataTestId = 'investment-lead-status-change-popup'

export interface InvestmentStatusChangePopupProps extends BusinessAppContextProps {
  initialValues?: {
    leadId?: string
  }
}

const InvestmentStatusChangePopup: React.FC<InvestmentStatusChangePopupProps> = props => {
  const { additionalData, accessToken } = props

  console.log('IRM Lead Status Popup - additionalData:', JSON.stringify(additionalData, null, 2))

  // Extract data from additionalData, checking both top level and nested psi_taskPayload
  const taskPayload = additionalData?.psi_taskPayload?.psi_initialParameters

  const leadId = (additionalData?.leadId ||
    taskPayload?.leadId ||
    additionalData?.id ||
    props.initialValues?.leadId) as string

  const newStatusRef = (additionalData?.newStatusRef || taskPayload?.newStatusRef) as string
  const statusDisplayName = (additionalData?.statusDisplayName || taskPayload?.statusDisplayName) as string
  const leadVersion = (additionalData?.leadVersion || taskPayload?.leadVersion) as number

  console.log('IRM Lead Status Popup - Extracted values:', {
    leadId,
    newStatusRef,
    statusDisplayName,
    leadVersion
  })

  // Use existing general hook
  const { lead, isLoading, error } = useLeadData(leadId, accessToken)

  const [submitting, setSubmitting] = useState(false)

  // Validate required data
  if (!leadId) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-missing-lead-id`}>
        <AlertDescription>
          {getTranslationFromI18nKeyAndLabel(
            'irm:investmentLead.status.error.missingId',
            'No investment lead ID provided'
          )}
        </AlertDescription>
      </Alert>
    )
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!lead) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel('irm:investmentLead.error.dataNotLoaded', 'Investment lead data not loaded')
      )
    }

    if (!newStatusRef) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel('irm:investmentLead.error.missingStatus', 'New status reference is missing')
      )
    }

    setSubmitting(true)

    const payload = {
      changeMode: 'UPDATE',
      investmentLead: {
        id: leadId,
        version: leadVersion || lead.version,
        leadStatusRef: newStatusRef
      }
    }

    console.log('IRM Lead Status Popup - Payload:', JSON.stringify(payload, null, 2))

    return payload
  }

  const handleCancel = () => {
    // AppActionForm will handle closing
  }

  // Show loading state
  if (isLoading) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:py-8"
        data-testid={`${prefixDataTestId}-loading`}
      >
        <Spinner size="lg" />
        <span className="gba:ml-2">
          {getTranslationFromI18nKeyAndLabel('irm:investmentLead.status.loading', 'Loading investment lead data...')}
        </span>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-error`}>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  // Show error if data is missing
  if (!lead) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-missing-data`}>
        <AlertDescription>
          {getTranslationFromI18nKeyAndLabel('irm:investmentLead.error.missingData', 'Investment lead data not loaded')}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <AppActionForm
      processType="update"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      formData={{}}
      businessAppContext={props}
      data-testid={`${prefixDataTestId}-form`}
      submitButtonText={getTranslationFromI18nKeyAndLabel('common.confirm', 'Confirm')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
      isSubmitting={submitting}
    >
      <div className="gba:space-y-6" data-testid={`${prefixDataTestId}-content`}>
        <div>
          <h2 className="gba:text-xl gba:font-semibold gba:text-foreground gba:mb-4">
            {getTranslationFromI18nKeyAndLabel('irm:investmentLead.status.confirmTitle', 'Confirm Status Change')}
          </h2>
          <p className="gba:text-base gba:text-foreground gba:mb-2">
            {getTranslationFromI18nKeyAndLabel(
              'irm:investmentLead.status.confirmChange',
              'Are you sure you want to change the investment lead status to'
            )}{' '}
            <strong className="gba:font-semibold">{statusDisplayName}</strong>?
          </p>
          <p className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'irm:investmentLead.status.confirmDescription',
              "This action will update the investment lead's current status and may trigger additional workflows."
            )}
          </p>
          <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">
            {getTranslationFromI18nKeyAndLabel('irm:investmentLead.status.current', 'Current status')}:{' '}
            {lead.investmentLeadStatus?.value || 'Unknown'}
          </p>
        </div>
      </div>
    </AppActionForm>
  )
}

InvestmentStatusChangePopup.displayName = 'InvestmentStatusChangePopup'

export default InvestmentStatusChangePopup
