import React from 'react'
import { useAccountFormContext } from '../context/AccountFormContext'
import { Button, Alert, AlertDescription } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import AccountInformationSection from './AccountInformationSection'
import AddressInformationSection from './AddressInformationSection'
import FinancialInformationSection from './FinancialInformationSection'
import ContactSelect from '@/common/components/common-relations/selects/contact-select/ContactSelect'
import { buildCommunicationChannelRef } from '@/common/data/common/utils/communicationChannelHelpers'
import { CommunicationChannelCode } from '@/common/data/common/types/commonTypes'

const prefixDataTestId = 'AccountForm'

const AccountFormComponent: React.FC = () => {
  const {
    formValues,
    onCancel,
    isLoading,
    error,
    hideActions,
    setFormValues,
    contacts,
    contactsLoading,
    contactsError,
    searchContacts
  } = useAccountFormContext()

  // Local loading state for submission
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Check if all mandatory fields are filled
  const isFormValid = Boolean(formValues.owner && formValues.accountName)

  // Helper function to convert values to strings safely
  const toStringOrUndefined = (value: string | undefined): string | undefined => {
    return value && value.trim() ? value.trim() : undefined
  }

  // Handle form submission
  const handleSubmit = async () => {
    // Prevent duplicate submissions
    if (isLoading || isSubmitting) {
      return
    }

    setIsSubmitting(true)
    try {
      // ✅ FIXED: Determine operation mode based on account ID presence
      const isUpdate = formValues.id && formValues.id.trim()

      // ✅ UPDATED: Prepare InvestmentAccount payload following the correct API structure
      const investmentAccountPayload: any = {
        sourceApp: 'IRM', // ✅ FIXED: Changed from CRM to IRM for Investment Relations Management
        name: toStringOrUndefined(formValues.accountName), // ✅ FIXED: accountName → name
        legalFormRef: toStringOrUndefined(formValues.legalForm),
        industryClassRef: toStringOrUndefined(formValues.industry), // ✅ FIXED: industryRef → industryClassRef
        website: toStringOrUndefined(formValues.website),
        mission: toStringOrUndefined(formValues.description), // ✅ UPDATED: description → mission
        // Contact Information - moved to communicationChannels
        // phone: toStringOrUndefined(formValues.phone), // ❌ REMOVED - use communicationChannels
        // email: toStringOrUndefined(formValues.email), // ❌ REMOVED - use communicationChannels
        geographicPresence: toStringOrUndefined(formValues.geographicPresence), // ✅ FIXED: Use dedicated geographicPresence field

        // Address relationships (using the new addresses array structure)
        addresses:
          formValues.addresses
            ?.filter(
              addr =>
                // Only include addresses that have some content
                addr.addressLines.some(line => line.trim()) ||
                addr.postalCode.trim() ||
                addr.locality.trim() ||
                addr.regionRef.trim() ||
                addr.countryRef.trim()
            )
            .map(addr => {
              const addressPayload: any = {
                addressType: 'PRIMARY_ADDRESS', // Always set to PRIMARY_ADDRESS
                addressLine:
                  addr.addressLines.filter(line => line.trim()).length > 0
                    ? { lines: addr.addressLines.filter(line => line.trim()) }
                    : null,
                postalCode: addr.postalCode.trim() || null,
                locality: addr.locality.trim() || null,
                regionRef: addr.regionRef.trim() || null,
                countryRef: addr.countryRef.trim() || null
              }

              // ✅ FIXED: Only include ID and version when updating an existing account
              // This prevents the backend from treating addresses as new inserts during updates
              if (isUpdate && addr.id && addr.id !== 'default-address') {
                addressPayload.id = addr.id
                // Include version for optimistic locking during address updates (only on update)
                if (addr.version !== undefined && addr.version !== null) {
                  addressPayload.version = addr.version
                }
              }

              return addressPayload
            }) || [],
        specialty: undefined, // Not available in current form
        liquidationDate: undefined, // Not available in current form
        picture: undefined, // Not available in current form
        pictureThumbnail: undefined, // Not available in current form
        // ✅ REMOVED: businessKey mapping - sicCode field removed from form
        accountAnnualRevenueBandRef: toStringOrUndefined(formValues.annualRevenue), // ✅ FIXED: annualRevenue → accountAnnualRevenueBandRef
        companySizeRef: toStringOrUndefined(formValues.numberOfEmployees), // ✅ FIXED: numberOfEmployeesRef → companySizeRef
        foundationDate: toStringOrUndefined(formValues.foundationDate),
        ownerEmployee: toStringOrUndefined(formValues.owner) // ✅ CORRECT: Keep as ownerEmployee (relationship field)
      }

      // ✅ NEW: Build communication channels array (Email, Phone)
      const communicationChannels: any[] = []

      if (formValues.email?.trim()) {
        communicationChannels.push({
          communicationChannelRef: buildCommunicationChannelRef(CommunicationChannelCode.EMAIL),
          value: formValues.email.trim(),
          valueExtension: null
        })
      }

      if (formValues.phone?.trim()) {
        communicationChannels.push({
          communicationChannelRef: buildCommunicationChannelRef(CommunicationChannelCode.PHONE),
          value: formValues.phone.trim(),
          valueExtension: null
        })
      }

      if (communicationChannels.length > 0) {
        investmentAccountPayload.communicationChannels = communicationChannels
      }

      // ✅ FIXED: Handle ID and version for UPDATE mode only
      if (isUpdate) {
        investmentAccountPayload.id = formValues.id
        if (formValues.version !== undefined && formValues.version !== null) {
          investmentAccountPayload.version = formValues.version
        }
      }

      // ✅ REMOVED: InvestmentAccount doesn't have addresses array - using geographicPresence instead
      // (geographicPresence is already set above from formValues.addressLine1)

      // ✅ UPDATED: Initialize required arrays for InvestmentAccount
      investmentAccountPayload.tags = []

      // Determine change mode based on whether we have an ID
      const changeMode = isUpdate ? 'UPDATE' : 'INSERT'

      // ✅ NEW: Build accountContacts array with full association objects
      const accountContacts = (formValues.contactIds || []).map(contact => {
        if (typeof contact === 'object' && contact.id) {
          // Existing association - include association metadata if available
          const accountContact: any = {
            contactType: null,
            account: formValues.id, // Current account ID
            contact: contact.id
          }

          // Include association ID and version if it exists (for updates)
          if (contact.associationId) {
            accountContact.id = contact.associationId
            if (contact.associationVersion !== undefined) {
              accountContact.version = contact.associationVersion
            }
          }

          return accountContact
        }

        // New association - simple format
        return {
          contactType: null,
          account: formValues.id,
          contact: contact
        }
      })

      // ✅ UPDATED: Create clean payload structure with accountContacts for both CREATE and UPDATE
      const cleanPayload = {
        investmentAccount: {
          ...investmentAccountPayload,
          accountContacts: accountContacts // Include for both create and update
        },
        changeMode: changeMode
      }

      // ✅ FIXED: Create completely isolated payload to prevent context field pollution
      const isolatedPayload = JSON.parse(JSON.stringify(cleanPayload))

      dispatchProcessContinueEvent('pse_submit', isolatedPayload)

      // Wait for process completion event
      await new Promise<void>(resolve => {
        const TIMEOUT = 10000
        const timeoutId = setTimeout(() => {
          cleanup()
          resolve()
        }, TIMEOUT)

        const handleProcessCompletion = (event: Event) => {
          const customEvent = event as CustomEvent<{ resolution: 'success' | 'failure' }>
          if (customEvent.detail?.resolution === 'success' || customEvent.detail?.resolution === 'failure') {
            cleanup()
            resolve()
          }
        }

        const cleanup = () => {
          clearTimeout(timeoutId)
          window.removeEventListener('com.newwork.process.processCompletion', handleProcessCompletion)
          window.removeEventListener('com.newwork.process.taskCompletion', handleProcessCompletion)
        }

        window.addEventListener('com.newwork.process.processCompletion', handleProcessCompletion)
        window.addEventListener('com.newwork.process.taskCompletion', handleProcessCompletion)
      })
    } catch (err) {
      console.error('Error submitting account form:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle form cancellation
  const handleCancel = async () => {
    try {
      await onCancel()

      // Dispatch process continue event for cancellation (pause)
      dispatchProcessContinueEvent('pse_pause', null)
    } catch (err) {
      console.error('Error cancelling account form:', err)
    }
  }

  return (
    <div className="gba:h-full gba:flex gba:flex-col gba:max-w-md gba:mx-auto gba:p-6">
      <div className="gba:h-full gba:flex gba:flex-col" data-testid={formatDataTestId(prefixDataTestId, 'Form')}>
        {/* Form Fields Container - Takes up available space */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-8">
          {/* Account Information Section */}
          <AccountInformationSection />

          {/* Related Contacts Selection - Multiple contacts can be associated */}
          <div className="gba:space-y-2">
            <ContactSelect
              value={formValues.contactIds}
              onChange={contactIds => setFormValues({ contactIds })}
              dataTestId={formatDataTestId(prefixDataTestId, 'contact-selector')}
              error={null}
              contacts={contacts}
              contactsLoading={contactsLoading}
              contactsError={contactsError}
              searchContacts={searchContacts}
            />
          </div>

          {/* Address Information Section */}
          <AddressInformationSection />

          {/* Financial Information Section */}
          <FinancialInformationSection />

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
              disabled={!isFormValid || isLoading || isSubmitting}
              className="gba:flex-1"
              size="lg"
              onClick={handleSubmit}
              data-testid={formatDataTestId(prefixDataTestId, 'submit-button')}
            >
              {formValues.id ? 'Update Account' : 'Create Account'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AccountFormComponent
