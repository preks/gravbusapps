import React from 'react'
import { Button, Spinner } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { useContactFormContext } from '../context/ContactFormContext'
import OwnerInformationSection from './OwnerInformationSection'
import PersonalInformationSection from './PersonalInformationSection'

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

  // Helper function to convert values to strings safely
  const toStringOrUndefined = (value: string | undefined): string | undefined => {
    return value && value.trim() ? value.trim() : undefined
  }

  // Helper: Build communication channels array (LinkedIn, Xing)
  const buildCommunicationChannels = (linkedinUrl?: string, xingUrl?: string, contactId?: string): any[] => {
    const channels = []

    if (linkedinUrl?.trim()) {
      const linkedinChannel: any = {
        communicationChannelRef: 'CommunicationChannel:v1:LinkedIn',
        value: linkedinUrl.trim(),
        valueExtension: null
      }

      if (contactId) {
        linkedinChannel.contact = contactId
      }

      channels.push(linkedinChannel)
    }

    if (xingUrl?.trim()) {
      const xingChannel: any = {
        communicationChannelRef: 'CommunicationChannel:v1:Xing',
        value: xingUrl.trim(),
        valueExtension: null
      }

      if (contactId) {
        xingChannel.contact = contactId
      }

      channels.push(xingChannel)
    }

    return channels
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

      // Prepare contact payload matching CRM API structure (verified against GraphQL schema)
      const contactPayload: any = {
        // Basic Information
        firstName: toStringOrUndefined(formValues.firstName),
        lastName: toStringOrUndefined(formValues.lastName),
        fullName: `${(formValues.firstName || '').trim()} ${(formValues.lastName || '').trim()}`.trim(),
        contactType: toStringOrUndefined(formValues.contactType),
        birthDate: toStringOrUndefined(formValues.birthDate),

        // Professional Information
        jobTitle: toStringOrUndefined(formValues.jobTitle),
        department: toStringOrUndefined(formValues.department),

        // Contact Information
        email: toStringOrUndefined(formValues.email),
        phone: toStringOrUndefined(formValues.phone),
        fax: toStringOrUndefined(formValues.fax), // ✅ ADDED - was missing

        // Owner Information
        ownerEmployee: toStringOrUndefined(formValues.ownerEmployeeId),

        // Notes
        notesSummary: toStringOrUndefined(formValues.notesSummary),
        bio: toStringOrUndefined(formValues.bio), // ✅ ADDED - was missing

        // References
        academicTitleRef: toStringOrUndefined(formValues.academicTitleRef),
        languageRef: toStringOrUndefined(formValues.languageRef),

        // System Fields
        businessKey: toStringOrUndefined(formValues.businessKey), // ✅ ADDED - was missing
        code: toStringOrUndefined(formValues.code), // ✅ ADDED - was missing

        // CRM-specific fields
        // Extract ID from object if accountId is an object (due to AccountSelect prefill format)
        accountId:
          typeof formValues.accountId === 'object' && formValues.accountId !== null && 'id' in formValues.accountId
            ? toStringOrUndefined(formValues.accountId.id)
            : toStringOrUndefined(formValues.accountId),
        // ⚠️ IMPORTANT: CRM expects 'salesCampaign' (without Id suffix), not 'salesCampaignId'
        salesCampaign: toStringOrUndefined(formValues.salesCampaignId),

        // Source tracking
        sourceApp: 'CRM',

        // Additional properties (JSONB field)
        additionalProperties: {} // ✅ ADDED - was missing
      }

      // Include recordState if it exists (system field)
      if (formValues.recordState) {
        contactPayload.recordState = formValues.recordState
      }

      // Build communication channels using helper function
      // ✅ FIXED: Always add communication channels array (like Lead form does)
      // Even if empty, this ensures the field is properly updated in the database
      const contactId = isUpdate ? formValues.id : undefined
      contactPayload.communicationChannels = buildCommunicationChannels(
        formValues.linkedinUrl,
        formValues.xingUrl,
        contactId
      )

      // Handle ID and version for UPDATE mode only
      if (isUpdate) {
        contactPayload.id = formValues.id
        if (formValues.version !== undefined && formValues.version !== null) {
          contactPayload.version = formValues.version
        }
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

      // ✅ FIXED: Create clean payload structure with accountContacts for BOTH CREATE and UPDATE (matching IRM pattern)
      const payload = {
        contact: {
          ...contactPayload,
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
          id: contactPayload.id,
          accountId: contactPayload.accountId,
          accountIdType: typeof contactPayload.accountId,
          salesCampaign: contactPayload.salesCampaign,
          communicationChannels: contactPayload.communicationChannels,
          communicationChannelsCount: contactPayload.communicationChannels?.length || 0
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
