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
import { InvestmentProspectLayout } from '@/common/components/investment/form-layouts/investment-prospect-layout'
import { createDynamicInvestmentProspectSchema } from '@/common/components/investment/form-layouts/investment-prospect-layout'
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
  SelectValue
} from '@newwork/nw-design-system'
import { useInvestmentAccountsList } from '@/common/data/investment/hooks/useInvestmentAccounts'
import { useInvestmentContactsList } from '@/common/data/investment/hooks/useInvestmentContacts'
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

  const dealType = additionalData?.dealType || additionalData?.psi_taskPayload?.psi_initialParameters?.dealType

  // Fetch opportunity data using declarative hook
  const { opportunity, loading, error } = useInvestmentOpportunity(accessToken || '', opportunityId)

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

  // Watch investmentTypeId from form
  const watchedInvestmentTypeId = form.watch('investmentTypeId')

  // Investment Types Hook - provides hierarchy and field definitions
  const businessAppContext = { accessToken, userInfo, additionalData }
  const {
    getTypesByLevel,
    getTypesByParent,
    getPathByType,
    getInvestmentFieldsByType,
    loading: investmentTypesLoading
  } = useInvestmentTypes(businessAppContext)

  // Get effective type ID from form or opportunity
  const effectiveTypeId = (watchedInvestmentTypeId as string) || opportunity?.investmentTypeId || null

  // Get prospect fields configuration (referenceFields) for selected type
  const formFieldsDefinition = useMemo(() => {
    if (!effectiveTypeId) return null
    return getInvestmentFieldsByType(effectiveTypeId, 'prospect')
  }, [effectiveTypeId, getInvestmentFieldsByType])

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

  useEffect(() => {
    // Update resolver when schema changes
    if (form && formResolver) {
      if (form.control._options.resolver !== formResolver) {
        form.control._options.resolver = formResolver
      }
    }

    const schemaChanged =
      JSON.stringify(previousSchemaKeysRef.current) !== JSON.stringify(Object.keys(prospectSchema.shape))

    if (schemaChanged) {
      previousSchemaKeysRef.current = Object.keys(prospectSchema.shape)
    }

    if (opportunityRef.current?.id !== opportunity?.id) {
      // Entity ID changed: Load all values (like CRM OpportunityForm)
      const baseValues = mapToFormValues(opportunity || {}, prospectSchema)
      const dynamicFieldValues = extractProspectFieldsFromEntity(opportunity, formFieldsDefinition)
      const currentUserEmployeeId = userInfo?.employeeDetails?.employeeId

      // Convert group/type to investmentTypeId if opportunity has them
      if (opportunity && (opportunity.investmentGroupRef || opportunity.investmentTypeRef) && getPathByType) {
        const groupId = opportunity.investmentGroupRef || null
        const typeId = opportunity.investmentTypeRef || null
        const investmentTypeId = mapToSingleInvestmentTypeId(groupId, typeId, getPathByType)
        if (investmentTypeId) {
          baseValues.investmentTypeId = investmentTypeId
        }
      } else if (opportunity?.investmentTypeId) {
        baseValues.investmentTypeId = opportunity.investmentTypeId
      }

      const mergedValues = {
        ...baseValues,
        ...dynamicFieldValues,
        ownerEmployeeId: (baseValues.ownerEmployeeId || currentUserEmployeeId || '') as string
      }

      form.reset(mergedValues as Partial<InvestmentOpportunity>)

      opportunityRef.current = opportunity
    } else if (schemaChanged) {
      // Schema changed: Update only dynamic fields
      const currentValues = form.getValues()
      const updatedValues = { ...currentValues }

      // Update dynamic fields: use value from entity if available, otherwise undefined
      if (formFieldsDefinition?.formFields) {
        for (const group of formFieldsDefinition.formFields) {
          for (const field of group.fields) {
            const property = field.property
            if (opportunity && property in opportunity) {
              updatedValues[property] = (opportunity as any)[property]
            } else {
              updatedValues[property] = undefined
            }
          }
        }
      }

      // Preserve base fields (investmentGroupRef, investmentTypeRef) from entity if they're empty in form
      if (!updatedValues.investmentGroupRef && opportunity?.investmentGroupRef) {
        updatedValues.investmentGroupRef = opportunity.investmentGroupRef
      }
      if (!updatedValues.investmentTypeRef && opportunity?.investmentTypeRef) {
        updatedValues.investmentTypeRef = opportunity.investmentTypeRef
      }

      form.reset(updatedValues as Partial<InvestmentOpportunity>)
    }
  }, [
    opportunity?.id,
    opportunity,
    form,
    prospectSchema,
    formResolver,
    userInfo?.employeeDetails?.employeeId,
    formFieldsDefinition,
    getPathByType
  ])

  // Handle form submission - returns payload for AppActionForm (like CRM OpportunityForm, but with dynamic fields)
  const handleSubmit = useCallback(
    async (data: any) => {
      try {
        // Debug: Check schema and form values
        console.log('🔍 [OpportunityForm] Schema keys:', Object.keys(prospectSchema.shape))
        console.log('🔍 [OpportunityForm] Form values:', form.getValues())

        // Debug: Log what's in data
        console.log('🔍 [OpportunityForm] handleSubmit data:', {
          stakePercentage: data.stakePercentage,
          hasStakePercentage: 'stakePercentage' in data,
          dataKeys: Object.keys(data),
          formFieldsDefinition: formFieldsDefinition?.formFields?.map(g => g.fields.map(f => f.property))
        })

        // Extract dynamic prospect fields and merge with form data
        const prospectFields = extractProspectFieldsFromFormValues(data, formFieldsDefinition)
        console.log('🔍 [OpportunityForm] prospectFields:', prospectFields)

        // Convert investmentTypeId back to group/type for payload
        const investmentTypeId = data.investmentTypeId
        const { groupId, typeId } = mapFromSingleInvestmentTypeId(investmentTypeId, getPathByType)

        const mergedData = {
          ...data,
          ...prospectFields,
          // Remove investmentTypeId from payload (not part of API)
          investmentTypeId: undefined,
          // Add group/type for payload
          investmentGroupRef: groupId,
          investmentTypeRef: typeId
        }
        console.log('🔍 [OpportunityForm] mergedData:', {
          stakePercentage: mergedData.stakePercentage,
          hasStakePercentage: 'stakePercentage' in mergedData
        })

        const { investmentOpportunity } = buildInvestmentOpportunityPayload(mergedData)
        console.log('🔍 [OpportunityForm] payload:', investmentOpportunity)

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
    [formFieldsDefinition, getPathByType]
  )

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
        schema={prospectSchema}
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
          pipelineCatalogIdentifier={OPPORTUNITY_PIPELINE}
          stageCatalogIdentifier={OPPORTUNITY_PIPELINE_STAGE}
          opportunityStatusCatalogIdentifier={OPPORTUNITY_STATUS}
          opportunityForecastCatalogIdentifier={OPPORTUNITY_FORECAST}
          opportunityInformationCustomFields={dealTypeField}
          loading={loading && !!opportunityId}
          customSegments={[
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
          ]}
        />
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default InvestmentOpportunityForm
