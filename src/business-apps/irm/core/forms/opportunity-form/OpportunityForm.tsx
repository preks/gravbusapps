import React, { useEffect, useRef, useMemo, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentOpportunity } from '@/common/data/investment/hooks/useInvestmentOpportunity'
import {
  OpportunityLayout,
  opportunitySchema
} from '@/common/components/common-relations/form-layouts/opportunity-layout'
import {
  InvestmentProspectLayout,
  createDynamicInvestmentProspectSchema
} from '@/common/components/investment/form-layouts/investment-prospect-layout'
import {
  extractProspectFieldsFromFormValues,
  extractProspectFieldsFromEntity
} from '@/common/components/investment/form-layouts/investment-prospect-layout/utils/extractProspectFields'
import { useInvestmentTypes } from '@/common/data/investment/hooks/useInvestmentTypes'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import {
  mapToSingleInvestmentTypeId,
  mapFromSingleInvestmentTypeId
} from '@/common/components/investment/form-layouts/investment-prospect-layout/utils/investmentTypeMapper'
import { createInvestmentOpportunitySchema } from '@/common/components/investment/form-layouts/investment-prospect-layout/investmentProspectSchema'
import {
  type InvestmentOpportunity,
  buildInvestmentOpportunityPayload
} from '@/common/data/investment/types/investmentOpportunityTypes'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Combobox
} from '@newwork/nw-design-system'
import { useInvestmentAccountsList } from '@/common/data/investment/hooks/useInvestmentAccounts'
import { useInvestmentContactsList } from '@/common/data/investment/hooks/useInvestmentContacts'
import { useInvestment } from '@/common/data/investment/hooks/useInvestment.new'
import { useInvestments } from '@/common/data/investment/hooks/useInvestments.new'
import { mapInvestmentToInvestmentOpportunityValues } from '@/common/data/investment/utils/investmentToOpportunityMapper'
import { ErrorAlert } from '@/components/error-alert'
import { getCurrencySymbol } from '@/common/utils/numberFormatter'
import {
  OPPORTUNITY_PIPELINE,
  OPPORTUNITY_PIPELINE_STAGE,
  OPPORTUNITY_STATUS,
  OPPORTUNITY_FORECAST
} from '@/common/data/investment/constants/investmentCatalogs'

const prefixDataTestId = 'InvestmentOpportunityForm'

// Base investment opportunity schema (will be extended with investmentTypeId)
const baseInvestmentOpportunitySchema = opportunitySchema.extend({
  investmentName: z.string().min(1, 'Investment Name is required'),
  dealType: z.string().nullable().optional()
})

// Create investment opportunity schema with investmentTypeId
export const investmentOpportunitySchema = createInvestmentOpportunitySchema(baseInvestmentOpportunitySchema)

// Deal types for Investment Opportunities (matching backend enum values)
const DEAL_TYPES = [
  {
    id: 'INVESTMENT_DEAL',
    value: 'INVESTMENT_DEAL',
    label: 'Investment Deal',
    name: 'Investment Deal'
  },
  {
    id: 'DIVESTMENT_DEAL',
    value: 'DIVESTMENT_DEAL',
    label: 'Divestment Deal',
    name: 'Divestment Deal'
  },
  {
    id: 'UNKOWN_DEAL_TYPE',
    value: 'UNKOWN_DEAL_TYPE',
    label: 'Unknown Deal Type',
    name: 'Unknown Deal Type'
  }
] as const

type InvestmentOpportunityFormProps = BusinessAppContextProps

