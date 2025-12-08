import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { InvestmentLayout, InvestmentFormValues } from '@/common/components/investment/form-layouts/investment-layout'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { useInvestmentReport } from '@/common/data/investment/hooks/useInvestmentReport.new'
import { useInvestment } from '@/common/data/investment/hooks/useInvestment.new'
import { useGetInvestments } from '@/common/data/investment/hooks/useInvestments'
import { useInvestmentAccountsList } from '@/common/data/investment/hooks/useInvestmentAccounts'
import { useInvestmentTypes } from '@/common/data/investment/hooks/useInvestmentTypes'
import { buildInvestmentReportPayload } from '@/common/data/investment/types/investmentReportTypes'
import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import translations from './_i18n'
import { InvestmentReportSegment } from './components/InvestmentReportSegment'
import { ErrorAlert } from '@/components/error-alert'
import { createDynamicInvestmentSchema } from '@/common/components/investment/form-layouts/investment-layout/investmentSchema'
import { mapInvestmentDataToFormFields } from '@/common/components/investment/form-layouts/investment-layout/utils/investmentFormMapper'
import { zodResolver } from '@hookform/resolvers/zod'
import { transformInvestment } from './utils/transformInvestment'
import { transformInvestmentReport } from './utils/transformInvestmentReport'
import { sanitizeInvestmentReport } from './utils/sanitizeInvestmentReport'

type InvestmentReportFormProps = BusinessAppContextProps

