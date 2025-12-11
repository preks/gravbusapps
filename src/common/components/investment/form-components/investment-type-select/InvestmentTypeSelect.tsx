import React, { useCallback, useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { Button, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { InvestmentType } from '@/common/data/investment/hooks/useInvestmentTypes'

interface InvestmentTypeSelectProps {
  baseTypeId?: string | null // Level 0 Group ID to start from
  investmentTypeIdFieldPath: string // Field path to investmentTypeId (e.g., "investment.investmentTypeId" or "investmentTypeId")
  getTypesByLevel: (level: number) => InvestmentType[]
  getTypesByParent: (parentId: string) => InvestmentType[]
  getPathByType: (typeId: string | null | undefined) => InvestmentType[]
  testIdPrefix?: string
  onTypeChange?: (level: number, typeId: string) => void
}

/**
 * InvestmentTypeSelect - Recursive type selection component
 *
 * Renders type selection levels recursively starting from the given baseTypeId.
 * Works with investmentTypeId (leaf type ID) stored in form state.
 *
 * @param baseTypeId - Level 0 Group ID to start selection from (if null/undefined, renders nothing)
 * @param investmentTypeIdFieldPath - Field path to investmentTypeId in form state
 * @param getTypesByLevel - Function to get types by level
 * @param getTypesByParent - Function to get types by parent ID
 * @param getPathByType - Function to get path by type ID (ancestors + type + descendants)
 * @param testIdPrefix - Optional prefix for data-testid attributes
 * @param onTypeChange - Optional callback when a type is selected
 */
export const InvestmentTypeSelect: React.FC<InvestmentTypeSelectProps> = ({
  baseTypeId,
  investmentTypeIdFieldPath,
  getTypesByLevel,
  getTypesByParent,
  getPathByType,
  testIdPrefix = 'InvestmentTypeSelect',
  onTypeChange
}) => {
  const { control, setValue } = useFormContext()
  const formValues = useWatch({ control })

  // Get current investmentTypeId from form state
  const getInvestmentTypeId = useCallback((): string | null => {
    const fieldPathParts = investmentTypeIdFieldPath.split('.')
    const value = fieldPathParts.reduce((obj: any, key) => obj?.[key], formValues)
    return value || null
  }, [investmentTypeIdFieldPath, formValues])

  // Get current selected path from investmentTypeId (only ancestors + selected type, no descendants)
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

  // Find base type (level 0)
  const baseType = useMemo(() => {
    if (!baseTypeId) return null
    const level0Types = getTypesByLevel(0)
    return level0Types.find(t => t.id === baseTypeId) ?? null
  }, [baseTypeId, getTypesByLevel])

  // Recursive render function for type selection
  const renderTypeSelection = useCallback(
    (level: number, parentId: string | null, parentType?: InvestmentType): React.ReactNode => {
      if (!parentId) return null

      // Get children for current level
      const children = getTypesByParent(parentId)
      if (children.length === 0) {
        return null // No children, this is handled by showing dynamic fields
      }

      // Get current selected type at this level from selectedPath
      const selectedTypeAtLevel = selectedPath.find(t => t.level === level && t.parentEntryId === parentId)
      const currentSelectedId = selectedTypeAtLevel?.id || null

      // Get label from parent type value
      const label = parentType?.value ? `${parentType.value} Type` : `Type Level ${level}`

      return (
        <FormItem
          key={`type-select-level-${level}`}
          data-testid={formatDataTestId(testIdPrefix, `TypeSelect-Level${level}`)}
        >
          <FormLabel className="gba:text-lg gba:font-semibold">{label}</FormLabel>
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
                      // Set investmentTypeId to the selected type (not the deepest leaf)
                      // This allows user to manually select sub-types
                      const fieldPathParts = investmentTypeIdFieldPath.split('.')
                      if (fieldPathParts.length === 1) {
                        setValue(fieldPathParts[0] as any, type.id)
                      } else {
                        // Nested path (e.g., "investment.investmentTypeId")
                        const [first, ...rest] = fieldPathParts
                        const nestedPath = rest.join('.')
                        setValue(`${first}.${nestedPath}` as any, type.id)
                      }

                      // Call optional callback
                      if (onTypeChange) {
                        onTypeChange(level, type.id)
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
        </FormItem>
      )
    },
    [selectedPath, getTypesByParent, investmentTypeIdFieldPath, setValue, testIdPrefix, onTypeChange]
  )

  // Render all type selection levels recursively starting from baseTypeId
  const renderAllTypeSelections = useMemo((): React.ReactNode[] => {
    const selections: React.ReactNode[] = []

    if (!baseTypeId || !baseType) {
      return selections
    }

    // Start from level 1 (children of baseType)
    let currentLevel = 1
    let currentParentId = baseTypeId
    let currentParentType = baseType

    while (currentParentId) {
      // Get children
      const children = getTypesByParent(currentParentId)
      if (children.length === 0) {
        break // No more children
      }

      const selection = renderTypeSelection(currentLevel, currentParentId, currentParentType)
      if (!selection) {
        break // No more levels
      }

      selections.push(selection)

      // Get selected type at this level
      const selectedTypeAtLevel = selectedPath.find(
        t => t.level === currentLevel && t.parentEntryId === currentParentId
      )
      if (selectedTypeAtLevel) {
        // Check if selected type has children
        const selectedChildren = getTypesByParent(selectedTypeAtLevel.id)
        if (selectedChildren.length === 0) {
          break // No more children, stop here
        }
        currentParentType = selectedTypeAtLevel
        currentParentId = selectedTypeAtLevel.id
        currentLevel++
      } else {
        break // No selection at this level, stop
      }
    }

    return selections
  }, [baseTypeId, baseType, renderTypeSelection, getTypesByParent, selectedPath])

  // If no base type, don't render anything
  if (!baseTypeId || !baseType) {
    return null
  }

  return (
    <FormField
      control={control}
      name={investmentTypeIdFieldPath as any}
      render={() => (
        <>
          <div data-testid={formatDataTestId(testIdPrefix, 'Container')} className="gba:space-y-6">
            {renderAllTypeSelections}
          </div>
          <FormMessage />
        </>
      )}
    />
  )
}

export default InvestmentTypeSelect
