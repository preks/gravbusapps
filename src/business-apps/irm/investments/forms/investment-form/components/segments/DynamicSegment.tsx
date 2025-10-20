import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { DynamicForm, DynamicFormFieldDefinition } from '@/components/dynamic-form'
import { useInvestmentFormContext } from '../../context/InvestmentFormContext'
import { InvestmentAccountField, InvestmentRolesField } from '../investment-field-types'
import { mapInvestmentDataToFormFields } from '../../utils/dynamicFieldMapper'
import { InvestmentFormValues } from '../../types'

interface DynamicSegmentProps {
  currencySymbol?: string
  testIdPrefix?: string
  rawInvestmentData?: any
  isUpdate?: boolean
}

const DynamicSegment: React.FC<DynamicSegmentProps> = ({
  currencySymbol,
  testIdPrefix = 'InvestmentForm',
  rawInvestmentData,
  isUpdate = false
}) => {
  const { control } = useFormContext()
  const {
    businessAppContext,
    formValues,
    setFormValues,
    getFormFieldsDefinition,
    investmentCatalogLoading,
    investmentCatalogData
  } = useInvestmentFormContext()

  // Ref to track mapping state per investment ID
  const lastMappedInvestmentId = useRef<string | null>(null)
  const [isDynamicFieldsMapped, setIsDynamicFieldsMapped] = useState(false)

  // Map dynamic fields after catalog data is loaded (only in update mode)
  useEffect(() => {
    // For create mode, mark as mapped immediately (no data to map)
    if (!isUpdate) {
      setIsDynamicFieldsMapped(true)
      return
    }

    if (!rawInvestmentData || !investmentCatalogData || investmentCatalogLoading) {
      return // Wait for both raw data and catalog to be available
    }

    const currentInvestmentId = formValues.investment.id || 'create-mode'

    // Check if we've already mapped for this specific investment
    if (lastMappedInvestmentId.current === currentInvestmentId) {
      return // Already mapped for this investment
    }

    const mapDynamicFields = () => {
      const fieldsDef = getFormFieldsDefinition()

      if (fieldsDef) {
        const dynamicDefaults = mapInvestmentDataToFormFields(rawInvestmentData, fieldsDef)

        // Deep merge nested structures
        if (Object.keys(dynamicDefaults).length > 0) {
          setFormValues({
            investment: {
              ...formValues.investment,
              ...dynamicDefaults.investment
            },
            equityInvestment: {
              ...formValues.equityInvestment,
              ...dynamicDefaults.equityInvestment
            },
            realEstateInvestment: {
              ...formValues.realEstateInvestment,
              ...dynamicDefaults.realEstateInvestment
            },
            liquidFundInvestment: {
              ...formValues.liquidFundInvestment,
              ...dynamicDefaults.liquidFundInvestment
            }
          } as InvestmentFormValues)
        }

        // Mark this investment as mapped
        lastMappedInvestmentId.current = currentInvestmentId
        setIsDynamicFieldsMapped(true)
      }
    }

    mapDynamicFields()
  }, [
    rawInvestmentData,
    investmentCatalogData,
    investmentCatalogLoading,
    formValues.investment.id,
    getFormFieldsDefinition,
    isUpdate,
    formValues,
    setFormValues
  ])

  // Render reference field (for REF_ type fields)
  // IMPORTANT: Must be defined before any conditional returns (Rules of Hooks)
  const renderReferenceField = useCallback(
    (entityType: string, field: DynamicFormFieldDefinition, fieldName: string) => {
      if (entityType === 'InvestmentAccount') {
        return (
          <InvestmentAccountField
            field={field}
            fieldName={fieldName}
            control={control}
            businessAppContext={businessAppContext}
            testIdPrefix={testIdPrefix}
          />
        )
      }

      if (entityType === 'InvestmentRole') {
        return (
          <InvestmentRolesField
            field={field}
            fieldName={fieldName}
            control={control}
            businessAppContext={businessAppContext}
            testIdPrefix={testIdPrefix}
          />
        )
      }

      // Fallback for unknown entity types
      return null
    },
    [control, businessAppContext, testIdPrefix]
  )

  // Don't render until dynamic fields are mapped in update mode
  if (isUpdate && !isDynamicFieldsMapped) {
    return null
  }

  return (
    <DynamicForm
      configuration={getFormFieldsDefinition() || { formFields: [] }}
      control={control}
      accessToken={businessAppContext.accessToken}
      testIdPrefix={testIdPrefix}
      currencySymbol={currencySymbol}
      renderReferenceField={renderReferenceField}
      isLoading={investmentCatalogLoading}
      error={null}
      emptyMessage="No dynamic fields available for this investment type"
    />
  )
}

export default DynamicSegment
