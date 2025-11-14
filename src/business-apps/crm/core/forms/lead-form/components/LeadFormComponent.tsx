import React from 'react'
import { Button, Label, Alert, AlertDescription } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { useLeadFormContext } from '../context/LeadFormContext'
import { toStringOrUndefined } from '../utils/validationUtils'
// no joinAddressLines needed anymore
import OwnerSelector from './OwnerSelector'
import LeadInformationSection from './LeadInformationSection'
import ContactInformationSection from './ContactInformationSection'
import CompanyInformationSection from './CompanyInformationSection'
import { buildCommunicationChannelRef } from '@/common/data/common/utils/communicationChannelHelpers'
import { CommunicationChannelCode } from '@/common/data/common/types/commonTypes'
import { buildCustomerLeadPayload } from '@/common/data/customer/payloads'

const prefixDataTestId = 'LeadForm'

const LeadFormComponent: React.FC = () => {
  const {
    formValues,
    onSubmit,
    onCancel,
    isLoading,
    error,
    setFormValues,
    employeePositions,
    employeePositionsLoading,
    employeePositionsError,
    employeePositionsHasMore,
    loadMoreEmployeePositions,
    searchEmployeePositions
  } = useLeadFormContext()

  // Check if all mandatory fields are filled
  const isFormValid =
    toStringOrUndefined(formValues.firstName) &&
    toStringOrUndefined(formValues.lastName) &&
    toStringOrUndefined(formValues.company) &&
    toStringOrUndefined(formValues.owner)

  // Handle form submission
  const handleSubmit = async () => {
    try {
      await onSubmit(formValues)

      // Customer Leads: API expects addressLine as string
      // Compose from form's dynamic address inputs into a single string (join by newline)
      const collectedLines: string[] = []
      // Build addresses array from dynamic addresses
      const addresses: any[] = []
      if (formValues.addresses && formValues.addresses.length > 0) {
        formValues.addresses.forEach(address => {
          const nonEmptyLines = (address.addressLines || [])
            .map(line => toStringOrUndefined(line))
            .filter((line): line is string => !!line)

          // Collect for flat string
          collectedLines.push(...nonEmptyLines)

          // Preserve addresses array entries (one per line, as before)
          nonEmptyLines.forEach(addressLine => {
            addresses.push({
              addressType: address.addressType || 'UNKNOWN_ADDRESS',
              addressLine,
              postalCode: toStringOrUndefined(address.postalCode),
              city: toStringOrUndefined(address.city),
              regionRef: toStringOrUndefined(address.region),
              countryRef: toStringOrUndefined(address.country)
            })
          })

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
      // Fallback from single addressLine field (support multi-line via newline split)
      const singleLine = toStringOrUndefined((formValues as any).addressLine)
      if (singleLine) {
        collectedLines.push(
          ...singleLine
            .split(/\r?\n/)
            .map(s => s.trim())
            .filter(s => s.length > 0)
        )
      }

      const addressString = collectedLines.join('\n')
      leadPayload.addressLine = addressString || null
      leadPayload.addresses = addresses.length > 0 ? addresses : null

      // Initialize empty arrays for tags
      leadPayload.tags = []

      // Add communication channels for LinkedIn and Xing (like IRM)
      const communicationChannels = []

      // Add LinkedIn communication channel if provided
      if (formValues.linkedinUrl?.trim()) {
        communicationChannels.push({
          communicationChannelRef: buildCommunicationChannelRef(CommunicationChannelCode.LINKEDIN),
          value: formValues.linkedinUrl.trim(),
          valueExtension: null,
          source: 'FORM_INPUT',
          activeFrom: new Date().toISOString(),
          activeTo: null
        })
      }

      // Add Xing communication channel if provided
      if (formValues.xingUrl?.trim()) {
        communicationChannels.push({
          communicationChannelRef: buildCommunicationChannelRef(CommunicationChannelCode.XING),
          value: formValues.xingUrl.trim(),
          valueExtension: null,
          source: 'FORM_INPUT',
          activeFrom: new Date().toISOString(),
          activeTo: null
        })
      }

      // ✅ Use centralized payload builder for CRM Lead
      const isUpdate = !!formValues.id
      const { customerLead } = buildCustomerLeadPayload(
        {
          ...formValues,
          companySize: formValues.numberOfEmployees, // Maps to numberOfEmployeesRef
          industry: formValues.industry, // Maps to industryRef
          annualRevenue: formValues.annualRevenue, // Maps to annualRevenueRef
          owner: formValues.owner, // Maps to ownerEmployee
          // Address fields
          addressLine: addressString || undefined,
          addresses: addresses.length > 0 ? addresses : undefined,
          // Communication channels
          communicationChannels: communicationChannels.length > 0 ? communicationChannels : undefined
        },
        { isUpdate }
      )

      // Use UPDATE mode if editing existing lead, INSERT for new lead
      const changeMode = isUpdate ? 'UPDATE' : 'INSERT'

      const payload = {
        lead: customerLead,
        changeMode: changeMode
      }

      // Dispatch process continue event on successful submission
      dispatchProcessContinueEvent('pse_submit', payload)
    } catch (err) {
      console.error('Error submitting lead form:', err)
    }
  }

  // Handle form cancellation
  const handleCancel = async () => {
    try {
      await onCancel()

      // Dispatch process continue event for cancellation (pause)
      dispatchProcessContinueEvent('pse_pause', null)
    } catch (err) {
      console.error('Error cancelling lead form:', err)
    }
  }

  return (
    <div className="gba:h-full gba:flex gba:flex-col gba:max-w-md gba:mx-auto gba:p-6">
      <div className="gba:h-full gba:flex gba:flex-col" data-testid={formatDataTestId(prefixDataTestId, 'Form')}>
        {/* Form Fields Container - Takes up available space */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-8">
          {/* Owner - Same pattern as contact form */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">
              Owner <span className="gba:text-red-500">*</span>
            </Label>
            <OwnerSelector
              value={formValues.owner}
              onChange={value => setFormValues({ owner: value })}
              employees={employeePositions}
              loading={employeePositionsLoading}
              hasMore={employeePositionsHasMore}
              onLoadMore={loadMoreEmployeePositions}
              onSearch={searchEmployeePositions}
              error={employeePositionsError}
              dataTestId={formatDataTestId(prefixDataTestId, 'OwnerSelector')}
            />
          </div>

          {/* Lead Information Section */}
          <LeadInformationSection />

          {/* Contact Information Section */}
          <ContactInformationSection />

          {/* Company Information Section */}
          <CompanyInformationSection />

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
            {isLoading ? 'Processing...' : formValues.id ? 'Update Lead' : 'Create Lead'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default LeadFormComponent
