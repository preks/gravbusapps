import React from 'react'
import { Button, Alert, AlertDescription } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { useContactFormContext } from '../context/ContactFormContext'
import PersonalInformationSection from './PersonalInformationSection'
import OwnerInformationSection from './OwnerInformationSection'
import { buildCommunicationChannelRef } from '@/common/data/common/utils/communicationChannelHelpers'
import { CommunicationChannelCode } from '@/common/data/common/types/commonTypes'
import { buildInvestmentContactPayload } from '@/common/data/investment/payloads'

const prefixDataTestId = 'ContactForm'

// Helper function to create communication channel object
const createCommunicationChannel = (channelCode: CommunicationChannelCode, value: string) => ({
  communicationChannelRef: buildCommunicationChannelRef(channelCode),
  value: value.trim(),
  valueExtension: null,
  source: 'FORM_INPUT',
  activeFrom: new Date().toISOString(),
  activeTo: null
})

// Helper function to build communication channels array
const buildCommunicationChannels = (formValues: any): any[] => {
  const channels: any[] = []

  if (formValues.email?.trim()) {
    channels.push(createCommunicationChannel(CommunicationChannelCode.EMAIL, formValues.email))
  }

  if (formValues.phone?.trim()) {
    channels.push(createCommunicationChannel(CommunicationChannelCode.PHONE, formValues.phone))
  }

  if (formValues.linkedinUrl?.trim()) {
    channels.push(createCommunicationChannel(CommunicationChannelCode.LINKEDIN, formValues.linkedinUrl))
  }

  if (formValues.xingUrl?.trim()) {
    channels.push(createCommunicationChannel(CommunicationChannelCode.XING, formValues.xingUrl))
  }

  return channels
}

const ContactFormComponent: React.FC = () => {
  const { formValues, onSubmit, onCancel, isLoading, error, hideActions } = useContactFormContext()

  // Safety check - if context is not properly initialized, show error
  if (!formValues) {
    return (
      <div className="gba:p-6 gba:text-center">
        <div className="gba:text-red-500">Error: Form context not properly initialized. Please refresh the page.</div>
      </div>
    )
  }

  // Check if all mandatory fields are filled
  const isFormValid = formValues.firstName && formValues.lastName && formValues.email && formValues.ownerEmployeeId

  // Handle form submission
  const handleSubmit = async () => {
    // Prevent duplicate submissions
    if (isLoading) {
      return
    }

    try {
      // Determine if this is an update or create operation
      const isUpdate = formValues.id

      // ✅ Build communication channels array first
      const communicationChannels = buildCommunicationChannels(formValues)

      // ✅ Use centralized payload builder for IRM Contact
      const { investmentContact } = buildInvestmentContactPayload(
        {
          ...formValues,
          owner: formValues.ownerEmployeeId, // Map ownerEmployeeId to owner
          communicationChannels: communicationChannels.length > 0 ? communicationChannels : undefined
        },
        { isUpdate }
      )

      // Override generated fullName with our custom logic (spaces handled)
      investmentContact.fullName = `${(formValues.firstName || '').trim()} ${(formValues.lastName || '').trim()}`.trim()

      // Determine change mode based on whether we have an ID
      const changeMode = isUpdate ? 'UPDATE' : 'INSERT'

      // ✅ NEW: Build accountContacts array with full association objects
      const accountContacts = (formValues.accountIds || []).map(account => {
        if (typeof account === 'object' && account.id) {
          // Existing association - include association metadata if available
          const accountContact: any = {
            contactType: null, // Set contact type if needed
            account: account.id,
            contact: formValues.id // Current contact ID
          }

          // Include association ID and version if it exists (for updates)
          if (account.associationId) {
            accountContact.id = account.associationId
            if (account.associationVersion !== undefined) {
              accountContact.version = account.associationVersion
            }
          }

          return accountContact
        }

        // New association - simple format
        return {
          contactType: null,
          account: account,
          contact: formValues.id
        }
      })

      // ✅ Create final payload structure with accountContacts
      const cleanPayload = {
        investmentContact: {
          ...investmentContact,
          accountContacts: accountContacts // Include for both create and update
        },
        changeMode: changeMode
      }

      const isolatedPayload = JSON.parse(JSON.stringify(cleanPayload))

      dispatchProcessContinueEvent('pse_submit', isolatedPayload)

      // Call the onSubmit callback after dispatching the process event
      // This ensures the process event is always dispatched even if onSubmit fails
      try {
        await onSubmit(formValues)
      } catch (submitError) {
        console.warn('onSubmit callback failed, but process event was dispatched:', submitError)
      }
    } catch (err) {
      console.error('Error submitting investment contact form:', err)
    }
  }

  // Handle form cancellation
  const handleCancel = async () => {
    try {
      await onCancel()

      // Dispatch process continue event for cancellation (pause)
      dispatchProcessContinueEvent('pse_pause', null)
    } catch (err) {
      console.error('Error cancelling investment contact form:', err)
    }
  }

  return (
    <div className="gba:h-full gba:flex gba:flex-col gba:max-w-md gba:mx-auto gba:p-6">
      <div className="gba:h-full gba:flex gba:flex-col" data-testid={formatDataTestId(prefixDataTestId, 'Form')}>
        {/* Form Fields Container - Takes up available space */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-8">
          {/* Contact Owner Section - First and most important (WITHOUT section header) */}
          <OwnerInformationSection />

          {/* Personal Information Section */}
          <PersonalInformationSection />

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Submit and Cancel Buttons - Fixed at bottom (only shown when not embedded) */}
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
              {formValues.id ? 'Update Contact' : 'Create Contact'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ContactFormComponent
