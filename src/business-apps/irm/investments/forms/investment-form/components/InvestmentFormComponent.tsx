import React, { useState, useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Button, Badge } from '@newwork/nw-design-system'
import { PiSwap } from 'react-icons/pi'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { AppActionForm } from '@/components/app-action-form'
import { useInvestmentFormContext } from '../context/InvestmentFormContext'
import {
  GroupSelectSegment,
  InvestmentSegment,
  TypeSelectSegment,
  LiquidFundTypeSelectSegment,
  DynamicSegment,
  InvestmentFileUploadSegment
} from './segments'
import { getCurrencySymbol } from '@/common/utils/numberFormatter'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { useGetInvestmentById } from '@/common/data/investment/hooks/useInvestments'
import { useInvestmentOpportunity } from '@/common/data/investment/hooks/useInvestmentOpportunity'
import { getInvestmentGroupFromContext } from '../utils/investmentDataTransformer'
import { createInvestmentFormResolver } from '../utils/investmentFormSchema'
import { InvestmentFormValues } from '../types'
import { buildInvestmentPayload } from '@/common/data/investment/payloads/investmentPayloads'
import { mapOpportunityToInvestmentFormValues } from '../utils/opportunityToInvestmentMapper'
import { useInvestmentAiAutofill } from '../hooks/useInvestmentAiAutofill'

const prefixDataTestId = 'InvestmentForm'

type FormStep = 'select' | 'form'

