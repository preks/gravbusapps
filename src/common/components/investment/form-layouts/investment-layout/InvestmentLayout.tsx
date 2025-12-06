import React, { useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { InvestmentInformationSegment } from '@/common/components/investment/form-segments/investment-information-segment'
import DynamicInvestmentSegment from '@/common/components/investment/form-segments/dynamic-investment-segment/DynamicInvestmentSegment'
import { InvestmentFormValues } from './types'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FormFieldsDefinition } from './queries/InvestmentCatalogQueries'
import { InvestmentType } from '@/common/data/investment/hooks/useInvestmentTypes'

const prefixDataTestId = 'InvestmentLayout'

export interface InvestmentLayoutProps {
  investmentInformationCustomFields?: React.ReactNode
  disableInvestmentFields?: boolean
  ownerEmployee?: any
  account?: any
  useAccounts?: {
    accounts: any[]
    total: number
    loading: boolean
    error: string | null
    refetch: (variables?: any) => Promise<void>
  }
  businessAppContext: BusinessAppContextProps
  formFieldsDefinition: FormFieldsDefinition | null
  investmentCatalogLoading: boolean
  getTypesByLevel?: (level: number) => InvestmentType[]
  getTypesByParent?: (parentId: string) => InvestmentType[]
}

export const InvestmentLayout: React.FC<InvestmentLayoutProps> = ({
  investmentInformationCustomFields,
  disableInvestmentFields = false,
  ownerEmployee,
  account,
  useAccounts,
  businessAppContext,
  formFieldsDefinition,
  investmentCatalogLoading,
  getTypesByLevel,
  getTypesByParent
}) => {
  const form = useFormContext<InvestmentFormValues>()

  // Use useWatch to get current form values
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

  const isUpdate = Boolean(formValues.investment.id)

  // Extract selected Group ID from form state
  const getGroupId = (group: any): string | null => {
    if (!group) return null
    return typeof group === 'object' ? group.id : group
  }
  const selectedGroupId = getGroupId(formValues.investment.investmentGroup)

  // Get currency symbol from formValues.investment.currencyRef (now string ID)
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

  // Show main form - only render form fields, no wrappers
  return (
    <div data-testid={`${prefixDataTestId}-content`} className="gba:space-y-6">
      {/* Investment Basic Information */}
      <InvestmentInformationSegment
        businessAppContext={businessAppContext}
        ownerEmployee={ownerEmployee || formValues.investment.ownerEmployee}
        account={account}
        useAccounts={useAccounts}
        entityId={formValues.investment.id}
        investmentGroup={formValues.investment.investmentGroup}
        customFields={investmentInformationCustomFields}
        disabled={disableInvestmentFields}
      />

      {/* Dynamic Investment Segment - handles type selection and dynamic fields recursively */}
      {selectedGroupId && getTypesByLevel && getTypesByParent && (
        <DynamicInvestmentSegment
          selectedGroupId={selectedGroupId}
          getTypesByLevel={getTypesByLevel}
          getTypesByParent={getTypesByParent}
          businessAppContext={businessAppContext}
          currencySymbol={currencySymbol}
          testIdPrefix={prefixDataTestId}
          isUpdate={isUpdate}
          formFieldsDefinition={formFieldsDefinition}
          investmentCatalogLoading={investmentCatalogLoading}
        />
      )}
    </div>
  )
}

export default InvestmentLayout
