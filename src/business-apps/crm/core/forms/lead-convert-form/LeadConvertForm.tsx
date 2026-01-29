import { useMemo, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  type WizardStep,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  useWizard
} from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppActionForm } from '@/components/app-action-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  leadConvertSchema,
  type LeadConvertSchema
} from '@/common/components/common-relations/form-layouts/lead-convert-layout/leadConvertSchema'
import { accountSchema } from '@/common/components/common-relations/form-layouts/account-layout'
import { contactSchema } from '@/common/components/common-relations/form-layouts/contact-layout'
import {
  opportunitySchema,
  opportunitySchemaBase
} from '@/common/components/common-relations/form-layouts/opportunity-layout'
import { useCustomerAccountsList } from '@/common/data/customer/hooks/useCustomerAccounts'
import { useCustomerContactsList } from '@/common/data/customer/hooks/useCustomerContacts'
import { useCustomerLead } from '@/common/data/customer/hooks/useCustomerLead'
import {
  mapLeadToAccount,
  mapLeadToContact,
  mapLeadToOpportunity
} from '@/common/components/common-relations/form-layouts/lead-convert-layout/utils'
import { buildCustomerLeadConvertPayload } from '@/common/data/customer/types/customerLeadTypes'
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
import { CampaignSelect } from '@/common/components/customer/selects/campaign-select'
import { ErrorAlert } from '@/components/error-alert'
import { useFileClient } from '@/common/network/files/useFileClient'
import { buildFilePath } from '@/common/utils/fileUtils'
import { APP_NAME, FILE_ENTITY, FILE_CONTEXT } from '@/common/data/customer/constants/customerConstants'
import {
  COMPANY_SIZE,
  ANNUAL_REVENUE,
  ACCOUNT_PRIORITY,
  OPPORTUNITY_PIPELINE,
  OPPORTUNITY_PIPELINE_STAGE,
  OPPORTUNITY_STATUS,
  OPPORTUNITY_FORECAST
} from '@/common/data/customer/constants/customerCatalogs'
import type { CustomerAccount } from '@/common/data/customer/types/customerAccountTypes'
import type { CustomerContact } from '@/common/data/customer/types/customerContactTypes'
import type { CustomerOpportunity } from '@/common/data/customer/types/customerOpportunityTypes'
import type { SelectOption as AccountSelectOption } from '@/common/components/common-relations/selects/account-select'
import type { SelectOption as ContactSelectOption } from '@/common/components/common-relations/selects/contact-select'

// Helper functions to extract entity data from form
const getAccountFromFormData = (
  data: ConvertLeadFormData,
  accountForm: any
): Partial<CustomerAccount> | { id: string } | undefined => {
  if (data.accountOption === 'match' && data.selectedAccountId) {
    return { id: data.selectedAccountId }
  }
  if (data.accountOption === 'create') {
    const accountData = accountForm.getValues() as Partial<CustomerAccount>
    // Remove ownerEmployee object to prevent it from overwriting ownerEmployeeId mapping
    // buildPayload will correctly transform ownerEmployeeId -> { id: ownerEmployeeId }
    delete accountData.ownerEmployee
    return accountData
  }
  return undefined
}

const getContactFromFormData = (
  data: ConvertLeadFormData,
  contactForm: any
): Partial<CustomerContact> | { id: string } | undefined => {
  if (data.contactOption === 'match' && data.selectedContactId) {
    return { id: data.selectedContactId }
  }
  if (data.contactOption === 'create') {
    const contactData = contactForm.getValues() as Partial<CustomerContact>
    // Remove ownerEmployee object to prevent it from overwriting ownerEmployeeId mapping
    delete contactData.ownerEmployee
    return contactData
  }
  return undefined
}

interface StepVisibilityGuardProps {
  stepIndex: number
  children: ReactNode | ((isActive: boolean) => ReactNode)
}

const StepVisibilityGuard = ({ stepIndex, children }: StepVisibilityGuardProps) => {
  const { currentStep } = useWizard()
  const isActive = currentStep === stepIndex
  if (!isActive) {
    return null
  }
  if (typeof children === 'function') {
    return <>{(children as (active: boolean) => ReactNode)(isActive)}</>
  }
  return <>{children}</>
}

// CRM-specific schema extensions (adds salesCampaignId)
const customerAccountSchema = accountSchema.extend({
  salesCampaignId: z.string().nullable().optional()
})

const customerContactSchema = contactSchema.extend({
  salesCampaignId: z.string().nullable().optional()
})

// CRM-specific opportunity schema: Pipeline and Stage validation happens in submit handler
// Schema accepts optional values to prevent premature validation errors on render
const customerOpportunitySchema = opportunitySchemaBase
  .omit({
    opportunityPipelineRef: true,
    opportunityPipelineStageRef: true
  })
  .extend({
    // Optional in schema - validation happens in submit handler
    opportunityPipelineRef: z.string().nullable().optional(),
    opportunityPipelineStageRef: z.string().nullable().optional(),
    // CRM-specific field
    salesCampaignId: z.string().nullable().optional()
  })

