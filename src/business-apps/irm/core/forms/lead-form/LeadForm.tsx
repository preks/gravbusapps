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
import { InvestmentProspectLayout } from '@/common/components/investment/form-layouts/investment-prospect-layout'
import { createDynamicInvestmentProspectSchema } from '@/common/components/investment/form-layouts/investment-prospect-layout'
import {
  extractProspectFieldsFromFormValues,
  extractProspectFieldsFromEntity
} from '@/common/components/investment/form-layouts/investment-prospect-layout/utils/extractProspectFields'
import { useInvestmentTypes } from '@/common/data/investment/hooks/useInvestmentTypes'
import { CatalogSelect } from '@/components/catalog-select'
import {
  mapToSingleInvestmentTypeId,
  mapFromSingleInvestmentTypeId
} from '@/common/components/investment/form-layouts/investment-prospect-layout/utils/investmentTypeMapper'
import { createInvestmentLeadSchema } from '@/common/components/investment/form-layouts/investment-prospect-layout/investmentProspectSchema'
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

// Base investment lead schema (will be extended with investmentTypeId)
const baseInvestmentLeadSchema = leadSchema.extend({
  investmentName: z.string().min(1, 'Investment Name is required'),
  dealType: z.string().nullable().optional()
})

// Create investment lead schema with investmentTypeId
export const investmentLeadSchema = createInvestmentLeadSchema(baseInvestmentLeadSchema)