const InvestmentOpportunityForm: React.FC<InvestmentOpportunityFormProps> = ({
  accessToken,
  userInfo,
  additionalData
}) => {
  // Extract opportunityId from additionalData
  const opportunityId =
    additionalData?.opportunityId || additionalData?.psi_taskPayload?.psi_initialParameters?.opportunityId

  // Extract investmentId from additionalData (for divestment cases)
  const investmentId =
    additionalData?.investmentId || additionalData?.psi_taskPayload?.psi_initialParameters?.investmentId

  // Auto-set dealType to DIVESTMENT_DEAL if investmentId is provided but dealType is not explicitly set
  const dealType = additionalData?.dealType || additionalData?.psi_taskPayload?.psi_initialParameters?.dealType

  // Fetch opportunity data using declarative hook
  const { opportunity, loading, error } = useInvestmentOpportunity(accessToken || '', opportunityId)

  // Fetch investment data if investmentId is provided (for divestment cases) - using declarative hook
  const { investment, loading: investmentLoading } = useInvestment(accessToken || '', investmentId)

  // Combined loading state - show loading if we're fetching opportunity (edit mode) or investment (create mode with investmentId)
  const isLoading = loading || (investmentLoading && !!investmentId && !opportunity?.id)

  // ALL HOOKS MUST BE CALLED BEFORE EARLY RETURN (Rules of Hooks)
  // Account selection hook - using new declarative list hook
  const useAccounts = useInvestmentAccountsList({ accessToken, userInfo, additionalData }, { limit: 20 })

  // Contact selection hook - using new declarative list hook
  const useContacts = useInvestmentContactsList({ accessToken, userInfo, additionalData }, { limit: 20 })

  // Create form instance - resolver will be updated dynamically
  const form = useForm({
    defaultValues: mapToFormValues(opportunity || {}, investmentOpportunitySchema) as Partial<InvestmentOpportunity>,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  }) as any

  // Watch investmentTypeId from form (HEAD approach - working)
  const watchedInvestmentTypeId = form.watch('investmentTypeId')

  // Watch form values for divestment handling (develop approach)
  const watchedDealType = form.watch('dealType')
  const watchedInvestmentId = form.watch('investmentId')

  // Fetch investment data if watchedInvestmentId is provided (for divestment cases when user selects investment)
  const { investment: investmentFromForm } = useInvestment(accessToken || '', watchedInvestmentId)

  // Investment Types Hook - provides hierarchy and field definitions
  const businessAppContext = { accessToken, userInfo, additionalData }
  const {
    getTypesByLevel,
    getTypesByParent,
    getPathByType,
    getInvestmentFieldsByType,
    loading: investmentTypesLoading
  } = useInvestmentTypes(businessAppContext, 'prospect')

  // Get effective type ID from form or opportunity (HEAD approach)
  const effectiveTypeId = (watchedInvestmentTypeId as string) || opportunity?.investmentTypeId || null

  // Get prospect fields configuration (referenceFields) for selected type
  const formFieldsDefinition = useMemo(() => {
    if (!effectiveTypeId) {
      return null
    }
    return getInvestmentFieldsByType(effectiveTypeId)
  }, [effectiveTypeId, getInvestmentFieldsByType])

  // Determine if we need to wait for formFieldsDefinition to be ready
  // If we have an effectiveTypeId, we need to wait for formFieldsDefinition to be loaded (or confirmed as null)
  // If we don't have an effectiveTypeId, we don't need to wait
  const isFormFieldsDefinitionLoading =
    effectiveTypeId !== null && formFieldsDefinition === undefined && investmentTypesLoading

  // Show loading state until everything is ready
  const isFormReady = !isLoading && !isFormFieldsDefinitionLoading && !investmentTypesLoading

  // Build dynamic schema
  const prospectSchema = useMemo(() => {
    const existingFields = new Set(Object.keys(investmentOpportunitySchema.shape))
    const dynamicFields = createDynamicInvestmentProspectSchema(formFieldsDefinition || null, existingFields)
    return Object.keys(dynamicFields).length > 0
      ? investmentOpportunitySchema.extend(dynamicFields)
      : investmentOpportunitySchema
  }, [investmentOpportunitySchema, formFieldsDefinition])

  // Create resolver dynamically based on schema
  const formResolver = useMemo(() => {
    return zodResolver(prospectSchema) as any
  }, [prospectSchema])

  // Sync form when opportunity changes (like CRM OpportunityForm, but with dynamic field handling)
  const opportunityRef = useRef(opportunity)
  const previousSchemaKeysRef = useRef<string[]>([])
  const previousFormFieldsDefinitionRef = useRef<typeof formFieldsDefinition>(null)
  const investmentLoadedRef = useRef(false)
  const mappedInvestmentValuesRef = useRef<Partial<InvestmentOpportunity> | null>(null)

  // Fetch investments list for selection (only when dealType is DIVESTMENT_DEAL and no initial investmentId)
  const { investments, loading: investmentsLoading } = useInvestments(accessToken || '', { limit: 100 }, 'list')

  // Convert investments to Combobox options
  const investmentOptions = useMemo(() => {
    return investments
      .filter(inv => inv.id) // Filter out investments without ID
      .map(inv => ({
        value: inv.id!,
        label: inv.name || inv.id!
      }))
  }, [investments])

  // Load investment data and map to opportunity form values for divestment cases
  useEffect(() => {
    // Map if we have investment data, dealType is DIVESTMENT_DEAL, no existing opportunity (create mode), haven't loaded yet,
    // AND formFieldsDefinition is loaded (to ensure dynamic fields are in schema)
    const shouldMap =
      (investmentFromForm || investment) &&
      (watchedDealType || dealType) === 'DIVESTMENT_DEAL' &&
      (watchedInvestmentId || investmentId) &&
      !opportunity?.id &&
      !investmentLoadedRef.current &&
      !investmentTypesLoading &&
      formFieldsDefinition !== undefined // Wait for definition to be loaded (can be null, but must be defined)

    if (shouldMap) {
      try {
        const investmentToMap = investmentFromForm || investment
        if (!investmentToMap) return

        const investmentIdToUse = watchedInvestmentId || investmentId

        // Type assertion needed because useInvestment returns Investment from investmentTypes.new
        // but mapper expects Investment from investmentTypes (both are compatible at runtime)
        const mappedValues = mapInvestmentToInvestmentOpportunityValues(investmentToMap as any)
        const currentUserEmployeeId = userInfo?.employeeDetails?.employeeId

        // Store mapped values for later use when schema updates
        mappedInvestmentValuesRef.current = mappedValues

        // Mapped values already contain both static and dynamic fields (from mapper)
        // Merge with existing form values and ensure dealType is set
        const mergedValues = {
          ...form.getValues(),
          ...mappedValues,
          dealType: 'DIVESTMENT_DEAL',
          investmentId: investmentIdToUse,
          ownerEmployeeId: mappedValues.ownerEmployeeId || currentUserEmployeeId || ''
        }

        form.reset(mergedValues as Partial<InvestmentOpportunity>)
        investmentLoadedRef.current = true
      } catch (err) {
        console.error('[OpportunityForm] Error mapping investment data for divestment:', err)
      }
    }

    // Reset investment loaded flag when investmentId changes (user selected different investment)
    if (watchedInvestmentId && watchedInvestmentId !== investmentId && investmentLoadedRef.current) {
      investmentLoadedRef.current = false
      mappedInvestmentValuesRef.current = null
    }
  }, [
    investmentFromForm,
    investment,
    watchedInvestmentId,
    investmentId,
    watchedDealType,
    dealType,
    opportunity?.id,
    form,
    userInfo?.employeeDetails?.employeeId,
    formFieldsDefinition,
    prospectSchema,
    investmentTypesLoading
  ])

  // Helper: Update form resolver
  const updateResolver = useCallback(() => {
    if (form && formResolver && form.control._options.resolver !== formResolver) {
      form.control._options.resolver = formResolver
    }
  }, [form, formResolver])

  // Helper: Check if schema changed
  const checkSchemaChanged = useCallback((): boolean => {
    const currentKeys = Object.keys(prospectSchema.shape)
    const changed = JSON.stringify(previousSchemaKeysRef.current) !== JSON.stringify(currentKeys)
    if (changed) {
      previousSchemaKeysRef.current = currentKeys
    }
    return changed
  }, [prospectSchema])

  // Helper: Build investmentTypeId from opportunity
  const buildInvestmentTypeIdFromOpportunity = useCallback(
    (opportunityData: typeof opportunity): string | null => {
      if (!opportunityData) return null
      if (opportunityData.investmentTypeId) return opportunityData.investmentTypeId
      if ((opportunityData.investmentGroupRef || opportunityData.investmentTypeRef) && getPathByType) {
        const groupId = opportunityData.investmentGroupRef || null
        const typeId = opportunityData.investmentTypeRef || null
        return mapToSingleInvestmentTypeId(groupId, typeId, getPathByType)
      }
      return null
    },
    [getPathByType]
  )

  // Helper: Build form values when entity ID changes
  const buildFormValuesFromOpportunity = useCallback(() => {
    const baseValues = mapToFormValues(opportunity || {}, prospectSchema)

    // Calculate investmentTypeId FIRST from opportunity data
    const investmentTypeId = buildInvestmentTypeIdFromOpportunity(opportunity)

    // Get formFieldsDefinition for this specific investmentTypeId (not the component-level one)
    const effectiveFormFieldsDefinition = investmentTypeId ? getInvestmentFieldsByType(investmentTypeId) : null

    // Extract dynamic fields using the calculated formFieldsDefinition
    const dynamicFieldValues = extractProspectFieldsFromEntity(opportunity, effectiveFormFieldsDefinition)

    const currentUserEmployeeId = userInfo?.employeeDetails?.employeeId

    // investmentTypeId is the single source of truth
    // InvestmentProspectLayout will derive baseTypeId (group) from investmentTypeId
    if (investmentTypeId) {
      baseValues.investmentTypeId = investmentTypeId
    }

    const mergedValues = {
      ...baseValues,
      ...dynamicFieldValues,
      ownerEmployeeId: (baseValues.ownerEmployeeId || currentUserEmployeeId || '') as string,
      dealType: baseValues.dealType || dealType || undefined,
      ...(investmentId ? { investmentId: investmentId } : {})
    }
    return mergedValues
  }, [
    opportunity,
    prospectSchema,
    userInfo,
    buildInvestmentTypeIdFromOpportunity,
    getInvestmentFieldsByType,
    dealType,
    investmentId
  ])

  // Helper: Update dynamic fields when schema changes
  const updateDynamicFieldsFromOpportunity = useCallback(() => {
    const currentValues = form.getValues()
    const updatedValues = { ...currentValues }

    // Get investmentTypeId from form values first
    const formInvestmentTypeId = currentValues.investmentTypeId || null

    // Calculate investmentTypeId from opportunity if not in form
    // ALWAYS preserve investmentTypeId - it's the single source of truth
    const opportunityInvestmentTypeId = formInvestmentTypeId || buildInvestmentTypeIdFromOpportunity(opportunity)

    // Always set investmentTypeId in updatedValues to preserve it
    if (opportunityInvestmentTypeId) {
      updatedValues.investmentTypeId = opportunityInvestmentTypeId
    }

    // Get formFieldsDefinition for this specific investmentTypeId (fallback to component-level if not available)
    const effectiveFormFieldsDefinition = opportunityInvestmentTypeId
      ? getInvestmentFieldsByType(opportunityInvestmentTypeId)
      : formFieldsDefinition

    if (effectiveFormFieldsDefinition?.formFields) {
      for (const group of effectiveFormFieldsDefinition.formFields) {
        for (const field of group.fields) {
          const property = field.property
          const value = opportunity && property in opportunity ? (opportunity as any)[property] : undefined
          updatedValues[property] = value
        }
      }
    }

    if (!updatedValues.dealType) {
      updatedValues.dealType = opportunity?.dealType || dealType || undefined
    }
    if (mappedInvestmentValuesRef.current) {
      Object.assign(updatedValues, mappedInvestmentValuesRef.current)
    }

    return updatedValues
  }, [
    form,
    formFieldsDefinition,
    opportunity,
    dealType,
    buildInvestmentTypeIdFromOpportunity,
    getInvestmentFieldsByType
  ])

  useEffect(() => {
    updateResolver()
    const schemaChanged = checkSchemaChanged()

    // Detect when formFieldsDefinition changes from null to a value (or vice versa)
    const formFieldsDefinitionChanged =
      (previousFormFieldsDefinitionRef.current === null && formFieldsDefinition !== null) ||
      (previousFormFieldsDefinitionRef.current !== null && formFieldsDefinition === null) ||
      previousFormFieldsDefinitionRef.current !== formFieldsDefinition

    if (opportunityRef.current?.id !== opportunity?.id) {
      const mergedValues = buildFormValuesFromOpportunity()
      form.reset(mergedValues as Partial<InvestmentOpportunity>)
      opportunityRef.current = opportunity
      investmentLoadedRef.current = false
      previousFormFieldsDefinitionRef.current = formFieldsDefinition
    } else if (schemaChanged || formFieldsDefinitionChanged) {
      const updatedValues = updateDynamicFieldsFromOpportunity()
      form.reset(updatedValues as Partial<InvestmentOpportunity>)
      previousFormFieldsDefinitionRef.current = formFieldsDefinition
    }
  }, [
    opportunity?.id,
    opportunity,
    form,
    prospectSchema,
    formResolver,
    userInfo?.employeeDetails?.employeeId,
    formFieldsDefinition,
    getPathByType,
    dealType,
    investmentId,
    extractProspectFieldsFromEntity,
    updateResolver,
    checkSchemaChanged,
    buildFormValuesFromOpportunity,
    updateDynamicFieldsFromOpportunity
  ])

  // Handle form submission - returns payload for AppActionForm (like CRM OpportunityForm, but with dynamic fields)
  const handleSubmit = useCallback(
    async (data: any) => {
      try {
        // For non-divestment: extract dynamic prospect fields from form values
        const isDivestmentDeal = (data.dealType || dealType) === 'DIVESTMENT_DEAL'
        const prospectFields = isDivestmentDeal ? {} : extractProspectFieldsFromFormValues(data, formFieldsDefinition)

        // For divestment: map investment data to opportunity form values (develop approach)
        const investmentMappedFields =
          (data.dealType || dealType) === 'DIVESTMENT_DEAL' && (investmentFromForm || investment)
            ? mapInvestmentToInvestmentOpportunityValues((investmentFromForm || investment) as any)
            : {}

        // Convert investmentTypeId back to group/type for payload (HEAD approach)
        const investmentTypeId = data.investmentTypeId
        const { groupId, typeId } = mapFromSingleInvestmentTypeId(investmentTypeId, getPathByType)

        const mergedData = {
          ...data,
          ...prospectFields, // Add dynamic fields for non-divestment deals
          ...investmentMappedFields, // Add mapped investment fields for divestment deals
          // Remove investmentTypeId from payload (not part of API)
          investmentTypeId: undefined,
          // Add group/type for payload
          investmentGroupRef: groupId,
          investmentTypeRef: typeId,
          dealType: data.dealType || dealType || undefined
        }

        const { investmentOpportunity } = buildInvestmentOpportunityPayload(mergedData)
        const changeMode = data.id ? 'UPDATE' : 'INSERT'

        return {
          investmentOpportunity: {
            ...investmentOpportunity
          },
          changeMode
        }
      } catch (error) {
        console.error('Error submitting opportunity:', error)
        throw error
      }
    },
    [
      formFieldsDefinition,
      getPathByType,
      dealType,
      investmentId,
      extractProspectFieldsFromFormValues,
      investmentFromForm,
      investment
    ]
  )

  // Handle form cancellation
  const handleCancel = async () => {
    // AppActionForm handles cancellation via process events
  }

  // Handle pre-submit: Upload files if present (placeholder for future implementation)
  const handlePreSubmit = async (formData: any) => {
    return formData
  }

  // Deal Type selector - hide if dealType is already set (from additionalData or opportunity)
  const dealTypeField = useMemo(() => {
    // Hide if dealType is set from additionalData (create mode) OR from opportunity (edit mode)
    if (dealType || opportunity?.dealType) return null
    return (
      <FormField
        control={form.control}
        name="dealType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Deal Type</FormLabel>
            <FormControl>
              <Select
                value={typeof field.value === 'string' ? field.value : ''}
                onValueChange={field.onChange}
                data-testid={formatDataTestId(prefixDataTestId, 'deal-type')}
              >
                <SelectTrigger className="gba:border-gray-300 gba:bg-white">
                  <SelectValue placeholder="Please select deal type..." />
                </SelectTrigger>
                <SelectContent>
                  {DEAL_TYPES.map(dealType => (
                    <SelectItem key={dealType.id} value={dealType.value}>
                      {dealType.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    )
  }, [dealType, opportunity?.dealType, form.control, prefixDataTestId])

  // Investment selector - hide if not DIVESTMENT_DEAL, or if investmentId/divestmentId already exists
  const investmentSelectorField = useMemo(() => {
    // Hide if not a divestment deal
    const isDivestmentDeal = (watchedDealType || dealType || opportunity?.dealType) === 'DIVESTMENT_DEAL'
    if (!isDivestmentDeal) return null
    // Hide if investmentId from additionalData or divestmentId from opportunity already exists
    if (investmentId || opportunity?.divestmentId) return null
    return (
      <FormField
        control={form.control}
        name="investmentId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Investment</FormLabel>
            <FormControl>
              <Combobox
                value={typeof field.value === 'string' ? field.value : ''}
                onValueChange={field.onChange}
                options={investmentOptions}
                placeholder="Select investment..."
                searchPlaceholder="Search investments..."
                emptyText="No investments found"
                disabled={investmentsLoading}
                loading={investmentsLoading}
                data-testid={formatDataTestId(prefixDataTestId, 'investment-selector')}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    )
  }, [
    watchedDealType,
    dealType,
    opportunity?.dealType,
    investmentId,
    opportunity?.divestmentId,
    form.control,
    investmentOptions,
    investmentsLoading,
    prefixDataTestId
  ])

  // Collect all errors for centralized early return (AFTER all hooks)
  const errors: Array<{ error?: string | Error; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) {
    errors.push({ type: 'accessToken' })
  }
  if (error) {
    errors.push({ error, context: 'Failed to load opportunity data' })
  }
  if (useAccounts.error) {
    errors.push({ error: useAccounts.error, context: 'Failed to load accounts' })
  }
  if (useContacts.error) {
    errors.push({ error: useContacts.error, context: 'Failed to load contacts' })
  }

  // Early return if any errors exist (now safe - all hooks called above)
  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId="investment-opportunity-form" />
  }

  const processType = opportunity?.id ? 'update' : 'create'
  const currencyRefValue = form.watch('currencyRef')
  const currencySymbol =
    typeof currencyRefValue === 'string' && currencyRefValue ? getCurrencySymbol(currencyRefValue) : undefined

  return (
    <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} form={form}>
      <AppActionForm
        processType={processType}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        handlePreSubmit={handlePreSubmit}
        formData={form.getValues()}
        form={form}
        schema={prospectSchema}
        data-testid={formatDataTestId('investment-opportunity-form', 'Form')}
        submitButtonText={opportunity?.id ? 'Update Opportunity' : 'Create Opportunity'}
        isSubmitDisabled={isLoading}
      >
        <OpportunityLayout
          businessAppContext={{ accessToken, userInfo, additionalData }}
          ownerEmployee={opportunity?.ownerEmployee}
          entityId={opportunity?.id || opportunityId}
          opportunityAccounts={opportunity?.opportunityAccounts}
          useAccounts={useAccounts}
          opportunityContacts={opportunity?.opportunityContacts}
          useContacts={useContacts}
          pipelineCatalogIdentifier={OPPORTUNITY_PIPELINE}
          stageCatalogIdentifier={OPPORTUNITY_PIPELINE_STAGE}
          opportunityStatusCatalogIdentifier={OPPORTUNITY_STATUS}
          opportunityForecastCatalogIdentifier={OPPORTUNITY_FORECAST}
          opportunityInformationCustomFields={
            <>
              {dealTypeField}
              {investmentSelectorField}
            </>
          }
          loading={!isFormReady}
          customSegments={useMemo(() => {
            // Hide InvestmentProspectLayout for divestment deals (develop approach)
            return (watchedDealType || dealType) === 'DIVESTMENT_DEAL'
              ? []
              : [
                  {
                    id: 'investment-prospect',
                    title: 'Investment Information',
                    content: (
                      <InvestmentProspectLayout
                        businessAppContext={{ accessToken, userInfo, additionalData }}
                        formFieldsDefinition={formFieldsDefinition}
                        investmentCatalogLoading={investmentTypesLoading}
                        getTypesByLevel={getTypesByLevel}
                        getTypesByParent={getTypesByParent}
                        getPathByType={getPathByType}
                        currencySymbol={currencySymbol}
                        testIdPrefix={formatDataTestId('investment-opportunity-form', 'investment-prospect')}
                      />
                    )
                  }
                ]
          }, [
            watchedDealType,
            dealType,
            accessToken,
            userInfo,
            additionalData,
            currencySymbol,
            formFieldsDefinition,
            investmentTypesLoading,
            getTypesByLevel,
            getTypesByParent,
            getPathByType
          ])}
        />
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default InvestmentOpportunityForm
