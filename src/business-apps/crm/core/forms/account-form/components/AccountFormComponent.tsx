import React from 'react'
import { useAccountFormContext } from '../context/AccountFormContext'
import { Button, Alert, AlertDescription, Spinner } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import AccountInformationSection from './AccountInformationSection'
import AddressInformationSection from './AddressInformationSection'
import FinancialInformationSection from './FinancialInformationSection'
import ContactSelect from '@/common/components/common-relations/selects/contact-select/ContactSelect'
import { buildCommunicationChannelRef } from '@/common/data/common/utils/communicationChannelHelpers'
import { CommunicationChannelCode } from '@/common/data/common/types/commonTypes'
import { buildCustomerAccountPayload } from '@/common/data/customer/payloads'

const prefixDataTestId = 'AccountForm'

const AccountFormComponent: React.FC = () => {
  const {
    formValues,
    onSubmit,
    onCancel,
    hideActions,
    isLoading,
    error,
    setFormValues,
    contacts,
    contactsLoading,
    contactsError,
    searchContacts
  } = useAccountFormContext()

  // Check if all mandatory fields are filled
  const isFormValid = formValues.owner && formValues.legalForm && formValues.accountName

  // Handle form submission
  const handleSubmit = async () => {
    try {
      // Determine if this is an update or create operation
      const isUpdate = formValues.id

      // ✅ Build communication channels array (Email, Phone)
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

      // ✅ Build addresses array
      const addresses =
        formValues.addresses
          ?.filter(
            addr =>
              // Only include addresses that have some content
              addr.addressLines.some(line => line.trim()) ||
              addr.postalCode.trim() ||
              addr.city.trim() ||
              addr.region.trim() ||
              addr.country.trim()
          )
          .map(addr => {
            const addressPayload: any = {
              addressType: addr.addressType || 'PRIMARY_ADDRESS',
              // ✅ CRM: addressLine is a String (join array into single line)
              addressLine: addr.addressLines.some(line => line.trim())
                ? addr.addressLines.filter(line => line.trim()).join(', ')
                : null,
              postalCode: addr.postalCode.trim() || null,
              city: addr.city.trim() || null,
              regionRef: addr.region.trim() || null,
              countryRef: addr.country.trim() || null
            }

            // Only include ID and version when updating an existing address
            // ✅ CRITICAL: Only include ID if it's a valid UUID (not temporary IDs like "address-0")
            const isValidUUID = (id: string) => {
              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
              return uuidRegex.test(id)
            }

            if (isUpdate && addr.id && addr.id !== 'default-address' && isValidUUID(addr.id)) {
              addressPayload.id = addr.id
              if (addr.version !== undefined && addr.version !== null) {
                addressPayload.version = addr.version
              }
            }

            return addressPayload
          }) || []

      // ✅ NEW: Use centralized payload builder for CRM Account
      const { customerAccount } = buildCustomerAccountPayload(
        {
          ...formValues,
          communicationChannels: communicationChannels.length > 0 ? communicationChannels : undefined,
          addresses: addresses.length > 0 ? addresses : undefined
        },
        { isUpdate }
      )

      // Determine change mode based on whether we have an ID
      const changeMode = isUpdate ? 'UPDATE' : 'INSERT'

      // ✅ Build accountContacts array with full association objects
      const accountContacts = (formValues.contactIds || []).map((contact: any) => {
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

      // ✅ Create final payload structure with accountContacts
      const payload = {
        account: {
          ...customerAccount,
          accountContacts: accountContacts // Include for both create and update
        },
        changeMode: changeMode
      }

      // Dispatch process continue event on successful submission
      dispatchProcessContinueEvent('pse_submit', payload)

      // Call the onSubmit callback after dispatching the process event
      // This ensures the process event is always dispatched even if onSubmit fails
      try {
        await onSubmit(formValues)
      } catch (submitError) {
        console.warn('onSubmit callback failed, but process event was dispatched:', submitError)
      }
    } catch (err) {
      console.error('Error submitting account form:', err)
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
              value={formValues.contactIds || []}
              onChange={contactIds => setFormValues({ contactIds })}
              dataTestId={formatDataTestId(prefixDataTestId, 'contact-selector')}
              error={null}
              contacts={contacts as any} // Type cast to handle SelectOption differences
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
              {formValues.id ? 'Update Account' : 'Create Account'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AccountFormComponent
