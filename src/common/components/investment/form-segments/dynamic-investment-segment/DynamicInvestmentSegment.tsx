import React, { useCallback, useMemo, useEffect, useRef } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { InvestmentType } from '@/common/data/investment/hooks/useInvestmentTypes'
import { InvestmentFormValues } from '@/common/components/investment/form-layouts/investment-layout/types'
import { DynamicForm, DynamicFormFieldDefinition } from '@/components/dynamic-form'
import { InvestmentAccountField } from '@/common/components/investment/form-components/investment-account-select/InvestmentAccountField'
import { InvestmentRolesField } from '@/common/components/investment/form-components/investment-role-select/InvestmentRolesField'
import { InvestmentTypeSelect } from '@/common/components/investment/form-components/investment-type-select'
import { DynamicFormConfiguration } from '@/components/dynamic-form/types'

/**
 * Parse objectValue from catalog entry (might be string or object)
 */
const parseObjectValue = (objValue: any): any => {
  if (!objValue) return null
  try {
    return typeof objValue === 'string' ? JSON.parse(objValue) : objValue
  } catch {
    return objValue
  }
}

interface DynamicInvestmentSegmentProps {
  baseTypeId?: string | null // Level 0 Group ID to start from
  investmentTypeIdFieldPath: string // Field path to investmentTypeId (e.g., "investment.investmentTypeId" or "investmentTypeId")
  getTypesByLevel: (level: number) => InvestmentType[]
  getTypesByParent: (parentId: string) => InvestmentType[]
  getPathByType: (typeId: string | null | undefined) => InvestmentType[]
  businessAppContext: BusinessAppContextProps
  currencySymbol?: string
  testIdPrefix?: string
  isUpdate?: boolean
  formFieldsDefinition?: DynamicFormConfiguration | null
  investmentCatalogLoading?: boolean
}

/**
 * DynamicInvestmentSegment - Recursive type selection with dynamic fields
 *
 * Works with investmentTypeId (leaf type ID) stored in form state.
 * Derives hierarchy from investmentTypeId using getPathByType.
 *
 * Shows DynamicFields when no more children exist for selected type
 */
