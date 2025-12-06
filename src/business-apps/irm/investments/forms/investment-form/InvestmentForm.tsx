import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { InvestmentLayout, InvestmentFormValues } from '@/common/components/investment/form-layouts/investment-layout'
import {
  useGetInvestmentCatalogData,
  FormFieldsDefinition
} from '@/common/components/investment/form-layouts/investment-layout/queries/InvestmentCatalogQueries'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { buildInvestmentPayload } from '@/common/data/investment/types/investmentTypes.new'
import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { ErrorAlert } from '@/components/error-alert'
import { createDynamicInvestmentSchema } from '@/common/components/investment/form-layouts/investment-layout/investmentSchema'
import { useInvestment } from '@/common/data/investment/hooks/useInvestment.new'
import { mapToFormValues, ArrayToObjectConfig } from '@/common/utils/formMappingUtils'
import { mapInvestmentDataToFormFields } from '@/common/components/investment/form-layouts/investment-layout/utils/investmentFormMapper'
import { zodResolver } from '@hookform/resolvers/zod'
import { useInvestmentTypes } from '@/common/data/investment/hooks/useInvestmentTypes'
import { useInvestmentAccountsList } from '@/common/data/investment/hooks/useInvestmentAccounts'
import GroupSelectSegment from './GroupSelectSegment'
import { Badge } from '@newwork/nw-design-system'
import { PiSwap } from 'react-icons/pi'

