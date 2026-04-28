import React, { useCallback, useMemo, useEffect, useRef, useState } from 'react'
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
import InvestmentFileUploadSegment from './InvestmentFileUploadSegment'
import { useInvestmentAiAutofill } from './useInvestmentAiAutofill'
import { mapFromSingleInvestmentTypeId } from '@/common/components/investment/form-layouts/investment-layout/utils/investmentTypeMapper'

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
  enableAiAutofill?: boolean // New prop to enable AI autofill feature
  onAiAutofillLoadingChange?: (isLoading: boolean) => void // Callback to notify parent of loading state changes
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
  investmentCatalogLoading = false,
  enableAiAutofill = false,
  onAiAutofillLoadingChange
}) => {
  const { control, setValue } = useFormContext<InvestmentFormValues>()
  const previousInvestmentTypeIdRef = useRef<string | null>(null)

  // AI autofill state (only if enabled)
  const [aiSourceFile, setAiSourceFile] = useState<File | null>(null)
  const [lastAutofillKey, setLastAutofillKey] = useState<string | null>(null)
  const [lastAppliedFieldsKey, setLastAppliedFieldsKey] = useState<string | null>(null)

  // AI autofill hook (only if enabled) - Must be called before renderReferenceField
  const { runAutofill: runInvestmentAiAutofill, isLoading: aiAutofillIsLoading } = useInvestmentAiAutofill(
    enableAiAutofill ? businessAppContext.accessToken : undefined
  )

  // Notify parent of loading state changes
  useEffect(() => {
    if (onAiAutofillLoadingChange) {
      onAiAutofillLoadingChange(aiAutofillIsLoading)
    }
  }, [aiAutofillIsLoading, onAiAutofillLoadingChange])

  // Render reference field (for REF_ type fields)
  // IMPORTANT: Must be defined before any conditional returns (Rules of Hooks)
  const renderReferenceField = useCallback(
    (entityType: string, _field: DynamicFormFieldDefinition, fieldName: string, formField: any) => {
      const isDisabled = aiAutofillIsLoading

      if (entityType === 'InvestmentAccount') {
        return (
          <InvestmentAccountField
            value={formField.value}
            onValueChange={value => formField.onChange(value)}
            fieldName={fieldName}
            businessAppContext={businessAppContext}
            testIdPrefix={testIdPrefix}
            disabled={isDisabled}
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
            disabled={isDisabled}
          />
        )
      }

      // Fallback for unknown entity types
      return null
    },
    [businessAppContext, testIdPrefix, aiAutofillIsLoading]
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

  // Extract group/type/liquidFundType from single investmentTypeId for AI autofill (only if enabled)
  const typeHierarchy = useMemo(() => {
    if (!enableAiAutofill || !investmentTypeId || !getPathByType) {
      return { groupId: null, typeId: null, liquidFundTypeId: null }
    }
    return mapFromSingleInvestmentTypeId(investmentTypeId, getPathByType)
  }, [enableAiAutofill, investmentTypeId, getPathByType])

  // Watch form fields for AI autofill (always call hooks, but only use values if enabled)
  const watchedName = useWatch({ control, name: 'investment.name' })
  const watchedOwnerEmployee = useWatch({ control, name: 'investment.ownerEmployeeId' })
  const watchedCurrency = useWatch({ control, name: 'investment.currencyRef' })
  const watchedAccount = useWatch({ control, name: 'investment.investmentAccountId' })

  // Extract IDs for AI autofill
  const investmentGroupRefForAi = typeHierarchy.groupId || baseTypeId || ''
  const investmentTypeRefForAi = typeHierarchy.typeId || ''
  const investmentLiquidFundTypeRefForAi = typeHierarchy.liquidFundTypeId || ''
  const investmentOwnerEmployeeIdForAi = typeof watchedOwnerEmployee === 'string' ? watchedOwnerEmployee : ''
  const investmentCurrencyRefForAi = typeof watchedCurrency === 'string' ? watchedCurrency : ''
  const investmentAccountIdForAi = typeof watchedAccount === 'string' ? watchedAccount : ''
  const investmentNameForAi = typeof watchedName === 'string' ? watchedName : ''

  const isLiquidFundForAi = investmentGroupRefForAi && investmentGroupRefForAi.split(':').pop() === 'LIQUID_FUND'

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

  // AI autofill effect (only if enabled)
  useEffect(() => {
    if (!enableAiAutofill || !aiSourceFile) return

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
          const fieldEntries = Object.entries(response.fields)
          const fieldsKey = JSON.stringify(fieldEntries.map(([path, value]) => [path, value]))

          if (fieldsKey !== lastAppliedFieldsKey) {
            fieldEntries.forEach(([path, value]) => {
              setValue(path as any, value as any, {
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
    enableAiAutofill,
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
    setValue
  ])

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
              displayOrder: field.displayOrder,
              ...(typeof field.report === 'boolean' ? { report: field.report } : {})
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

  // Determine the effective type to check for children
  // Use deepestSelectedType if available, otherwise fall back to baseTypeId
  const typeToCheckForChildren = deepestSelectedType?.id || baseTypeId
  const hasMoreChildren = typeToCheckForChildren ? getTypesByParent(typeToCheckForChildren).length > 0 : false

  // Determine which formFieldsDefinition to use
  // Only show fields when we're at a leaf type (no more children)
  // Priority: Use provided formFieldsDefinition (works for both investment formFields and prospect referenceFields)
  // Fallback: Only in create mode without provided definition, look for formFields in objectValue
  const getEffectiveFormFieldsDefinition = (): DynamicFormConfiguration | null => {
    // Only show fields when we're at a leaf type (no more children to select)
    if (hasMoreChildren) {
      return null
    }

    if (formFieldsDefinition) {
      return formFieldsDefinition
    }
    if (isUpdate) {
      return null
    }
    if (deepestSelectedType) {
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

      {/* AI Source Document for Autofill (available in both create and update modes) */}
      {/* Show when: AI is enabled, we have a base type, and we're at a leaf level (no more children) */}
      {enableAiAutofill && baseTypeId && !hasMoreChildren && (
        <InvestmentFileUploadSegment
          file={aiSourceFile}
          onFileChange={setAiSourceFile}
          isLoading={aiAutofillIsLoading}
        />
      )}

      {/* Show dynamic fields when available */}
      {effectiveFormFieldsDefinition && (
        <fieldset disabled={aiAutofillIsLoading}>
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
        </fieldset>
      )}
    </div>
  )
}

export default DynamicInvestmentSegment
