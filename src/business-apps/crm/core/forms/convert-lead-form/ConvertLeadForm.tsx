import { useState, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Spinner, type WizardStep } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppActionForm } from '@/components/app-action-form'

// Import types
import { ConvertLeadFormData, convertLeadSchema, ConvertLeadFormProps } from './types'

// Import hooks
import { useAccountsList, useContactsList, useLeadData } from './hooks'

// Import utilities
import {
  getAccountInitialValues,
  getContactInitialValues,
  getOpportunityInitialValues,
  createSubmissionPayload,
  submitConversionForm,
  cancelConversionForm,
  checkFormReadiness,
  setValidationErrors
} from './utils'

// Import components
import { ChoicesStep, CreateAccountStep, CreateContactStep, CreateOpportunityStep } from './components'

// Import form types
import { AccountFormValues } from '../account-form/types'
import { ContactFormValues } from '../contact-form/types'
import { OpportunityFormValues } from '../opportunity-form/types'

export const ConvertLeadForm = ({ accessToken, userInfo, additionalData, onSuccess }: ConvertLeadFormProps) => {
  // React Hook Form setup
  const form = useForm<ConvertLeadFormData>({
    resolver: zodResolver(convertLeadSchema),
    defaultValues: {
      accountOption: 'create',
      contactOption: 'create',
      createOpportunity: false,
      // Initialize other fields as empty to ensure validation fails initially
      selectedAccountId: '',
      selectedAccountName: '',
      accountName: '',
      accountOwner: '',
      selectedContactId: '',
      selectedContactName: '',
      contactFirstName: '',
      contactLastName: '',
      contactEmail: '',
      opportunityName: ''
    }
  })

  // Store complete form data from wrappers for payload construction
  const [completeAccountData, setCompleteAccountData] = useState<Partial<AccountFormValues>>({})
  const [completeContactData, setCompleteContactData] = useState<Partial<ContactFormValues>>({})
  const [completeOpportunityData, setCompleteOpportunityData] = useState<Partial<OpportunityFormValues>>({})

  // Watch form values for legacy compatibility
  const formData = form.watch()

  // Load lead data
  const { leadData, loading, actualLeadId } = useLeadData(accessToken, additionalData)

  // Use dropdown hooks with infinite scrolling
  const {
    accounts,
    isLoading: isLoadingAccounts,
    hasMore: hasMoreAccounts,
    searchAccounts,
    loadMoreAccounts
  } = useAccountsList(accessToken)

  const {
    contacts,
    isLoading: isLoadingContacts,
    hasMore: hasMoreContacts,
    searchContacts,
    loadMoreContacts
  } = useContactsList(accessToken)

  // Form handlers for each step
  const handleAccountFormSubmit = useCallback(
    async (values: AccountFormValues) => {
      console.log('Account form submitted:', values)
      // Map AccountFormValues to individual form fields
      form.setValue('accountName', values.accountName)
      form.setValue('accountOwner', values.owner)
      form.setValue('accountLegalForm', values.legalForm)
      form.setValue('accountIndustry', values.industry)
      // CRM-specific: Sales Campaign
      if (values.salesCampaignId) {
        form.setValue('accountSalesCampaign', values.salesCampaignId)
      }
      form.setValue('accountOption', 'create')
      // Don't submit here, just store the data
    },
    [form]
  )

  // Auto-save handler for account form changes
  const handleAccountFormChange = useCallback(
    (values: Partial<AccountFormValues>) => {
      // Store complete account data for payload construction
      setCompleteAccountData(prev => ({ ...prev, ...values }))

      // Map basic fields to form for validation
      if (values.accountName !== undefined) form.setValue('accountName', values.accountName)
      if (values.owner !== undefined) form.setValue('accountOwner', values.owner)
      if (values.legalForm !== undefined) form.setValue('accountLegalForm', values.legalForm)
      if (values.industry !== undefined) form.setValue('accountIndustry', values.industry)
      // CRM-specific: Sales Campaign
      if (values.salesCampaignId !== undefined) form.setValue('accountSalesCampaign', values.salesCampaignId)
      form.setValue('accountOption', 'create')
    },
    [form]
  )

  // Auto-save handler for contact form changes
  const handleContactFormChange = useCallback(
    (values: Partial<ContactFormValues>) => {
      // Store complete contact data for payload construction
      setCompleteContactData(prev => ({ ...prev, ...values }))

      // Map basic fields to form for validation
      if (values.firstName !== undefined) form.setValue('contactFirstName', values.firstName)
      if (values.lastName !== undefined) form.setValue('contactLastName', values.lastName)
      if (values.email !== undefined) form.setValue('contactEmail', values.email)
      if (values.ownerEmployeeId !== undefined) form.setValue('contactOwnerEmployeeId', values.ownerEmployeeId)
      // CRM-specific: Sales Campaign
      if (values.salesCampaignId !== undefined) form.setValue('contactSalesCampaign', values.salesCampaignId)
      form.setValue('contactOption', 'create')
    },
    [form]
  )

  // Auto-save handler for opportunity form changes
  const handleOpportunityFormChange = useCallback(
    (values: Partial<OpportunityFormValues>) => {
      // Store complete opportunity data for payload construction
      setCompleteOpportunityData(prev => ({ ...prev, ...values }))

      // Map basic fields to form for validation
      if (values.name !== undefined) form.setValue('opportunityName', values.name)
      if (values.owner !== undefined) form.setValue('opportunityOwner', values.owner)
      if (values.pipeline !== undefined) form.setValue('opportunityPipeline', values.pipeline)
      if (values.status !== undefined) form.setValue('opportunityPipelineStage', values.status)
      if (values.estimatedAmount !== undefined) form.setValue('opportunityEstimatedAmount', values.estimatedAmount)
      if (values.currency !== undefined) form.setValue('opportunityCurrency', values.currency)
      // CRM-specific: Sales Campaign
      if (values.salesCampaignId !== undefined) form.setValue('opportunitySalesCampaign', values.salesCampaignId)
      form.setValue('createOpportunity', true)
    },
    [form]
  )

  const handleContactFormSubmit = useCallback(
    async (values: ContactFormValues) => {
      console.log('Contact form submitted:', values)
      // Map ContactFormValues to individual form fields
      form.setValue('contactFirstName', values.firstName)
      form.setValue('contactLastName', values.lastName)
      form.setValue('contactEmail', values.email)
      form.setValue('contactOwnerEmployeeId', values.ownerEmployeeId)
      // CRM-specific: Sales Campaign
      if (values.salesCampaignId) {
        form.setValue('contactSalesCampaign', values.salesCampaignId)
      }
      form.setValue('contactOption', 'create')
      // Don't submit here, just store the data
    },
    [form]
  )

  const handleOpportunityFormSubmit = useCallback(
    async (values: OpportunityFormValues) => {
      console.log('Opportunity form submitted:', values)
      // Map OpportunityFormValues to individual form fields
      form.setValue('opportunityName', values.name)
      form.setValue('opportunityOwner', values.owner)
      form.setValue('opportunityPipeline', values.pipeline)
      form.setValue('opportunityPipelineStage', values.status)
      form.setValue('opportunityEstimatedAmount', values.estimatedAmount)
      form.setValue('opportunityCurrency', values.currency)
      // CRM-specific: Sales Campaign
      if (values.salesCampaignId) {
        form.setValue('opportunitySalesCampaign', values.salesCampaignId)
      }
      form.setValue('createOpportunity', true)
      // Don't submit here, just store the data
    },
    [form]
  )

  // Helper function to check if form is ready for conversion - using watch for reactivity
  const formValues = form.watch()
  const isFormReadyForConversion = useCallback((): boolean => {
    return checkFormReadiness(formValues)
  }, [formValues])

  // Create dynamic wizard steps based on user choices
  const wizardSteps: WizardStep<ConvertLeadFormData>[] = useMemo(() => {
    const steps: WizardStep<ConvertLeadFormData>[] = []

    // Step 1: Always present - Choice step with all options
    steps.push({
      id: 'choices',
      title: 'Convert Lead',
      description: 'Choose how to convert this lead',
      fields: [
        'accountOption',
        'selectedAccountId',
        'selectedAccountName',
        'contactOption',
        'selectedContactId',
        'selectedContactName',
        'createOpportunity'
      ],
      content: (
        <ChoicesStep
          form={form}
          accounts={accounts}
          isLoadingAccounts={isLoadingAccounts}
          hasMoreAccounts={hasMoreAccounts}
          searchAccounts={searchAccounts}
          loadMoreAccounts={loadMoreAccounts}
          contacts={contacts}
          isLoadingContacts={isLoadingContacts}
          hasMoreContacts={hasMoreContacts}
          searchContacts={searchContacts}
          loadMoreContacts={loadMoreContacts}
        />
      )
    })

    // Step 2: Account Creation (if user chose to create new account)
    if (form.watch('accountOption') === 'create') {
      steps.push({
        id: 'create-account',
        title: 'Create Account',
        description: 'Enter new account details',
        fields: [], // Empty fields array - nested form handles its own validation
        content: (
          <CreateAccountStep
            key={`account-step-${actualLeadId}`}
            accessToken={accessToken}
            userInfo={userInfo}
            additionalData={additionalData}
            loading={loading}
            leadData={leadData}
            actualLeadId={actualLeadId}
            accountInitialValues={getAccountInitialValues(leadData)}
            onFormChange={handleAccountFormChange}
            onSubmit={handleAccountFormSubmit}
          />
        )
      })
    }

    // Step N: Contact Creation (if user chose to create new contact)
    if (form.watch('contactOption') === 'create') {
      steps.push({
        id: 'create-contact',
        title: 'Create Contact',
        description: 'Enter new contact details',
        fields: [], // Empty fields array - nested form handles its own validation
        content: (
          <CreateContactStep
            key={`contact-step-${actualLeadId}`}
            accessToken={accessToken}
            userInfo={userInfo}
            additionalData={additionalData}
            loading={loading}
            leadData={leadData}
            actualLeadId={actualLeadId}
            contactInitialValues={getContactInitialValues(leadData)}
            onFormChange={handleContactFormChange}
            onSubmit={handleContactFormSubmit}
          />
        )
      })
    }

    // Step N: Opportunity Creation (if user chose to create opportunity)
    if (form.watch('createOpportunity')) {
      steps.push({
        id: 'create-opportunity',
        title: 'Create Opportunity',
        description: 'Enter new opportunity details',
        fields: [], // Empty fields array - nested form handles its own validation
        content: (
          <CreateOpportunityStep
            key={`opportunity-step-${actualLeadId}`}
            accessToken={accessToken}
            userInfo={userInfo}
            additionalData={additionalData}
            loading={loading}
            leadData={leadData}
            actualLeadId={actualLeadId}
            opportunityInitialValues={getOpportunityInitialValues(leadData)}
            onFormChange={handleOpportunityFormChange}
            onSubmit={handleOpportunityFormSubmit}
          />
        )
      })
    }

    return steps
  }, [
    form,
    formData,
    accessToken,
    userInfo,
    additionalData,
    loading,
    leadData,
    actualLeadId,
    accounts,
    isLoadingAccounts,
    hasMoreAccounts,
    searchAccounts,
    loadMoreAccounts,
    contacts,
    isLoadingContacts,
    hasMoreContacts,
    searchContacts,
    loadMoreContacts,
    handleAccountFormChange,
    handleAccountFormSubmit,
    handleContactFormChange,
    handleContactFormSubmit,
    handleOpportunityFormChange,
    handleOpportunityFormSubmit
  ])

  const handleSubmit = useCallback(
    async (data: ConvertLeadFormData): Promise<any> => {
      console.log('🚀 Convert Lead Form Submission Started')
      console.log('Form data:', data)
      console.log('Complete Account Data:', completeAccountData)
      console.log('Complete Contact Data:', completeContactData)
      console.log('Complete Opportunity Data:', completeOpportunityData)

      // Guard clause: Check if form is ready for conversion
      const isReady = isFormReadyForConversion()
      console.log('Is form ready for conversion?', isReady)

      if (!isReady) {
        console.error('❌ Form validation failed')
        setValidationErrors(form, formValues)
        throw new Error('Form validation failed')
      }

      // Create submission payload
      console.log('📦 Creating submission payload...')
      const payload = createSubmissionPayload(
        data,
        completeAccountData,
        completeContactData,
        completeOpportunityData,
        actualLeadId,
        leadData // Pass lead data for owner fallback
      )

      console.log('✅ Payload created:', payload)

      // Submit the form (AppActionForm will handle the process event dispatch)
      console.log('📤 Submitting conversion form...')
      submitConversionForm(payload, onSuccess)

      console.log('✅ Conversion form submitted successfully')

      // Return success result for AppActionForm
      // AppActionForm will automatically dispatch the process continue event
      return payload
    },
    [
      actualLeadId,
      leadData,
      isFormReadyForConversion,
      formValues,
      form,
      formData,
      completeAccountData,
      completeContactData,
      completeOpportunityData
    ]
  )

  // Cancel function following CRM convert lead form pattern
  const handleDirectCancel = useCallback(() => {
    cancelConversionForm()
  }, [])

  if (loading) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid="convert-lead-loading">
        <Spinner className="gba:w-8 gba:h-8" />
        <div className="gba:mt-4">
          <p className="gba:text-sm gba:text-gray-600">
            {getTranslationFromI18nKeyAndLabel('common:loading', 'Loading...')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <AppActionForm
      processType="create"
      formType="wizard"
      onSubmit={data => {
        console.log('🎯 AppActionForm onSubmit triggered with data:', data)

        // Double-check validation before allowing submission
        const isReady = isFormReadyForConversion()
        console.log('Pre-submission check - Is form ready?', isReady)

        if (!isReady) {
          console.error('❌ Pre-submission validation failed')
          return Promise.reject(new Error('Form validation failed'))
        }

        console.log('✅ Pre-submission validation passed, calling handleSubmit')
        return handleSubmit(data)
      }}
      onSuccess={onSuccess}
      onCancel={handleDirectCancel}
      formData={formData}
      form={form}
      wizardSteps={wizardSteps}
      showStepIndicator={true}
      allowStepJumping={false}
      submitButtonText={getTranslationFromI18nKeyAndLabel('crm:convertLead.convertLead', 'Convert Lead')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('common:button.cancel', 'Cancel')}
      data-testid="convert-lead-process-dialog"
    >
      {/* Children required by AppActionForm - content is handled by wizard steps */}
      <div />
    </AppActionForm>
  )
}

export default ConvertLeadForm