const DynamicInvestmentSegment: React.FC<DynamicInvestmentSegmentProps> = ({
  baseTypeId,
  investmentTypeIdFieldPath,
  getTypesByLevel,
  getTypesByParent,
  getPathByType,
  businessAppContext,
  currencySymbol,
  testIdPrefix = 'DynamicInvestmentSegment',
  isUpdate = false,
  formFieldsDefinition,
  investmentCatalogLoading = false
}) => {
  const { control, setValue } = useFormContext<InvestmentFormValues>()
  const previousInvestmentTypeIdRef = useRef<string | null>(null)

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
            businessAppContext={businessAppContext as any}
            testIdPrefix={testIdPrefix}
          />
        )
      }

      // Fallback for unknown entity types
      return null
    },
    [businessAppContext, testIdPrefix]
  )

  // Watch entire form state once
  const formValues = useWatch({ control })

  // Get current investmentTypeId from form state
  const getInvestmentTypeId = useCallback((): string | null => {
    const fieldPathParts = investmentTypeIdFieldPath.split('.')
    const value = fieldPathParts.reduce((obj: any, key) => obj?.[key], formValues)
    return value || null
  }, [investmentTypeIdFieldPath, formValues])

  // Get current investmentTypeId
  const investmentTypeId = getInvestmentTypeId()

  // Clear dynamic fields when investmentTypeId changes (in create mode only)
  useEffect(() => {
    if (isUpdate) return

    const previousTypeId = previousInvestmentTypeIdRef.current
    const currentTypeId = investmentTypeId

    // Clear dynamic fields when type changes
    if (previousTypeId !== null && previousTypeId !== currentTypeId) {
      if (formFieldsDefinition?.formFields) {
        formFieldsDefinition.formFields.forEach(group => {
          group.fields.forEach(field => {
            const property = field.property
            if (property) {
              if (property.startsWith('investment.')) {
                const fieldName = property.replace('investment.', '')
                // Skip core fields
                if (!['id', 'name', 'investmentTypeId', 'investmentStatus'].includes(fieldName)) {
                  setValue(property as any, undefined as any)
                }
              } else {
                setValue(property as any, undefined as any)
              }
            }
          })
        })
      }
    }

    previousInvestmentTypeIdRef.current = currentTypeId
  }, [investmentTypeId, isUpdate, formFieldsDefinition, setValue])

  // Get selected path from investmentTypeId (only ancestors + selected type, no descendants)
  const selectedPath = useMemo(() => {
    const investmentTypeId = getInvestmentTypeId()
    if (!investmentTypeId) return []
    const fullPath = getPathByType(investmentTypeId)
    // Filter to only include ancestors and the selected type itself (exclude descendants)
    const selectedTypeIndex = fullPath.findIndex(t => t.id === investmentTypeId)
    if (selectedTypeIndex === -1) return []
    // Return only up to and including the selected type
    return fullPath.slice(0, selectedTypeIndex + 1)
  }, [getInvestmentTypeId, getPathByType])

  // Get selected types from path
  const selectedTypes = useMemo(() => {
    return selectedPath
  }, [selectedPath])

  // Get DynamicFormConfiguration for the deepest selected type
  const getFormFieldsDefinitionForSelectedType = useCallback((): DynamicFormConfiguration | null => {
    // Priority: deepest level first
    for (let i = selectedTypes.length - 1; i >= 0; i--) {
      const type = selectedTypes[i]
      if (type?.objectValue) {
        const parsedObjectValue = parseObjectValue(type.objectValue)
        const formFields = parsedObjectValue?.formFields
        if (formFields && Array.isArray(formFields) && formFields.length > 0) {
          // Convert to DynamicFormConfiguration format
          const dynamicFormFields = formFields.map((group: any) => ({
            groupId: group.groupId,
            groupLabel: group.groupLabel,
            displayOrder: group.displayOrder,
            fields: group.fields.map((field: any) => ({
              type: field.type,
              label: field.label,
              property: field.property,
              required: field.required,
              displayOrder: field.displayOrder
            }))
          }))
          return { formFields: dynamicFormFields }
        }
      }
    }

    return null
  }, [selectedTypes])

  // Build slash-separated hierarchy path: level 0 value / level 1 value / level 2 value / ... - MUST be called before any conditional returns
  const hierarchyPath = useMemo(() => {
    const path: string[] = []
    selectedTypes.forEach(type => {
      const displayValue = type.displayValue || type.value || type.code || type.id
      if (displayValue && displayValue !== 'Unknown') {
        path.push(displayValue)
      }
    })
    return path.join(' / ')
  }, [selectedTypes])

  // If no base type, don't render anything
  if (!baseTypeId) {
    return null
  }

  // Create mode: Check if deepest selected type has no children (show dynamic fields)
  const deepestSelectedType = selectedPath.length > 0 ? selectedPath[selectedPath.length - 1] : null
  const hasMoreChildren = deepestSelectedType ? getTypesByParent(deepestSelectedType.id).length > 0 : false

  // Determine which formFieldsDefinition to use
  // Priority: Use provided formFieldsDefinition (works for both investment formFields and prospect referenceFields)
  // Fallback: Only in create mode without provided definition, look for formFields in objectValue
  const getEffectiveFormFieldsDefinition = (): DynamicFormConfiguration | null => {
    if (formFieldsDefinition) {
      return formFieldsDefinition
    }
    if (isUpdate) {
      return null
    }
    if (!hasMoreChildren && deepestSelectedType) {
      return getFormFieldsDefinitionForSelectedType()
    }
    return null
  }
  const effectiveFormFieldsDefinition = getEffectiveFormFieldsDefinition()

  return (
    <div data-testid={formatDataTestId(testIdPrefix, 'Container')} className="gba:space-y-6">
      {/* Update mode: Show hierarchy path */}
      {isUpdate && baseTypeId && (
        <div className="gba:p-4 gba:bg-secondary gba:rounded-md gba:border gba:border-solid gba:border-ring">
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:font-medium">{hierarchyPath || 'Loading...'}</span>
          </div>
        </div>
      )}

      {/* Create mode: Render type selection */}
      {!isUpdate && (
        <InvestmentTypeSelect
          baseTypeId={baseTypeId}
          investmentTypeIdFieldPath={investmentTypeIdFieldPath}
          getTypesByLevel={getTypesByLevel}
          getTypesByParent={getTypesByParent}
          getPathByType={getPathByType}
          testIdPrefix={testIdPrefix}
        />
      )}

      {/* Show dynamic fields when available */}
      {effectiveFormFieldsDefinition && (
        <DynamicForm
          configuration={effectiveFormFieldsDefinition}
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
      )}
    </div>
  )
}

export default DynamicInvestmentSegment
