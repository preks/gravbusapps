import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { InvestmentLayout, InvestmentFormValues } from '@/common/components/investment/form-layouts/investment-layout'
import {
  useGetInvestmentCatalogData,
  FormFieldsDefinition
} from '@/common/components/investment/form-layouts/investment-layout/queries/InvestmentCatalogQueries'
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
  SelectValue,
  DateInput
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppActionForm } from '@/components/app-action-form'
import { CatalogSelect } from '@/components/catalog-select'
import { useInvestmentReport } from '@/common/data/investment/hooks/useInvestmentReport.new'
import { useInvestment } from '@/common/data/investment/hooks/useInvestment.new'
import { useGetInvestments } from '@/common/data/investment/hooks/useInvestments'
import { useInvestmentAccountsList } from '@/common/data/investment/hooks/useInvestmentAccounts'
import { useInvestmentTypes } from '@/common/data/investment/hooks/useInvestmentTypes'
import { buildInvestmentReportPayload } from '@/common/data/investment/types/investmentReportTypes'
import type { InvestmentReport } from '@/common/data/investment/types/investmentReportTypes'
import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import type { ReportScope } from '@/common/data/investment/types/investmentEnums'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { ErrorAlert } from '@/components/error-alert'
import { createDynamicInvestmentSchema } from '@/common/components/investment/form-layouts/investment-layout/investmentSchema'
import { mapToFormValues, ArrayToObjectConfig } from '@/common/utils/formMappingUtils'
import { mapInvestmentDataToFormFields } from '@/common/components/investment/form-layouts/investment-layout/utils/investmentFormMapper'
import { zodResolver } from '@hookform/resolvers/zod'
import dayjs from 'dayjs'
import { transformReportToFormValues } from './utils/transformInitialValues'

interface InvestmentReportFormProps extends BusinessAppContextProps {
  initialValues?: Partial<InvestmentReport>
  onSubmit?: (values: any) => Promise<void>
  onCancel?: () => Promise<void>
  onDelete?: (id: string) => Promise<void>
  prefixDataTestId?: string
}