const LeadForm: React.FC<LeadFormProps> = ({ accessToken, userInfo, additionalData }) => {
  // Extract leadId from additionalData
  const leadId = additionalData?.leadId || additionalData?.psi_taskPayload?.psi_initialParameters?.leadId || undefined

  // Fetch lead data using declarative hook
  const { lead, loading, error } = useInvestmentLead(accessToken || '', leadId)

  // ALL HOOKS MUST BE CALLED BEFORE EARLY RETURN (Rules of Hooks)
  // Create form instance - resolver will be updated dynamically
  const form = useForm({
    defaultValues: mapToFormValues(lead || {}, investmentLeadSchema) as Partial<InvestmentLead>,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  }) as any

  // Investment Types Hook - provides hierarchy and field definitions
  const businessAppContext = { accessToken, userInfo, additionalData }
  const {
    getTypesByLevel,
    getTypesByParent,
    getPathByType,
    getInvestmentFieldsByType,
    loading: investmentTypesLoading
  } = useInvestmentTypes(businessAppContext, 'prospect')

  // Watch investmentTypeId from form
  const watchedInvestmentTypeId = form.watch('investmentTypeId')

  // Get effective type ID from form or lead
  const effectiveTypeId = (watchedInvestmentTypeId as string) || lead?.investmentTypeId || null

  // Get prospect fields configuration (referenceFields) for selected type
  const formFieldsDefinition = useMemo(() => {
    if (!effectiveTypeId) return null
    return getInvestmentFieldsByType(effectiveTypeId)
  }, [effectiveTypeId, getInvestmentFieldsByType])

  // Build dynamic schema
  const prospectSchema = useMemo(() => {
    const existingFields = new Set(Object.keys(investmentLeadSchema.shape))
    const dynamicFields = createDynamicInvestmentProspectSchema(formFieldsDefinition || null, existingFields)
    return Object.keys(dynamicFields).length > 0 ? investmentLeadSchema.extend(dynamicFields) : investmentLeadSchema
  }, [investmentLeadSchema, formFieldsDefinition])

  // Create resolver dynamically based on schema
  const formResolver = useMemo(() => {
    return zodResolver(prospectSchema) as any
  }, [prospectSchema])

  // Sync form when lead changes (like CRM LeadForm, but with dynamic field handling)
  const leadRef = useRef(lead)
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

    if (leadRef.current?.id !== lead?.id) {
      // Entity ID changed: Load all values (like CRM LeadForm)
      const baseValues = mapToFormValues(lead || {}, prospectSchema)
      const dynamicFieldValues = extractProspectFieldsFromEntity(lead, formFieldsDefinition)

      // Convert group/type to investmentTypeId if lead has them
      if (lead && (lead.investmentGroupRef || lead.investmentTypeRef) && getPathByType) {
        const groupId = lead.investmentGroupRef || null
        const typeId = lead.investmentTypeRef || null
        const investmentTypeId = mapToSingleInvestmentTypeId(groupId, typeId, getPathByType)
        if (investmentTypeId) {
          baseValues.investmentTypeId = investmentTypeId
        }
      } else if (lead?.investmentTypeId) {
        baseValues.investmentTypeId = lead.investmentTypeId
      }

      const mergedValues = { ...baseValues, ...dynamicFieldValues }

      form.reset(mergedValues as Partial<InvestmentLead>)

      leadRef.current = lead
    } else if (schemaChanged) {
      // Schema changed: Update only dynamic fields
      const currentValues = form.getValues()
      const updatedValues = { ...currentValues }

      // Update dynamic fields: use value from entity if available, otherwise undefined
      if (formFieldsDefinition?.formFields) {
        for (const group of formFieldsDefinition.formFields) {
          for (const field of group.fields) {
            const property = field.property
            if (lead && property in lead) {
              updatedValues[property] = (lead as any)[property]
            } else {
              updatedValues[property] = undefined
            }
          }
        }
      }

      // Preserve investmentTypeId from entity if they're empty in form
      if (!updatedValues.investmentTypeId && lead?.investmentTypeId) {
        updatedValues.investmentTypeId = lead.investmentTypeId
      } else if (
        !updatedValues.investmentTypeId &&
        (lead?.investmentGroupRef || lead?.investmentTypeRef) &&
        getPathByType
      ) {
        // Convert group/type to investmentTypeId if lead has them
        const groupId = lead.investmentGroupRef || null
        const typeId = lead.investmentTypeRef || null
        const investmentTypeId = mapToSingleInvestmentTypeId(groupId, typeId, getPathByType)
        if (investmentTypeId) {
          updatedValues.investmentTypeId = investmentTypeId
        }
      }

      form.reset(updatedValues as Partial<InvestmentLead>)
    }
  }, [lead?.id, lead, form, prospectSchema, formResolver, formFieldsDefinition, getPathByType])

  // Handle form submission - returns payload for AppActionForm (like CRM LeadForm, but with dynamic fields)
  const handleSubmit = useCallback(
    async (data: any) => {
      try {
        // Debug: Check schema and form values
        console.log('🔍 [LeadForm] Schema keys:', Object.keys(prospectSchema.shape))
        console.log('🔍 [LeadForm] Form values:', form.getValues())

        // Debug: Log what's in data
        console.log('🔍 [LeadForm] handleSubmit data:', {
          stakePercentage: data.stakePercentage,
          hasStakePercentage: 'stakePercentage' in data,
          dataKeys: Object.keys(data),
          formFieldsDefinition: formFieldsDefinition?.formFields?.map(g => g.fields.map(f => f.property))
        })

        // Extract dynamic prospect fields and merge with form data
        const prospectFields = extractProspectFieldsFromFormValues(data, formFieldsDefinition)
        console.log('🔍 [LeadForm] prospectFields:', prospectFields)

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
        console.log('🔍 [LeadForm] mergedData:', {
          stakePercentage: mergedData.stakePercentage,
          hasStakePercentage: 'stakePercentage' in mergedData
        })

        const { investmentLead } = buildInvestmentLeadPayload(mergedData)
        console.log('🔍 [LeadForm] payload:', investmentLead)

        return {
          investmentLead: {
            ...investmentLead
          }
        }
      } catch (error) {
        console.error('Error submitting lead:', error)
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
        schema={prospectSchema}
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
                <InvestmentProspectLayout
                  businessAppContext={{ accessToken, userInfo, additionalData }}
                  formFieldsDefinition={formFieldsDefinition}
                  investmentCatalogLoading={investmentTypesLoading}
                  getTypesByLevel={getTypesByLevel}
                  getTypesByParent={getTypesByParent}
                  getPathByType={getPathByType}
                  currencySymbol="€"
                  testIdPrefix={formatDataTestId('investment-lead-form', 'investment-prospect')}
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
