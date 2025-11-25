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
  SelectValue
} from '@newwork/nw-design-system'
import { useInvestmentAccountsList } from '@/common/data/investment/hooks/useInvestmentAccounts'
import { useInvestmentContactsList } from '@/common/data/investment/hooks/useInvestmentContacts'
import { ErrorAlert } from '@/components/error-alert'
import { getCurrencySymbol } from '@/common/utils/numberFormatter'
import {
  OPPORTUNITY_PIPELINE,
  OPPORTUNITY_PIPELINE_STAGE,
  OPPORTUNITY_STATUS
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

  const dealType = additionalData?.dealType || additionalData?.psi_taskPayload?.psi_initialParameters?.dealType

  // Fetch opportunity data using declarative hook
  const { opportunity, loading, error } = useInvestmentOpportunity(accessToken || '', opportunityId)

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

  // Investment Prospect Fields Hook (reactive with watched values)
  const {
    formFieldsDefinition,
    groups,
    types,
    configuration,
    loading: catalogLoading
  } = useProspectFields({
    investmentGroupRef: (watchedGroupRef as string) || opportunity?.investmentGroupRef || null,
    investmentTypeRef: (watchedTypeRef as string) || opportunity?.investmentTypeRef || null,
    accessToken
  })

  // Investment Prospect Form Hook - handles dynamic schema and field extraction
  const { schema, prospectSchema, extractDynamicFieldValuesFromEntity, updateDynamicFieldsInFormValues } =
    useInvestmentProspectForm({
      baseSchema: investmentOpportunitySchema,
      formFieldsDefinition: formFieldsDefinition || undefined,
      entity: opportunity
    })

  // Resolver memoization - MUST update when schema changes for validation
  const resolver = useMemo(() => zodResolver(schema) as any, [schema])

  // Sync form when opportunity changes (like CRM OpportunityForm, but with dynamic field handling)
  const opportunityRef = useRef(opportunity)
  const previousSchemaKeysRef = useRef<string[]>([])

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
      form.reset({
        ...baseValues,
        ...dynamicFieldValues,
        ownerEmployeeId: (baseValues.ownerEmployeeId || currentUserEmployeeId || '') as string
      } as Partial<InvestmentOpportunity>)
      opportunityRef.current = opportunity
    } else if (schemaChanged) {
      // Schema changed: Update only dynamic fields
      const currentValues = form.getValues()
      const updatedValues = updateDynamicFieldsInFormValues(currentValues)
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
    updateDynamicFieldsInFormValues
  ])

  // Handle form submission - returns payload for AppActionForm (like CRM OpportunityForm, but with dynamic fields)
  const handleSubmit = useCallback(async (data: any) => {
    try {
      const { investmentOpportunity } = buildInvestmentOpportunityPayload(data)
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
  }, [])

  // Handle form cancellation
  const handleCancel = async () => {
    // AppActionForm handles cancellation via process events
  }

  // Handle pre-submit: Upload files if present (placeholder for future implementation)
  const handlePreSubmit = async (formData: any) => {
    return formData
  }

  // Deal Type selector (IRM-specific custom field)
  const dealTypeField = dealType ? null : (
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
        isSubmitDisabled={loading}
      >
        <OpportunityLayout
          businessAppContext={{ accessToken, userInfo, additionalData }}
          ownerEmployee={opportunity?.ownerEmployee}
          entityId={opportunity?.id || opportunityId}
          account={opportunity?.account || undefined}
          useAccounts={useAccounts}
          opportunityContacts={opportunity?.opportunityContacts}
          useContacts={useContacts}
          pipelineFieldName="opportunityPipelineRef"
          stageFieldName="opportunityPipelineStageRef"
          pipelineCatalogIdentifier={OPPORTUNITY_PIPELINE}
          stageCatalogIdentifier={OPPORTUNITY_PIPELINE_STAGE}
          opportunityStatusCatalogIdentifier={OPPORTUNITY_STATUS}
          opportunityInformationCustomFields={dealTypeField}
          loading={loading && !!opportunityId}
          customSegments={[
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
          ]}
        />
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default InvestmentOpportunityForm
