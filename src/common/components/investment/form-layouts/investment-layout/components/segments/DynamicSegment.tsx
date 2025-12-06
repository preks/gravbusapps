import React, { useCallback } from 'react'
import { useFormContext } from 'react-hook-form'
import { DynamicForm, DynamicFormFieldDefinition } from '@/components/dynamic-form'
import { InvestmentAccountField } from '@/common/components/investment/form-components/investment-account-select/InvestmentAccountField'
import { InvestmentRolesField } from '@/common/components/investment/form-components/investment-role-select/InvestmentRolesField'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FormFieldsDefinition } from '../../queries/InvestmentCatalogQueries'

interface DynamicSegmentProps {
  currencySymbol?: string
  testIdPrefix?: string
  isUpdate?: boolean
  businessAppContext: BusinessAppContextProps
  formFieldsDefinition: FormFieldsDefinition | null
  investmentCatalogLoading: boolean
  selectedGroupId?: string | null
  getTypesByLevel?: (level: number) => any[]
  getTypesByParent?: (parentId: string) => any[]
}

const DynamicSegment: React.FC<DynamicSegmentProps> = ({
  currencySymbol,
  testIdPrefix = 'InvestmentForm',
  businessAppContext,
  formFieldsDefinition,
  investmentCatalogLoading
}) => {
  const { control } = useFormContext()

  // Dynamic fields are already mapped by the form component
  // No need to map them here anymore

  // Render reference field (for REF_ type fields)
  // IMPORTANT: Must be defined before any conditional returns (Rules of Hooks)
  const renderReferenceField = useCallback(
    (entityType: string, _field: DynamicFormFieldDefinition, fieldName: string, formField: any) => {
      if (entityType === 'InvestmentAccount') {
        return (
          <InvestmentAccountField
            value={formField.value}
            onValueChange={value => formField.onChange(value)}
            fieldName={fieldName}
            businessAppContext={businessAppContext}
            testIdPrefix={testIdPrefix}
          />
        )
      }

      if (entityType === 'InvestmentRole') {
        return (
          <InvestmentRolesField
            value={formField.value}
            onValueChange={value => formField.onChange(value)}
            fieldName={fieldName}
            businessAppContext={businessAppContext}
            testIdPrefix={testIdPrefix}
          />
        )
      }

      // Fallback for unknown entity types
      return null
    },
    [businessAppContext, testIdPrefix]
  )

  return (
    <DynamicForm
      configuration={formFieldsDefinition || { formFields: [] }}
      control={control}
      accessToken={businessAppContext.accessToken}
      testIdPrefix={testIdPrefix}
      currencySymbol={currencySymbol}
      renderReferenceField={renderReferenceField}
      businessAppContext={businessAppContext}
      isLoading={investmentCatalogLoading}
      error={null}
      emptyMessage="No dynamic fields available for this investment type"
    />
  )
}

export default DynamicSegment
