import { useCallback, useMemo, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
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
  InvestmentProspectLayout,
  createDynamicInvestmentProspectSchema
} from '@/common/components/investment/form-layouts/investment-prospect-layout'
import { createInvestmentOpportunitySchema } from '@/common/components/investment/form-layouts/investment-prospect-layout/investmentProspectSchema'
import { useInvestmentTypes } from '@/common/data/investment/hooks/useInvestmentTypes'
import {
  mapToSingleInvestmentTypeId,
  mapFromSingleInvestmentTypeId
} from '@/common/components/investment/form-layouts/investment-prospect-layout/utils/investmentTypeMapper'
import {
  extractProspectFieldsFromFormValues,
  extractProspectFieldsFromEntity
} from '@/common/components/investment/form-layouts/investment-prospect-layout/utils/extractProspectFields'

// IRM-specific schema extension for Opportunity (adds investment fields)
const baseInvestmentOpportunitySchema = opportunitySchema.extend({
  investmentName: z.string().min(1, 'Investment Name is required'),
  dealType: z.string().nullable().optional()
})

// Create investment opportunity schema with investmentTypeId
const investmentOpportunitySchema = createInvestmentOpportunitySchema(baseInvestmentOpportunitySchema)

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
      // Convert group/type to investmentTypeId if lead has them
      ...((leadData as any)?.investmentGroupRef || (leadData as any)?.investmentTypeRef
        ? {
            investmentTypeId: null as string | null // Will be set below
          }
        : {})
    }
  }, [leadData?.id, leadData])

  // Investment Types Hook - provides hierarchy and field definitions
  // Use 'prospect' fieldType to get referenceFields for opportunity conversion
  const {
    getTypesByLevel,
    getTypesByParent,
    getPathByType,
    getInvestmentFieldsByType,
    loading: investmentTypesLoading
  } = useInvestmentTypes(businessAppContext, 'prospect')

  // Convert group/type to investmentTypeId for baseOpportunityValues
  const baseOpportunityValuesWithTypeId = useMemo(() => {
    if (
      baseOpportunityValues.investmentGroupRef ||
      baseOpportunityValues.investmentTypeRef ||
      (leadData as any)?.investmentGroupRef ||
      (leadData as any)?.investmentTypeRef
    ) {
      const groupId = baseOpportunityValues.investmentGroupRef || (leadData as any)?.investmentGroupRef || null
      const typeId = baseOpportunityValues.investmentTypeRef || (leadData as any)?.investmentTypeRef || null
      const investmentTypeId = mapToSingleInvestmentTypeId(groupId, typeId, getPathByType)
      return {
        ...baseOpportunityValues,
        investmentTypeId: investmentTypeId || null
      }
    }
    return baseOpportunityValues
  }, [baseOpportunityValues, leadData, getPathByType])

  // Get initial effective type ID from baseOpportunityValues (before form is created)
  const initialEffectiveTypeId = baseOpportunityValuesWithTypeId.investmentTypeId || null

  // Get initial prospect fields configuration (referenceFields) for selected type
  const initialFormFieldsDefinition = useMemo(() => {
    if (!initialEffectiveTypeId) return null
    return getInvestmentFieldsByType(initialEffectiveTypeId)
  }, [initialEffectiveTypeId, getInvestmentFieldsByType])

  // Build initial dynamic schema
  const initialProspectSchema = useMemo(() => {
    const existingFields = new Set(Object.keys(investmentOpportunitySchema.shape))
    const dynamicFields = createDynamicInvestmentProspectSchema(initialFormFieldsDefinition || null, existingFields)
    return Object.keys(dynamicFields).length > 0
      ? investmentOpportunitySchema.extend(dynamicFields)
      : investmentOpportunitySchema
  }, [investmentOpportunitySchema, initialFormFieldsDefinition])

  // Opportunity form with base schema (will be updated when prospect schema is available)
  const opportunityForm = useForm<z.infer<typeof investmentOpportunitySchema>>({
    resolver: zodResolver(initialProspectSchema) as any,
    defaultValues: baseOpportunityValuesWithTypeId as any,
    mode: 'onChange'
  })

  // Watch investmentTypeId from form (after form is created)
  const watchedInvestmentTypeId = opportunityForm.watch('investmentTypeId')

  // Get effective type ID from form or initial value
  const effectiveTypeId = watchedInvestmentTypeId || initialEffectiveTypeId || null

  // Get prospect fields configuration (referenceFields) for selected type (reactive)
  const formFieldsDefinition = useMemo(() => {
    if (!effectiveTypeId) return initialFormFieldsDefinition
    return getInvestmentFieldsByType(effectiveTypeId)
  }, [effectiveTypeId, getInvestmentFieldsByType, initialFormFieldsDefinition])

  // Determine if we need to wait for formFieldsDefinition to be ready
  // If we have an effectiveTypeId, we need to wait for formFieldsDefinition to be loaded (or confirmed as null)
  // If we don't have an effectiveTypeId, we don't need to wait
  const isFormFieldsDefinitionLoading =
    effectiveTypeId !== null && formFieldsDefinition === undefined && investmentTypesLoading

  // Show loading state until everything is ready for opportunity step
  const isOpportunityFormReady = !loading && !isFormFieldsDefinitionLoading && !investmentTypesLoading

  // Build dynamic schema (reactive)
  const prospectSchema = useMemo(() => {
    const existingFields = new Set(Object.keys(investmentOpportunitySchema.shape))
    const dynamicFields = createDynamicInvestmentProspectSchema(formFieldsDefinition || null, existingFields)
    return Object.keys(dynamicFields).length > 0
      ? investmentOpportunitySchema.extend(dynamicFields)
      : investmentOpportunitySchema
  }, [investmentOpportunitySchema, formFieldsDefinition])

  // Update opportunity form resolver when schema changes
  useEffect(() => {
    if (opportunityForm && prospectSchema) {
      ;(opportunityForm.control._options as any).resolver = zodResolver(prospectSchema) as any
    }
  }, [opportunityForm, prospectSchema])

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

      // Convert group/type to investmentTypeId FIRST if lead has them
      // investmentTypeId is the single source of truth
      const groupId = (leadData as any)?.investmentGroupRef || null
      const typeId = (leadData as any)?.investmentTypeRef || null
      const investmentTypeId = mapToSingleInvestmentTypeId(groupId, typeId, getPathByType)

      // Get formFieldsDefinition for this specific investmentTypeId (not the component-level one)
      const effectiveFormFieldsDefinition = investmentTypeId ? getInvestmentFieldsByType(investmentTypeId) : null

      // Extract dynamic fields using the calculated formFieldsDefinition
      const dynamicFieldValues = extractProspectFieldsFromEntity(leadData, effectiveFormFieldsDefinition)

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
        investmentRoleRef: (leadData as any)?.investmentRoleRef || '',
        investmentStakeTypeRef: (leadData as any)?.investmentStakeTypeRef || '',
        investmentTypeId: investmentTypeId || null,
        ...dynamicFieldValues
      }

      opportunityForm.reset(allOpportunityValues as any)

      leadDataRef.current = leadData?.id
    }
  }, [leadData?.id, accountForm, contactForm, opportunityForm, getPathByType, getInvestmentFieldsByType])

  // Update opportunity form when prospect schema changes (including when formFieldsDefinition becomes available)
  // Track previous schema keys to avoid unnecessary resets
  const previousProspectSchemaKeysRef = useRef<string[]>([])
  const previousFormFieldsDefinitionRef = useRef<typeof formFieldsDefinition>(null)

  // Helper: Update dynamic fields from lead data
  const updateDynamicFieldsFromLeadData = useCallback(() => {
    if (!opportunityForm) return null

    const currentValues = opportunityForm.getValues()
    const updatedValues = { ...currentValues }

    // Get investmentTypeId from form values first
    const formInvestmentTypeId = currentValues.investmentTypeId || null

    // Calculate investmentTypeId from leadData if not in form
    // ALWAYS preserve investmentTypeId - it's the single source of truth
    let leadInvestmentTypeId = formInvestmentTypeId
    if (!leadInvestmentTypeId && leadData) {
      const groupId = (leadData as any)?.investmentGroupRef || null
      const typeId = (leadData as any)?.investmentTypeRef || null
      leadInvestmentTypeId = mapToSingleInvestmentTypeId(groupId, typeId, getPathByType)
    }

    // Always set investmentTypeId in updatedValues to preserve it
    if (leadInvestmentTypeId) {
      updatedValues.investmentTypeId = leadInvestmentTypeId
    }

    // Get formFieldsDefinition for this specific investmentTypeId (fallback to component-level if not available)
    const effectiveFormFieldsDefinition = leadInvestmentTypeId
      ? getInvestmentFieldsByType(leadInvestmentTypeId)
      : formFieldsDefinition

    if (!effectiveFormFieldsDefinition) return null

    if (effectiveFormFieldsDefinition.formFields) {
      for (const group of effectiveFormFieldsDefinition.formFields) {
        for (const field of group.fields) {
          const property = field.property
          const value = leadData && property && property in leadData ? (leadData as any)[property] : undefined
          updatedValues[property] = value
        }
      }
    }

    const hasChanges = JSON.stringify(currentValues) !== JSON.stringify(updatedValues)
    return hasChanges ? updatedValues : null
  }, [
    opportunityForm,
    formFieldsDefinition,
    leadData,
    getInvestmentFieldsByType,
    getPathByType,
    mapToSingleInvestmentTypeId
  ])

  useEffect(() => {
    if (!opportunityForm || !prospectSchema) return

    // Wait for formFieldsDefinition if we have an effectiveTypeId
    if (effectiveTypeId && !formFieldsDefinition && investmentTypesLoading) return

    const currentSchemaKeys = Object.keys(prospectSchema.shape)
    const schemaChanged = JSON.stringify(previousProspectSchemaKeysRef.current) !== JSON.stringify(currentSchemaKeys)

    // Detect when formFieldsDefinition changes from null to a value (or vice versa)
    const formFieldsDefinitionChanged =
      (previousFormFieldsDefinitionRef.current === null && formFieldsDefinition !== null) ||
      (previousFormFieldsDefinitionRef.current !== null && formFieldsDefinition === null) ||
      previousFormFieldsDefinitionRef.current !== formFieldsDefinition

    if (schemaChanged || formFieldsDefinitionChanged) {
      previousProspectSchemaKeysRef.current = currentSchemaKeys
      previousFormFieldsDefinitionRef.current = formFieldsDefinition
      const updatedValues = updateDynamicFieldsFromLeadData()
      if (updatedValues) {
        opportunityForm.reset(updatedValues as any)
      }
    }
  }, [
    prospectSchema,
    opportunityForm,
    formFieldsDefinition,
    leadData,
    effectiveTypeId,
    investmentTypesLoading,
    updateDynamicFieldsFromLeadData
  ])

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
  // NOTE: This must be defined AFTER opportunityForm is initialized (which happens at line 213)
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
        form: accountForm,
        formSchema: accountSchema,
        content: (
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
              avatarFileRef={accountAvatarFileRef}
            />
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
        form: contactForm,
        formSchema: contactSchema,
        content: (
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
              avatarFileRef={contactAvatarFileRef}
            />
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
        form: opportunityForm,
        formSchema: prospectSchema,
        content: (
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
              loading={!isOpportunityFormReady}
              pipelineCatalogIdentifier={OPPORTUNITY_PIPELINE}
              stageCatalogIdentifier={OPPORTUNITY_PIPELINE_STAGE}
              opportunityStatusCatalogIdentifier={OPPORTUNITY_STATUS}
              opportunityForecastCatalogIdentifier={OPPORTUNITY_FORECAST}
              customSegments={[
                {
                  id: 'investment-prospect',
                  title: 'Investment Information',
                  content: (
                    <InvestmentProspectLayout
                      businessAppContext={businessAppContext}
                      formFieldsDefinition={formFieldsDefinition}
                      investmentCatalogLoading={investmentTypesLoading}
                      getTypesByLevel={getTypesByLevel}
                      getTypesByParent={getTypesByParent}
                      getPathByType={getPathByType}
                      currencySymbol="€"
                      testIdPrefix={formatDataTestId('convert-investment-lead-form', 'investment-prospect')}
                    />
                  )
                }
              ]}
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
    baseOpportunityValuesWithTypeId.investmentTypeId,
    formFieldsDefinition ? JSON.stringify(formFieldsDefinition) : null,
    investmentTypesLoading,
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
            const prospectFields = extractProspectFieldsFromFormValues(opportunityValues, formFieldsDefinition)

            // Convert investmentTypeId back to group/type for payload
            const investmentTypeId = opportunityValues.investmentTypeId
            const { groupId, typeId } = mapFromSingleInvestmentTypeId(investmentTypeId, getPathByType)

            return {
              ...opportunityValues,
              ...prospectFields,
              // Remove investmentTypeId from payload (not part of API)
              investmentTypeId: undefined,
              // Add group/type for payload
              investmentGroupRef: groupId,
              investmentTypeRef: typeId
            } as Partial<InvestmentOpportunity>
          })()
        : undefined

      // Build payload using simple builder
      const finalPayload = buildInvestmentLeadConvertPayload(actualLeadId, account, contact, opportunity)

      return finalPayload
    },
    [
      actualLeadId,
      isFormReadyForConversion,
      form,
      accountForm,
      contactForm,
      opportunityForm,
      extractProspectFieldsFromFormValues,
      formFieldsDefinition,
      getPathByType
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
      schema={prospectSchema as any}
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
