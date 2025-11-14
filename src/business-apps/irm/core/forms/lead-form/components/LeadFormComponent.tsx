import React from 'react'
import { Button, Label, Alert, AlertDescription } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { useLeadFormContext } from '../context/LeadFormContext'
import { toStringOrUndefined } from '../utils/validationUtils'
import OwnerSelector from './OwnerSelector'
import LeadInformationSection from './LeadInformationSection'
import ContactInformationSection from './ContactInformationSection'
import { buildCommunicationChannelRef } from '@/common/data/common/utils/communicationChannelHelpers'
import { CommunicationChannelCode } from '@/common/data/common/types/commonTypes'
import CompanyInformationSection from './CompanyInformationSection'
import { buildInvestmentLeadPayload } from '@/common/data/investment/payloads'

const prefixDataTestId = 'LeadForm'

const LeadFormComponent: React.FC = () => {
  const {
    formValues,
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

  // Local loading state for submission
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Check if all mandatory fields are filled
  const isFormValid =
    toStringOrUndefined(formValues.firstName) &&
    toStringOrUndefined(formValues.lastName) &&
    toStringOrUndefined(formValues.company) &&
    toStringOrUndefined(formValues.owner)

  // Handle form submission
  const handleSubmit = async () => {
    // Prevent duplicate submissions
    if (isLoading || isSubmitting) {
      return
    }

    setIsSubmitting(true)
    try {
      // ✅ Build addressLine structure (IRM-specific format)
      const addressLines = [
        formValues.addressLine1,
        formValues.addressLine2,
        formValues.addressLine3,
        formValues.addressLine4
      ]
        .filter(line => line && line.trim())
        .map(line => line!.trim())

      const addressLine = addressLines.length > 0 ? { lines: addressLines } : undefined

      // ✅ NEW: Add communication channels for LinkedIn and Xing
      const communicationChannels = []

      // Add LinkedIn communication channel if provided
      if (formValues.linkedinUrl && formValues.linkedinUrl.trim()) {
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
      if (formValues.xingUrl && formValues.xingUrl.trim()) {
        communicationChannels.push({
          communicationChannelRef: buildCommunicationChannelRef(CommunicationChannelCode.XING),
          value: formValues.xingUrl.trim(),
          valueExtension: null,
          source: 'FORM_INPUT',
          activeFrom: new Date().toISOString(),
          activeTo: null
        })
      }

      // ✅ Use centralized payload builder for IRM Lead
      const isUpdate = !!formValues.id
      const { investmentLead } = buildInvestmentLeadPayload(
        {
          ...formValues,
          owner: formValues.owner, // Maps to ownerEmployee
          companySize: formValues.numberOfEmployees, // Maps to companySizeRef
          industry: formValues.industry, // Maps to industryClassRef
          annualRevenue: formValues.annualRevenue, // Maps to accountAnnualRevenueBandRef
          // Address fields
          addressLine,
          // Communication channels
          communicationChannels: communicationChannels.length > 0 ? communicationChannels : undefined
        },
        { isUpdate }
      )

      // ✅ ADDED: Ensure numerical fields are properly set (API validation) - defaults to 0
      investmentLead.stakePercentage = investmentLead.stakePercentage || 0
      investmentLead.marketValue = investmentLead.marketValue || 0
      investmentLead.initialInvestmentAmount = investmentLead.initialInvestmentAmount || 0
      investmentLead.loanAmount = investmentLead.loanAmount || 0
      investmentLead.loanInterestRate = investmentLead.loanInterestRate || 0
      investmentLead.requiredCapitalAmount = investmentLead.requiredCapitalAmount || 0
      investmentLead.forecastedProfitAmount = investmentLead.forecastedProfitAmount || 0
      investmentLead.annualNetColdRent = investmentLead.annualNetColdRent || 0

      // Use UPDATE mode if editing existing lead, INSERT for new lead
      const changeMode = isUpdate ? 'UPDATE' : 'INSERT'

      const payload = {
        investmentLead,
        changeMode
      }

      // Dispatch process continue event on successful submission
      dispatchProcessContinueEvent('pse_submit', payload)

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
      console.error('Error submitting lead form:', err)
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
              dataTestId={formatDataTestId(prefixDataTestId, 'owner-selector-select')}
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
            data-testid={formatDataTestId(prefixDataTestId, 'cancel-button')}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            disabled={!isFormValid || isLoading || isSubmitting}
            className="gba:flex-1"
            size="lg"
            onClick={handleSubmit}
            data-testid={formatDataTestId(prefixDataTestId, 'submit-button')}
          >
            {formValues.id ? 'Update Lead' : 'Create Lead'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default LeadFormComponent
