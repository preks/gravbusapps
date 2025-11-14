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
import { buildInvestmentAccountPayload } from '@/common/data/investment/payloads'

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

  // Handle form submission
  const handleSubmit = async () => {
    // Prevent duplicate submissions
    if (isLoading || isSubmitting) {
      return
    }

    setIsSubmitting(true)
    try {
      // ✅ Determine operation mode based on account ID presence
      const isUpdate = formValues.id && formValues.id.trim()

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

      // ✅ Build addresses array (IRM-specific structure)
      const addresses =
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

            // Only include ID and version when updating an existing account
            if (isUpdate && addr.id && addr.id !== 'default-address') {
              addressPayload.id = addr.id
              if (addr.version !== undefined && addr.version !== null) {
                addressPayload.version = addr.version
              }
            }

            return addressPayload
          }) || []

      // ✅ NEW: Use centralized payload builder for IRM Account
      const { investmentAccount } = buildInvestmentAccountPayload(
        {
          ...formValues,
          communicationChannels: communicationChannels.length > 0 ? communicationChannels : undefined,
          addresses: addresses.length > 0 ? addresses : undefined
        },
        { isUpdate: Boolean(isUpdate) }
      )

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

      // ✅ Create final payload structure with accountContacts
      const cleanPayload = {
        investmentAccount: {
          ...investmentAccount,
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
