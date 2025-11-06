import React, { useState } from 'react'
import { Alert, AlertDescription, Spinner } from '@newwork/nw-design-system'
import { useLeadStatusChangePopupContext } from '../context/LeadStatusChangePopupContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppActionForm } from '@/components/app-action-form'

const prefixDataTestId = 'lead-status-change-popup'

const LeadStatusChangePopupComponent: React.FC = () => {
  const { formValues, leadData, error, businessAppContext, isLoading } = useLeadStatusChangePopupContext()

  const [submitting, setSubmitting] = useState(false)

  // Handle form submission - create payload for AppActionForm
  const handleSubmit = async () => {
    if (!formValues || !leadData) {
      throw new Error(getTranslationFromI18nKeyAndLabel('crm:lead.error.dataNotLoaded', 'Lead data not loaded'))
    }

    setSubmitting(true)

    // Create the payload for saveLead process
    const payload = {
      changeMode: 'UPDATE',
      lead: {
        id: formValues.leadId,
        version: formValues.leadVersion,
        leadStatusRef: formValues.newStatusRef
      }
    }

    // Return the payload for AppActionForm to handle
    return payload
  }

  const handleCancel = () => {
    // AppActionForm will handle closing the popup
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
          {getTranslationFromI18nKeyAndLabel('crm:lead.status.loading', 'Loading lead data...')}
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
  if (!formValues || !leadData) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-missing-data`}>
        <AlertDescription>
          {getTranslationFromI18nKeyAndLabel('crm:lead.error.missingData', 'Required lead data is missing')}
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
      businessAppContext={businessAppContext}
      data-testid={`${prefixDataTestId}-form`}
      submitButtonText={getTranslationFromI18nKeyAndLabel('common.confirm', 'Confirm')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
      isSubmitting={submitting}
    >
      <div className="gba:space-y-6" data-testid={`${prefixDataTestId}-content`}>
        <div>
          <h2 className="gba:text-xl gba:font-semibold gba:text-foreground gba:mb-4">
            {getTranslationFromI18nKeyAndLabel('crm:lead.status.confirmTitle', 'Confirm Status Change')}
          </h2>
          <p className="gba:text-base gba:text-foreground gba:mb-2">
            {getTranslationFromI18nKeyAndLabel(
              'crm:lead.status.confirmChange',
              'Are you sure you want to change the lead status to'
            )}{' '}
            <strong className="gba:font-semibold">{formValues.statusDisplayName}</strong>?
          </p>
          <p className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'crm:lead.status.confirmDescription',
              "This action will update the lead's current status and may trigger additional workflows."
            )}
          </p>
        </div>
      </div>
    </AppActionForm>
  )
}

export default LeadStatusChangePopupComponent
