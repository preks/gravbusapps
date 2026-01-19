import React, { useMemo, useState, useCallback } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { Skeleton } from '@newwork/nw-design-system'
import { InvestmentInformationSegment } from '@/common/components/investment/form-segments/investment-information-segment'
import DynamicInvestmentSegment from '@/common/components/investment/form-segments/dynamic-investment-segment/DynamicInvestmentSegment'
import { InvestmentFormValues } from './types'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DynamicFormConfiguration } from '@/components/dynamic-form/types'
import { InvestmentType } from '@/common/data/investment/hooks/useInvestmentTypes'

const prefixDataTestId = 'InvestmentLayout'

export interface InvestmentLayoutProps {
  investmentInformationCustomFields?: React.ReactNode
  disableInvestmentFields?: boolean
  ownerEmployee?: any
  account?: any // Deprecated - use investmentAccounts instead
  investmentAccounts?: any[] // Multiple accounts with types (junction table format)
  useAccounts?: {
    accounts: any[]
    total: number
    loading: boolean
    error: string | null
    refetch: (variables?: any) => Promise<void>
  }
  businessAppContext: BusinessAppContextProps
  formFieldsDefinition: DynamicFormConfiguration | null
  investmentCatalogLoading: boolean
  getTypesByLevel?: (level: number) => InvestmentType[]
  getTypesByParent?: (parentId: string) => InvestmentType[]
  getPathByType?: (typeId: string | null | undefined) => InvestmentType[]
  baseTypeId?: string | null // Optional: override baseTypeId calculation
  // Loading state - shows skeletons while data is being fetched
  loading?: boolean
  enableAiAutofill?: boolean // New prop to enable AI autofill feature
}

export const InvestmentLayout: React.FC<InvestmentLayoutProps> = ({
  investmentInformationCustomFields,
  disableInvestmentFields = false,
  ownerEmployee,
  account,
  investmentAccounts,
  useAccounts,
  businessAppContext,
  formFieldsDefinition,
  investmentCatalogLoading,
  getTypesByLevel,
  getTypesByParent,
  getPathByType,
  baseTypeId: baseTypeIdProp,
  loading = false,
  enableAiAutofill = false
}) => {
  const form = useFormContext<InvestmentFormValues>()
  const [aiAutofillLoading, setAiAutofillLoading] = useState(false)

  const handleAiAutofillLoadingChange = useCallback((isLoading: boolean) => {
    setAiAutofillLoading(isLoading)
  }, [])

  // Use useWatch to get current form values - MUST be called before any conditional returns
  const investment = useWatch({ control: form.control, name: 'investment' })
  const equityInvestment = useWatch({ control: form.control, name: 'equityInvestment' })
  const realEstateInvestment = useWatch({ control: form.control, name: 'realEstateInvestment' })
  const liquidFundInvestment = useWatch({ control: form.control, name: 'liquidFundInvestment' })

  // Create formValues object for compatibility
  const formValues: InvestmentFormValues = {
    investment: investment || { name: '' },
    equityInvestment,
    realEstateInvestment,
    liquidFundInvestment
  }

  // For investment-form: investment.id exists (the investment entity ID)
  // For investment-report-form: investment.id doesn't exist, but investment.investmentId exists (reference to investment)
  // In both cases, if we have an ID, we should disable type selection
  const isUpdate = Boolean(formValues.investment.id || formValues.investment.investmentId)

  // Get investmentTypeId from form state
  const investmentTypeId = investment?.investmentTypeId || null

  // Use prop if provided, otherwise derive from investmentTypeId - MUST be called before any conditional returns
  const baseTypeId = useMemo(() => {
    if (baseTypeIdProp !== undefined) {
      return baseTypeIdProp
    }
    if (!investmentTypeId || !getPathByType) return null
    const path = getPathByType(investmentTypeId)
    const rootType = path.find(t => t.level === 0)
    return rootType?.id || null
  }, [investmentTypeId, getPathByType, baseTypeIdProp])

  // Get currency symbol from formValues.investment.currencyRef (now string ID) - MUST be called before any conditional returns
  const currencySymbol = useMemo(() => {
    const currencyRef: any = formValues.investment.currencyRef
    if (!currencyRef) return ''

    // If currencyRef is a string (ID format like "Currency:v1:EUR")
    if (typeof currencyRef === 'string') {
      // Extract code from ID format (e.g., "Currency:v1:EUR" -> "EUR")
      const parts = currencyRef.split(':')
      const code = parts.length > 0 ? parts[parts.length - 1] : currencyRef
      return code
    }

    return ''
  }, [formValues.investment.currencyRef])

  // Show skeletons while loading (after all hooks)
  if (loading) {
    return (
      <div data-testid={`${prefixDataTestId}-loading`} className="gba:space-y-6">
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

  // Show main form - only render form fields, no wrappers
  const isFormDisabled = disableInvestmentFields || aiAutofillLoading

  return (
    <div className="gba:space-y-6" data-testid={`${prefixDataTestId}-content`}>
      {/* Investment Basic Information */}
      <fieldset disabled={isFormDisabled}>
        <InvestmentInformationSegment
          businessAppContext={businessAppContext}
          ownerEmployee={ownerEmployee || formValues.investment.ownerEmployee}
          account={account}
          investmentAccounts={investmentAccounts}
          company={formValues.investment.company}
          useAccounts={useAccounts}
          entityId={formValues.investment.id || formValues.investment.investmentId}
          investmentGroup={baseTypeId}
          customFields={investmentInformationCustomFields}
          disabled={isFormDisabled}
        />
      </fieldset>

      {/* Dynamic Investment Segment - handles type selection and dynamic fields recursively */}
      {baseTypeId && getTypesByLevel && getTypesByParent && getPathByType && (
        <fieldset disabled={aiAutofillLoading}>
          <DynamicInvestmentSegment
            baseTypeId={baseTypeId}
            investmentTypeIdFieldPath="investment.investmentTypeId"
            getTypesByLevel={getTypesByLevel}
            getTypesByParent={getTypesByParent}
            getPathByType={getPathByType}
            businessAppContext={businessAppContext}
            currencySymbol={currencySymbol}
            testIdPrefix={prefixDataTestId}
            isUpdate={isUpdate}
            formFieldsDefinition={formFieldsDefinition}
            investmentCatalogLoading={investmentCatalogLoading}
            enableAiAutofill={enableAiAutofill}
            onAiAutofillLoadingChange={handleAiAutofillLoadingChange}
          />
        </fieldset>
      )}
    </div>
  )
}

export default InvestmentLayout
