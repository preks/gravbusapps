import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { InvestmentLayout, InvestmentFormValues } from '@/common/components/investment/form-layouts/investment-layout'
import { useTranslation, Skeleton } from '@newwork/nw-design-system'
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

  // Compute initialInvestmentId - prioritize fetchedReport.investmentId if report is loaded
  // Wait for report loading to complete if investmentReportId was provided
  const initialInvestmentId = useMemo(() => {
    // If we have an investmentReportId, wait for loading to complete
    if (investmentReportId && reportLoading) {
      // Return fallback during loading (will be updated once loading completes)
      return additionalData?.investmentId || additionalData?.psi_taskPayload?.psi_initialParameters?.investmentId
    }

    // Once loading is complete (or no reportId), prioritize fetchedReport.investmentId
    if (fetchedReport?.investmentId) {
      return fetchedReport.investmentId
    }

    // Fallback to additionalData
    return additionalData?.investmentId || additionalData?.psi_taskPayload?.psi_initialParameters?.investmentId
  }, [
    investmentReportId,
    reportLoading,
    fetchedReport?.investmentId,
    additionalData?.investmentId,
    additionalData?.psi_taskPayload?.psi_initialParameters?.investmentId
  ])

  // InvestmentId as state - initialize with computed initialInvestmentId
  // This will update when fetchedReport finishes loading
  const [investmentId, setInvestmentId] = useState<string | undefined>(initialInvestmentId)

  // Update investmentId when initialInvestmentId changes (e.g., when report finishes loading)
  useEffect(() => {
    if (initialInvestmentId && initialInvestmentId !== investmentId) {
      setInvestmentId(initialInvestmentId)
    }
  }, [initialInvestmentId])

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

  // Get current form values using useWatch - watch all values at once to avoid type instantiation issues
  const formValues = useWatch({ control: form.control }) as InvestmentFormValues & {
    investmentReportDate?: string
    investmentReportScope?: string
  }

  // Ensure investment has at least name field
  if (!formValues.investment?.name) {
    formValues.investment = { ...formValues.investment, name: '' }
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

  // Calculate baseTypeId from investmentTypeId (root type at level 0)
  const baseTypeId = useMemo(() => {
    if (!investmentTypeId || !getPathByType) return null
    const path = getPathByType(investmentTypeId)
    const rootType = path.find(t => t.level === 0)
    return rootType?.id || null
  }, [investmentTypeId, getPathByType])

  // Get form fields definition using getInvestmentFieldsByType
  const formFieldsDefinition = useMemo(() => {
    return getInvestmentFieldsByType(investmentTypeId)
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
    const fieldsDef = getInvestmentFieldsByType(investmentTypeId)
    if (!fieldsDef) {
      return
    }

    // Map dynamic fields from raw investment data
    const dynamicFields = mapInvestmentDataToFormFields(currentFetchedInvestment, fieldsDef)

    // Merge dynamic fields with existing form values
    if (Object.keys(dynamicFields).length > 0) {
      // Get current form values
      const currentValues = form.getValues()

      // Merge dynamic fields with current values
      const mergedValues = {
        ...currentValues,
        investment: {
          ...currentValues.investment,
          ...(dynamicFields.investment ?? {})
        },
        ...(dynamicFields.equityInvestment && {
          equityInvestment: {
            ...currentValues.equityInvestment,
            ...dynamicFields.equityInvestment
          }
        }),
        ...(dynamicFields.realEstateInvestment && {
          realEstateInvestment: {
            ...currentValues.realEstateInvestment,
            ...dynamicFields.realEstateInvestment
          }
        }),
        ...(dynamicFields.liquidFundInvestment && {
          liquidFundInvestment: {
            ...currentValues.liquidFundInvestment,
            ...dynamicFields.liquidFundInvestment
          }
        })
      }

      // Update form with merged values in one call (avoids type instantiation issues)
      form.reset(mergedValues as any)
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

  // Determine if we're still loading initial data
  const isLoading = reportLoading || (investmentId && investmentLoading) || investmentTypesLoading

  // Early returns AFTER all hooks
  if (!accessToken) {
    return <ErrorAlert errors={[{ type: 'accessToken' }]} prefixDataTestId={prefixDataTestId} />
  }

  // Show skeletons while loading (replaces spinner)
  if (isLoading) {
    return (
      <div data-testid={formatDataTestId(prefixDataTestId, 'loading')} className="gba:space-y-6 gba:p-6">
        {/* Report-specific fields skeleton */}
        <div className="gba:space-y-4">
          <Skeleton className="gba:h-10 gba:w-full" />
          <Skeleton className="gba:h-10 gba:w-1/2" />
        </div>
        {/* Investment Information Skeleton */}
        <div className="gba:space-y-4">
          <Skeleton className="gba:h-10 gba:w-full" />
          <Skeleton className="gba:h-10 gba:w-full" />
          <Skeleton className="gba:h-10 gba:w-3/4" />
          <Skeleton className="gba:h-10 gba:w-full" />
          <Skeleton className="gba:h-32 gba:w-full" />
        </div>
        {/* Dynamic Segment Skeleton */}
        <div className="gba:space-y-2">
          <Skeleton className="gba:h-12 gba:w-full" />
          <Skeleton className="gba:h-12 gba:w-full" />
          <Skeleton className="gba:h-24 gba:w-full" />
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
            baseTypeId={baseTypeId}
            loading={false}
            enableAiAutofill={true}
          />
        )}
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export default InvestmentReportForm