export const InvestmentFormComponent: React.FC = () => {
  const { businessAppContext, formValues, setFormValues, getFormFieldsDefinition, currentEmployee } =
    useInvestmentFormContext()

  // Extract investmentId and opportunityId from additionalData (must be before hooks)
  const externalInvestmentId =
    formValues.investment.id ||
    businessAppContext.additionalData?.investmentId ||
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.investmentId
  const externalOpportunityId =
    businessAppContext.additionalData?.opportunityId ||
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.opportunityId

  // Add the investment and opportunity fetch hooks
  const { fetchInvestmentById } = useGetInvestmentById(businessAppContext)
  // Use new declarative hook for opportunity
  const {
    opportunity: fetchedOpportunity,
    loading: opportunityLoading,
    error: opportunityError
  } = useInvestmentOpportunity(businessAppContext.accessToken, externalOpportunityId)

  // UI state
  const [currentStep, setCurrentStep] = useState<FormStep>('select')
  const [isLoadingInvestment, setIsLoadingInvestment] = useState(false)
  const [loadingError, setLoadingError] = useState<string | null>(null)
  const [skipAutoDetection, setSkipAutoDetection] = useState(false)
  const [aiSourceFile, setAiSourceFile] = useState<File | null>(null)

  // Store raw investment data for payload building
  const [rawInvestmentData, setRawInvestmentData] = useState<any>(null)
  const preSelectedGroup = getInvestmentGroupFromContext(businessAppContext.additionalData)
  const isUpdate = Boolean(externalInvestmentId)

  // Helper function to detect if current context is Overview tab
  const isOverviewContext = () => {
    const additionalData = businessAppContext.additionalData
    const fromSubView = additionalData?.fromSubView || additionalData?.subView
    return fromSubView === 'overview' || fromSubView === 'all' || (!fromSubView && !preSelectedGroup)
  }

  // Liquid fund flow states
  // NOTE: Form state can store catalog objects or string IDs (for backward compatibility)
  // Extract ID from object if needed: object.id or string directly
  const getGroupId = (group: any): string => {
    if (!group) return ''
    return typeof group === 'object' ? group.id : group
  }
  const groupId = getGroupId(formValues.investment.investmentGroup)
  const groupCode = groupId?.split(':').pop()
  const isLiquidFund = groupCode === 'LIQUID_FUND'
  const hasInvestmentType = Boolean(formValues.investment.investmentType)
  const hasLiquidFundType = Boolean(formValues.liquidFundInvestment?.investmentLiquidFundType)

  // Clean workflow initialization
  useEffect(() => {
    const initializeForm = async () => {
      setIsLoadingInvestment(true)
      setLoadingError(null)

      try {
        // Step 1: Investment group & type hierarchy is loaded by context

        // Step 2: Conditional flow based on opportunityId or investmentId
        if (externalOpportunityId && !externalInvestmentId) {
          // Opportunity pre-fill mode: Load opportunity data and map to investment form

          // Check if opportunity is still loading
          if (opportunityLoading) {
            // Keep loading state, don't show error yet
            return
          }

          // Check if there was an error loading the opportunity
          if (opportunityError) {
            setLoadingError(`Failed to load opportunity: ${opportunityError}`)
            return
          }

          // Use opportunity from declarative hook
          const opportunity = fetchedOpportunity

          if (opportunity) {
            // Extract form fields definition - check Type first (more specific), then fall back to Group
            // Some catalogs have formFields at Type level, others at Group level
            const groupObjectValue = opportunity.investmentGroup?.objectValue as any
            const typeObjectValue = opportunity.investmentType?.objectValue as any

            // Use Type's formFields if available, otherwise fall back to Group's formFields
            const formFieldsDefinition =
              typeObjectValue?.formFields?.length > 0
                ? typeObjectValue
                : groupObjectValue?.formFields?.length > 0
                  ? groupObjectValue
                  : typeObjectValue || groupObjectValue

            // Map ALL fields (static + dynamic) using the form fields definition from opportunity
            const allMappedValues = mapOpportunityToInvestmentFormValues(opportunity, formFieldsDefinition)

            setFormValues(allMappedValues)
            setCurrentStep('form')
          } else {
            setLoadingError('Opportunity not found')
          }
        } else if (externalInvestmentId) {
          // Update mode: Execute GET_INVESTMENT_BY_ID
          const result = await fetchInvestmentById(externalInvestmentId)
          const rawInvestment = result?.investment

          if (rawInvestment) {
            // Store raw investment data for payload building
            setRawInvestmentData(rawInvestment)

            // Validate investment has required data
            if (!rawInvestment.investmentGroup) {
              setLoadingError('Investment must have a group')
              return
            }

            // Prepare form data in nested structure
            // NOTE: Form state stores FULL OBJECTS for catalog/entity fields
            // This avoids redundant API calls and simplifies component code
            const nestedFormData: InvestmentFormValues = {
              investment: {
                id: rawInvestment.id,
                version: (rawInvestment as any).version || 1,
                name: rawInvestment.name || '',
                investmentGroup: rawInvestment.investmentGroup, // Full catalog object
                ownerEmployee: rawInvestment.ownerEmployee, // Full employee object
                investmentStatus: rawInvestment.investmentStatus || {
                  id: 'InvestmentStatus:v1:ACTIVE',
                  code: 'ACTIVE'
                },
                ...(rawInvestment.code && { code: rawInvestment.code }),
                ...(rawInvestment.currency && { currency: rawInvestment.currency }), // Full catalog object
                ...(rawInvestment.investmentAccount && { investmentAccount: rawInvestment.investmentAccount }), // Full account object
                ...(rawInvestment.investmentType && { investmentType: rawInvestment.investmentType }) // Full catalog object
              },
              // Load subtype data (keep full catalog objects and preserve id/version for updates)
              ...((rawInvestment as any).equityInvestment?.[0] && {
                equityInvestment: {
                  id: (rawInvestment as any).equityInvestment[0].id,
                  version: (rawInvestment as any).equityInvestment[0].version
                }
              }),
              ...((rawInvestment as any).realEstateInvestment?.[0] && {
                realEstateInvestment: {
                  id: (rawInvestment as any).realEstateInvestment[0].id,
                  version: (rawInvestment as any).realEstateInvestment[0].version
                }
              }),
              ...((rawInvestment as any).liquidFundInvestment?.[0] && {
                liquidFundInvestment: {
                  id: (rawInvestment as any).liquidFundInvestment[0].id,
                  version: (rawInvestment as any).liquidFundInvestment[0].version,
                  investmentLiquidFundType: (rawInvestment as any).liquidFundInvestment[0].investmentLiquidFundType // Full catalog object
                }
              })
            }

            // Set form values immediately (dynamic fields will be mapped separately after catalog loads)
            setFormValues(nestedFormData)
            setCurrentStep('form')
          } else {
            setLoadingError('Investment not found')
          }
        } else if (preSelectedGroup) {
          // Create mode with pre-selected group: Skip selection step, show investment segment
          // NOTE: Form state stores full objects (or IDs for backward compatibility)
          // For preSelectedGroup, it's already a string ID - create minimal object
          setFormValues({
            investment: {
              investmentGroup: { id: preSelectedGroup } as any, // Minimal catalog object (will be enriched by components)
              ownerEmployee: currentEmployee as any, // Full employee object
              name: '',
              investmentStatus: { id: 'InvestmentStatus:v1:ACTIVE', code: 'ACTIVE' } as any // Default status as object
            }
          } as Partial<InvestmentFormValues>)
          setCurrentStep('form')
        } else {
          // Create mode without group: Start with group selection step
          setCurrentStep('select')
        }
      } catch (err) {
        console.error('Error initializing form:', err)
        setLoadingError(err instanceof Error ? err.message : 'Failed to initialize form')
      } finally {
        setIsLoadingInvestment(false)
      }
    }

    initializeForm()
  }, [
    externalInvestmentId,
    externalOpportunityId,
    preSelectedGroup,
    fetchedOpportunity,
    opportunityLoading,
    opportunityError
  ])

  // Handle group selection from SelectSegment
  const handleGroupSelect = (group: string) => {
    // Clean form values when switching groups in create mode
    // NOTE: Form state stores full objects for catalog/entity fields
    // Preserve existing owner if it exists, fallback to currentEmployee
    const preservedOwner = formValues.investment.ownerEmployee || currentEmployee

    const newFormValues = {
      investment: {
        ownerEmployee: preservedOwner as any, // Full employee object
        name: formValues.investment.name || '',
        investmentGroup: { id: group } as any, // Minimal catalog object (will be enriched by components)
        investmentStatus: { id: 'InvestmentStatus:v1:ACTIVE', code: 'ACTIVE' } as any, // Default status as object
        // Keep system fields if updating
        ...(isUpdate && {
          id: formValues.investment.id,
          version: formValues.investment.version
        })
      } as any,
      // Clear all subtype data when group changes
      equityInvestment: undefined,
      realEstateInvestment: undefined,
      liquidFundInvestment: undefined
    } as Partial<InvestmentFormValues>

    // Update context state
    setFormValues(newFormValues)

    // Update react-hook-form state to match
    form.setValue('investment.investmentGroup', { id: group } as any)
    form.setValue('investment.investmentType', undefined as any)
    form.setValue('investment.currency', undefined as any)
    form.setValue('investment.investmentAccount', undefined as any)
    form.setValue('equityInvestment', undefined as any)
    form.setValue('realEstateInvestment', undefined as any)
    form.setValue('liquidFundInvestment', undefined as any)

    // Reset skip auto-detection flag after selection
    setSkipAutoDetection(false)
    setCurrentStep('form')
  }

  // Handle going back to group selection (only for create mode without pre-selected group)
  const handleBack = () => {
    if (!isUpdate && !preSelectedGroup) {
      // Preserve the owner employee when going back, clear everything else
      const preservedOwner = formValues.investment.ownerEmployee || currentEmployee

      // Create a new form state with only ownerEmployee preserved
      const newFormValues: Partial<InvestmentFormValues> = {
        investment: {
          ownerEmployee: preservedOwner,
          name: '',
          investmentStatus: { id: 'InvestmentStatus:v1:ACTIVE', code: 'ACTIVE' } as any,
          // Explicitly set to undefined to clear them
          investmentGroup: undefined,
          investmentType: undefined,
          currency: undefined,
          investmentAccount: undefined
        } as any,
        // Clear all subtype data
        equityInvestment: undefined,
        realEstateInvestment: undefined,
        liquidFundInvestment: undefined
      }

      setFormValues(newFormValues)

      // Also clear react-hook-form state
      form.setValue('investment.investmentGroup', undefined as any)
      form.setValue('investment.investmentType', undefined as any)
      form.setValue('investment.currency', undefined as any)
      form.setValue('investment.investmentAccount', undefined as any)
      form.setValue('equityInvestment', undefined as any)
      form.setValue('realEstateInvestment', undefined as any)
      form.setValue('liquidFundInvestment', undefined as any)

      // Skip auto-detection when user explicitly clicks Back button
      setSkipAutoDetection(true)
      setCurrentStep('select')
    }
  }

  // Create form resolver based on current form state and dynamic fields
  const [formFieldsDefinition, setFormFieldsDefinition] = useState<any>(null)

  // State to store the current currency catalog entry
  const [currencyEntry, setCurrencyEntry] = useState<any>(null)

  const catalogClient = useCatalogManagerClient(businessAppContext.accessToken)

  // Get form fields definition for validation
  useEffect(() => {
    const loadFormFields = async () => {
      if (formValues.investment.investmentType) {
        // Without Ref suffix
        try {
          const fieldsDef = getFormFieldsDefinition()
          setFormFieldsDefinition(fieldsDef)
        } catch (error) {
          console.error('Error loading form fields for validation:', error)
        }
      }
    }

    loadFormFields()
  }, [
    // Extract IDs to prevent infinite loop from object reference changes
    typeof formValues.investment.investmentGroup === 'object'
      ? formValues.investment.investmentGroup?.id
      : formValues.investment.investmentGroup,
    typeof formValues.investment.investmentType === 'object'
      ? formValues.investment.investmentType?.id
      : formValues.investment.investmentType,
    typeof formValues.liquidFundInvestment?.investmentLiquidFundType === 'object'
      ? formValues.liquidFundInvestment?.investmentLiquidFundType?.id
      : formValues.liquidFundInvestment?.investmentLiquidFundType,
    getFormFieldsDefinition
  ])

  const formResolver = createInvestmentFormResolver(formFieldsDefinition)

  // Form already uses nested structure - no transformation needed!
  const form = useForm<InvestmentFormValues>({
    resolver: formResolver as any,
    values: formValues, // Direct nested structure
    resetOptions: {
      keepDirtyValues: true // Preserve user input during resets
    }
  })

  // Watch the currency field for real-time updates (without Ref suffix)
  const selectedCurrencyRef = useWatch({
    control: form.control,
    name: 'investment.currency' // Without Ref suffix
  })

  const watchedGroup = useWatch({
    control: form.control,
    name: 'investment.investmentGroup'
  })

  const watchedType = useWatch({
    control: form.control,
    name: 'investment.investmentType'
  })

  const watchedLiquidFundType = useWatch({
    control: form.control,
    name: 'liquidFundInvestment.investmentLiquidFundType'
  })

  const watchedName = useWatch({
    control: form.control,
    name: 'investment.name'
  })

  const watchedOwnerEmployee = useWatch({
    control: form.control,
    name: 'investment.ownerEmployee'
  })

  const watchedInvestmentAccount = useWatch({
    control: form.control,
    name: 'investment.investmentAccount'
  })

  const normalizeCatalogRef = (value: unknown): string => {
    if (!value) return ''
    if (typeof value === 'object' && value !== null && 'id' in (value as any)) {
      return ((value as any).id as string) || ''
    }
    return (value as string) || ''
  }

  const investmentGroupRefForAi = normalizeCatalogRef(watchedGroup)
  const investmentTypeRefForAi = normalizeCatalogRef(watchedType)
  const investmentLiquidFundTypeRefForAi = normalizeCatalogRef(watchedLiquidFundType)
  const investmentOwnerEmployeeIdForAi = normalizeCatalogRef(watchedOwnerEmployee)
  const investmentCurrencyRefForAi = normalizeCatalogRef(selectedCurrencyRef)
  const investmentAccountIdForAi = normalizeCatalogRef(watchedInvestmentAccount)
  const investmentNameForAi = typeof watchedName === 'string' ? watchedName : ''
  const isLiquidFundForAi = investmentGroupRefForAi && investmentGroupRefForAi.split(':').pop() === 'LIQUID_FUND'

  const { runAutofill: runInvestmentAiAutofill } = useInvestmentAiAutofill(businessAppContext.accessToken)
  const [lastAutofillKey, setLastAutofillKey] = useState<string | null>(null)
  const [lastAppliedFieldsKey, setLastAppliedFieldsKey] = useState<string | null>(null)

  // Load currency entry when currency changes
  useEffect(() => {
    const loadCurrencyEntry = async () => {
      if (!selectedCurrencyRef || !businessAppContext.accessToken) {
        setCurrencyEntry(null)
        return
      }

      // If selectedCurrencyRef is already a catalog object, use it directly
      if (typeof selectedCurrencyRef === 'object' && selectedCurrencyRef.id) {
        setCurrencyEntry(selectedCurrencyRef)
        return
      }

      try {
        // selectedCurrencyRef is a string ID (e.g., "Currency:v1:EUR")
        const response = await catalogClient.getCatalogEntryById(selectedCurrencyRef as unknown as string)
        setCurrencyEntry(response)
      } catch (error) {
        console.error('Error loading currency entry:', error)
        setCurrencyEntry(null)
      }
    }

    loadCurrencyEntry()
  }, [selectedCurrencyRef, businessAppContext.accessToken, catalogClient])

  // Get currency symbol from currency entry or raw investment data
  const currencySymbol = useMemo(() => {
    // Priority 1: Use the currently selected currency from the form
    if (currencyEntry) {
      return getCurrencySymbol(currencyEntry)
    }

    // Priority 2: Try to get from raw investment data (for update mode initial load)
    if (rawInvestmentData?.currency) {
      return getCurrencySymbol(rawInvestmentData.currency)
    }

    // Fallback to empty string (user needs to select currency)
    return ''
  }, [currencyEntry, rawInvestmentData])

  // Automatically trigger AI autofill when:
  // 1) User selected required investment group/type (and liquid fund type for liquid funds)
  // 2) User selected AI source file
  useEffect(() => {
    if (!aiSourceFile) return

    const hasRequiredContext =
      !!investmentGroupRefForAi &&
      !!investmentTypeRefForAi &&
      (!isLiquidFundForAi || !!investmentLiquidFundTypeRefForAi)

    if (!hasRequiredContext) {
      return
    }

    const keyParts = [
      aiSourceFile.name,
      aiSourceFile.size,
      aiSourceFile.lastModified,
      investmentGroupRefForAi,
      investmentTypeRefForAi,
      investmentLiquidFundTypeRefForAi || ''
    ]
    const currentKey = keyParts.join('|')

    if (currentKey === lastAutofillKey) {
      return
    }

    let isCancelled = false

    const run = async () => {
      try {
        const response = await runInvestmentAiAutofill({
          file: aiSourceFile,
          investmentGroupRef: investmentGroupRefForAi,
          investmentTypeRef: investmentTypeRefForAi || undefined,
          investmentLiquidFundTypeRef: investmentLiquidFundTypeRefForAi || undefined,
          investmentOwnerEmployeeId: investmentOwnerEmployeeIdForAi || undefined,
          investmentName: investmentNameForAi || undefined,
          investmentCurrencyRef: investmentCurrencyRefForAi || undefined,
          investmentAccountId: investmentAccountIdForAi || undefined
        })

        if (!isCancelled && response?.fields) {
          // Apply returned fields directly to react-hook-form using property paths
          const fieldEntries = Object.entries(response.fields)
          const fieldsKey = JSON.stringify(fieldEntries.map(([path, value]) => [path, value]))

          if (fieldsKey !== lastAppliedFieldsKey) {
            fieldEntries.forEach(([path, value]) => {
              form.setValue(path as any, value as any, {
                shouldDirty: true,
                shouldValidate: true,
                shouldTouch: true
              })
            })

            setLastAppliedFieldsKey(fieldsKey)
          }

          setLastAutofillKey(currentKey)
        }
      } catch {
        // Errors are already logged inside the hook
      }
    }

    run()

    return () => {
      isCancelled = true
    }
  }, [
    aiSourceFile,
    investmentGroupRefForAi,
    investmentTypeRefForAi,
    investmentLiquidFundTypeRefForAi,
    investmentOwnerEmployeeIdForAi,
    investmentNameForAi,
    investmentCurrencyRefForAi,
    investmentAccountIdForAi,
    isLiquidFundForAi,
    lastAutofillKey,
    lastAppliedFieldsKey,
    runInvestmentAiAutofill,
    form
  ])

  // Show loading spinner
  if (isLoadingInvestment) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:p-8" data-testid={`${prefixDataTestId}-loading`}>
        <div className="gba:flex gba:flex-col gba:items-center gba:gap-4">
          <div className="gba:animate-spin gba:rounded-full gba:h-12 gba:w-12 gba:border-b-2 gba:border-primary" />
          <p className="gba:text-muted-foreground">Loading investment data...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (loadingError) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:p-8" data-testid={`${prefixDataTestId}-error`}>
        <div className="gba:flex gba:flex-col gba:items-center gba:gap-4 gba:max-w-md gba:text-center">
          <h3 className="gba:text-lg gba:font-semibold gba:text-destructive">Error Loading Investment</h3>
          <p className="gba:text-muted-foreground">{loadingError}</p>
          <div className="gba:flex gba:gap-2 gba:mt-2">
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              data-testid={`${prefixDataTestId}-retry-button`}
            >
              Retry
            </Button>
            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              data-testid={`${prefixDataTestId}-back-button`}
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Show group selection step
  if (currentStep === 'select') {
    return (
      <div data-testid={`${prefixDataTestId}-group-selection`}>
        <GroupSelectSegment
          {...businessAppContext}
          onGroupSelect={handleGroupSelect}
          skipAutoDetection={skipAutoDetection}
        />
      </div>
    )
  }

  // Show main form step

  return (
    <AppActionForm
      form={form}
      formData={formValues}
      processType={isUpdate ? 'update' : 'create'}
      submitButtonText={isUpdate ? 'Update' : 'Create'}
      onSubmit={async formData => {
        try {
          // Merge context data (selections) with form data (user input) to get complete state
          const mergedData = {
            investment: {
              ...formValues.investment, // Context data (selections, defaults)
              ...formData.investment // Form data (user input)
            },
            equityInvestment: formData.equityInvestment || formValues.equityInvestment,
            realEstateInvestment: formData.realEstateInvestment || formValues.realEstateInvestment,
            liquidFundInvestment: formData.liquidFundInvestment || formValues.liquidFundInvestment
          }

          const payload = buildInvestmentPayload(mergedData, businessAppContext, {
            isUpdate,
            rawInvestmentData
          })
          return payload
        } catch (error) {
          console.error('❌ Error building payload:', error)
          throw error
        }
      }}
      businessAppContext={businessAppContext}
      data-testid={`${prefixDataTestId}-form`}
    >
      <div data-testid={`${prefixDataTestId}-content`} className="gba:space-y-6">
        {/* Group Display Header (only show for overview context) */}
        {groupCode && isOverviewContext() && (
          <div data-testid={`${prefixDataTestId}-selected-group`}>
            {/* Back Button for overview context (only in create mode) */}
            {!isUpdate ? (
              <Badge
                variant="secondary"
                className="gba:flex gba:items-center gba:gap-1 gba:text-sm gba:font-medium gba:cursor-pointer gba:transition-colors gba:hover:bg-accent"
                onClick={handleBack}
                data-testid={formatDataTestId(`${prefixDataTestId}-back-badge`)}
              >
                Back
                <PiSwap className="gba:w-3.5 gba:h-3.5 gba:opacity-70" />
              </Badge>
            ) : null}
          </div>
        )}

        {/* Investment Basic Information */}
        <InvestmentSegment />

        {/* Investment Type Selector */}
        <TypeSelectSegment currentGroup={groupCode || ''} isUpdate={isUpdate} />

        {/* Liquid Fund Type Selector (for liquid funds with investment type selected) */}
        {isLiquidFund && hasInvestmentType && (
          <LiquidFundTypeSelectSegment
            currentInvestmentType={
              typeof formValues.investment.investmentType === 'object'
                ? formValues.investment.investmentType.id
                : formValues.investment.investmentType || ''
            }
            isUpdate={isUpdate}
          />
        )}

        {/* AI Source Document for Autofill (front-end only, not sent in payload yet) */}
        <InvestmentFileUploadSegment file={aiSourceFile} onFileChange={setAiSourceFile} />

        {/* Dynamic Fields - Conditional Display:
             - For NON-liquid funds: Show when investment type is selected
             - For liquid funds: Show when BOTH investment type AND liquid fund type are selected */}
        {((hasInvestmentType && !isLiquidFund) || (isLiquidFund && hasInvestmentType && hasLiquidFundType)) && (
          <DynamicSegment
            currencySymbol={currencySymbol}
            testIdPrefix={prefixDataTestId}
            rawInvestmentData={rawInvestmentData}
            isUpdate={isUpdate}
          />
        )}
      </div>
    </AppActionForm>
  )
}

export default InvestmentFormComponent
