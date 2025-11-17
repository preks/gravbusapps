import { useState, useCallback, useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Spinner, type WizardStep } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppActionForm } from '@/components/app-action-form'

// Import central schema
import {
  leadConvertSchema,
  type LeadConvertSchema
} from '@/common/components/common-relations/schemas/leadConvertSchema'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Form data type (alias for central schema)
type ConvertLeadFormData = LeadConvertSchema

// Props interface (directly in component file)
interface ConvertInvestmentLeadFormProps extends BusinessAppContextProps {
  onCancel?: () => void
  onSuccess?: () => void
}

// Import central hooks
import { useGetInvestmentAccounts } from '@/common/data/investment/hooks/useInvestmentAccounts'
import { useGetInvestmentContacts } from '@/common/data/investment/hooks/useInvestmentContacts'
import { useInvestmentLead } from '@/common/data/investment/hooks/useInvestmentLead'

// Import utilities
import { getAccountInitialValues, getContactInitialValues, getOpportunityInitialValues } from './utils'
import { buildInvestmentLeadConvertPayload } from '@/common/data/investment/types/investmentLeadTypes'
import {
  checkFormReadiness,
  setValidationErrors
} from '@/common/components/common-relations/form-segments/lead-convert-segment/utils/validationUtils'

// Import layouts and segments
import { LeadConvertSegment } from '@/common/components/common-relations/form-segments/lead-convert-segment'
import {
  LeadConvertAccountStep,
  LeadConvertContactStep,
  LeadConvertOpportunityStep
} from '@/common/components/common-relations/form-layouts/lead-convert-layout'
import { FormProvider } from 'react-hook-form'
import { CatalogSelect } from '@/components/catalog-select'
import { createAccountSegmentResolver } from '@/common/components/common-relations/schemas/accountSchema'
import { createContactSegmentResolver } from '@/common/components/common-relations/schemas/contactSchema'
import { createOpportunitySegmentResolver } from '@/common/components/common-relations/schemas/opportunitySchema'

