import React from 'react'
import { useOpportunityFormContext } from '../context/OpportunityFormContext'
import { Button, Alert, AlertDescription, Spinner } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import OpportunityInformationSection from './OpportunityInformationSection'
import { buildCustomerOpportunityPayload, buildCustomerOpportunityContacts } from '@/common/data/customer/payloads'

const prefixDataTestId = 'OpportunityForm'

const OpportunityFormComponent: React.FC = () => {
  const { formValues, onSubmit, onCancel, isLoading, error, hideActions } = useOpportunityFormContext()

  // Check if all mandatory fields are filled
  const isFormValid =
    formValues.owner &&
    formValues.name &&
    formValues.pipeline &&
    formValues.salesPipelineStage &&
    formValues.estimatedAmount &&
    !isNaN(parseFloat(formValues.estimatedAmount)) &&
    parseFloat(formValues.estimatedAmount) > 0 &&
    formValues.currency

  // Handle form submission
  const handleSubmit = async () => {
    // Prevent duplicate submissions
    if (isLoading) {
      return
    }

    try {
      // ✅ Use centralized payload builder for CRM Opportunity
      const isUpdate = !!formValues.id
      const { customerOpportunity } = buildCustomerOpportunityPayload(
        {
          ...formValues,
          pipeline: formValues.pipeline, // Maps to salesPipelineRef
          pipelineStage: formValues.salesPipelineStage // Maps to salesPipelineStageRef
        },
        { isUpdate }
      )

      // ✅ Use centralized opportunity contacts builder
      const opportunityContacts = buildCustomerOpportunityContacts(formValues.contactIds || [], formValues.id)

      // ✅ Create payload structure with opportunityContacts for UPDATE, contactIds for CREATE
      const changeMode = isUpdate ? 'UPDATE' : 'INSERT'
      const payload = {
        opportunity: {
          ...customerOpportunity,
          opportunityContacts: isUpdate ? opportunityContacts : undefined // Only for updates
        },
        changeMode,
        contactIds: isUpdate ? undefined : opportunityContacts.map(oc => oc.contact) // For CREATE mode only
      }

      // Dispatch process continue event FIRST (like IRM)
      dispatchProcessContinueEvent('pse_submit', payload)

      // Call the onSubmit callback after dispatching the process event
      // This ensures the process event is always dispatched even if onSubmit fails
      try {
        await onSubmit(formValues)
      } catch (submitError) {
        console.warn('onSubmit callback failed, but process event was dispatched:', submitError)
      }
    } catch (err) {
      console.error('Error submitting CRM opportunity form:', err)
    }
  }

  // Handle form cancellation
  const handleCancel = async () => {
    try {
      await onCancel()

      // Dispatch process continue event for cancellation (pause)
      dispatchProcessContinueEvent('pse_pause', {})
    } catch (err) {
      console.error('Error cancelling CRM opportunity form:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:p-8">
        <Spinner size="lg" />
        <span className="gba:ml-3 gba:text-gray-600">Loading opportunity data...</span>
      </div>
    )
  }

  return (
    <div className="gba:h-full gba:flex gba:flex-col gba:max-w-md gba:mx-auto gba:p-6">
      <div className="gba:h-full gba:flex gba:flex-col" data-testid={formatDataTestId(prefixDataTestId, 'Form')}>
        {/* Form Fields Container - Takes up available space */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-8">
          {/* Opportunity Information Section */}
          <OpportunityInformationSection />

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="gba:bg-red-50 gba:border gba:border-red-200 gba:rounded-md gba:p-4">
              <AlertDescription className="gba:text-red-800 gba:text-sm">{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Submit and Cancel Buttons - Fixed at bottom (only if not hidden) */}
        {!hideActions && (
          <div className="gba:mt-6 gba:pt-4 gba:border-t gba:border-gray-200 gba:flex gba:gap-3">
            <Button
              type="button"
              variant="secondary"
              className="gba:flex-1"
              size="lg"
              onClick={handleCancel}
              data-testid={formatDataTestId(prefixDataTestId, 'cancel-button')}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              disabled={!isFormValid || isLoading}
              className="gba:flex-1"
              size="lg"
              onClick={handleSubmit}
              data-testid={formatDataTestId(prefixDataTestId, 'submit-button')}
            >
              {formValues.id ? 'Update Opportunity' : 'Create Opportunity'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default OpportunityFormComponent