export const InvestmentReportForm: React.FC<InvestmentReportFormProps> = ({
  accessToken,
  userInfo,
  additionalData
}) => {
  // ALL HOOKS MUST BE CALLED BEFORE EARLY RETURN (Rules of Hooks)

  // Extract investmentReportId from additionalData
  const investmentReportId =
    additionalData?.investmentReportId || additionalData?.psi_taskPayload?.psi_initialParameters?.investmentReportId

  // Fetch investment report if editing
  const {
    investmentReport: fetchedReport,
    loading: reportLoading,
    error: reportError
  } = useInvestmentReport(accessToken || '', investmentReportId, 'record')

  // Extract initialInvestmentId from additionalData (immutable - only from initial props)
  const initialInvestmentId =
    additionalData?.investmentId || additionalData?.psi_taskPayload?.psi_initialParameters?.investmentId

  // InvestmentId as state - can be changed by user selection
  // Initialize with initialInvestmentId, will be updated when fetchedReport loads
  const [investmentId, setInvestmentId] = useState<string | undefined>(initialInvestmentId)

  // Update investmentId when fetchedReport loads (if it has an investmentId)
  useEffect(() => {
    const reportInvestmentId = fetchedReport?.investmentId
    if (reportInvestmentId && reportInvestmentId !== investmentId) {
      setInvestmentId(reportInvestmentId)
    }
  }, [fetchedReport?.investmentId, investmentId])

  // Load investment data - automatically reloads when investmentId changes
  const { investment: fetchedInvestment, loading: investmentLoading } = useInvestment(
    accessToken || '',
    investmentId,
    'record'
  )

  const businessAppContext = { accessToken, userInfo, additionalData }

  // Account selection hook - using new declarative list hook (like InvestmentForm)
  const useAccounts = useInvestmentAccountsList(businessAppContext, { limit: 20 })

  // Load useInvestmentTypes hook (needed for DynamicInvestmentSegment to render correctly)
  const {
    getTypesByLevel,
    getTypesByParent,
    getPathByType,
    getInvestmentFieldsByType,
    loading: investmentTypesLoading
  } = useInvestmentTypes(businessAppContext)

  // Transform InvestmentReport to InvestmentFormValues
  // InvestmentReport has the same fields as Investment, plus date, scope, investmentId
  const transformedInitialValues: Partial<
    InvestmentFormValues & { investmentReportDate?: string; investmentReportScope?: string }
  > = useMemo(() => {
    if (investmentReportId && fetchedReport) {
      return transformInvestmentReport(
        fetchedReport,
        investmentReportId,
        investmentId,
        getPathByType,
        fetchedInvestment
      )
    } else if (investmentId && fetchedInvestment) {
      return transformInvestment(fetchedInvestment, investmentId, getPathByType)
    } else if (investmentId) {
      return {
        investment: {
          id: investmentId,
          investmentId: investmentId
        } as any
      }
    }
    return {}
  }, [fetchedReport, investmentId, investmentReportId, fetchedInvestment, getPathByType])

  // Create form instance - resolver will be updated dynamically
  const form = useForm<InvestmentFormValues & { investmentReportDate?: string; investmentReportScope?: string }>({
    defaultValues: transformedInitialValues as any,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  // Reset form when initial values change
  useEffect(() => {
    if (transformedInitialValues) {
      form.reset(transformedInitialValues as any)
    }
  }, [transformedInitialValues, form])

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

  // Helper: Get investment type ID from form values (deepest level)
  const getInvestmentTypeId = useCallback((values: InvestmentFormValues): string | null => {
    // Use investmentTypeId directly (new single type ID approach)
    return values.investment?.investmentTypeId || null
  }, [])

  // Get investment type ID from current form values
  const investmentTypeId = useMemo(() => getInvestmentTypeId(formValues), [getInvestmentTypeId, formValues])

  // Get complete path with ancestors and descendants
  const typePath = useMemo(() => getPathByType(investmentTypeId), [getPathByType, investmentTypeId])

  // Get form fields definition using getInvestmentFieldsByType
  const formFieldsDefinition = useMemo(() => {
    return getInvestmentFieldsByType(investmentTypeId, 'investment')
  }, [getInvestmentFieldsByType, investmentTypeId])

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

  const [investments, setInvestments] = useState<Investment[]>([])
  const [isLoadingInvestments, setIsLoadingInvestments] = useState(false)

  const { fetchInvestments } = useGetInvestments({
    accessToken,
    userInfo,
    additionalData
  })

  // Use fetchedInvestment from investmentId
  // Priority: 1) fetchedReport.investment, 2) fetchedInvestment (from investmentId)
  const currentFetchedInvestment = fetchedReport?.investment || fetchedInvestment

  // Track if we've already mapped dynamic fields for this investment
  const lastMappedInvestmentIdRef = useRef<string | null>(null)

  // Map dynamic fields after catalog data is loaded (only in update mode or when investment is loaded)
  useEffect(() => {
    // Only map if we have investment data
    if (!currentFetchedInvestment) {
      return
    }

    const effectiveId = currentFetchedInvestment.id || investmentId
    if (!effectiveId) {
      return
    }

    // Wait for type path to be available (from getPathByType)
    if (typePath.length === 0 && investmentTypesLoading) {
      return
    }

    // Check if we've already mapped for this investment
    if (lastMappedInvestmentIdRef.current === effectiveId) {
      return
    }

    // Get form fields definition for dynamic mapping
    const fieldsDef = getInvestmentFieldsByType(investmentTypeId, 'investment')
    if (!fieldsDef) {
      return
    }

    // Map dynamic fields from raw investment data
    const dynamicFields = mapInvestmentDataToFormFields(currentFetchedInvestment, fieldsDef)

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
    }

    // Mark this investment as mapped
    lastMappedInvestmentIdRef.current = effectiveId
  }, [
    currentFetchedInvestment,
    investmentId,
    investmentTypeId,
    getInvestmentFieldsByType,
    investmentTypesLoading,
    form,
    formValues
  ])

  // Load investments list for select
  useEffect(() => {
    const loadInvestments = async () => {
      if (!accessToken) return
      try {
        setIsLoadingInvestments(true)
        const result = await fetchInvestments()
        setInvestments(result?.Investment || [])
      } catch (error) {
        console.error('Error loading investments:', error)
      } finally {
        setIsLoadingInvestments(false)
      }
    }
    loadInvestments()
  }, [accessToken, fetchInvestments])

  // Show investment select only if no initialInvestmentId was provided
  const showInvestmentSelect = !initialInvestmentId

  // Map investment data to form values when investment is loaded
  // Only run this in Fall 3 (no investmentReportId, but investmentId exists)
  // In Fall 2, values come from transformedInitialValues (based on fetchedReport)
  useEffect(() => {
    // Skip if we have a investmentReportId (Fall 2) - values come from transformedInitialValues
    if (investmentReportId) {
      return
    }

    if (currentFetchedInvestment && !investmentLoading && investmentId) {
      // Use transformInvestment to transform the investment
      const transformed = transformInvestment(currentFetchedInvestment, investmentId, getPathByType)

      // Update form values
      if (transformed.investment) {
        Object.keys(transformed.investment).forEach(key => {
          form.setValue(`investment.${key}` as any, (transformed.investment as any)[key])
        })
      }
      if (transformed.liquidFundInvestment) {
        form.setValue('liquidFundInvestment', transformed.liquidFundInvestment)
      }
      if (transformed.equityInvestment) {
        form.setValue('equityInvestment', transformed.equityInvestment)
      }
      if (transformed.realEstateInvestment) {
        form.setValue('realEstateInvestment', transformed.realEstateInvestment)
      }
      if (transformed.investmentReportDate) {
        form.setValue('investmentReportDate', transformed.investmentReportDate)
      }
      if (transformed.investmentReportScope) {
        form.setValue('investmentReportScope', transformed.investmentReportScope)
      }
    }
  }, [currentFetchedInvestment, investmentLoading, investmentId, form, investmentReportId, getPathByType])

  // Handle investment selection change - update investmentId state
  const handleInvestmentChange = useCallback((newInvestmentId: string) => {
    setInvestmentId(newInvestmentId)
  }, [])

  // Determine if this is an update
  const isUpdate = Boolean(investmentReportId || formValues.investment.id)

  // Translation hook
  const { t } = useTranslation(translations)

  // Handle form submission - transform InvestmentFormValues back to InvestmentReport payload
  const handleSubmit = useCallback(
    async (
      formData: InvestmentFormValues & {
        investmentReportDate?: string
        investmentReportScope?: string
      }
    ) => {
      try {
        const investmentReport = sanitizeInvestmentReport(formData, getPathByType)
        const payload = buildInvestmentReportPayload(investmentReport)
        return payload
      } catch (error) {
        console.error('Error building investment report payload:', error)
        throw error
      }
    },
    [getPathByType]
  )

  // Handle form cancellation
  const handleCancel = useCallback(async () => {
    // AppActionForm handles cancellation via process events
  }, [])

  const processType = isUpdate ? 'update' : 'create'
  const prefixDataTestId = 'investment-report-form'

  // Early returns AFTER all hooks
  if (!accessToken) {
    return <ErrorAlert errors={[{ type: 'accessToken' }]} prefixDataTestId={prefixDataTestId} />
  }

  if (reportLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:p-8">
        <div className="gba:flex gba:flex-col gba:items-center gba:gap-4">
          <div className="gba:animate-spin gba:rounded-full gba:h-12 gba:w-12 gba:border-b-2 gba:border-primary" />
          <p className="gba:text-muted-foreground">Loading investment report data...</p>
        </div>
      </div>
    )
  }

  if (reportError) {
    return (
      <ErrorAlert
        errors={[{ error: reportError, context: 'Failed to load investment report data' }]}
        prefixDataTestId={prefixDataTestId}
      />
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
        submitButtonText={isUpdate ? t('report-form-update') : t('report-form-create')}
        data-testid={formatDataTestId(prefixDataTestId, 'Form')}
      >
        {/* Report-specific fields at the top */}
        <InvestmentReportSegment
          form={form}
          prefixDataTestId={prefixDataTestId}
          showInvestmentSelect={showInvestmentSelect}
          selectedInvestmentId={investmentId}
          investments={investments}
          isLoadingInvestments={isLoadingInvestments}
          onInvestmentChange={handleInvestmentChange}
        />

        {/* Investment Information + Dynamic Segment */}
        {(!showInvestmentSelect || currentFetchedInvestment) && (
          <InvestmentLayout
            investmentInformationCustomFields={null}
            ownerEmployee={currentFetchedInvestment?.ownerEmployee || formValues.investment.ownerEmployee}
            account={currentFetchedInvestment?.investmentAccount || formValues.investment.investmentAccount}
            useAccounts={useAccounts}
            businessAppContext={businessAppContext}
            formFieldsDefinition={formFieldsDefinition}
            investmentCatalogLoading={investmentTypesLoading}
            disableInvestmentFields={true}
            getTypesByLevel={getTypesByLevel}
            getTypesByParent={getTypesByParent}
            getPathByType={getPathByType}
          />
        )}
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default InvestmentReportForm