// Internal component that renders form with wrappers
const InvestmentReportFormContent: React.FC<{
  onSubmit?: (values: any) => Promise<void>
  onCancel?: () => Promise<void>
  reportId?: string
  fetchedReport?: InvestmentReport | null
  transformedInitialValues: Partial<InvestmentFormValues>
  accessToken: string
  userInfo: BusinessAppContextProps['userInfo']
  additionalData: BusinessAppContextProps['additionalData']
  prefixDataTestId: string
  fetchedInvestment?: any
  investmentId?: string
  investmentLoading?: boolean
  form: ReturnType<
    typeof useForm<InvestmentFormValues & { investmentReportDate?: string; investmentReportScope?: string }>
  >
}> = ({
  onSubmit,
  onCancel,
  reportId,
  fetchedReport,
  transformedInitialValues,
  accessToken,
  userInfo,
  additionalData,
  prefixDataTestId,
  fetchedInvestment,
  investmentId,
  investmentLoading = false,
  form
}) => {
  const businessAppContext = { accessToken, userInfo, additionalData }

  // Account selection hook - using new declarative list hook (like InvestmentForm)
  const useAccounts = useInvestmentAccountsList(businessAppContext, { limit: 20 })

  // Load useInvestmentTypes hook (needed for DynamicInvestmentSegment to render correctly)
  const investmentTypesHook = useInvestmentTypes(businessAppContext)
  const { getTypesByLevel, getTypesByParent } = investmentTypesHook

  // Load catalog data
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

  // Extract investmentId from additionalData (like AccountForm/LeadForm)
  // Priority: fetchedReport.investmentId > additionalData.investmentId
  const reportInvestmentId =
    fetchedReport?.investmentId ||
    additionalData?.investmentId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.investmentId
  const [selectedInvestmentId, setSelectedInvestmentId] = useState<string | undefined>(
    reportInvestmentId || investmentId
  )
  const [investments, setInvestments] = useState<Investment[]>([])
  const [isLoadingInvestments, setIsLoadingInvestments] = useState(false)

  const { fetchInvestments } = useGetInvestments({
    accessToken,
    userInfo,
    additionalData
  })

  // Use fetchedInvestment from prop if available
  // In Fall 2 (reportId exists): use fetchedReport.investment (investment comes from report)
  // In Fall 3 (no reportId, but investmentId exists): use fetchedInvestment
  // NO FALLBACK - currency, name, owner, account ALWAYS come from investment, never from report
  const currentFetchedInvestment = fetchedReport?.investment || fetchedInvestment

  // Track if we've already mapped dynamic fields for this investment
  const lastMappedInvestmentIdRef = useRef<string | null>(null)

  // Map dynamic fields after catalog data is loaded (only in update mode or when investment is loaded)
  useEffect(() => {
    // Only map if we have investment data
    if (!currentFetchedInvestment) {
      return
    }

    const effectiveId = currentFetchedInvestment.id || selectedInvestmentId || investmentId
    if (!effectiveId) {
      return
    }

    // Wait for catalog data to be loaded
    if (!investmentCatalogData || investmentCatalogLoading) {
      return
    }

    // Check if we've already mapped for this investment
    if (lastMappedInvestmentIdRef.current === effectiveId) {
      return
    }

    // Get form fields definition for dynamic mapping
    const fieldsDef = getFormFieldsDefinition()
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
    selectedInvestmentId,
    investmentId,
    investmentCatalogData,
    investmentCatalogLoading,
    getFormFieldsDefinition,
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

  // Update selectedInvestmentId when investmentId changes (also when fetchedReport is loaded)
  useEffect(() => {
    const effectiveId = reportInvestmentId || investmentId
    if (effectiveId && effectiveId !== selectedInvestmentId) {
      setSelectedInvestmentId(effectiveId)
    }
  }, [reportInvestmentId, investmentId, selectedInvestmentId])

  // Show investment select only if no investment was provided initially
  const showInvestmentSelect = !(reportInvestmentId || investmentId)

  // Map investment data to form values when investment is loaded
  // Only run this in Fall 3 (no reportId, but investmentId exists)
  // In Fall 2, values come from transformedInitialValues (based on fetchedReport)
  useEffect(() => {
    // Skip if we have a reportId (Fall 2) - values come from transformedInitialValues
    if (reportId) {
      return
    }

    if (currentFetchedInvestment && !investmentLoading && (selectedInvestmentId || investmentId)) {
      // Create base schema for mapping
      const baseSchema = createDynamicInvestmentSchema(undefined)
      const arrayToObjectConfig: ArrayToObjectConfig = {
        arrayFields: ['equityInvestment', 'realEstateInvestment', 'liquidFundInvestment']
      }

      // Map investment data to form values
      // Wrap currentFetchedInvestment in { investment: ... } structure to match schema
      const mappedValues = mapToFormValues(
        { investment: currentFetchedInvestment },
        baseSchema,
        undefined,
        undefined,
        arrayToObjectConfig
      ) as Partial<InvestmentFormValues>

      // Extract liquidFundInvestment, equityInvestment, realEstateInvestment from fetchedInvestment
      // Schema expects them at top level, but GraphQL returns them as arrays nested in investment.*
      const fetchedAny = currentFetchedInvestment as any
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

      // Ensure ownerEmployeeId is set from ownerEmployee if available
      if (mappedValues.investment?.ownerEmployee && !mappedValues.investment?.ownerEmployeeId) {
        mappedValues.investment.ownerEmployeeId = (mappedValues.investment.ownerEmployee as any)?.id
      }

      // Ensure currencyRef is set from currency if available
      if (mappedValues.investment?.currency && !mappedValues.investment?.currencyRef) {
        const currency = mappedValues.investment.currency as any
        mappedValues.investment.currencyRef = typeof currency === 'object' ? currency?.id : currency
      }

      // Ensure investmentAccountId is set from investmentAccount if available
      if (mappedValues.investment?.investmentAccount && !mappedValues.investment?.investmentAccountId) {
        const account = mappedValues.investment.investmentAccount as any
        mappedValues.investment.investmentAccountId = typeof account === 'object' ? account?.id : account
      }

      // Set investment.id and investmentId so InvestmentLayout recognizes it and validation works
      // Also convert null to undefined for optional fields (like code) to fix validation errors
      // Remove id and version if we're creating a new report (not updating)
      if (mappedValues.investment) {
        // FIRST: Remove id and version from investment if we're creating a new report (not updating)
        // These belong to the investment, not the report, so we shouldn't include them in create mode
        if (!reportId) {
          delete (mappedValues.investment as any).id
          delete (mappedValues.investment as any).version

          // Also remove id and version from sub-groups if we're creating a new report
          if ((mappedValues.investment as any).equityInvestment) {
            delete (mappedValues.investment as any).equityInvestment.id
            delete (mappedValues.investment as any).equityInvestment.version
          }
          if ((mappedValues.investment as any).liquidFundInvestment) {
            delete (mappedValues.investment as any).liquidFundInvestment.id
            delete (mappedValues.investment as any).liquidFundInvestment.version
          }
          if ((mappedValues.investment as any).realEstateInvestment) {
            delete (mappedValues.investment as any).realEstateInvestment.id
            delete (mappedValues.investment as any).realEstateInvestment.version
          }
        }

        // THEN: Set investment.id and investmentId so InvestmentLayout recognizes it
        // Always set investment.id if we have an investmentId (Fall 2 and 3)
        const effectiveId = selectedInvestmentId || investmentId
        if (effectiveId) {
          ;(mappedValues.investment as any).id = effectiveId
          ;(mappedValues.investment as any).investmentId = effectiveId
        }

        // Convert null to undefined for optional string fields (schema expects string | undefined, not null)
        if ((mappedValues.investment as any).code === null) {
          delete (mappedValues.investment as any).code
        }
      }

      // Update form values directly
      Object.keys(mappedValues).forEach(key => {
        if (mappedValues[key as keyof typeof mappedValues]) {
          form.setValue(key as any, mappedValues[key as keyof typeof mappedValues] as any)
        }
      })
      if (mappedValues.investment) {
        Object.keys(mappedValues.investment).forEach(key => {
          form.setValue(`investment.${key}` as any, (mappedValues.investment as any)[key])
        })
      }
    }
  }, [currentFetchedInvestment, investmentLoading, selectedInvestmentId, form, reportId])

  // Handle investment selection change - load investment data and map to form values
  const handleInvestmentChange = useCallback((investmentId: string) => {
    // Update selected investment ID - this will trigger useInvestment hook
    setSelectedInvestmentId(investmentId)
  }, [])

  // Determine if this is an update
  const isUpdate = Boolean(reportId || formValues.investment.id)

  const reportScopeOptions = [
    { label: getTranslationFromI18nKeyAndLabel('filter.scope.daily', 'Daily'), value: 'DAILY' },
    { label: getTranslationFromI18nKeyAndLabel('filter.scope.weekly', 'Weekly'), value: 'WEEKLY' },
    { label: getTranslationFromI18nKeyAndLabel('filter.scope.monthly', 'Monthly'), value: 'MONTHLY' },
    { label: getTranslationFromI18nKeyAndLabel('filter.scope.quarterly', 'Quarterly'), value: 'QUARTERLY' },
    { label: getTranslationFromI18nKeyAndLabel('filter.scope.yearly', 'Yearly'), value: 'YEARLY' }
  ]

  // Handle form submission - transform InvestmentFormValues back to InvestmentReport payload
  const handleSubmit = useCallback(
    async (
      formData: InvestmentFormValues & {
        investmentReportDate?: string
        investmentReportScope?: string
      }
    ) => {
      try {
        // Merge context data (selections) with form data (user input)
        const mergedData: Partial<Investment> = {
          ...formValues.investment, // Context data (selections, defaults)
          ...formData.investment // Form data (user input)
        }

        // Get report-specific fields from form data
        const reportDate =
          (formData as any).investmentReportDate || (transformedInitialValues as any).investmentReportDate
        const reportScope =
          (formData as any).investmentReportScope || (transformedInitialValues as any).investmentReportScope
        // Extract investmentId from formValues (set when investment is loaded)
        // Fallback to selectedInvestmentId if formValues doesn't have it yet
        const finalInvestmentId = formValues.investment.id || selectedInvestmentId || reportInvestmentId || investmentId

        // The payload from InvestmentLayout will be in InvestmentFormValues format
        // We need to transform it to InvestmentReport format
        // Map investment.investmentRole (from Layout) to investmentRoleReport (for Report)
        // Map Sub-Groups (from Layout) to Report field names (with "Report")
        // NOTE: Sub-Groups are on root level of InvestmentFormValues, not in investment
        const { investmentRole, ...investmentDataWithoutSubGroups } = mergedData
        const equityInvestment = formValues.equityInvestment || formData.equityInvestment
        const liquidFundInvestment = formValues.liquidFundInvestment || formData.liquidFundInvestment
        const realEstateInvestment = formValues.realEstateInvestment || formData.realEstateInvestment
        const reportPayload: Partial<InvestmentReport> = {
          ...investmentDataWithoutSubGroups,
          // Add report-specific fields from form state
          date: reportDate,
          scope: reportScope as ReportScope | undefined,
          investmentId: finalInvestmentId,
          // Map investmentRole (from Layout) to investmentRoleReport (for Report)
          ...(investmentRole && {
            investmentRoleReport: investmentRole
          }),
          // Map Sub-Groups (from Layout) to Report field names (with "Report")
          ...(equityInvestment && {
            equityInvestmentReport: Array.isArray(equityInvestment) ? equityInvestment : [equityInvestment]
          }),
          ...(liquidFundInvestment && {
            liquidFundInvestmentReport: Array.isArray(liquidFundInvestment)
              ? liquidFundInvestment
              : [liquidFundInvestment]
          }),
          ...(realEstateInvestment && {
            realEstateInvestmentReport: Array.isArray(realEstateInvestment)
              ? realEstateInvestment
              : [realEstateInvestment]
          })
        }

        const finalPayload = buildInvestmentReportPayload(reportPayload)

        // Call optional custom handler
        if (onSubmit) {
          await onSubmit(finalPayload)
        }

        return finalPayload
      } catch (error) {
        console.error('Error building investment report payload:', error)
        throw error
      }
    },
    [formValues, transformedInitialValues, onSubmit, selectedInvestmentId, reportInvestmentId, investmentId]
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

  const processType = isUpdate ? 'update' : 'create'

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
        submitButtonText={isUpdate ? 'Update Report' : 'Create Report'}
        data-testid={formatDataTestId(prefixDataTestId, 'Form')}
      >
        {/* Report-specific fields at the top */}
        <div className="gba:space-y-4 gba:mb-6">
          {/* Investment Selection - only show if no investment provided */}
          {showInvestmentSelect && (
            <div className="gba:space-y-2">
              <label className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel('report.form.investment', 'Investment')}{' '}
                <span className="gba:text-destructive">*</span>
              </label>
              <Select
                onValueChange={handleInvestmentChange}
                value={selectedInvestmentId || ''}
                disabled={isLoadingInvestments}
                data-testid={formatDataTestId(prefixDataTestId, 'InvestmentSelect')}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={getTranslationFromI18nKeyAndLabel(
                      'report.form.investment.placeholder',
                      'Select investment'
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  {investments.map(investment => (
                    <SelectItem key={investment.id} value={investment.id || ''}>
                      {investment.name} {investment.code && `(${investment.code})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Report Date and Scope Row */}
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <FormField
              control={form.control}
              name="investmentReportDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {getTranslationFromI18nKeyAndLabel('report.form.date', 'Report Date')}{' '}
                    <span className="gba:text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <DateInput
                      type="date"
                      outputFormat="iso"
                      value={field.value || dayjs().format('YYYY-MM-DD')}
                      onChange={value => field.onChange(value || '')}
                      data-testid={formatDataTestId(prefixDataTestId, 'DateInput')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="investmentReportScope"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {getTranslationFromI18nKeyAndLabel('report.form.scope', 'Report Scope')}{' '}
                    <span className="gba:text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value || 'MONTHLY'}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={getTranslationFromI18nKeyAndLabel(
                            'report.form.scope.placeholder',
                            'Select scope'
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {reportScopeOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Investment Information + Dynamic Segment */}
        {(!showInvestmentSelect || currentFetchedInvestment) && (
          <InvestmentLayout
            investmentInformationCustomFields={null}
            ownerEmployee={currentFetchedInvestment?.ownerEmployee}
            account={currentFetchedInvestment?.investmentAccount}
            useAccounts={useAccounts}
            businessAppContext={businessAppContext}
            formFieldsDefinition={formFieldsDefinition}
            investmentCatalogLoading={investmentCatalogLoading}
            disableInvestmentFields={true}
            getTypesByLevel={getTypesByLevel}
            getTypesByParent={getTypesByParent}
          />
        )}
      </AppActionForm>
    </CatalogSelect.Provider>
  )
}

export const InvestmentReportForm: React.FC<InvestmentReportFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  accessToken,
  userInfo,
  additionalData,
  prefixDataTestId = 'InvestmentReportForm'
}) => {
  // ALL HOOKS MUST BE CALLED BEFORE EARLY RETURN (Rules of Hooks)

  // Extract reportId from additionalData
  const reportId =
    initialValues?.id ||
    additionalData?.investmentReportId ||
    additionalData?.id ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.investmentReportId

  // Fetch investment report if editing
  const {
    investmentReport: fetchedReport,
    loading: reportLoading,
    error: reportError
  } = useInvestmentReport(accessToken || '', reportId, 'record')

  // Extract investmentId from all sources (like AccountForm/LeadForm)
  const investmentId =
    fetchedReport?.investmentId ||
    additionalData?.investmentId ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.investmentId

  // Load investment data if investmentId is provided (must be before transformedInitialValues)
  const { investment: fetchedInvestment, loading: investmentLoading } = useInvestment(
    accessToken || '',
    investmentId,
    'record'
  )

  // Transform InvestmentReport to InvestmentFormValues
  // InvestmentReport has the same fields as Investment, plus date, scope, investmentId
  const transformedInitialValues: Partial<
    InvestmentFormValues & { investmentReportDate?: string; investmentReportScope?: string }
  > = useMemo(() => {
    const baseValues = transformReportToFormValues(fetchedReport || initialValues, reportId, investmentId)

    // Ensure investment fields come from investment, not report
    const currentFetchedInvestment = fetchedReport?.investment || fetchedInvestment

    const mergedInvestment = {
      ...(baseValues.investment || {}),
      // Prefer IDs already present on investment
      ...(currentFetchedInvestment?.investmentAccountId &&
        !(baseValues.investment as any)?.investmentAccountId && {
          investmentAccountId: currentFetchedInvestment.investmentAccountId
        }),
      ...(currentFetchedInvestment?.investmentAccount &&
        !(baseValues.investment as any)?.investmentAccountId && {
          investmentAccountId:
            typeof currentFetchedInvestment.investmentAccount === 'object'
              ? currentFetchedInvestment.investmentAccount.id
              : currentFetchedInvestment.investmentAccount
        }),
      ...(currentFetchedInvestment?.currencyRef &&
        !(baseValues.investment as any)?.currencyRef && {
          currencyRef: currentFetchedInvestment.currencyRef
        }),
      ...(currentFetchedInvestment?.currency &&
        !(baseValues.investment as any)?.currencyRef && {
          currencyRef:
            typeof currentFetchedInvestment.currency === 'object'
              ? currentFetchedInvestment.currency.id
              : currentFetchedInvestment.currency
        }),
      ...(currentFetchedInvestment?.ownerEmployeeId &&
        !(baseValues.investment as any)?.ownerEmployeeId && {
          ownerEmployeeId: currentFetchedInvestment.ownerEmployeeId
        }),
      ...(currentFetchedInvestment?.ownerEmployee &&
        !(baseValues.investment as any)?.ownerEmployeeId && {
          ownerEmployeeId:
            typeof currentFetchedInvestment.ownerEmployee === 'object'
              ? currentFetchedInvestment.ownerEmployee.id
              : currentFetchedInvestment.ownerEmployee
        }),
      ...(currentFetchedInvestment?.name &&
        !(baseValues.investment as any)?.name && {
          name: currentFetchedInvestment.name
        }),
      // Ensure hierarchy fields present (group/type/liquid fund type) if investment has them
      ...(currentFetchedInvestment?.investmentGroup &&
        !(baseValues.investment as any)?.investmentGroup && {
          investmentGroup: currentFetchedInvestment.investmentGroup
        }),
      ...(currentFetchedInvestment?.investmentType &&
        !(baseValues.investment as any)?.investmentType && {
          investmentType: currentFetchedInvestment.investmentType
        })
    }

    // Liquid fund sub-type from nested investment
    const mergedLiquidFund =
      baseValues.liquidFundInvestment || (currentFetchedInvestment as any)?.liquidFundInvestment || undefined
    const mergedLiquidFundNormalized =
      mergedLiquidFund && Array.isArray(mergedLiquidFund) ? mergedLiquidFund[0] : mergedLiquidFund

    return {
      ...baseValues,
      investment: mergedInvestment,
      ...(mergedLiquidFundNormalized && {
        liquidFundInvestment: mergedLiquidFundNormalized
      })
    }
  }, [fetchedReport, initialValues, investmentId, reportId, fetchedInvestment])

  // Create form instance - resolver will be updated dynamically in InvestmentReportFormContent
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
    <InvestmentReportFormContent
      onSubmit={onSubmit}
      onCancel={onCancel}
      reportId={reportId}
      fetchedReport={fetchedReport}
      transformedInitialValues={transformedInitialValues}
      accessToken={accessToken}
      userInfo={userInfo}
      additionalData={additionalData}
      prefixDataTestId={prefixDataTestId}
      fetchedInvestment={fetchedInvestment}
      investmentId={investmentId}
      investmentLoading={investmentLoading}
      form={form}
    />
  )
}

export default InvestmentReportForm
