import React from 'react'
import { useOpportunityFormContext } from '../context/OpportunityFormContext'
import { Button, Alert, AlertDescription, Spinner } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import OpportunityInformationSection from './OpportunityInformationSection'

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

  // Helper function to convert values to strings safely
  const toStringOrUndefined = (value: string): string | undefined => {
    return value && value.trim() ? value.trim() : undefined
  }

  // Helper: Build opportunityContacts array with full association objects
  const buildOpportunityContacts = (contactIds: any[], opportunityId?: string): any[] => {
    if (!contactIds || contactIds.length === 0) {
      return []
    }

    return contactIds.map(contact => {
      if (typeof contact === 'object' && contact.id) {
        // Existing association - include association metadata if available
        const opportunityContact: any = {
          contactType: null,
          opportunity: opportunityId, // Current opportunity ID
          contact: contact.id
        }

        // Include association ID and version if it exists (for updates)
        if (contact.associationId) {
          opportunityContact.id = contact.associationId
          if (contact.associationVersion !== undefined) {
            opportunityContact.version = contact.associationVersion
          }
        }

        return opportunityContact
      }

      // New association - simple format
      return {
        contactType: null,
        opportunity: opportunityId,
        contact: contact
      }
    })
  }

  // Helper: Build complete opportunity payload with all optional fields
  const buildOpportunityPayload = (formValues: any): any => {
    const payload: any = {
      sourceApp: 'CRM',
      name: toStringOrUndefined(formValues.name),
      businessKey: toStringOrUndefined(formValues.businessKey),
      code: toStringOrUndefined(formValues.code),
      estimatedAmount: formValues.estimatedAmount ? Number.parseFloat(formValues.estimatedAmount) : undefined,
      currencyRef: toStringOrUndefined(formValues.currency),
      closeDate: toStringOrUndefined(formValues.closeDate),
      winningChance: formValues.winningChance ? Number.parseFloat(formValues.winningChance) : undefined,
      salesPipelineRef: toStringOrUndefined(formValues.pipeline),
      salesPipelineStageRef: toStringOrUndefined(formValues.salesPipelineStage),
      opportunityStatusRef: toStringOrUndefined(formValues.opportunityStatus),
      personal: formValues.personal || false,
      notesSummary: toStringOrUndefined(formValues.notesSummary),
      account: toStringOrUndefined(formValues.accountId || formValues.account),
      salesCampaign: toStringOrUndefined(formValues.salesCampaignId),
      lead: toStringOrUndefined(formValues.leadId || formValues.lead),
      ownerEmployee: toStringOrUndefined(formValues.owner),
      additionalProperties: formValues.additionalProperties || {}
    }

    // Add optional complex fields if they exist
    if (formValues.addresses?.length > 0) payload.addresses = formValues.addresses
    if (formValues.communicationChannels?.length > 0) payload.communicationChannels = formValues.communicationChannels
    if (formValues.tags?.length > 0) payload.tags = formValues.tags
    if (formValues.express1 && Object.keys(formValues.express1).length > 0) payload.express1 = formValues.express1
    if (formValues.express2 && Object.keys(formValues.express2).length > 0) payload.express2 = formValues.express2
    if (formValues.recordState) payload.recordState = formValues.recordState
    if (formValues.processInstanceId) payload.processInstanceId = formValues.processInstanceId

    // Add ID and version for updates
    if (formValues.id) {
      payload.id = formValues.id
      payload.version = formValues.version || 0
    }

    return payload
  }

  // Handle form submission
  const handleSubmit = async () => {
    // Prevent duplicate submissions
    if (isLoading) {
      return
    }

    try {
      // Build opportunity payload using helper function
      const opportunityPayload = buildOpportunityPayload(formValues)

      // Determine change mode based on whether we have an ID
      const changeMode = formValues.id ? 'UPDATE' : 'INSERT'
      const isUpdate = changeMode === 'UPDATE'

      // Build opportunityContacts array with full association objects (matching IRM pattern)
      const opportunityContacts = buildOpportunityContacts(formValues.contactIds || [], formValues.id)

      // ✅ UPDATED: Create payload structure with opportunityContacts for UPDATE, contactIds for CREATE
      const payload = {
        opportunity: {
          ...opportunityPayload,
          opportunityContacts: isUpdate ? opportunityContacts : undefined // Only for updates
        },
        changeMode: changeMode,
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
