import { useCallback, useMemo, useEffect, useRef } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { type WizardStep } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppActionForm } from '@/components/app-action-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  leadConvertSchema,
  type LeadConvertSchema
} from '@/common/components/common-relations/form-layouts/lead-convert-layout/leadConvertSchema'
import { accountSchema } from '@/common/components/common-relations/form-layouts/account-layout'
import { contactSchema } from '@/common/components/common-relations/form-layouts/contact-layout'
import { opportunitySchema } from '@/common/components/common-relations/form-layouts/opportunity-layout'
import { useInvestmentAccountsList } from '@/common/data/investment/hooks/useInvestmentAccounts'
import { useInvestmentContactsList } from '@/common/data/investment/hooks/useInvestmentContacts'
import { useInvestmentLead } from '@/common/data/investment/hooks/useInvestmentLead'
import {
  mapLeadToAccount,
  mapLeadToContact,
  mapLeadToOpportunity
} from '@/common/components/common-relations/form-layouts/lead-convert-layout/utils'
import { buildInvestmentLeadConvertPayload } from '@/common/data/investment/types/investmentLeadTypes'
import {
  checkFormReadiness,
  setValidationErrors
} from '@/common/components/common-relations/form-segments/lead-convert-segment/utils/validationUtils'
import { LeadConvertSegment } from '@/common/components/common-relations/form-segments/lead-convert-segment'
import {
  LeadConvertAccountStep,
  LeadConvertContactStep,
  LeadConvertOpportunityStep
} from '@/common/components/common-relations/form-layouts/lead-convert-layout'
import { CatalogSelect } from '@/components/catalog-select'
import { ErrorAlert } from '@/components/error-alert'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useFileClient } from '@/common/network/files/useFileClient'
import { buildFilePath } from '@/common/utils/fileUtils'
import { APP_NAME, FILE_ENTITY, FILE_CONTEXT } from '@/common/data/investment/constants/investmentConstants'
import {
  COMPANY_SIZE,
  ANNUAL_REVENUE,
  ACCOUNT_PRIORITY,
  OPPORTUNITY_PIPELINE,
  OPPORTUNITY_PIPELINE_STAGE,
  OPPORTUNITY_STATUS,
  OPPORTUNITY_FORECAST
} from '@/common/data/investment/constants/investmentCatalogs'
import type { InvestmentAccount } from '@/common/data/investment/types/investmentAccountTypes'
import type { InvestmentContact } from '@/common/data/investment/types/investmentContactTypes'
import type { InvestmentOpportunity } from '@/common/data/investment/types/investmentOpportunityTypes'
import type { SelectOption as AccountSelectOption } from '@/common/components/common-relations/selects/account-select'
import type { SelectOption as ContactSelectOption } from '@/common/components/common-relations/selects/contact-select'
import {
  InvestmentProspectSegment,
  useProspectFields,
  useInvestmentProspectForm
} from '@/common/components/investment/form-segments/investment-prospect-segment'

// IRM-specific schema extension for Opportunity (adds investment fields)
const investmentOpportunitySchema = opportunitySchema.extend({
  investmentName: z.string().min(1, 'Investment Name is required'),
  investmentGroupRef: z
    .union([
      z.string().min(1),
      z
        .object({ id: z.string().min(1), code: z.string().optional(), value: z.string().optional() })
        .catchall(z.unknown()),
      z.null()
    ])
    .optional(),
  investmentTypeRef: z
    .union([
      z.string().min(1),
      z
        .object({ id: z.string().min(1), code: z.string().optional(), value: z.string().optional() })
        .catchall(z.unknown()),
      z.null()
    ])
    .optional(),
  dealType: z.string().nullable().optional()
})

type ConvertLeadFormData = LeadConvertSchema

interface ConvertInvestmentLeadFormProps extends BusinessAppContextProps {
  onCancel?: () => void
  onSuccess?: () => void
}

