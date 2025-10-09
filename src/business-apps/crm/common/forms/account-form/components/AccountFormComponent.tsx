import React from 'react'
import { useAccountFormContext } from '../context/AccountFormContext'
import { Button, Alert, AlertDescription, Spinner } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import AccountInformationSection from './AccountInformationSection'
import CompanyInformationSection from './CompanyInformationSection'
import ContactInformationSection from './ContactInformationSection'
import AddressInformationSection from './AddressInformationSection'
import FinancialInformationSection from './FinancialInformationSection'

const prefixDataTestId = 'AccountForm'

const AccountFormComponent: React.FC = () => {
  const { formValues, onSubmit, onCancel, isLoading, error, addressLineCount } = useAccountFormContext()

  // Check if all mandatory fields are filled
  const isFormValid = formValues.owner && formValues.legalForm && formValues.accountName

  // Helper function to convert values to strings safely
  const toStringOrUndefined = (value: string | undefined): string | undefined => {
    return value && value.trim() ? value.trim() : undefined
  }

  // Handle form submission
  const handleSubmit = async () => {
    try {
      // Determine if this is an update or create operation
      const isUpdate = formValues.id

      // Prepare comprehensive account payload following the API structure
      const accountPayload: any = {
        sourceApp: 'CRM',
        accountName: toStringOrUndefined(formValues.accountName),
        parentAccountRef: toStringOrUndefined(formValues.parentAccount),
        legalFormRef: toStringOrUndefined(formValues.legalForm),
        industryRef: toStringOrUndefined(formValues.industry),
        website: toStringOrUndefined(formValues.website),
        description: toStringOrUndefined(formValues.description),
        salesCampaign: toStringOrUndefined(formValues.salesCampaignId),
        phone: toStringOrUndefined(formValues.phone),
        email: toStringOrUndefined(formValues.email),
        fax: toStringOrUndefined(formValues.fax),
        countryRef: toStringOrUndefined(formValues.country),
        regionRef: toStringOrUndefined(formValues.region),
        addressLine: undefined, // Will be set from addresses array below
        postalCode: toStringOrUndefined(formValues.postalCode),
        city: toStringOrUndefined(formValues.city),
        annualRevenue: toStringOrUndefined(formValues.annualRevenue),
        numberOfEmployeesRef: toStringOrUndefined(formValues.numberOfEmployees),
        currencyRef: toStringOrUndefined(formValues.currency),
        //  timeZoneRef: toStringOrUndefined(formValues.timeZone),
        foundationDate: toStringOrUndefined(formValues.foundationDate),
        tickerSymbol: toStringOrUndefined(formValues.tickerSymbol),
        sicCode: toStringOrUndefined(formValues.sicCode),
        ownerEmployee: toStringOrUndefined(formValues.owner),
        ownerOrganization: undefined // Will be set by backend based on owner employee
      }

      // For updates, include the account ID and version
      if (isUpdate) {
        accountPayload.id = formValues.id
        if (formValues.version !== undefined) {
          accountPayload.version = formValues.version
        }
      }

      // Build addresses array from dynamic addresses
      const addresses: any[] = []

      // Process dynamic addresses (new implementation)
      if (formValues.addresses && formValues.addresses.length > 0) {
        formValues.addresses.forEach(address => {
          // Filter out empty address lines
          const nonEmptyLines = address.addressLines.map(line => toStringOrUndefined(line)).filter(line => line)

          nonEmptyLines.forEach(addressLine => {
            addresses.push({
              addressType: address.addressType || 'UNKNOWN_ADDRESS',
              addressLine: addressLine,
              postalCode: toStringOrUndefined(address.postalCode),
              city: toStringOrUndefined(address.city),
              regionRef: toStringOrUndefined(address.region),
              countryRef: toStringOrUndefined(address.country)
            })
          })

          // If no address lines but other address data exists, create one address with empty addressLine
          if (
            nonEmptyLines.length === 0 &&
            (toStringOrUndefined(address.city) ||
              toStringOrUndefined(address.postalCode) ||
              toStringOrUndefined(address.region) ||
              toStringOrUndefined(address.country))
          ) {
            addresses.push({
              addressType: address.addressType || 'UNKNOWN_ADDRESS',
              addressLine: '',
              postalCode: toStringOrUndefined(address.postalCode),
              city: toStringOrUndefined(address.city),
              regionRef: toStringOrUndefined(address.region),
              countryRef: toStringOrUndefined(address.country)
            })
          }
        })
      }

      // Set addresses to null if empty, otherwise use the addresses array
      accountPayload.addresses = addresses.length > 0 ? addresses : null

      // Set the main addressLine field from the first address (for backward compatibility)
      if (addresses.length > 0) {
        accountPayload.addressLine = addresses[0].addressLine
      } else {
        accountPayload.addressLine = null
      }

      accountPayload.tags = []

      // Determine change mode based on whether we have an ID
      const changeMode = isUpdate ? 'UPDATE' : 'INSERT'

      const payload = {
        account: accountPayload,
        changeMode: changeMode
      }

      // Dispatch process continue event on successful submission
      console.log('✅ Account form dispatching pse_submit event with payload:', payload)
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

          {/* Company Information Section */}
          <CompanyInformationSection />

          {/* Contact Information Section */}
          <ContactInformationSection />

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

        {/* Submit and Cancel Buttons - Fixed at bottom */}
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
      </div>
    </div>
  )
}

export default AccountFormComponent