export const ConvertInvestmentLeadForm = ({
  accessToken,
  userInfo,
  additionalData,
  onSuccess
}: ConvertInvestmentLeadFormProps) => {
  // Extract leadId from additionalData
  const actualLeadId = additionalData?.leadId || additionalData?.psi_taskPayload?.psi_initialParameters?.leadId || ''

  // Business app context
  const businessAppContext = { accessToken, userInfo }

  // React Hook Form setup
  const form = useForm<ConvertLeadFormData>({
    resolver: zodResolver(leadConvertSchema),
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

  // Watch form values for legacy compatibility
  const formData = form.watch()

  // Load lead data using central hook
  const { lead: leadData, loading } = useInvestmentLead(businessAppContext, actualLeadId)

  // Separate forms for Account, Contact, Opportunity (used by layouts)
  const accountForm = useForm({
    resolver: createAccountSegmentResolver(),
    defaultValues: getAccountInitialValues(leadData) as any,
    mode: 'onChange'
  })

  const contactForm = useForm({
    resolver: createContactSegmentResolver(),
    defaultValues: getContactInitialValues(leadData) as any,
    mode: 'onChange'
  })

  const opportunityForm = useForm({
    resolver: createOpportunitySegmentResolver(),
    defaultValues: getOpportunityInitialValues(leadData) as any,
    mode: 'onChange'
  })

  // Update forms when leadData is loaded
  useEffect(() => {
    if (leadData) {
      accountForm.reset(getAccountInitialValues(leadData) as any)
      contactForm.reset(getContactInitialValues(leadData) as any)
      opportunityForm.reset(getOpportunityInitialValues(leadData) as any)
    }
  }, [leadData?.id, leadData, accountForm, contactForm, opportunityForm])

  // Store complete form data from nested forms for payload construction
  const [completeAccountData, setCompleteAccountData] = useState<Partial<any>>({})
  const [completeContactData, setCompleteContactData] = useState<Partial<any>>({})
  const [completeOpportunityData, setCompleteOpportunityData] = useState<Partial<any>>({})

  // Watch form changes and sync to main form
  useEffect(() => {
    const subscription = accountForm.watch(values => {
      if (values.name) form.setValue('accountName', values.name)
      if (values.ownerEmployeeId) form.setValue('accountOwner', values.ownerEmployeeId)
      if (values.legalFormRef) form.setValue('accountLegalForm', values.legalFormRef)
      if (values.industryClassRef) form.setValue('accountIndustry', values.industryClassRef)
      setCompleteAccountData(values as any)
    })
    return () => subscription.unsubscribe()
  }, [accountForm, form])

  useEffect(() => {
    const subscription = contactForm.watch(values => {
      if (values.firstName) form.setValue('contactFirstName', values.firstName)
      if (values.lastName) form.setValue('contactLastName', values.lastName)
      if (values.email) form.setValue('contactEmail', values.email)
      if (values.ownerEmployeeId) form.setValue('contactOwnerEmployeeId', values.ownerEmployeeId)
      setCompleteContactData(values as any)
    })
    return () => subscription.unsubscribe()
  }, [contactForm, form])

  useEffect(() => {
    const subscription = opportunityForm.watch(values => {
      if (values.opportunityName) form.setValue('opportunityName', values.opportunityName)
      if (values.ownerEmployeeId) form.setValue('opportunityOwner', values.ownerEmployeeId)
      if (values.pipelineRef) form.setValue('opportunityPipeline', values.pipelineRef)
      if (values.stageRef) form.setValue('opportunityPipelineStage', values.stageRef)
      if (values.estimatedAmount) form.setValue('opportunityEstimatedAmount', values.estimatedAmount)
      if (values.currency) form.setValue('opportunityCurrency', values.currency)
      setCompleteOpportunityData(values as any)
    })
    return () => subscription.unsubscribe()
  }, [opportunityForm, form])

  // Use central hooks with state management
  const {
    options: accounts,
    loading: isLoadingAccounts,
    search: searchAccounts
  } = useGetInvestmentAccounts(businessAppContext, { withState: true, autoFetch: true, mapToSelectOptions: true })

  const {
    options: contacts,
    loading: isLoadingContacts,
    search: searchContacts
  } = useGetInvestmentContacts(businessAppContext, { withState: true, autoFetch: true, mapToSelectOptions: true })

  // Pipeline catalogs and currencies - not needed for lead conversion
  // The OpportunityLayout will handle loading these internally if needed
  const pipelines: any[] = []
  const stages: any[] = []
  const stagesLoading = false
  const currencies: any[] = []
  const currenciesLoading = false
  const currenciesError = null
  const currenciesHasMore = false
  const searchCurrencies = () => {}
  const loadMoreCurrencies = () => {}

  // Helper function to check if form is ready for conversion - using watch for reactivity
  const formValues = form.watch()
  const isFormReadyForConversion = useCallback((): boolean => {
    return checkFormReadiness(formValues)
  }, [formValues])

  // Create dynamic wizard steps based on user choices
  const wizardSteps: WizardStep<LeadConvertSchema>[] = useMemo(() => {
    const steps: WizardStep<LeadConvertSchema>[] = []

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
        <LeadConvertSegment
          form={form}
          accounts={accounts as any}
          isLoadingAccounts={isLoadingAccounts}
          searchAccounts={searchAccounts}
          contacts={contacts as any}
          isLoadingContacts={isLoadingContacts}
          searchContacts={searchContacts}
        />
      )
    })

    // Step 2: Account Creation (if user chose to create new account)
    if (form.watch('accountOption') === 'create') {
      steps.push({
        id: 'create-account',
        title: 'Create Account',
        description: 'Enter new account details',
        fields: [],
        content: (
          <CatalogSelect.Provider {...businessAppContext} form={accountForm}>
            <FormProvider {...accountForm}>
              <LeadConvertAccountStep
                businessAppContext={businessAppContext}
                ownerEmployee={leadData?.ownerEmployee}
                addresses={undefined}
                annualRevenueCatalogIdentifier="AccountAnnualRevenueBand:v1"
                companySizeCatalogIdentifier="CompanySize:v1"
                uploadConfig={{
                  appName: 'irm',
                  accessScope: 'tenant',
                  getAvatarPath: id => `/accounts/${id || 'temp'}/pictures`
                }}
                contacts={contacts as any}
                contactsLoading={isLoadingContacts}
                contactsError={null}
                searchContacts={searchContacts}
                loading={loading}
              />
            </FormProvider>
          </CatalogSelect.Provider>
        )
      })
    }

    // Step N: Contact Creation (if user chose to create new contact)
    if (form.watch('contactOption') === 'create') {
      steps.push({
        id: 'create-contact',
        title: 'Create Contact',
        description: 'Enter new contact details',
        fields: [],
        content: (
          <CatalogSelect.Provider {...businessAppContext} form={contactForm}>
            <FormProvider {...contactForm}>
              <LeadConvertContactStep
                businessAppContext={businessAppContext}
                ownerEmployee={leadData?.ownerEmployee}
                addresses={undefined}
                accounts={accounts as any}
                accountsLoading={isLoadingAccounts}
                accountsError={null}
                searchAccounts={searchAccounts}
                loading={loading}
              />
            </FormProvider>
          </CatalogSelect.Provider>
        )
      })
    }

    // Step N: Opportunity Creation (if user chose to create opportunity)
    if (form.watch('createOpportunity')) {
      steps.push({
        id: 'create-opportunity',
        title: 'Create Opportunity',
        description: 'Enter new opportunity details',
        fields: [],
        content: (
          <CatalogSelect.Provider {...businessAppContext} form={opportunityForm}>
            <FormProvider {...opportunityForm}>
              <LeadConvertOpportunityStep
                businessAppContext={businessAppContext}
                ownerEmployee={leadData?.ownerEmployee}
                accountId={form.watch('selectedAccountId') || undefined}
                accounts={accounts as any}
                accountsLoading={isLoadingAccounts}
                accountsError={null}
                searchAccounts={searchAccounts}
                onAccountChange={accountId => {
                  const id = typeof accountId === 'object' && accountId ? accountId.id : accountId
                  if (id) {
                    opportunityForm.setValue('accountId', id)
                  }
                }}
                contacts={contacts as any}
                contactsLoading={isLoadingContacts}
                contactsError={null}
                searchContacts={searchContacts}
                onContactsChange={contactIds => {
                  const ids = contactIds.map(c => (typeof c === 'object' ? c.id : c))
                  opportunityForm.setValue('contactIds', ids)
                }}
                pipelines={pipelines.map((p: any) => ({
                  id: p.id,
                  value: p.value,
                  label: p.label || p.name,
                  name: p.name
                }))}
                stages={stages.map((s: any) => ({
                  id: s.id,
                  value: s.value,
                  label: s.label || s.name,
                  name: s.name
                }))}
                stagesLoading={stagesLoading}
                onPipelineChange={() => {}}
                currencies={currencies.map((c: any) => ({
                  id: c.id,
                  value: c.value,
                  label: c.label || c.name,
                  name: c.name
                }))}
                currenciesLoading={currenciesLoading}
                currenciesError={currenciesError}
                currenciesHasMore={currenciesHasMore}
                searchCurrencies={searchCurrencies}
                loadMoreCurrencies={loadMoreCurrencies}
                loading={loading}
              />
            </FormProvider>
          </CatalogSelect.Provider>
        )
      })
    }

    return steps
  }, [
    form,
    formData,
    businessAppContext,
    loading,
    leadData,
    actualLeadId,
    accounts,
    isLoadingAccounts,
    searchAccounts,
    contacts,
    isLoadingContacts,
    searchContacts,
    accountForm,
    contactForm,
    opportunityForm,
    pipelines,
    stages,
    stagesLoading,
    currencies,
    currenciesLoading,
    currenciesError,
    currenciesHasMore,
    searchCurrencies,
    loadMoreCurrencies
  ])

  const handleSubmit = useCallback(
    async (data: LeadConvertSchema): Promise<any> => {
      // Guard clause: Check if form is ready for conversion
      if (!isFormReadyForConversion()) {
        setValidationErrors(form, formValues)
        throw new Error('Form validation failed')
      }

      // Determine account, contact, opportunity objects based on form data
      const account =
        data.accountOption === 'match' && data.selectedAccountId
          ? { id: data.selectedAccountId }
          : data.accountOption === 'create'
            ? completeAccountData
            : undefined

      const contact =
        data.contactOption === 'match' && data.selectedContactId
          ? { id: data.selectedContactId }
          : data.contactOption === 'create'
            ? completeContactData
            : undefined

      const opportunity = data.createOpportunity ? completeOpportunityData : undefined

      // Build payload using simple builder
      return buildInvestmentLeadConvertPayload(actualLeadId, account, contact, opportunity)
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

  // Cancel is handled automatically by AppActionForm

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
        // Double-check validation before allowing submission
        if (!isFormReadyForConversion()) {
          return Promise.reject('Form validation failed')
        }

        return handleSubmit(data)
      }}
      onSuccess={onSuccess}
      formData={formData}
      form={form}
      wizardSteps={wizardSteps}
      showStepIndicator={true}
      allowStepJumping={false}
      submitButtonText={getTranslationFromI18nKeyAndLabel('crm:convertLead.convertLead', 'Convert Lead')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('common:button.cancel', 'Cancel')}
      data-testid="convert-lead-process-dialog"
      showSuccessMessage={false}
    >
      {/* Children required by AppActionForm - content is handled by wizard steps */}
      <div />
    </AppActionForm>
  )
}

export default ConvertInvestmentLeadForm

// Also export with the original name for backward compatibility
export { ConvertInvestmentLeadForm as ConvertLeadForm }
