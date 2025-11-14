import React from 'react'
import { useOpportunityFormContext } from '../context/OpportunityFormContext'
import { Button, Alert, AlertDescription, Spinner } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import OpportunityInformationSection from './OpportunityInformationSection'
import {
  buildInvestmentOpportunityPayload,
  buildInvestmentOpportunityContacts
} from '@/common/data/investment/payloads'

const prefixDataTestId = 'InvestmentOpportunityForm'

const OpportunityFormComponent: React.FC = () => {
  const { formValues, onSubmit, onCancel, isLoading, error, businessAppContext, hideActions } =
    useOpportunityFormContext()

  // Check if all mandatory fields are filled for Investment Opportunity
  const isFormValid =
    formValues.owner &&
    formValues.name &&
    formValues.pipeline &&
    formValues.pipelineStage &&
    formValues.estimatedAmount &&
    !isNaN(parseFloat(formValues.estimatedAmount)) &&
    parseFloat(formValues.estimatedAmount) > 0 &&
    formValues.currency

  // Handle form submission for Investment Opportunity
  const handleSubmit = async () => {
    // Prevent duplicate submissions
    if (isLoading) {
      return
    }

    try {
      // Determine dealType: default to "INVESTMENT_DEAL" unless business context provides one
      const contextDealType = businessAppContext.additionalData?.dealType
      const finalDealType = contextDealType || formValues.dealType || 'INVESTMENT_DEAL'

      // ✅ Use centralized payload builder for IRM Opportunity
      const isUpdate = !!formValues.id
      const { investmentOpportunity } = buildInvestmentOpportunityPayload(
        {
          ...formValues,
          dealType: finalDealType,
          pipeline: formValues.pipeline, // Maps to opportunityPipelineRef
          pipelineStage: formValues.pipelineStage, // Maps to opportunityPipelineStageRef
          currency: formValues.currency || formValues.currencyRef, // Handle both formats
          // Handle account ID extraction
          accountId:
            typeof formValues.account === 'object' && formValues.account?.id
              ? formValues.account.id
              : typeof formValues.account === 'string'
                ? formValues.account
                : undefined
        },
        { isUpdate }
      )

      // ✅ Use centralized opportunity contacts builder
      const opportunityContacts = buildInvestmentOpportunityContacts(formValues.contactIds || [], formValues.id)

      // ✅ Create payload structure with opportunityContacts for both CREATE and UPDATE
      const changeMode = isUpdate ? 'UPDATE' : 'INSERT'
      const payload = {
        investmentOpportunity: {
          ...investmentOpportunity,
          opportunityContacts // Include for both create and update
        },
        changeMode
      }

      // Dispatch process continue event FIRST (like account form)
      dispatchProcessContinueEvent('pse_submit', payload)

      // Call the onSubmit callback after dispatching the process event
      // This ensures the process event is always dispatched even if onSubmit fails
      try {
        await onSubmit(formValues)
      } catch (submitError) {
        console.warn('onSubmit callback failed, but process event was dispatched:', submitError)
      }
    } catch (err) {
      console.error('Error submitting investment opportunity form:', err)
    }
  }

  // Handle form cancellation
  const handleCancel = async () => {
    try {
      await onCancel()

      // Dispatch process continue event for cancellation (pause)
      dispatchProcessContinueEvent('pse_pause', {})
    } catch (err) {
      console.error('Error cancelling investment opportunity form:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:p-8">
        <Spinner size="lg" />
        <span className="gba:ml-3 gba:text-gray-600">Loading investment opportunity data...</span>
      </div>
    )
  }

  return (
    <div className="gba:h-full gba:flex gba:flex-col gba:max-w-md gba:mx-auto gba:p-6">
      <div className="gba:h-full gba:flex gba:flex-col" data-testid={formatDataTestId(prefixDataTestId, 'Form')}>
        {/* Form Fields Container - Takes up available space */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-8">
          {/* Investment Opportunity Information Section */}
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
              {formValues.id ? 'Update Investment Opportunity' : 'Create Investment Opportunity'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default OpportunityFormComponent