type ConvertLeadFormData = LeadConvertSchema

interface ConvertLeadFormProps extends BusinessAppContextProps {
  onCancel?: () => void
  onSuccess?: () => void
}

export const LeadConvertForm = ({ accessToken, userInfo, additionalData, onSuccess }: ConvertLeadFormProps) => {
  // Extract leadId from additionalData
  const actualLeadId = additionalData?.leadId || additionalData?.psi_taskPayload?.psi_initialParameters?.leadId || ''

  // Business app context - memoized to prevent re-renders
  const businessAppContext = useMemo(
    () => ({ accessToken, userInfo, additionalData }),
    [accessToken, userInfo, additionalData]
  )

  // Main form for Step 1 (selection)
  const form = useForm<ConvertLeadFormData>({
    resolver: zodResolver(leadConvertSchema) as Resolver<ConvertLeadFormData>,
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
  const { lead: leadData, loading, error: leadError } = useCustomerLead(accessToken, actualLeadId)

  // Nested forms for entity creation with CRM-specific schemas
  const accountForm = useForm<z.infer<typeof customerAccountSchema>>({
    resolver: zodResolver(customerAccountSchema) as Resolver<z.infer<typeof customerAccountSchema>>,
    defaultValues: {
      ...mapLeadToAccount(leadData),
      salesCampaignId: (leadData as any)?.salesCampaignId || undefined
    },
    mode: 'onChange'
  })

  const contactForm = useForm<z.infer<typeof customerContactSchema>>({
    resolver: zodResolver(customerContactSchema) as Resolver<z.infer<typeof customerContactSchema>>,
    defaultValues: {
      ...mapLeadToContact(leadData),
      salesCampaignId: (leadData as any)?.salesCampaignId || undefined
    },
    mode: 'onChange'
  })

  const opportunityForm = useForm<z.infer<typeof customerOpportunitySchema>>({
    resolver: zodResolver(customerOpportunitySchema) as Resolver<z.infer<typeof customerOpportunitySchema>>,
    defaultValues: {
      ...mapLeadToOpportunity(leadData),
      // Ensure pipeline and stage have empty string defaults (required fields in CRM)
      opportunityPipelineRef: mapLeadToOpportunity(leadData).opportunityPipelineRef || '',
      opportunityPipelineStageRef: mapLeadToOpportunity(leadData).opportunityPipelineStageRef || '',
      salesCampaignId: (leadData as any)?.salesCampaignId || undefined
    },
    mode: 'onChange'
  })

  // Update forms when leadData is loaded
  useEffect(() => {
    if (leadData?.id) {
      accountForm.reset({
        ...mapLeadToAccount(leadData),
        salesCampaignId: (leadData as any)?.salesCampaignId || undefined
      })
      contactForm.reset({
        ...mapLeadToContact(leadData),
        salesCampaignId: (leadData as any)?.salesCampaignId || undefined
      })
      opportunityForm.reset({
        ...mapLeadToOpportunity(leadData),
        // Ensure pipeline and stage have empty string defaults (required fields in CRM)
        opportunityPipelineRef: mapLeadToOpportunity(leadData).opportunityPipelineRef || '',
        opportunityPipelineStageRef: mapLeadToOpportunity(leadData).opportunityPipelineStageRef || '',
        salesCampaignId: (leadData as any)?.salesCampaignId || undefined
      })
    }
  }, [leadData?.id, accountForm, contactForm, opportunityForm])

  // File client for avatar uploads
  const fileClient = useFileClient({ accessToken, userInfo, additionalData })

  // Refs to store current file and thumbnail from AvatarUpload (no re-renders)
  const accountAvatarFileRef = useRef<{ file: File; thumbnail: string } | null>(null)
  const contactAvatarFileRef = useRef<{ file: File; thumbnail: string } | null>(null)

  // Use central hooks for accounts and contacts - extract refetch directly
  const {
    accounts: accountsList,
    total: accountsTotal,
    loading: accountsLoading,
    error: accountsError,
    refetch: refetchAccounts
  } = useCustomerAccountsList(businessAppContext, { limit: 20 })

  const {
    contacts: contactsList,
    total: contactsTotal,
    loading: contactsLoading,
    error: contactsError,
    refetch: refetchContacts
  } = useCustomerContactsList(businessAppContext, { limit: 20 })

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

  // Campaign Select component factory - memoized to prevent re-renders
  // MUST be defined BEFORE currentRenderValues to avoid "Cannot access before initialization" error
  const createCampaignSelectField = useCallback(
    (formControl: any, formName: string) => (
      <FormField
        control={formControl}
        name={formName}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Sales Campaign</FormLabel>
            <FormControl>
              <CampaignSelect
                value={field.value || null}
                onValueChange={(v: string | null) => field.onChange(v || '')}
                businessAppContext={businessAppContext}
                selectedCampaign={null}
                placeholder="Search Campaign..."
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    ),
    [businessAppContext]
  )

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
  const wizardSteps: WizardStep<ConvertLeadFormData>[] = useMemo(() => {
    const steps: WizardStep<ConvertLeadFormData>[] = []

    const wrapWithStepGuard = (index: number, content: ReactNode | ((isActive: boolean) => ReactNode)) => (
      <StepVisibilityGuard stepIndex={index}>{content}</StepVisibilityGuard>
    )

    // Step 1: Always present - Choice step with all options
    const choiceStepIndex = steps.length
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
      content: wrapWithStepGuard(
        choiceStepIndex,
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
      const stepIndex = steps.length
      steps.push({
        id: 'create-account',
        title: 'Create Account',
        description: 'Enter new account details',
        form: accountForm,
        formSchema: accountSchema,
        content: wrapWithStepGuard(stepIndex, isActive => (
          <CatalogSelect.Provider {...businessAppContext} form={accountForm}>
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
              accountInformationCustomFields={createCampaignSelectField(accountForm.control, 'salesCampaignId')}
              avatarFileRef={accountAvatarFileRef}
              isActive={isActive}
            />
          </CatalogSelect.Provider>
        ))
      })
    }

    // Step 3: Contact Creation (if user chose to create new contact)
    if (contactOption === 'create') {
      const stepIndex = steps.length
      steps.push({
        id: 'create-contact',
        title: 'Create Contact',
        description: 'Enter new contact details',
        form: contactForm,
        formSchema: contactSchema,
        content: wrapWithStepGuard(
          stepIndex,
          <CatalogSelect.Provider {...businessAppContext} form={contactForm}>
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
              contactInformationCustomFields={createCampaignSelectField(contactForm.control, 'salesCampaignId')}
              avatarFileRef={contactAvatarFileRef}
            />
          </CatalogSelect.Provider>
        )
      })
    }

    // Step 4: Opportunity Creation (if user chose to create opportunity)
    if (createOpportunity) {
      const stepIndex = steps.length
      steps.push({
        id: 'create-opportunity',
        title: 'Create Opportunity',
        description: 'Enter new opportunity details',
        form: opportunityForm,
        formSchema: opportunitySchema,
        content: wrapWithStepGuard(
          stepIndex,
          <CatalogSelect.Provider {...businessAppContext} form={opportunityForm}>
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
              opportunityInformationCustomFields={createCampaignSelectField(opportunityForm.control, 'salesCampaignId')}
            />
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
    createCampaignSelectField,
    accountAvatarFileRef,
    contactAvatarFileRef,
    leadData?.ownerEmployee
  ])

  const handleSubmit = useCallback(
    async (data: ConvertLeadFormData): Promise<any> => {
      // Guard clause: Check if form is ready for conversion
      if (!isFormReadyForConversion()) {
        const currentValues = form.getValues()
        setValidationErrors(form, currentValues)
        throw new Error('Form validation failed')
      }

      // Determine account, contact, opportunity objects based on form data
      // Get form values directly when needed (like other forms - no subscriptions!)
      const account = getAccountFromFormData(data, accountForm)
      const contact = getContactFromFormData(data, contactForm)
      const opportunity = data.createOpportunity
        ? (() => {
            const opportunityData = opportunityForm.getValues() as Partial<CustomerOpportunity>

            // Validate required fields manually (CRM requirement: pipeline and stage are mandatory)
            if (!opportunityData.opportunityPipelineRef || opportunityData.opportunityPipelineRef.trim() === '') {
              opportunityForm.setError('opportunityPipelineRef', {
                type: 'manual',
                message: 'Pipeline is required'
              })
              throw new Error('Pipeline is required')
            }
            if (
              !opportunityData.opportunityPipelineStageRef ||
              opportunityData.opportunityPipelineStageRef.trim() === ''
            ) {
              opportunityForm.setError('opportunityPipelineStageRef', {
                type: 'manual',
                message: 'Stage is required'
              })
              throw new Error('Stage is required')
            }

            // Remove ownerEmployee object to prevent it from overwriting ownerEmployeeId mapping
            delete opportunityData.ownerEmployee
            return opportunityData
          })()
        : undefined

      // Debug logs
      console.log('[CRM Lead Convert] Raw data before payload builder:', {
        account,
        contact,
        opportunity
      })

      // Build payload using simple builder
      const finalPayload = buildCustomerLeadConvertPayload(actualLeadId, account, contact, opportunity)

      console.log('[CRM Lead Convert] Final payload after builder:', finalPayload)

      return finalPayload
    },
    [actualLeadId, isFormReadyForConversion, form, accountForm, contactForm, opportunityForm]
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
    return <ErrorAlert errors={errors} prefixDataTestId="convert-lead-form" />
  }

  return (
    <AppActionForm
      processType="create"
      formType="wizard"
      allowStepJumping={false}
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
      submitButtonText={getTranslationFromI18nKeyAndLabel('crm:convertLead.convertLead', 'Convert Lead')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('common:button.cancel', 'Cancel')}
      data-testid="convert-lead-process-dialog"
    >
      <></>
    </AppActionForm>
  )
}

export default LeadConvertForm