interface InvestmentFormProps {
  initialValues?: Partial<InvestmentFormValues>
  onSubmit?: (values: InvestmentFormValues) => Promise<void>
  onCancel?: () => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

// Internal component that renders form with wrappers
const InvestmentFormContent: React.FC<{
  onSubmit?: (values: InvestmentFormValues) => Promise<void>
  onCancel?: () => Promise<void>
  investmentInformationCustomFields?: React.ReactNode
  accessToken: string
  userInfo: BusinessAppContextProps['userInfo']
  additionalData: BusinessAppContextProps['additionalData']
  fetchedInvestment?: any
  investmentId?: string
  form: ReturnType<typeof useForm<InvestmentFormValues>>
  initialValues: Partial<InvestmentFormValues>
}> = ({
  onSubmit,
  onCancel,
  investmentInformationCustomFields,
  accessToken,
  userInfo,
  additionalData,
  fetchedInvestment,
  investmentId,
  form
}) => {
  const businessAppContext = { accessToken, userInfo, additionalData }
  const isUpdate = Boolean(investmentId)

  // Load useInvestmentTypes hook (needed for both create and update mode to display hierarchy)
  const investmentTypesHook = useInvestmentTypes(businessAppContext)
  const {
    getTypesByLevel,
    getTypesByParent,
    loading: investmentTypesLoading,
    error: investmentTypesError
  } = investmentTypesHook

  // Account selection hook - using new declarative list hook (like OpportunityForm)
  const useAccounts = useInvestmentAccountsList(businessAppContext, { limit: 20 })

  // UI state for group selection step
  const [currentStep, setCurrentStep] = useState<'select' | 'form'>('select')
  const [skipAutoDetection, setSkipAutoDetection] = useState(false)

  // Load catalog data (still needed for formFieldsDefinition)
  const [investmentCatalogData, setInvestmentCatalogData] = useState<any>(null)
  const [investmentCatalogLoading, setInvestmentCatalogLoading] = useState(false)
  const { fetchInvestmentCatalogData } = useGetInvestmentCatalogData(businessAppContext)

  useEffect(() => {
    if (!accessToken) return

    const loadCatalogData = async () => {
      setInvestmentCatalogLoading(true)
      try {
        const data = await fetchInvestmentCatalogData()
        setInvestmentCatalogData(data)
      } catch (err) {
        console.error('Failed to load investment catalog data:', err)
      } finally {
        setInvestmentCatalogLoading(false)
      }
    }

    loadCatalogData()
  }, [accessToken, fetchInvestmentCatalogData])

  // Get current form values using useWatch
  const investment = useWatch({ control: form.control, name: 'investment' })
  const equityInvestment = useWatch({ control: form.control, name: 'equityInvestment' })
  const realEstateInvestment = useWatch({ control: form.control, name: 'realEstateInvestment' })
  const liquidFundInvestment = useWatch({ control: form.control, name: 'liquidFundInvestment' })

  const formValues: InvestmentFormValues = {
    investment: investment || { name: '' },
    equityInvestment,
    realEstateInvestment,
    liquidFundInvestment
  }

  // Initialize form step based on whether we have a group selected
  useEffect(() => {
    if (isUpdate) {
      // Update mode: Always show form
      setCurrentStep('form')
    } else {
      // Create mode: Show select if no group, form if group selected
      const hasGroup = formValues.investment.investmentGroup
      if (hasGroup && currentStep === 'select') {
        setCurrentStep('form')
      } else if (!hasGroup && currentStep === 'form') {
        setCurrentStep('select')
      }
    }
  }, [isUpdate, formValues.investment.investmentGroup, currentStep])

  // Handle group selection
  const handleGroupSelect = useCallback(
    (group: string) => {
      // Update react-hook-form state
      form.setValue('investment.investmentGroup', { id: group } as any)
      if (!formValues.investment.name) {
        form.setValue('investment.name', '')
      }
      form.setValue('investment.investmentStatus', { id: 'InvestmentStatus:v1:ACTIVE', code: 'ACTIVE' } as any)

      // Clear all subtype data when group changes (cascade clearing)
      form.setValue('investment.investmentType', undefined as any)
      form.setValue('investment.currency', undefined as any)
      form.setValue('investment.investmentAccountId', undefined as any)
      form.setValue('equityInvestment', undefined as any)
      form.setValue('realEstateInvestment', undefined as any)
      form.setValue('liquidFundInvestment', undefined as any)

      // Reset skip auto-detection flag after selection
      setSkipAutoDetection(false)
      setCurrentStep('form')
    },
    [form, formValues.investment.name]
  )

  // Implement getFormFieldsDefinition
  const getFormFieldsDefinition = useCallback((): FormFieldsDefinition | null => {
    if (!investmentCatalogData) return null

    // Extract codes from form values
    const getIdFromField = (field: any): string | null => {
      if (!field) return null
      const id = typeof field === 'object' ? field.id : field
      return id || null
    }
    const groupId = getIdFromField(formValues.investment.investmentGroup)
    const typeId = getIdFromField(formValues.investment.investmentType)
    const liquidFundTypeId = getIdFromField(formValues.liquidFundInvestment?.investmentLiquidFundType)

    const groupCode = groupId?.split(':').pop() || null
    const typeCode = typeId?.split(':').pop() || null
    const liquidFundTypeCode = liquidFundTypeId?.split(':').pop() || null

    // PRIORITY 1: Investment Liquid Fund Type (highest priority for liquid funds)
    if (groupCode === 'LIQUID_FUND' && liquidFundTypeCode) {
      const liquidFundTypeEntry = investmentCatalogData.investmentLiquidFundTypes?.find(
        (entry: any) => entry.code === liquidFundTypeCode
      )
      if (liquidFundTypeEntry?.objectValue?.formFields && liquidFundTypeEntry.objectValue.formFields.length > 0) {
        return liquidFundTypeEntry.objectValue
      }
    }

    // PRIORITY 2: Investment Type
    if (typeCode) {
      const typeEntry = investmentCatalogData.investmentTypes.find((type: any) => type.code === typeCode)
      if (typeEntry && typeEntry.objectValue && typeEntry.objectValue.formFields?.length > 0) {
        return typeEntry.objectValue
      }
    }

    // PRIORITY 3: Investment Group (fallback)
    if (groupCode) {
      const groupEntry = investmentCatalogData.investmentGroups.find((group: any) => group.code === groupCode)
      if (groupEntry && groupEntry.objectValue && groupEntry.objectValue.formFields?.length > 0) {
        return groupEntry.objectValue
      }
    }

    return null
  }, [
    investmentCatalogData,
    typeof formValues.investment.investmentGroup === 'object'
      ? formValues.investment.investmentGroup?.id
      : formValues.investment.investmentGroup,
    typeof formValues.investment.investmentType === 'object'
      ? formValues.investment.investmentType?.id
      : formValues.investment.investmentType,
    typeof formValues.liquidFundInvestment?.investmentLiquidFundType === 'object'
      ? formValues.liquidFundInvestment?.investmentLiquidFundType?.id
      : formValues.liquidFundInvestment?.investmentLiquidFundType
  ])

  const formFieldsDefinition = getFormFieldsDefinition()

  // Track if we've already mapped dynamic fields for this investment
  const lastMappedInvestmentIdRef = useRef<string | null>(null)

  // Map dynamic fields after catalog data is loaded (only in update mode)
  useEffect(() => {
    // Only map in update mode and if we have investment data
    if (!investmentId || !fetchedInvestment) {
      return
    }

    // Wait for catalog data to be loaded
    if (!investmentCatalogData || investmentCatalogLoading) {
      return
    }

    // Check if we've already mapped for this investment
    if (lastMappedInvestmentIdRef.current === investmentId) {
      return
    }

    // Get form fields definition for dynamic mapping
    const fieldsDef = getFormFieldsDefinition()
    if (!fieldsDef) {
      console.log('🟡 [InvestmentFormContent] No formFieldsDefinition available yet')
      return
    }

    console.log('🟡 [InvestmentFormContent] Mapping dynamic fields for investment:', investmentId)
    console.log('🟡 [InvestmentFormContent] fieldsDef:', fieldsDef)
    console.log('🟡 [InvestmentFormContent] current formValues:', formValues)

    // Normalize array fields to objects (same as in enhancedInitialValues)
    // GraphQL returns arrays, but form expects single objects
    const normalizedInvestment = { ...fetchedInvestment }
    const fetchedAny = fetchedInvestment as any
    if (fetchedAny.liquidFundInvestment) {
      normalizedInvestment.liquidFundInvestment = Array.isArray(fetchedAny.liquidFundInvestment)
        ? fetchedAny.liquidFundInvestment[0]
        : fetchedAny.liquidFundInvestment
    }
    if (fetchedAny.equityInvestment) {
      normalizedInvestment.equityInvestment = Array.isArray(fetchedAny.equityInvestment)
        ? fetchedAny.equityInvestment[0]
        : fetchedAny.equityInvestment
    }
    if (fetchedAny.realEstateInvestment) {
      normalizedInvestment.realEstateInvestment = Array.isArray(fetchedAny.realEstateInvestment)
        ? fetchedAny.realEstateInvestment[0]
        : fetchedAny.realEstateInvestment
    }

    // Map dynamic fields from normalized investment data
    const dynamicFields = mapInvestmentDataToFormFields(normalizedInvestment, fieldsDef)
    console.log('🟡 [InvestmentFormContent] dynamicFields mapped:', dynamicFields)

    // Merge dynamic fields with existing form values
    if (Object.keys(dynamicFields).length > 0) {
      // Update form directly
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

      console.log('🟢 [InvestmentFormContent] Merged dynamic fields into form')
    }

    // Mark this investment as mapped
    lastMappedInvestmentIdRef.current = investmentId
  }, [
    investmentId,
    fetchedInvestment,
    investmentCatalogData,
    investmentCatalogLoading,
    getFormFieldsDefinition,
    form,
    formValues
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

  // Handle form submission - merge formValues (context data) with formData (user input)
  const handleSubmit = useCallback(
    async (formData: InvestmentFormValues) => {
      try {
        // Merge formValues (context data) with formData (user input) and convert to Investment format
        const mergedData: Partial<Investment> = {
          ...formValues.investment, // Context data (selections, defaults)
          ...formData.investment, // Form data (user input)
          // Convert subtype objects to arrays (matching Investment interface)
          ...(formData.equityInvestment || formValues.equityInvestment
            ? {
                equityInvestment: [
                  {
                    ...formValues.equityInvestment,
                    ...formData.equityInvestment
                  }
                ]
              }
            : {}),
          ...(formData.realEstateInvestment || formValues.realEstateInvestment
            ? {
                realEstateInvestment: [
                  {
                    ...formValues.realEstateInvestment,
                    ...formData.realEstateInvestment
                  }
                ]
              }
            : {}),
          ...(formData.liquidFundInvestment || formValues.liquidFundInvestment
            ? {
                liquidFundInvestment: [
                  {
                    ...formValues.liquidFundInvestment,
                    ...formData.liquidFundInvestment
                  }
                ]
              }
            : {})
        }

        const payload = buildInvestmentPayload(mergedData)

        // Call optional custom handler
        if (onSubmit) {
          await onSubmit(formData)
        }

        return payload
      } catch (error) {
        console.error('❌ Error building payload:', error)
        throw error
      }
    },
    [onSubmit, formValues]
  )

  // Handle form cancellation
  const handleCancel = useCallback(async () => {
    if (onCancel) {
      await onCancel()
    }
    // AppActionForm handles cancellation via process events
  }, [onCancel])

  // Handle pre-submit (placeholder for future implementation)
  const handlePreSubmit = useCallback(async (formData: any) => {
    return formData
  }, [])

  // Handle going back to group selection (only for create mode)
  const handleBack = useCallback(() => {
    if (!isUpdate) {
      // Clear group selection
      form.setValue('investment.investmentGroup', undefined as any)
      form.setValue('investment.investmentType', undefined as any)
      form.setValue('liquidFundInvestment.investmentLiquidFundType', undefined as any)
      // Clear subtype data
      form.setValue('equityInvestment', undefined as any)
      form.setValue('realEstateInvestment', undefined as any)
      form.setValue('liquidFundInvestment', undefined as any)
      // Go back to select step
      setCurrentStep('select')
      setSkipAutoDetection(true)
    }
  }, [form, isUpdate])

  const processType = isUpdate ? 'update' : 'create'
  const prefixDataTestId = 'investment-form'

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
        handlePreSubmit={handlePreSubmit}
        submitButtonText={isUpdate ? 'Update' : 'Create'}
        data-testid={formatDataTestId(prefixDataTestId, 'Form')}
      >
        {/* Back Button for create mode */}
        {!isUpdate && formValues.investment.investmentGroup && (
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
          investmentInformationCustomFields={investmentInformationCustomFields}
          ownerEmployee={fetchedInvestment?.ownerEmployee}
          account={fetchedInvestment?.investmentAccount}
          useAccounts={useAccounts}
          businessAppContext={businessAppContext}
          formFieldsDefinition={formFieldsDefinition}
          investmentCatalogLoading={investmentCatalogLoading}
          getTypesByLevel={getTypesByLevel}
          getTypesByParent={getTypesByParent}
        />
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

const InvestmentForm: React.FC<BusinessAppContextProps & InvestmentFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  accessToken,
  userInfo,
  additionalData
}) => {
  if (!accessToken) {
    return <ErrorAlert errors={[{ type: 'accessToken' }]} prefixDataTestId="investment-form" />
  }

  // Extract investmentId from additionalData (like AccountForm/LeadForm)
  const investmentId =
    additionalData?.investmentId || additionalData?.psi_taskPayload?.psi_initialParameters?.investmentId

  // Load investment data if in update mode
  const { investment: fetchedInvestment, loading: investmentLoading } = useInvestment(
    accessToken,
    investmentId,
    'record'
  )

  // Create form instance - resolver will be updated dynamically in InvestmentFormContent
  const form = useForm<InvestmentFormValues>({
    defaultValues: {},
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  // Enhanced initial values with investmentId for updates
  const enhancedInitialValues = useMemo(() => {
    // If we have fetched investment data, map it to form values
    if (fetchedInvestment && !investmentLoading) {
      console.log('🔵 [InvestmentForm] fetchedInvestment:', fetchedInvestment)
      console.log('🔵 [InvestmentForm] investmentGroup:', fetchedInvestment.investmentGroup)
      console.log('🔵 [InvestmentForm] investmentType:', fetchedInvestment.investmentType)

      // Create base schema for mapping (without dynamic fields for now)
      const baseSchema = createDynamicInvestmentSchema(undefined)
      const arrayToObjectConfig: ArrayToObjectConfig = {
        arrayFields: ['equityInvestment', 'realEstateInvestment', 'liquidFundInvestment']
      }

      // Map investment data to form values
      // Wrap fetchedInvestment in { investment: ... } structure to match schema
      const mappedValues = mapToFormValues(
        { investment: fetchedInvestment },
        baseSchema,
        undefined,
        initialValues,
        arrayToObjectConfig
      ) as Partial<InvestmentFormValues>

      console.log('🟢 [InvestmentForm] mappedValues after mapToFormValues:', mappedValues)

      // Extract liquidFundInvestment, equityInvestment, realEstateInvestment from fetchedInvestment
      // Schema expects them at top level, but GraphQL returns them as arrays nested in investment.*
      const fetchedAny = fetchedInvestment as any
      if (fetchedAny.liquidFundInvestment) {
        const liquidFund = Array.isArray(fetchedAny.liquidFundInvestment)
          ? fetchedAny.liquidFundInvestment[0]
          : fetchedAny.liquidFundInvestment
        ;(mappedValues as any).liquidFundInvestment = liquidFund
      }
      if (fetchedAny.equityInvestment) {
        const equity = Array.isArray(fetchedAny.equityInvestment)
          ? fetchedAny.equityInvestment[0]
          : fetchedAny.equityInvestment
        ;(mappedValues as any).equityInvestment = equity
      }
      if (fetchedAny.realEstateInvestment) {
        const realEstate = Array.isArray(fetchedAny.realEstateInvestment)
          ? fetchedAny.realEstateInvestment[0]
          : fetchedAny.realEstateInvestment
        ;(mappedValues as any).realEstateInvestment = realEstate
      }

      console.log('🟢 [InvestmentForm] mappedValues after extracting subtypes:', mappedValues)
      console.log(
        '🟢 [InvestmentForm] mappedValues.investment.investmentGroup:',
        mappedValues.investment?.investmentGroup
      )
      console.log(
        '🟢 [InvestmentForm] mappedValues.investment.investmentType:',
        mappedValues.investment?.investmentType
      )
      console.log('🟢 [InvestmentForm] mappedValues.liquidFundInvestment:', mappedValues.liquidFundInvestment)

      // Ensure investmentStatus has a default if missing
      if (!mappedValues.investment?.investmentStatus) {
        mappedValues.investment = {
          ...mappedValues.investment,
          investmentStatus: {
            id: 'InvestmentStatus:v1:ACTIVE',
            code: 'ACTIVE'
          } as any
        }
      }

      // Convert null to undefined for optional fields (schema expects string | undefined, not null)
      if (mappedValues.investment?.code === null) {
        delete mappedValues.investment.code
      }

      return mappedValues
    }

    // Otherwise use provided initial values
    return {
      ...initialValues,
      ...(investmentId && {
        investment: {
          ...initialValues?.investment,
          id: investmentId
        }
      })
    }
  }, [fetchedInvestment, investmentLoading, investmentId, initialValues])

  // Reset form when initial values change
  useEffect(() => {
    if (enhancedInitialValues) {
      form.reset(enhancedInitialValues as any)
    }
  }, [enhancedInitialValues, form])

  return (
    <InvestmentFormContent
      onSubmit={onSubmit}
      onCancel={onCancel}
      investmentInformationCustomFields={undefined}
      accessToken={accessToken}
      userInfo={userInfo}
      additionalData={additionalData}
      fetchedInvestment={fetchedInvestment}
      investmentId={investmentId}
      form={form}
      initialValues={enhancedInitialValues}
    />
  )
}

export default InvestmentForm
