import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { InvestmentLayout, InvestmentFormValues } from '@/common/components/investment/form-layouts/investment-layout'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { ErrorAlert } from '@/components/error-alert'
import { createDynamicInvestmentSchema } from '@/common/components/investment/form-layouts/investment-layout/investmentSchema'
import { useInvestment } from '@/common/data/investment/hooks/useInvestment.new'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import { mapInvestmentDataToFormFields } from '@/common/components/investment/form-layouts/investment-layout/utils/investmentFormMapper'
import { zodResolver } from '@hookform/resolvers/zod'
import { useInvestmentTypes } from '@/common/data/investment/hooks/useInvestmentTypes'
import { useInvestmentAccountsList } from '@/common/data/investment/hooks/useInvestmentAccounts'
import { useInvestmentOpportunity } from '@/common/data/investment/hooks/useInvestmentOpportunity'
import { transformInvestment } from './utils/transformInvestment'
import { transformOpportunity } from './utils/transformOpportunity'
import { sanitizeInvestment } from './utils/sanitizeInvestment'
import { buildInvestmentPayload } from '@/common/data/investment/types/investmentTypes.new'
import GroupSelectSegment from './segments/InvestmentGroupSegment'
import { Badge } from '@newwork/nw-design-system'
import { PiSwap } from 'react-icons/pi'

type InvestmentFormProps = BusinessAppContextProps

