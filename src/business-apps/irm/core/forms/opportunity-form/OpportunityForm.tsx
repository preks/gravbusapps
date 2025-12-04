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
  InvestmentProspectSegment,
  useProspectFields,
  useInvestmentProspectForm
} from '@/common/components/investment/form-segments/investment-prospect-segment'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
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

export const investmentOpportunitySchema = opportunitySchema.extend({
  investmentName: z.string().min(1, 'Investment Name is required'),
  investmentGroupRef: z
    .union([
      z.string().min(1),
      z
        .object({ id: z.string().min(1), code: z.string().optional(), value: z.string().optional() })
        .catchall(z.unknown()),
      z.null()
    ])
    .refine(val => val !== null && val !== undefined && val !== '', {
      message: 'Investment group is required'
    }),
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

  // Initialize React Hook Form with base schema first (will be updated by hook)
  // Note: Schema is dynamic, so we use 'as any' for TypeScript compatibility
  const form = useForm({
    resolver: zodResolver(investmentOpportunitySchema) as any,
    defaultValues: mapToFormValues(opportunity || {}, investmentOpportunitySchema) as Partial<InvestmentOpportunity>,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  }) as any

  // Watch form values for Investment Prospect fields
  const watchedGroupRef = form.watch('investmentGroupRef')
  const watchedTypeRef = form.watch('investmentTypeRef')
  const watchedDealType = form.watch('dealType')
  const watchedInvestmentId = form.watch('investmentId')

  // Fetch investment data if watchedInvestmentId is provided (for divestment cases when user selects investment)
  const { investment: investmentFromForm } = useInvestment(accessToken || '', watchedInvestmentId)

  // Investment Prospect Fields Hook (reactive with watched values)
  const effectiveGroupRef = (watchedGroupRef as string) || opportunity?.investmentGroupRef || null
  const effectiveTypeRef = (watchedTypeRef as string) || opportunity?.investmentTypeRef || null

  const {
    formFieldsDefinition,
    groups,
    types,
    configuration,
    loading: catalogLoading
  } = useProspectFields({
    investmentGroupRef: effectiveGroupRef,
    investmentTypeRef: effectiveTypeRef,
    accessToken
  })

  // Investment Prospect Form Hook - handles dynamic schema and field extraction
  const {
    schema,
    prospectSchema,
    extractDynamicFieldValuesFromEntity,
    updateDynamicFieldsInFormValues,
    extractProspectFieldsFromFormValues
  } = useInvestmentProspectForm({
    baseSchema: investmentOpportunitySchema,
    formFieldsDefinition: formFieldsDefinition || undefined,
    entity: opportunity
  })

  // Resolver memoization - MUST update when schema changes for validation
  const resolver = useMemo(() => zodResolver(schema) as any, [schema])

  // Sync form when opportunity changes (like CRM OpportunityForm, but with dynamic field handling)
  const opportunityRef = useRef(opportunity)
  const previousSchemaKeysRef = useRef<string[]>([])
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
      !catalogLoading &&
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
    catalogLoading
  ])

  useEffect(() => {
    // Update resolver when schema changes
    if (form.control._options.resolver !== resolver) {
      form.control._options.resolver = resolver
    }

    const schemaChanged =
      JSON.stringify(previousSchemaKeysRef.current) !== JSON.stringify(Object.keys(prospectSchema.shape))

    if (schemaChanged) {
      previousSchemaKeysRef.current = Object.keys(prospectSchema.shape)
    }

    if (opportunityRef.current?.id !== opportunity?.id) {
      // Entity ID changed: Load all values (like CRM OpportunityForm)
      const baseValues = mapToFormValues(opportunity || {}, prospectSchema)
      const dynamicFieldValues = extractDynamicFieldValuesFromEntity()
      const currentUserEmployeeId = userInfo?.employeeDetails?.employeeId

      // Ensure dealType is set from additionalData if not in opportunity
      const mergedValues = {
        ...baseValues,
        ...dynamicFieldValues,
        ownerEmployeeId: (baseValues.ownerEmployeeId || currentUserEmployeeId || '') as string,
        // Preserve dealType from additionalData if not in opportunity
        dealType: baseValues.dealType || dealType || undefined,
        // Set investmentId if provided
        ...(investmentId ? { investmentId: investmentId } : {})
      }

      form.reset(mergedValues as Partial<InvestmentOpportunity>)

      opportunityRef.current = opportunity
      investmentLoadedRef.current = false // Reset flag when opportunity changes
    } else if (schemaChanged) {
      // Schema changed: Update only dynamic fields
      const currentValues = form.getValues()
      const updatedValues = updateDynamicFieldsInFormValues(currentValues)

      // Preserve base fields (investmentGroupRef, investmentTypeRef) from entity if they're empty in form
      // These are not dynamic fields, so they won't be updated by updateDynamicFieldsInFormValues
      if (!updatedValues.investmentGroupRef && opportunity?.investmentGroupRef) {
        updatedValues.investmentGroupRef = opportunity.investmentGroupRef
      }
      if (!updatedValues.investmentTypeRef && opportunity?.investmentTypeRef) {
        updatedValues.investmentTypeRef = opportunity.investmentTypeRef
      }

      // Ensure dealType is preserved from opportunity or additionalData
      if (!updatedValues.dealType) {
        updatedValues.dealType = opportunity?.dealType || dealType || undefined
      }

      // If we have mapped investment values, include them (already contain static + dynamic fields from mapper)
      if (mappedInvestmentValuesRef.current) {
        // Merge mapped investment values into updated values (already contain all dynamic fields)
        Object.assign(updatedValues, mappedInvestmentValuesRef.current)
      }

      form.reset(updatedValues as Partial<InvestmentOpportunity>)
    }
  }, [
    opportunity?.id,
    opportunity,
    form,
    prospectSchema,
    schema,
    resolver,
    userInfo?.employeeDetails?.employeeId,
    extractDynamicFieldValuesFromEntity,
    updateDynamicFieldsInFormValues,
    dealType,
    investmentId,
    investmentFromForm,
    investment
  ])

  // Handle form submission - returns payload for AppActionForm (like CRM OpportunityForm, but with dynamic fields)
  const handleSubmit = useCallback(
    async (data: any) => {
      try {
        // For non-divestment: extract dynamic prospect fields from form values
        const prospectFields =
          (data.dealType || dealType) !== 'DIVESTMENT_DEAL' ? extractProspectFieldsFromFormValues(data) : {}

        // For divestment: map investment data to opportunity form values (self-contained common mapper)
        const investmentMappedFields =
          (data.dealType || dealType) === 'DIVESTMENT_DEAL' && (investmentFromForm || investment)
            ? mapInvestmentToInvestmentOpportunityValues((investmentFromForm || investment) as any)
            : {}

        const formDataWithDealType = {
          ...data,
          ...prospectFields, // Add dynamic fields for non-divestment deals
          ...investmentMappedFields, // Add mapped investment fields for divestment deals
          dealType: data.dealType || dealType || undefined
        }

        const { investmentOpportunity } = buildInvestmentOpportunityPayload(formDataWithDealType)
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
    [dealType, investmentId, extractProspectFieldsFromFormValues, investmentFromForm, investment, formFieldsDefinition]
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
    if ((watchedDealType || dealType || opportunity?.dealType) !== 'DIVESTMENT_DEAL') return null
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
        schema={schema}
        data-testid={formatDataTestId('investment-opportunity-form', 'Form')}
        submitButtonText={opportunity?.id ? 'Update Opportunity' : 'Create Opportunity'}
        isSubmitDisabled={isLoading}
      >
        <OpportunityLayout
          businessAppContext={{ accessToken, userInfo, additionalData }}
          ownerEmployee={opportunity?.ownerEmployee}
          entityId={opportunity?.id || opportunityId}
          account={opportunity?.account || undefined}
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
          loading={isLoading}
          customSegments={useMemo(() => {
            // Hide InvestmentProspectSegment for divestment deals (regardless of investmentId)
            return (watchedDealType || dealType) === 'DIVESTMENT_DEAL'
              ? []
              : [
                  {
                    id: 'investment-prospect',
                    title: 'Investment Information',
                    content: (
                      <InvestmentProspectSegment
                        investmentGroupRef={(watchedGroupRef as string) || opportunity?.investmentGroupRef || null}
                        investmentTypeRef={(watchedTypeRef as string) || opportunity?.investmentTypeRef || null}
                        businessAppContext={{ accessToken, userInfo, additionalData }}
                        testIdPrefix={formatDataTestId('investment-opportunity-form', 'investment-prospect')}
                        currencySymbol={currencySymbol}
                        configuration={configuration}
                        groups={groups}
                        types={types}
                        isLoading={catalogLoading}
                      />
                    )
                  }
                ]
          }, [
            watchedDealType,
            dealType,
            watchedGroupRef,
            watchedTypeRef,
            opportunity?.investmentGroupRef,
            opportunity?.investmentTypeRef,
            accessToken,
            userInfo,
            additionalData,
            currencySymbol,
            configuration,
            groups,
            types,
            catalogLoading
          ])}
        />
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default InvestmentOpportunityForm
