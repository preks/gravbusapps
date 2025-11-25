import React, { useEffect, useRef, useMemo, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentLead } from '@/common/data/investment/hooks/useInvestmentLead'
import { LeadLayout, leadSchema } from '@/common/components/common-relations/form-layouts/lead-layout'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { zodResolver } from '@hookform/resolvers/zod'
import { type InvestmentLead, buildInvestmentLeadPayload } from '@/common/data/investment/types/investmentLeadTypes'
import { AppActionForm } from '@/components/app-action-form'
import {
  InvestmentProspectSegment,
  useProspectFields,
  useInvestmentProspectForm
} from '@/common/components/investment/form-segments/investment-prospect-segment'
import { CatalogSelect } from '@/components/catalog-select'
import {
  LEAD_STATUS,
  LEAD_SOURCE,
  LEAD_RATING,
  COMPANY_SIZE,
  ANNUAL_REVENUE
} from '@/common/data/investment/constants/investmentCatalogs'
import { ErrorAlert } from '@/components/error-alert'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

type LeadFormProps = BusinessAppContextProps

export const investmentLeadSchema = leadSchema.extend({
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

const LeadForm: React.FC<LeadFormProps> = ({ accessToken, userInfo, additionalData }) => {
  // Extract leadId from additionalData
  const leadId = additionalData?.leadId || additionalData?.psi_taskPayload?.psi_initialParameters?.leadId || undefined

  // Fetch lead data using declarative hook
  const { lead, loading, error } = useInvestmentLead(accessToken || '', leadId)

  // ALL HOOKS MUST BE CALLED BEFORE EARLY RETURN (Rules of Hooks)
  // Initialize React Hook Form with base schema first (will be updated by hook)
  // Note: Schema is dynamic, so we use 'as any' for TypeScript compatibility
  const form = useForm({
    resolver: zodResolver(investmentLeadSchema) as any,
    defaultValues: mapToFormValues(lead || {}, investmentLeadSchema) as Partial<InvestmentLead>,
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
    investmentGroupRef: (watchedGroupRef as string) || lead?.investmentGroupRef || null,
    investmentTypeRef: (watchedTypeRef as string) || lead?.investmentTypeRef || null,
    accessToken
  })

  // Investment Prospect Form Hook - handles dynamic schema and field extraction
  const { schema, prospectSchema, extractDynamicFieldValuesFromEntity, updateDynamicFieldsInFormValues } =
    useInvestmentProspectForm({
      baseSchema: investmentLeadSchema,
      formFieldsDefinition: formFieldsDefinition || undefined,
      entity: lead
    })

  // Resolver memoization - MUST update when schema changes for validation
  const resolver = useMemo(() => zodResolver(schema) as any, [schema])

  // Sync form when lead changes (like CRM LeadForm, but with dynamic field handling)
  const leadRef = useRef(lead)
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

    if (leadRef.current?.id !== lead?.id) {
      // Entity ID changed: Load all values (like CRM LeadForm)
      const baseValues = mapToFormValues(lead || {}, prospectSchema)
      const dynamicFieldValues = extractDynamicFieldValuesFromEntity()
      form.reset({ ...baseValues, ...dynamicFieldValues } as Partial<InvestmentLead>)
      leadRef.current = lead
    } else if (schemaChanged) {
      // Schema changed: Update only dynamic fields
      const currentValues = form.getValues()
      const updatedValues = updateDynamicFieldsInFormValues(currentValues)
      form.reset(updatedValues as Partial<InvestmentLead>)
    }
  }, [
    lead?.id,
    lead,
    form,
    prospectSchema,
    schema,
    resolver,
    extractDynamicFieldValuesFromEntity,
    updateDynamicFieldsInFormValues
  ])

  // Handle form submission - returns payload for AppActionForm (like CRM LeadForm, but with dynamic fields)
  const handleSubmit = useCallback(async (data: any) => {
    try {
      const { investmentLead } = buildInvestmentLeadPayload(data)
      return {
        investmentLead: {
          ...investmentLead
        }
      }
    } catch (error) {
      console.error('Error submitting lead:', error)
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

  // Collect all errors for centralized early return (AFTER all hooks)
  const errors: Array<{ error?: string | Error; type?: 'accessToken'; context?: string }> = []
  if (!accessToken) {
    errors.push({ type: 'accessToken' })
  }
  if (error) {
    errors.push({ error, context: 'Failed to load lead data' })
  }

  // Early return if any errors exist (now safe - all hooks called above)
  if (errors.length > 0) {
    return <ErrorAlert errors={errors} prefixDataTestId="investment-lead-form" />
  }

  const processType = lead?.id ? 'update' : 'create'

  return (
    <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} form={form}>
      <AppActionForm
        processType={processType}
        form={form}
        schema={schema}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        handlePreSubmit={handlePreSubmit}
        formData={form.getValues()}
        data-testid={formatDataTestId('investment-lead-form', 'Form')}
        submitButtonText={lead?.id ? 'Update Lead' : 'Create Lead'}
        isSubmitDisabled={loading}
      >
        <LeadLayout
          businessAppContext={{ accessToken, userInfo, additionalData }}
          ownerEmployee={lead?.ownerEmployee}
          entityId={lead?.id || leadId}
          leadStatusCatalogIdentifier={LEAD_STATUS}
          leadSourceCatalogIdentifier={LEAD_SOURCE}
          leadRatingCatalogIdentifier={LEAD_RATING}
          companySizeCatalogIdentifier={COMPANY_SIZE}
          annualRevenueCatalogIdentifier={ANNUAL_REVENUE}
          loading={loading && !!leadId}
          customSegments={[
            {
              id: 'investment-prospect',
              title: 'Investment Information',
              content: (
                <InvestmentProspectSegment
                  investmentGroupRef={(watchedGroupRef as string) || lead?.investmentGroupRef || null}
                  investmentTypeRef={(watchedTypeRef as string) || lead?.investmentTypeRef || null}
                  businessAppContext={{ accessToken, userInfo, additionalData }}
                  testIdPrefix={formatDataTestId('investment-lead-form', 'investment-prospect')}
                  currencySymbol="€"
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

export default LeadForm
