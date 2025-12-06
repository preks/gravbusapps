import React, { useCallback, useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { Button, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { InvestmentType } from '@/common/data/investment/hooks/useInvestmentTypes'
import { InvestmentFormValues } from '@/common/components/investment/form-layouts/investment-layout/types'
import { DynamicForm, DynamicFormFieldDefinition } from '@/components/dynamic-form'
import { InvestmentAccountField } from '@/common/components/investment/form-components/investment-account-select/InvestmentAccountField'
import { InvestmentRolesField } from '@/common/components/investment/form-components/investment-role-select/InvestmentRolesField'
import { FormFieldsDefinition } from '@/common/components/investment/form-layouts/investment-layout/queries/InvestmentCatalogQueries'

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
  selectedGroupId: string | null
  getTypesByLevel: (level: number) => InvestmentType[]
  getTypesByParent: (parentId: string) => InvestmentType[]
  businessAppContext: BusinessAppContextProps
  currencySymbol?: string
  testIdPrefix?: string
  isUpdate?: boolean
  formFieldsDefinition?: FormFieldsDefinition | null
  investmentCatalogLoading?: boolean
}

/**
 * DynamicInvestmentSegment - Recursive type selection with dynamic fields
 *
 * Works recursively with any number of levels:
 * - Level 0: InvestmentGroups (selected externally)
 * - Level 1+: Any child types recursively
 *
 * Shows DynamicFields when no more children exist for selected type
 */
const DynamicInvestmentSegment: React.FC<DynamicInvestmentSegmentProps> = ({
  selectedGroupId,
  getTypesByLevel,
  getTypesByParent,
  businessAppContext,
  currencySymbol,
  testIdPrefix = 'DynamicInvestmentSegment',
  isUpdate = false,
  formFieldsDefinition,
  investmentCatalogLoading = false
}) => {
  const { control, setValue } = useFormContext<InvestmentFormValues>()

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

  // Helper: Extract ID from form value
  const getTypeId = (type: any): string | null => {
    if (!type) return null
    return typeof type === 'object' ? type.id : type
  }

  // Helper: Get form value by fieldPath (e.g., "investment.investmentType")
  const getFormValue = useCallback((fieldPath: string, formValues: any): any => {
    if (!fieldPath || !formValues) {
      console.log('🟡 [getFormValue] Missing fieldPath or formValues:', { fieldPath, hasFormValues: !!formValues })
      return null
    }
    const result = fieldPath.split('.').reduce((obj, key) => obj?.[key], formValues)
    console.log('🟡 [getFormValue]', fieldPath, '->', result)
    return result
  }, [])

  // Helper: Get display value from CatalogEntry object or fallback to tree lookup
  const getDisplayValue = useCallback((catalogEntry: any, fallbackLookup: () => InvestmentType | undefined): string => {
    if (catalogEntry && typeof catalogEntry === 'object' && catalogEntry.value) {
      return catalogEntry.value
    }
    const found = fallbackLookup()
    return found?.value || 'Unknown'
  }, [])

  // Watch entire form state once
  const formValues = useWatch({ control })

  // Build selection path recursively: [level0Id, level1Id, level2Id, ...]
  const { path: selectionPath, types: selectedTypes } = useMemo(() => {
    const path: (string | null)[] = [selectedGroupId]
    const types: InvestmentType[] = []

    if (!selectedGroupId) {
      return { path, types }
    }

    // Get level 0 type
    const level0Type = getTypesByLevel(0).find(t => t.id === selectedGroupId)
    if (level0Type) {
      types.push(level0Type)
    }

    console.log('🔵 [DynamicInvestmentSegment] Building selection path, selectedGroupId:', selectedGroupId)
    console.log('🔵 [DynamicInvestmentSegment] Level 0 type:', level0Type)

    // Recursively build path by following the hierarchy
    let currentLevel = 1
    let currentParentId = selectedGroupId

    while (currentParentId) {
      // Get children of current parent
      const children = getTypesByParent(currentParentId)
      console.log(
        `🔵 [DynamicInvestmentSegment] Level ${currentLevel}, parentId: ${currentParentId}, children count: ${children.length}`
      )

      if (children.length === 0) {
        console.log(`🔵 [DynamicInvestmentSegment] No more children at level ${currentLevel}`)
        break // No more children
      }

      // Get the first child type to determine fieldPath
      const firstChild = children[0]
      console.log(`🔵 [DynamicInvestmentSegment] First child at level ${currentLevel}:`, {
        id: firstChild.id,
        fieldPath: firstChild.fieldPath,
        value: firstChild.value
      })

      if (!firstChild.fieldPath) {
        console.log(`🔵 [DynamicInvestmentSegment] No fieldPath at level ${currentLevel}, breaking`)
        break // No fieldPath means this level doesn't have a form field
      }

      // Get form value dynamically from fieldPath
      const fieldValue = getFormValue(firstChild.fieldPath, formValues)
      console.log(`🔵 [DynamicInvestmentSegment] Form value for ${firstChild.fieldPath}:`, fieldValue)

      const selectedId = getTypeId(fieldValue)
      console.log(`🔵 [DynamicInvestmentSegment] Selected ID at level ${currentLevel}:`, selectedId)

      if (selectedId) {
        path.push(selectedId)
        const selectedType = children.find(t => t.id === selectedId)
        if (selectedType) {
          types.push(selectedType)
          console.log(`🔵 [DynamicInvestmentSegment] Added type to selectedTypes:`, {
            level: selectedType.level,
            id: selectedType.id,
            value: selectedType.value,
            fieldPath: selectedType.fieldPath
          })
        }
        currentParentId = selectedId
        currentLevel++
      } else {
        console.log(`🔵 [DynamicInvestmentSegment] No selectedId at level ${currentLevel}, breaking`)
        break // No selection at this level
      }
    }

    console.log(
      '🔵 [DynamicInvestmentSegment] Final selectedTypes:',
      types.map(t => ({
        level: t.level,
        id: t.id,
        value: t.value,
        fieldPath: t.fieldPath
      }))
    )
    console.log('🔵 [DynamicInvestmentSegment] Final path:', path)

    return { path, types }
  }, [selectedGroupId, getTypesByLevel, getTypesByParent, formValues, getFormValue])

  // Get FormFieldsDefinition for the deepest selected type
  const getFormFieldsDefinitionForSelectedType = useCallback((): FormFieldsDefinition | null => {
    // Priority: deepest level first
    for (let i = selectedTypes.length - 1; i >= 0; i--) {
      const type = selectedTypes[i]
      if (type?.objectValue) {
        const parsedObjectValue = parseObjectValue(type.objectValue)
        const formFields = parsedObjectValue?.formFields
        if (formFields && Array.isArray(formFields) && formFields.length > 0) {
          return parsedObjectValue as FormFieldsDefinition
        }
      }
    }

    return null
  }, [selectedTypes])

  // Recursive render function for type selection
  const renderTypeSelection = useCallback(
    (level: number, parentId: string | null, currentFieldValue?: any, parentType?: InvestmentType): React.ReactNode => {
      if (!parentId) return null

      // Get children for current level
      const children = getTypesByParent(parentId)
      if (children.length === 0) {
        return null // No children, this is handled by showing dynamic fields
      }

      // Get field path from first child (all children at same level have same fieldPath)
      const fieldPath = children[0].fieldPath
      if (!fieldPath) {
        return null // No fieldPath means this level doesn't have a form field
      }

      // Get label from parent type value
      const label = parentType?.value ? `${parentType.value} Type` : `Type Level ${level}`

      return (
        <FormField
          key={`type-select-level-${level}`}
          control={control}
          name={fieldPath as any}
          render={({ field }) => {
            const currentSelectedId = typeof field.value === 'object' ? field.value?.id : field.value

            return (
              <FormItem data-testid={formatDataTestId(testIdPrefix, `TypeSelect-Level${level}`)}>
                <FormLabel className="gba:text-lg gba:font-semibold">
                  {label} <span className="gba:text-destructive">*</span>
                </FormLabel>
                <p className="gba:m-0 gba:text-muted-foreground gba:text-sm gba:mb-4">
                  {level === 1
                    ? 'Choose the type of investment you want to create'
                    : 'Select the specific type to configure type-specific fields'}
                </p>
                <FormControl>
                  <div
                    className="gba:grid gba:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gba:gap-4 gba:items-stretch"
                    data-testid={formatDataTestId(testIdPrefix, `TypeGrid-Level${level}`)}
                  >
                    {children.map(type => {
                      const isSelected = currentSelectedId === type.id
                      return (
                        <Button
                          key={type.id}
                          type="button"
                          variant={isSelected ? 'default' : 'outline'}
                          onClick={() => {
                            setValue(fieldPath as any, { id: type.id } as any)
                            // Clear deeper levels when selection changes
                            // Clear all deeper levels recursively
                            const clearDeeperLevels = (parentId: string, startLevel: number) => {
                              const deeperChildren = getTypesByParent(parentId)
                              if (deeperChildren.length === 0) return
                              const deeperFieldPath = deeperChildren[0].fieldPath
                              if (!deeperFieldPath) return
                              setValue(deeperFieldPath as any, undefined as any)
                              // Recursively clear even deeper levels
                              for (const child of deeperChildren) {
                                clearDeeperLevels(child.id, startLevel + 1)
                              }
                            }
                            clearDeeperLevels(type.id, level + 1)
                            // Also clear subtype data when level 1 changes
                            if (level === 1) {
                              setValue('liquidFundInvestment' as any, undefined as any)
                              setValue('equityInvestment' as any, undefined as any)
                              setValue('realEstateInvestment' as any, undefined as any)
                            }
                          }}
                          data-testid={formatDataTestId(testIdPrefix, `type-level${level}-${type.id}-button`)}
                          className="gba:min-h-12 gba:justify-center gba:text-center gba:whitespace-normal gba:px-4 gba:py-2"
                        >
                          {type.displayValue || type.value || type.code || type.id}
                        </Button>
                      )
                    })}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />
      )
    },
    [getTypesByParent, control, setValue, testIdPrefix, formValues, getFormValue]
  )

  // Render all type selection levels recursively
  const renderAllTypeSelections = useMemo((): React.ReactNode[] => {
    const selections: React.ReactNode[] = []

    if (!selectedGroupId) {
      return selections
    }

    // Get level 0 type for parent reference
    const level0Type = getTypesByLevel(0).find(t => t.id === selectedGroupId)

    // Start from level 1 (children of selected group)
    let currentLevel = 1
    let currentParentId = selectedGroupId
    let currentParentType = level0Type

    while (currentParentId) {
      // Get children to determine fieldPath
      const children = getTypesByParent(currentParentId)
      if (children.length === 0) {
        break
      }

      const fieldPath = children[0].fieldPath
      if (!fieldPath) {
        break
      }

      // Get current field value dynamically
      const currentFieldValue = getFormValue(fieldPath, formValues)
      const selection = renderTypeSelection(currentLevel, currentParentId, currentFieldValue, currentParentType)
      if (!selection) {
        break // No more levels
      }

      selections.push(selection)

      // Get field value for next iteration
      const fieldValue = getFormValue(fieldPath, formValues)
      const selectedId = getTypeId(fieldValue)

      if (selectedId) {
        // Check if selected type has children
        const selectedChildren = getTypesByParent(selectedId)
        if (selectedChildren.length === 0) {
          break // No more children, stop here
        }
        // Update parent type for next level
        currentParentType = children.find(t => t.id === selectedId)
        currentParentId = selectedId
        currentLevel++
      } else {
        break // No selection at this level, stop
      }
    }

    return selections
  }, [selectedGroupId, renderTypeSelection, getTypesByParent, formValues, getFormValue, getTypesByLevel])

  // If no group selected, don't render anything
  if (!selectedGroupId) {
    return null
  }

  // In update mode, show read-only selected types and dynamic fields
  if (isUpdate) {
    const dynamicFormFieldsDefinition = formFieldsDefinition || getFormFieldsDefinitionForSelectedType()

    // Get level 0 type for display
    const level0Type = getTypesByLevel(0).find(t => t.id === selectedGroupId)
    const investmentGroup = useWatch({ control, name: 'investment.investmentGroup' as any })

    // Build slash-separated hierarchy path: level 0 value / level 1 value / level 2 value / ...
    const hierarchyPath = useMemo(() => {
      const path: string[] = []

      console.log('🟢 [DynamicInvestmentSegment] Building hierarchyPath')
      console.log(
        '🟢 [DynamicInvestmentSegment] selectedTypes:',
        selectedTypes.map(t => ({
          level: t.level,
          id: t.id,
          value: t.value,
          fieldPath: t.fieldPath
        }))
      )

      // Add level 0 (Group)
      if (level0Type) {
        const groupValue = getDisplayValue(investmentGroup, () => level0Type)
        console.log('🟢 [DynamicInvestmentSegment] Level 0 groupValue:', groupValue)
        if (groupValue && groupValue !== 'Unknown') {
          path.push(groupValue)
        }
      }

      // Add all selected types (level 1+) - dynamically get values
      const filteredTypes = selectedTypes.filter(type => type.level > 0)
      console.log(
        '🟢 [DynamicInvestmentSegment] Filtered types (level > 0):',
        filteredTypes.map(t => ({
          level: t.level,
          id: t.id,
          value: t.value,
          fieldPath: t.fieldPath
        }))
      )

      filteredTypes.forEach(type => {
        if (!type.fieldPath) {
          console.log('🟢 [DynamicInvestmentSegment] Skipping type without fieldPath:', type.id)
          return
        }
        const fieldValue = getFormValue(type.fieldPath, formValues)
        console.log(
          `🟢 [DynamicInvestmentSegment] Type ${type.id} (level ${type.level}), fieldPath: ${type.fieldPath}, fieldValue:`,
          fieldValue
        )
        const displayValue = getDisplayValue(fieldValue, () => type)
        console.log(`🟢 [DynamicInvestmentSegment] Display value for ${type.id}:`, displayValue)
        if (displayValue && displayValue !== 'Unknown') {
          path.push(displayValue)
        }
      })

      const result = path.join(' / ')
      console.log('🟢 [DynamicInvestmentSegment] Final hierarchyPath:', result)
      return result
    }, [selectedTypes, level0Type, investmentGroup, formValues, getFormValue, getDisplayValue])

    return (
      <div data-testid={formatDataTestId(testIdPrefix, 'Container')} className="gba:space-y-6">
        {/* Show hierarchy path as slash-separated string */}
        {selectedGroupId && (
          <div className="gba:p-4 gba:bg-secondary gba:rounded-md gba:border gba:border-solid gba:border-ring">
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-sm gba:font-medium">{hierarchyPath || 'Loading...'}</span>
            </div>
          </div>
        )}

        {/* Show dynamic fields */}
        {dynamicFormFieldsDefinition && (
          <DynamicForm
            configuration={dynamicFormFieldsDefinition || { formFields: [] }}
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

  // Create mode: Show type selection recursively
  const typeSelections = renderAllTypeSelections

  // Check if deepest selected type has no children (show dynamic fields)
  const deepestSelectedId = selectionPath[selectionPath.length - 1] || null
  const hasMoreChildren = deepestSelectedId ? getTypesByParent(deepestSelectedId).length > 0 : false

  return (
    <div data-testid={formatDataTestId(testIdPrefix, 'Container')} className="gba:space-y-6">
      {/* Render all type selection levels */}
      {typeSelections}

      {/* Show DynamicFields when deepest selected type has no children */}
      {!hasMoreChildren && deepestSelectedId && (
        <DynamicForm
          configuration={formFieldsDefinition || getFormFieldsDefinitionForSelectedType() || { formFields: [] }}
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