export const ConvertInvestmentLeadForm = ({
  accessToken,
  userInfo,
  additionalData,
  onSuccess
}: ConvertInvestmentLeadFormProps) => {
  // Extract leadId from additionalData
  const actualLeadId = additionalData?.leadId || additionalData?.psi_taskPayload?.psi_initialParameters?.leadId || ''

  // Business app context - memoized to prevent re-renders
  const businessAppContext = useMemo(
    () => ({ accessToken, userInfo, additionalData }),
    [accessToken, userInfo, additionalData]
  )

  // Main form for Step 1 (selection)
  const form = useForm<ConvertLeadFormData>({
    resolver: zodResolver(leadConvertSchema),
    defaultValues: {
      accountOption: 'create',
      contactOption: 'create',
      createOpportunity: false
    }
  })

  // Watch only specific form fields (not entire form object)
  const accountOption = form.watch('accountOption')
  const contactOption = form.watch('contactOption')
  const createOpportunity = form.watch('createOpportunity')

  // Load lead data
  const { lead: leadData, loading, error: leadError } = useInvestmentLead(accessToken, actualLeadId)

  // Nested forms for entity creation
  const accountForm = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    defaultValues: mapLeadToAccount(leadData),
    mode: 'onChange'
  })

  const contactForm = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    defaultValues: mapLeadToContact(leadData),
    mode: 'onChange'
  })

  // Base opportunity values from lead - memoized to prevent re-renders
  // Use leadData?.id as dependency to only recalculate when lead actually changes
  // Common fields from mapper + IRM-specific investment fields
  const baseOpportunityValues = useMemo(() => {
    const commonValues = mapLeadToOpportunity(leadData)
    return {
      ...commonValues,
      // IRM-specific investment fields
      name: (leadData as any)?.investmentName || (leadData as any)?.companyName || commonValues.name || '',
      investmentName: (leadData as any)?.investmentName || '',
      dealType: 'INVESTMENT_DEAL',
      code: (leadData as any)?.code || '',
      estimatedAmount: (leadData as any)?.initialInvestmentAmount || commonValues.estimatedAmount,
      forecastedProfitAmount: (leadData as any)?.forecastedProfitAmount || undefined,
      initialInvestmentAmount: (leadData as any)?.initialInvestmentAmount || undefined,
      stakePercentage: (leadData as any)?.stakePercentage || undefined,
      loanAmount: (leadData as any)?.loanAmount || undefined,
      loanInterestRate: (leadData as any)?.loanInterestRate || undefined,
      marketValue: (leadData as any)?.marketValue || undefined,
      requiredCapitalAmount: (leadData as any)?.requiredCapitalAmount || undefined,
      annualNetColdRent: (leadData as any)?.annualNetColdRent || undefined,
      buildingYear: (leadData as any)?.buildingYear || undefined,
      size: (leadData as any)?.size || undefined,
      sizeMeasurementUnitRef: (leadData as any)?.sizeMeasurementUnitRef || '',
      investmentGroupRef: (leadData as any)?.investmentGroupRef || '',
      investmentRoleRef: (leadData as any)?.investmentRoleRef || '',
      investmentStakeTypeRef: (leadData as any)?.investmentStakeTypeRef || '',
      investmentTypeRef: (leadData as any)?.investmentTypeRef || ''
    }
  }, [leadData?.id, leadData])

  // Opportunity form with base schema (will be updated when prospect schema is available)
  const opportunityForm = useForm<z.infer<typeof investmentOpportunitySchema>>({
    resolver: zodResolver(investmentOpportunitySchema) as any,
    defaultValues: baseOpportunityValues as any,
    mode: 'onChange'
  })

  // Watch form values for Investment Prospect fields (reactive)
  const watchedGroupRef = opportunityForm.watch('investmentGroupRef')
  const watchedTypeRef = opportunityForm.watch('investmentTypeRef')

  // Prospect fields hook for dynamic schema (reactive with watched values)
  const {
    formFieldsDefinition,
    groups,
    types,
    configuration,
    loading: catalogLoading
  } = useProspectFields({
    accessToken,
    investmentGroupRef: (watchedGroupRef as string) || baseOpportunityValues.investmentGroupRef || null,
    investmentTypeRef: (watchedTypeRef as string) || baseOpportunityValues.investmentTypeRef || null
  })

  // Investment Prospect Form hook for dynamic schema management (reactive with formFieldsDefinition)
  const {
    schema: opportunitySchemaWithProspect,
    prospectSchema,
    extractDynamicFieldValuesFromEntity,
    updateDynamicFieldsInFormValues,
    extractProspectFieldsFromFormValues
  } = useInvestmentProspectForm({
    baseSchema: investmentOpportunitySchema,
    formFieldsDefinition: formFieldsDefinition || undefined,
    entity: baseOpportunityValues
  })

  // Update opportunity form resolver when schema changes
  useEffect(() => {
    if (opportunityForm && opportunitySchemaWithProspect) {
      ;(opportunityForm.control._options as any).resolver = zodResolver(opportunitySchemaWithProspect) as any
    }
  }, [opportunityForm, opportunitySchemaWithProspect])

  // File client for avatar uploads
  const fileClient = useFileClient({ accessToken, userInfo, additionalData })

  // Refs to store current file and thumbnail from AvatarUpload (no re-renders)
  const accountAvatarFileRef = useRef<{ file: File; thumbnail: string } | null>(null)
  const contactAvatarFileRef = useRef<{ file: File; thumbnail: string } | null>(null)

  // Update forms when leadData is loaded
  // Use leadDataRef to track if leadData actually changed (not just reference)
  const leadDataRef = useRef(leadData?.id)

  useEffect(() => {
    // Only reset forms if leadData ID actually changed
    if (leadData?.id && leadDataRef.current !== leadData?.id) {
      accountForm.reset(mapLeadToAccount(leadData))
      contactForm.reset(mapLeadToContact(leadData))

      // For opportunity: merge common values + IRM-specific fields + dynamic field values
      const commonValues = mapLeadToOpportunity(leadData)
      const dynamicFieldValues = extractDynamicFieldValuesFromEntity()
      const allOpportunityValues = {
        ...commonValues,
        // IRM-specific investment fields
        name: (leadData as any)?.investmentName || (leadData as any)?.companyName || commonValues.name || '',
        investmentName: (leadData as any)?.investmentName || '',
        dealType: 'INVESTMENT_DEAL',
        code: (leadData as any)?.code || '',
        estimatedAmount: (leadData as any)?.initialInvestmentAmount || commonValues.estimatedAmount,
        forecastedProfitAmount: (leadData as any)?.forecastedProfitAmount || undefined,
        initialInvestmentAmount: (leadData as any)?.initialInvestmentAmount || undefined,
        stakePercentage: (leadData as any)?.stakePercentage || undefined,
        loanAmount: (leadData as any)?.loanAmount || undefined,
        loanInterestRate: (leadData as any)?.loanInterestRate || undefined,
        marketValue: (leadData as any)?.marketValue || undefined,
        requiredCapitalAmount: (leadData as any)?.requiredCapitalAmount || undefined,
        annualNetColdRent: (leadData as any)?.annualNetColdRent || undefined,
        buildingYear: (leadData as any)?.buildingYear || undefined,
        size: (leadData as any)?.size || undefined,
        sizeMeasurementUnitRef: (leadData as any)?.sizeMeasurementUnitRef || '',
        investmentGroupRef: (leadData as any)?.investmentGroupRef || '',
        investmentRoleRef: (leadData as any)?.investmentRoleRef || '',
        investmentStakeTypeRef: (leadData as any)?.investmentStakeTypeRef || '',
        investmentTypeRef: (leadData as any)?.investmentTypeRef || '',
        ...dynamicFieldValues
      }
      opportunityForm.reset(allOpportunityValues as any)

      leadDataRef.current = leadData?.id
    }
  }, [leadData?.id, accountForm, contactForm, opportunityForm, extractDynamicFieldValuesFromEntity])

  // Update opportunity form when prospect schema changes (including when formFieldsDefinition becomes available)
  // Track previous schema keys to avoid unnecessary resets
  const previousProspectSchemaKeysRef = useRef<string[]>([])

  useEffect(() => {
    if (opportunityForm && prospectSchema && formFieldsDefinition) {
      const currentSchemaKeys = Object.keys(prospectSchema.shape)
      const schemaChanged = JSON.stringify(previousProspectSchemaKeysRef.current) !== JSON.stringify(currentSchemaKeys)

      if (schemaChanged) {
        previousProspectSchemaKeysRef.current = currentSchemaKeys

        const currentValues = opportunityForm.getValues()
        const updatedValues = updateDynamicFieldsInFormValues(currentValues)

        const hasChanges = JSON.stringify(currentValues) !== JSON.stringify(updatedValues)

        // Only reset if there are actual changes
        if (hasChanges) {
          opportunityForm.reset(updatedValues as any)
        }
      }
    }
  }, [prospectSchema, opportunityForm, updateDynamicFieldsInFormValues, formFieldsDefinition])

  // Use central hooks for accounts and contacts - extract refetch directly
  const {
    accounts: accountsList,
    total: accountsTotal,
    loading: accountsLoading,
    error: accountsError,
    refetch: refetchAccounts
  } = useInvestmentAccountsList(businessAppContext, { limit: 20 })

  const {
    contacts: contactsList,
    total: contactsTotal,
    loading: contactsLoading,
    error: contactsError,
    refetch: refetchContacts
  } = useInvestmentContactsList(businessAppContext, { limit: 20 })

  // Memoize search functions to prevent re-renders - use refetch directly
  const searchAccounts = useCallback(
    (search: string) => {
      refetchAccounts({ search, limit: 20, offset: 0 })
    },
    [refetchAccounts]
  )

  const searchContacts = useCallback(
    (search: string) => {
      refetchContacts({ search, limit: 20, offset: 0 })
    },
    [refetchContacts]
  )

  // Transform accounts to SelectOption[] (like AccountInformationSegment does)
  const accountOptions = useMemo<AccountSelectOption[]>(() => {
    if (!accountsList || accountsList.length === 0) return []

    return accountsList.map((account: any) => {
      const emailChannel = account.communicationChannels?.find(
        (ch: any) => ch.communicationChannel?.code === 'EMAIL' || ch.communicationChannelRef?.includes(':EMAIL')
      )
      const phoneChannel = account.communicationChannels?.find(
        (ch: any) => ch.communicationChannel?.code === 'PHONE' || ch.communicationChannelRef?.includes(':PHONE')
      )

      return {
        id: account.id || '',
        value: account.id || '',
        label: account.displayName || account.name || 'Unknown Account',
        name: account.displayName || account.name || 'Unknown Account',
        pictureThumbnail: account.pictureThumbnail || undefined,
        extraInfo: {
          email: emailChannel?.value || undefined,
          phone: phoneChannel?.value || undefined,
          website: account.website || undefined,
          businessKey: account.businessKey || undefined,
          code: account.code || undefined,
          ownerEmployee: account.ownerEmployee
            ? {
                firstName: account.ownerEmployee.firstName,
                lastName: account.ownerEmployee.lastName
              }
            : undefined
        }
      } as AccountSelectOption
    })
  }, [accountsList])

  // Transform contacts to SelectOption[] (like ContactInformationSegment does)
  const contactOptions = useMemo<ContactSelectOption[]>(() => {
    if (!contactsList || contactsList.length === 0) return []

    return contactsList.map((contact: any) => {
      const emailChannel = contact.communicationChannels?.find(
        (ch: any) => ch.communicationChannel?.code === 'EMAIL' || ch.communicationChannelRef?.includes(':EMAIL')
      )
      const email = emailChannel?.value || contact.email || undefined

      return {
        id: contact.id || '',
        value: contact.id || '',
        label: contact.fullName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unnamed Contact',
        name: contact.fullName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unnamed Contact',
        pictureThumbnail: contact.pictureThumbnail || undefined,
        extraInfo: {
          email,
          jobPosition: contact.jobPosition,
          department: contact.department,
          organizationalUnit: contact.ownerEmployee?.displayName || 'Unknown'
        }
      } as ContactSelectOption
    })
  }, [contactsList])

  // ALL HOOKS MUST BE CALLED BEFORE EARLY RETURN (Rules of Hooks)
  // Helper function to check if form is ready for conversion
  const isFormReadyForConversion = useCallback((): boolean => {
    const currentValues = form.getValues()
    return checkFormReadiness(currentValues)
  }, [form])

  // Handle pre-submit: Upload avatar files if present
  const handlePreSubmit = useCallback(
    async (formData: any) => {
      // Upload Account Avatar if creating new account
      if (formData.accountOption === 'create' && accountAvatarFileRef.current?.file) {
        const avatarData = accountAvatarFileRef.current
        try {
          const accountId = accountForm.getValues().id || null
          const folderPath = buildFilePath(FILE_ENTITY.ACCOUNT, accountId, FILE_CONTEXT.PICTURE)
          const pathParams = { accessScope: 'tenant' } as const
          const queryParams = {
            appName: APP_NAME,
            folderPath: folderPath,
            mimeType: avatarData.file.type || 'image/jpeg'
          }

          const uploadResponse = await fileClient.uploadFile(avatarData.file, pathParams, queryParams)

          // Add avatar data to accountForm
          accountForm.setValue('picture', JSON.stringify(uploadResponse.fileInfo))
          accountForm.setValue('pictureThumbnail', avatarData.thumbnail)
        } catch (error) {
          console.error('Failed to upload account avatar:', error)
          throw error
        }
      }

      // Upload Contact Avatar if creating new contact
      if (formData.contactOption === 'create' && contactAvatarFileRef.current?.file) {
        const avatarData = contactAvatarFileRef.current
        try {
          const contactId = contactForm.getValues().id || null
          const folderPath = buildFilePath(FILE_ENTITY.CONTACT, contactId, FILE_CONTEXT.PICTURE)
          const pathParams = { accessScope: 'tenant' } as const
          const queryParams = {
            appName: APP_NAME,
            folderPath: folderPath,
            mimeType: avatarData.file.type || 'image/jpeg'
          }

          const uploadResponse = await fileClient.uploadFile(avatarData.file, pathParams, queryParams)

          // Add avatar data to contactForm
          contactForm.setValue('picture', JSON.stringify(uploadResponse.fileInfo))
          contactForm.setValue('pictureThumbnail', avatarData.thumbnail)
        } catch (error) {
          console.error('Failed to upload contact avatar:', error)
          throw error
        }
      }

      return formData
    },
    [fileClient, accountForm, contactForm]
  )

  // Create dynamic wizard steps based on user choices - MEMOIZED to prevent re-creation on every render
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
          accounts={accountOptions}
          isLoadingAccounts={accountsLoading}
          searchAccounts={searchAccounts}
          contacts={contactOptions}
          isLoadingContacts={contactsLoading}
          searchContacts={searchContacts}
          loading={loading}
        />
      )
    })

    // Step 2: Account Creation (if user chose to create new account)
    if (accountOption === 'create') {
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
                annualRevenueCatalogIdentifier={ANNUAL_REVENUE}
                companySizeCatalogIdentifier={COMPANY_SIZE}
                accountPriorityCatalogIdentifier={ACCOUNT_PRIORITY}
                useContacts={{
                  contacts: contactsList,
                  loading: contactsLoading,
                  error: contactsError,
                  refetch: refetchContacts
                }}
                loading={loading}
                avatarFileRef={accountAvatarFileRef}
              />
            </FormProvider>
          </CatalogSelect.Provider>
        )
      })
    }

    // Step 3: Contact Creation (if user chose to create new contact)
    if (contactOption === 'create') {
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
                useAccounts={{
                  accounts: accountsList,
                  loading: accountsLoading,
                  error: accountsError,
                  refetch: refetchAccounts
                }}
                loading={loading}
                avatarFileRef={contactAvatarFileRef}
              />
            </FormProvider>
          </CatalogSelect.Provider>
        )
      })
    }

    // Step 4: Opportunity Creation (if user chose to create opportunity) - WITH Investment Prospect Segment
    if (createOpportunity) {
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
                useAccounts={{
                  accounts: accountsList,
                  total: accountsTotal,
                  loading: accountsLoading,
                  error: accountsError,
                  refetch: refetchAccounts
                }}
                useContacts={{
                  contacts: contactsList,
                  total: contactsTotal,
                  loading: contactsLoading,
                  error: contactsError,
                  refetch: refetchContacts
                }}
                loading={loading}
                pipelineCatalogIdentifier={OPPORTUNITY_PIPELINE}
                stageCatalogIdentifier={OPPORTUNITY_PIPELINE_STAGE}
                opportunityStatusCatalogIdentifier={OPPORTUNITY_STATUS}
                opportunityForecastCatalogIdentifier={OPPORTUNITY_FORECAST}
                customSegments={[
                  {
                    id: 'investment-prospect',
                    title: 'Investment Information',
                    content: (
                      <InvestmentProspectSegment
                        investmentGroupRef={
                          (watchedGroupRef as string) || baseOpportunityValues.investmentGroupRef || null
                        }
                        investmentTypeRef={
                          (watchedTypeRef as string) || baseOpportunityValues.investmentTypeRef || null
                        }
                        businessAppContext={businessAppContext}
                        testIdPrefix={formatDataTestId('convert-investment-lead-form', 'investment-prospect')}
                        configuration={configuration || null}
                        groups={groups}
                        types={types}
                        isLoading={catalogLoading}
                      />
                    )
                  }
                ]}
              />
            </FormProvider>
          </CatalogSelect.Provider>
        )
      })
    }

    return steps
  }, [
    accountOption,
    contactOption,
    createOpportunity,
    form,
    accountOptions,
    contactOptions,
    accountsLoading,
    contactsLoading,
    searchAccounts,
    searchContacts,
    businessAppContext,
    accountForm,
    contactForm,
    opportunityForm,
    leadData?.ownerEmployee?.id,
    contactsList.length,
    contactsTotal,
    contactsError,
    refetchContacts,
    accountsList.length,
    accountsTotal,
    accountsError,
    refetchAccounts,
    loading,
    watchedGroupRef,
    watchedTypeRef,
    baseOpportunityValues.investmentGroupRef,
    baseOpportunityValues.investmentTypeRef,
    configuration ? JSON.stringify(configuration) : null,
    groups.length,
    types.length,
    catalogLoading,
    accountAvatarFileRef,
    contactAvatarFileRef
  ])

  // Helper function to determine account object from form data
  const getAccountFromFormData = (data: LeadConvertSchema): Partial<InvestmentAccount> | { id: string } | undefined => {
    if (data.accountOption === 'match' && data.selectedAccountId) {
      return { id: data.selectedAccountId }
    }
    if (data.accountOption === 'create') {
      const accountData = accountForm.getValues() as Partial<InvestmentAccount>
      // Remove ownerEmployee object to prevent it from overwriting ownerEmployeeId mapping
      delete accountData.ownerEmployee
      return accountData
    }
    return undefined
  }

  // Helper function to determine contact object from form data
  const getContactFromFormData = (data: LeadConvertSchema): Partial<InvestmentContact> | { id: string } | undefined => {
    if (data.contactOption === 'match' && data.selectedContactId) {
      return { id: data.selectedContactId }
    }
    if (data.contactOption === 'create') {
      const contactData = contactForm.getValues() as Partial<InvestmentContact>
      // Remove ownerEmployee object to prevent it from overwriting ownerEmployeeId mapping
      delete contactData.ownerEmployee
      return contactData
    }
    return undefined
  }

  const handleSubmit = useCallback(
    async (data: LeadConvertSchema): Promise<any> => {
      // Guard clause: Check if form is ready for conversion
      if (!isFormReadyForConversion()) {
        const currentValues = form.getValues()
        setValidationErrors(form, currentValues)
        throw new Error('Form validation failed')
      }

      // Determine account, contact, opportunity objects based on form data
      // Get form values directly when needed (like other forms - no subscriptions!)
      const account = getAccountFromFormData(data)
      const contact = getContactFromFormData(data)

      // For opportunity: merge base form values with dynamic prospect fields
      const opportunity = data.createOpportunity
        ? (() => {
            const opportunityValues = opportunityForm.getValues()
            const prospectFields = extractProspectFieldsFromFormValues(opportunityValues)
            // Remove ownerEmployee object to prevent it from overwriting ownerEmployeeId mapping
            delete opportunityValues.ownerEmployee
            return {
              ...opportunityValues,
              ...prospectFields
            } as Partial<InvestmentOpportunity>
          })()
        : undefined

      // Debug logs
      console.log('[IRM Lead Convert] Raw data before payload builder:', { account, contact, opportunity })

      // Build payload using simple builder
      const finalPayload = buildInvestmentLeadConvertPayload(actualLeadId, account, contact, opportunity)

      console.log('[IRM Lead Convert] Final payload after builder:', finalPayload)

      return finalPayload
    },
    [
      actualLeadId,
      isFormReadyForConversion,
      form,
      accountForm,
      contactForm,
      opportunityForm,
      extractProspectFieldsFromFormValues
    ]
  )

  // Collect all errors for centralized early return (AFTER all hooks)
  const errors: Array<{ error?: string | Error; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) {
    errors.push({ type: 'accessToken' })
  }
  if (!loading && leadError) {
    errors.push({ error: leadError, context: 'Failed to load lead data' })
  }
  if (accountsError) {
    errors.push({ error: accountsError, context: 'Failed to load accounts' })
  }
  if (contactsError) {
    errors.push({ error: contactsError, context: 'Failed to load contacts' })
  }

  // Early return if any errors exist (now safe - all hooks called above)
  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId="convert-investment-lead-form" />
  }

  return (
    <AppActionForm
      processType="create"
      formType="wizard"
      onSubmit={data => {
        // Double-check validation before allowing submission
        if (!isFormReadyForConversion()) {
          return Promise.reject(new Error('Form validation failed'))
        }
        return handleSubmit(data)
      }}
      onSuccess={onSuccess}
      handlePreSubmit={handlePreSubmit}
      formData={form.getValues()}
      form={form}
      wizardSteps={wizardSteps}
      schema={opportunitySchemaWithProspect as any}
      submitButtonText={getTranslationFromI18nKeyAndLabel('crm:convertLead.convertLead', 'Convert Lead')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('common:button.cancel', 'Cancel')}
      data-testid="convert-lead-process-dialog"
    >
      {null}
    </AppActionForm>
  )
}

export default ConvertInvestmentLeadForm

// Also export with the original name for backward compatibility
export { ConvertInvestmentLeadForm as LeadConvertForm }
