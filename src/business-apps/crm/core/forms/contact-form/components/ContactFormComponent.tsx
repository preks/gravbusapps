import React from 'react'
import { Button, Spinner } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { useContactFormContext } from '../context/ContactFormContext'
import OwnerInformationSection from './OwnerInformationSection'
import PersonalInformationSection from './PersonalInformationSection'
import { buildCommunicationChannelRef } from '@/common/data/common/utils/communicationChannelHelpers'
import { CommunicationChannelCode } from '@/common/data/common/types/commonTypes'
import { buildCustomerContactPayload } from '@/common/data/customer/payloads'

const prefixDataTestId = 'ContactForm'

const ContactFormComponent: React.FC = () => {
  const { formValues, onSubmit, onCancel, hideActions, isLoading, error } = useContactFormContext()

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

  // Helper: Build communication channels array (Email, Phone, LinkedIn, Xing)
  const buildCommunicationChannels = (
    email?: string,
    phone?: string,
    linkedinUrl?: string,
    xingUrl?: string,
    contactId?: string
  ): any[] => {
    const channelConfigs = [
      { value: email, code: CommunicationChannelCode.EMAIL },
      { value: phone, code: CommunicationChannelCode.PHONE },
      { value: linkedinUrl, code: CommunicationChannelCode.LINKEDIN },
      { value: xingUrl, code: CommunicationChannelCode.XING }
    ]

    return channelConfigs
      .filter(config => config.value?.trim())
      .map(config => ({
        communicationChannelRef: buildCommunicationChannelRef(config.code),
        value: config.value!.trim(),
        valueExtension: null,
        ...(contactId && { contact: contactId })
      }))
  }

  // Handle form submission
  const handleSubmit = async () => {
    // Prevent duplicate submissions
    if (isLoading) {
      return
    }

    try {
      // Determine if this is an update or create operation
      const isUpdate = formValues.id

      console.log('📝 CRM Contact Form: Starting submit with form values', {
        id: formValues.id,
        accountId: formValues.accountId,
        accountIdType: typeof formValues.accountId,
        accountIdIsObject: typeof formValues.accountId === 'object',
        salesCampaignId: formValues.salesCampaignId,
        linkedinUrl: formValues.linkedinUrl,
        xingUrl: formValues.xingUrl,
        contactType: formValues.contactType
      })

      // ✅ Build communication channels array first
      const contactId = isUpdate ? formValues.id : undefined
      const communicationChannels = buildCommunicationChannels(
        formValues.email,
        formValues.phone,
        formValues.linkedinUrl,
        formValues.xingUrl,
        contactId
      )

      // ✅ Extract accountId from object if needed (AccountSelect prefill format)
      const accountId =
        typeof formValues.accountId === 'object' && formValues.accountId !== null && 'id' in formValues.accountId
          ? (formValues.accountId as { id: string }).id
          : formValues.accountId

      // ✅ Use centralized payload builder for CRM Contact
      const { customerContact } = buildCustomerContactPayload(
        {
          ...formValues,
          accountId,
          communicationChannels: communicationChannels.length > 0 ? communicationChannels : undefined,
          linkedinUrl: formValues.linkedinUrl, // CRM-specific
          xingUrl: formValues.xingUrl // CRM-specific
        },
        { isUpdate }
      )

      // Override generated fullName with our custom logic (spaces handled)
      customerContact.fullName = `${(formValues.firstName || '').trim()} ${(formValues.lastName || '').trim()}`.trim()

      // Include recordState if it exists (system field)
      if (formValues.recordState) {
        customerContact.recordState = formValues.recordState
      }

      // Determine change mode based on whether we have an ID
      const changeMode = isUpdate ? 'UPDATE' : 'INSERT'

      // ✅ NEW: Build accountContacts array with full association objects (matching IRM pattern)
      const accountContacts = (formValues.accountIds || []).map((account: any) => {
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
      const payload = {
        contact: {
          ...customerContact,
          accountContacts: accountContacts // Include for both create and update
        },
        changeMode: changeMode
      }

      console.log('📤 CRM Contact Form: Submitting payload', {
        changeMode,
        isUpdate,
        contactId: formValues.id,
        formValues: {
          accountId: formValues.accountId,
          accountIdRaw: JSON.stringify(formValues.accountId),
          salesCampaignId: formValues.salesCampaignId,
          linkedinUrl: formValues.linkedinUrl,
          xingUrl: formValues.xingUrl
        },
        contactPayload: {
          id: customerContact.id,
          accountId: customerContact.accountId,
          accountIdType: typeof customerContact.accountId,
          salesCampaign: customerContact.salesCampaign,
          communicationChannels: customerContact.communicationChannels,
          communicationChannelsCount: customerContact.communicationChannels?.length || 0
        },
        fullPayload: structuredClone(payload)
      })

      dispatchProcessContinueEvent('pse_submit', payload)

      // Call the onSubmit callback after dispatching the process event
      try {
        await onSubmit(formValues)
      } catch (submitError) {
        console.warn('onSubmit callback failed, but process event was dispatched:', submitError)
      }
    } catch (err) {
      console.error('Error submitting contact form:', err)
    }
  }

  // Handle form cancellation
  const handleCancel = async () => {
    try {
      await onCancel()

      // Dispatch process continue event for cancellation (pause)
      dispatchProcessContinueEvent('pse_pause', null)
    } catch (err) {
      console.error('Error cancelling contact form:', err)
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
            <div
              className="gba:bg-red-50 gba:border gba:border-red-200 gba:rounded-md gba:p-4 gba:mb-4"
              data-testid={formatDataTestId(prefixDataTestId, 'ErrorAlert')}
            >
              <p className="gba:text-red-800 gba:font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Submit and Cancel Buttons - Fixed at bottom (hidden in wizard mode) */}
        {!hideActions && (
          <div className="gba:mt-6 gba:pt-4 gba:border-t gba:border-gray-200 gba:flex gba:gap-3">
            <Button
              variant="secondary"
              className="gba:flex-1"
              size="lg"
              onClick={handleCancel}
              data-testid={formatDataTestId(prefixDataTestId, 'CancelButton')}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              disabled={!isFormValid}
              className="gba:flex-1"
              size="lg"
              onClick={handleSubmit}
              data-testid={formatDataTestId(prefixDataTestId, 'SubmitButton')}
            >
              {isLoading && <Spinner size="sm" className="gba:mr-2" />}
              {formValues.id ? 'Update Contact' : 'Create Contact'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ContactFormComponent