const InvestmentForm: React.FC<InvestmentFormProps> = ({ accessToken, userInfo, additionalData }) => {
  const businessAppContext = { accessToken, userInfo, additionalData }
  // Extract investmentId from additionalData (like AccountForm/LeadForm)
  const investmentId =
    additionalData?.investmentId || additionalData?.psi_taskPayload?.psi_initialParameters?.investmentId

  // Extract opportunityId from additionalData (for creating investment from opportunity)
  const opportunityId =
    additionalData?.opportunityId || additionalData?.psi_taskPayload?.psi_initialParameters?.opportunityId

  // Load investment data if in update mode
  const { investment: fetchedInvestment, loading: investmentLoading } = useInvestment(
    accessToken || '',
    investmentId,
    'record'
  )

  // Load opportunity data if opportunityId is provided (for creating investment from opportunity)
  const { opportunity: fetchedOpportunity, loading: opportunityLoading } = useInvestmentOpportunity(
    accessToken || '',
    opportunityId
  )

  const isUpdate = Boolean(investmentId)

  // Load investment types hook (needed for both create and update mode to display hierarchy)
  const {
    getTypesByLevel,
    getTypesByParent,
    getPathByType,
    getInvestmentFieldsByType,
    loading: investmentTypesLoading,
    error: investmentTypesError
  } = useInvestmentTypes(businessAppContext)

  // Account selection hook - using new declarative list hook (like OpportunityForm)
  const useAccounts = useInvestmentAccountsList(businessAppContext, { limit: 20 })

  // UI state for group selection step
  const [currentStep, setCurrentStep] = useState<'select' | 'form'>('select')
  const [skipAutoDetection, setSkipAutoDetection] = useState(false)
  // Track baseTypeId (level 0 group) - set directly when group is selected
  const [baseTypeId, setBaseTypeId] = useState<string | null>(null)

  // Create form instance - resolver will be updated dynamically
  const form = useForm<InvestmentFormValues>({
    defaultValues: {},
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  // Get current form values using useWatch
  const formValues = useWatch({ control: form.control }) as InvestmentFormValues

  // Ensure investment has at least name field
  if (!formValues.investment?.name) {
    formValues.investment = { ...formValues.investment, name: '' }
  }

  // Map opportunity data if available
  const mappedInitialValues = useMemo(() => {
    // Use fetched opportunity data if available
    if (fetchedOpportunity && !opportunityLoading) {
      const opportunityTypeId = fetchedOpportunity.investmentType?.id || fetchedOpportunity.investmentTypeRef
      const formFieldsDef = opportunityTypeId ? getInvestmentFieldsByType(opportunityTypeId) : undefined
      const mapped = transformOpportunity(fetchedOpportunity, formFieldsDef || undefined, getPathByType)
      return mapped
    }

    return undefined
  }, [fetchedOpportunity, opportunityLoading, getInvestmentFieldsByType, getPathByType])

  // Enhanced initial values with investmentId for updates
  const enhancedInitialValues = useMemo(() => {
    // If we have fetched investment data, map it to form values
    if (fetchedInvestment && !investmentLoading) {
      const baseSchema = createDynamicInvestmentSchema()

      // Map investment data to form values
      // Wrap fetchedInvestment in { investment: ... } structure to match schema
      const mappedValues = mapToFormValues(
        { investment: fetchedInvestment },
        baseSchema
      ) as Partial<InvestmentFormValues>

      // Apply custom transformations (normalize arrays, extract IDs, set defaults)
      return transformInvestment(mappedValues, fetchedInvestment, getPathByType)
    }

    // Otherwise use provided initial values (may be mapped from opportunity)
    const result = {
      ...mappedInitialValues,
      ...(investmentId && {
        investment: {
          ...mappedInitialValues?.investment,
          id: investmentId
        }
      })
    }

    // Add investmentOpportunityId if opportunityId is provided
    if (opportunityId && result.investment) {
      result.investment = {
        ...result.investment,
        investmentOpportunityId: opportunityId
      }
    }

    return result
  }, [fetchedInvestment, investmentLoading, investmentId, mappedInitialValues, opportunityId])

  // Reset form when initial values change
  useEffect(() => {
    if (enhancedInitialValues) {
      form.reset(enhancedInitialValues as Partial<InvestmentFormValues>)
    }
  }, [enhancedInitialValues, form])

  // Get investment type ID from current form values
  const investmentTypeId = useMemo(() => {
    return formValues.investment?.investmentTypeId || null
  }, [formValues.investment?.investmentTypeId])

  // Get complete path with ancestors and descendants (needed for dynamic field mapping)
  const typePath = useMemo(() => getPathByType(investmentTypeId), [getPathByType, investmentTypeId])

  // Update baseTypeId from investmentTypeId when it's set (for update mode or when type is selected)
  useEffect(() => {
    if (investmentTypeId) {
      const root = typePath.find(t => t.level === 0)
      if (root) {
        setBaseTypeId(root.id)
      }
    }
  }, [investmentTypeId, typePath])

  // Initialize form step based on whether we have a group selected
  useEffect(() => {
    if (isUpdate) {
      // Update mode: Always show form
      setCurrentStep('form')
      return
    }
    // Create mode: Show select if no group, form if group selected
    if (baseTypeId && currentStep === 'select') {
      setCurrentStep('form')
    }
    if (!baseTypeId && currentStep === 'form') {
      setCurrentStep('select')
    }
  }, [isUpdate, baseTypeId, currentStep])

  // Handle group selection
  const handleGroupSelect = useCallback(
    (group: string) => {
      // Don't set investmentTypeId - let user select type manually
      form.setValue('investment.investmentTypeId', undefined as any)
      // Set baseTypeId directly
      setBaseTypeId(group)
      if (!formValues.investment.name) {
        form.setValue('investment.name', '')
      }
      form.setValue('investment.investmentStatus', { id: 'InvestmentStatus:v1:ACTIVE', code: 'ACTIVE' } as any)

      // Clear all subtype data when group changes
      form.setValue('investment.currency', undefined as any)
      form.setValue('investment.investmentAccountId', undefined as any)
      form.setValue('equityInvestment', undefined as any)
      form.setValue('realEstateInvestment', undefined as any)
      form.setValue('liquidFundInvestment', undefined as any)

      setSkipAutoDetection(false)
      setCurrentStep('form')
    },
    [form, formValues.investment.name]
  )

  // Get form fields definition using getInvestmentFieldsByType
  const formFieldsDefinition = useMemo(() => {
    return getInvestmentFieldsByType(investmentTypeId)
  }, [getInvestmentFieldsByType, investmentTypeId])

  // Track if we've already mapped dynamic fields for this investment
  const lastMappedInvestmentIdRef = useRef<string | null>(null)

  // Helper: Normalize sub-investment arrays to single objects
  const normalizeInvestmentArrays = useCallback((investment: typeof fetchedInvestment) => {
    if (!investment) return investment
    const normalized = { ...investment }
    if (investment.liquidFundInvestment) {
      normalized.liquidFundInvestment = Array.isArray(investment.liquidFundInvestment)
        ? investment.liquidFundInvestment[0]
        : investment.liquidFundInvestment
    }
    if (investment.equityInvestment) {
      normalized.equityInvestment = Array.isArray(investment.equityInvestment)
        ? investment.equityInvestment[0]
        : investment.equityInvestment
    }
    if (investment.realEstateInvestment) {
      normalized.realEstateInvestment = Array.isArray(investment.realEstateInvestment)
        ? investment.realEstateInvestment[0]
        : investment.realEstateInvestment
    }
    return normalized
  }, [])

  // Helper: Apply dynamic fields to form
  const applyDynamicFieldsToForm = useCallback(
    (dynamicFields: ReturnType<typeof mapInvestmentDataToFormFields>) => {
      if (!Object.keys(dynamicFields).length) return

      if (dynamicFields.investment) {
        Object.keys(dynamicFields.investment).forEach(key => {
          form.setValue(`investment.${key}` as any, (dynamicFields.investment as any)[key])
        })
      }
      if (dynamicFields.equityInvestment) {
        form.setValue('equityInvestment', { ...formValues.equityInvestment, ...dynamicFields.equityInvestment } as any)
      }
      if (dynamicFields.realEstateInvestment) {
        form.setValue('realEstateInvestment', {
          ...formValues.realEstateInvestment,
          ...dynamicFields.realEstateInvestment
        } as any)
      }
      if (dynamicFields.liquidFundInvestment) {
        form.setValue('liquidFundInvestment', {
          ...formValues.liquidFundInvestment,
          ...dynamicFields.liquidFundInvestment
        } as any)
      }
    },
    [form, formValues]
  )

  // Map dynamic fields after catalog data is loaded (only in update mode)
  useEffect(() => {
    if (!investmentId || !fetchedInvestment) return
    if (typePath.length === 0 && investmentTypesLoading) return
    if (lastMappedInvestmentIdRef.current === investmentId) return

    const fieldsDef = getInvestmentFieldsByType(investmentTypeId)
    if (!fieldsDef) return

    const normalizedInvestment = normalizeInvestmentArrays(fetchedInvestment)
    const dynamicFields = mapInvestmentDataToFormFields(normalizedInvestment, fieldsDef)
    applyDynamicFieldsToForm(dynamicFields)

    lastMappedInvestmentIdRef.current = investmentId
  }, [
    investmentId,
    fetchedInvestment,
    investmentTypeId,
    getInvestmentFieldsByType,
    investmentTypesLoading,
    form,
    formValues,
    typePath,
    normalizeInvestmentArrays,
    applyDynamicFieldsToForm
  ])

  // Create dynamic schema based on formFieldsDefinition
  const dynamicSchema = useMemo(() => {
    return createDynamicInvestmentSchema(formFieldsDefinition || undefined)
  }, [formFieldsDefinition])

  // Create resolver dynamically based on schema
  const formResolver = useMemo(() => {
    return zodResolver(dynamicSchema) as any
  }, [dynamicSchema])

  // Update form resolver when schema changes
  useEffect(() => {
    if (form && formResolver) {
      // Update resolver when schema changes (like LeadForm does)
      if (form.control._options.resolver !== formResolver) {
        form.control._options.resolver = formResolver
      }
    }
  }, [form, formResolver])

  // Handle form submission - formData contains all current form values
  const handleSubmit = useCallback(
    async (formData: InvestmentFormValues) => {
      try {
        const investment = sanitizeInvestment(formData, getPathByType)
        const payload = buildInvestmentPayload(investment)
        return payload
      } catch (error) {
        console.error('Error building payload:', error)
        throw error
      }
    },
    [getPathByType]
  )

  // Handle form cancellation
  const handleCancel = useCallback(async () => {
    // AppActionForm handles cancellation via process events
  }, [])

  // Handle going back to group selection (only for create mode)
  const handleBack = useCallback(() => {
    if (!isUpdate) {
      form.setValue('investment.investmentTypeId', undefined as any)
      setBaseTypeId(null)
      form.setValue('equityInvestment', undefined as any)
      form.setValue('realEstateInvestment', undefined as any)
      form.setValue('liquidFundInvestment', undefined as any)
      setCurrentStep('select')
      setSkipAutoDetection(true)
    }
  }, [form, isUpdate])

  const processType = isUpdate ? 'update' : 'create'
  const prefixDataTestId = 'investment-form'

  // Determine if we're still loading initial data
  const isLoading = (isUpdate && investmentLoading) || (opportunityId && opportunityLoading) || investmentTypesLoading

  // Early returns AFTER all hooks
  if (!accessToken) {
    return <ErrorAlert errors={[{ type: 'accessToken' }]} prefixDataTestId={prefixDataTestId} />
  }

  // Show group selection step (only in create mode when no group selected)
  if (!isUpdate && currentStep === 'select') {
    return (
      <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} form={form}>
        <GroupSelectSegment
          {...businessAppContext}
          onGroupSelect={handleGroupSelect}
          skipAutoDetection={skipAutoDetection}
          getTypesByLevel={getTypesByLevel}
          loading={investmentTypesLoading}
          error={investmentTypesError}
        />
      </CatalogSelect.Provider>
    )
  }

  return (
    <CatalogSelect.Provider accessToken={accessToken} userInfo={userInfo} additionalData={additionalData} form={form}>
      <AppActionForm
        processType={processType}
        form={form}
        formData={formValues}
        schema={dynamicSchema}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitButtonText={isUpdate ? 'Update' : 'Create'}
        data-testid={formatDataTestId(prefixDataTestId, 'Form')}
      >
        {/* Back Button for create mode */}
        {!isUpdate && baseTypeId && (
          <div className="gba:mb-4">
            <Badge
              variant="secondary"
              className="gba:flex gba:items-center gba:gap-1 gba:text-sm gba:font-medium gba:cursor-pointer gba:transition-colors gba:hover:bg-accent"
              onClick={handleBack}
              data-testid={formatDataTestId(prefixDataTestId, 'back-badge')}
            >
              Back
              <PiSwap className="gba:w-3.5 gba:h-3.5 gba:opacity-70" />
            </Badge>
          </div>
        )}

        <InvestmentLayout
          investmentInformationCustomFields={undefined}
          ownerEmployee={fetchedInvestment?.ownerEmployee || formValues.investment.ownerEmployee}
          investmentAccounts={fetchedInvestment?.investmentAccounts || formValues.investment.investmentAccounts}
          useAccounts={useAccounts}
          businessAppContext={businessAppContext}
          formFieldsDefinition={formFieldsDefinition}
          investmentCatalogLoading={investmentTypesLoading}
          getTypesByLevel={getTypesByLevel}
          getTypesByParent={getTypesByParent}
          getPathByType={getPathByType}
          baseTypeId={baseTypeId}
          loading={isLoading}
          enableAiAutofill={true}
        />
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default InvestmentForm
