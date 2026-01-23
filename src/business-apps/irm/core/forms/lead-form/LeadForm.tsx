import React, { useEffect, useRef, useMemo, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentLead } from '@/common/data/investment/hooks/useInvestmentLead'
import { LeadLayout, leadSchema } from '@/common/components/common-relations/form-layouts/lead-layout'
import { useLeadAccountAutocomplete } from '@/common/components/common-relations/form-layouts/lead-layout/hooks/useLeadAccountAutocomplete'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { zodResolver } from '@hookform/resolvers/zod'
import { type InvestmentLead, buildInvestmentLeadPayload } from '@/common/data/investment/types/investmentLeadTypes'
import { AppActionForm } from '@/components/app-action-form'
import {
  InvestmentProspectLayout,
  createDynamicInvestmentProspectSchema
} from '@/common/components/investment/form-layouts/investment-prospect-layout'
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
import { useGetInvestmentAccounts } from '@/common/data/investment/hooks/useInvestmentAccounts'

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

  // Account search hook
  const { fetchInvestmentAccounts } = useGetInvestmentAccounts({ accessToken, userInfo, additionalData })

  // ALL HOOKS MUST BE CALLED BEFORE EARLY RETURN (Rules of Hooks)
  // Create form instance - resolver will be updated dynamically
  const form = useForm({
    defaultValues: mapToFormValues(lead || {}, investmentLeadSchema) as Partial<InvestmentLead>,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  }) as any

  // Account autocomplete hook (shared between CRM and IRM)
  const {
    accountSearchOptions,
    accountSearchLoading,
    autoFilledFields,
    expandCompanySection,
    handleAccountSearch,
    handleAccountSelect,
    handleFieldChange,
    setAutoFilledFields,
    setExpandCompanySection
  } = useLeadAccountAutocomplete({
    form,
    fetchAccounts: fetchInvestmentAccounts
  })

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
  const isFormReady = !loading && !isFormFieldsDefinitionLoading && !investmentTypesLoading

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
  const previousFormFieldsDefinitionRef = useRef<typeof formFieldsDefinition>(null)

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

  // Helper: Build investmentTypeId from lead
  const buildInvestmentTypeIdFromLead = useCallback(
    (leadData: typeof lead): string | null => {
      if (!leadData) return null
      if (leadData.investmentTypeId) return leadData.investmentTypeId
      if ((leadData.investmentGroupRef || leadData.investmentTypeRef) && getPathByType) {
        const groupId = leadData.investmentGroupRef || null
        const typeId = leadData.investmentTypeRef || null
        return mapToSingleInvestmentTypeId(groupId, typeId, getPathByType)
      }
      return null
    },
    [getPathByType]
  )

  // Helper: Build form values when entity ID changes
  const buildFormValuesFromLead = useCallback(() => {
    const baseValues = mapToFormValues(lead || {}, prospectSchema)

    // Calculate investmentTypeId FIRST from lead data
    const investmentTypeId = buildInvestmentTypeIdFromLead(lead)

    // Get formFieldsDefinition for this specific investmentTypeId (not the component-level one)
    const effectiveFormFieldsDefinition = investmentTypeId ? getInvestmentFieldsByType(investmentTypeId) : null

    // Extract dynamic fields using the calculated formFieldsDefinition
    const dynamicFieldValues = extractProspectFieldsFromEntity(lead, effectiveFormFieldsDefinition)

    // investmentTypeId is the single source of truth
    // InvestmentProspectLayout will derive baseTypeId (group) from investmentTypeId
    if (investmentTypeId) {
      baseValues.investmentTypeId = investmentTypeId
    }

    const mergedValues = { ...baseValues, ...dynamicFieldValues }
    return mergedValues
  }, [lead, prospectSchema, buildInvestmentTypeIdFromLead, getInvestmentFieldsByType])

  // Helper: Update dynamic fields when schema changes
  const updateDynamicFieldsFromLead = useCallback(() => {
    const currentValues = form.getValues()
    const updatedValues = { ...currentValues }

    // Get investmentTypeId from form values first
    const formInvestmentTypeId = currentValues.investmentTypeId || null

    // Calculate investmentTypeId from lead if not in form
    // ALWAYS preserve investmentTypeId - it's the single source of truth
    const leadInvestmentTypeId = formInvestmentTypeId || buildInvestmentTypeIdFromLead(lead)

    // Always set investmentTypeId in updatedValues to preserve it
    if (leadInvestmentTypeId) {
      updatedValues.investmentTypeId = leadInvestmentTypeId
    }

    // Get formFieldsDefinition for this specific investmentTypeId (fallback to component-level if not available)
    const effectiveFormFieldsDefinition = leadInvestmentTypeId
      ? getInvestmentFieldsByType(leadInvestmentTypeId)
      : formFieldsDefinition

    if (effectiveFormFieldsDefinition?.formFields) {
      for (const group of effectiveFormFieldsDefinition.formFields) {
        for (const field of group.fields) {
          const property = field.property
          const value = lead && property in lead ? (lead as any)[property] : undefined
          updatedValues[property] = value
        }
      }
    }

    return updatedValues
  }, [form, formFieldsDefinition, lead, buildInvestmentTypeIdFromLead, getInvestmentFieldsByType])

  useEffect(() => {
    updateResolver()
    const schemaChanged = checkSchemaChanged()

    // Detect when formFieldsDefinition changes from null to a value (or vice versa)
    const formFieldsDefinitionChanged =
      (previousFormFieldsDefinitionRef.current === null && formFieldsDefinition !== null) ||
      (previousFormFieldsDefinitionRef.current !== null && formFieldsDefinition === null) ||
      previousFormFieldsDefinitionRef.current !== formFieldsDefinition

    if (leadRef.current?.id !== lead?.id) {
      const mergedValues = buildFormValuesFromLead()
      form.reset(mergedValues as Partial<InvestmentLead>)
      leadRef.current = lead
      previousFormFieldsDefinitionRef.current = formFieldsDefinition
    } else if (schemaChanged || formFieldsDefinitionChanged) {
      const updatedValues = updateDynamicFieldsFromLead()
      form.reset(updatedValues as Partial<InvestmentLead>)
      previousFormFieldsDefinitionRef.current = formFieldsDefinition
    }
  }, [
    lead?.id,
    lead,
    form,
    prospectSchema,
    formResolver,
    formFieldsDefinition,
    getPathByType,
    updateResolver,
    checkSchemaChanged,
    buildFormValuesFromLead,
    updateDynamicFieldsFromLead
  ])

  // Track when country is auto-selected by CatalogSelect (bidirectional from region)
  useEffect(() => {
    const subscription = form.watch((value: any, { name }: any) => {
      // When countryRef changes and regionRef is auto-filled, mark countryRef as auto-filled too
      if (name === 'countryRef' && value.countryRef && autoFilledFields.has('regionRef')) {
        setAutoFilledFields(prev => {
          if (!prev.has('countryRef')) {
            const next = new Set(prev)
            next.add('countryRef')
            return next
          }
          return prev
        })
      }
    })
    return () => subscription.unsubscribe()
  }, [form, autoFilledFields])

  // Handle form submission - returns payload for AppActionForm (like CRM LeadForm, but with dynamic fields)
  const handleSubmit = useCallback(
    async (data: any) => {
      // Clear auto-filled fields marking on submit
      setAutoFilledFields(new Set())
      // Reset company section expansion
      setExpandCompanySection(false)

      try {
        // Extract dynamic prospect fields and merge with form data
        const prospectFields = extractProspectFieldsFromFormValues(data, formFieldsDefinition)

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

        const { investmentLead } = buildInvestmentLeadPayload(mergedData)

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
    [formFieldsDefinition, getPathByType, setAutoFilledFields, setExpandCompanySection]
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
          loading={!isFormReady}
          accountSearchOptions={accountSearchOptions}
          onAccountSearch={handleAccountSearch}
          onAccountSelect={handleAccountSelect}
          accountSearchLoading={accountSearchLoading}
          autoFilledFields={autoFilledFields}
          expandCompanySection={expandCompanySection}
          onFieldChange={handleFieldChange}
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
