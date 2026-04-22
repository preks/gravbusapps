import React, { useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DynamicFormConfiguration } from '@/components/dynamic-form/types'
import { InvestmentType } from '@/common/data/investment/hooks/useInvestmentTypes'
import DynamicInvestmentSegment from '@/common/components/investment/form-segments/dynamic-investment-segment/DynamicInvestmentSegment'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

const prefixDataTestId = 'InvestmentProspectLayout'

// Helper function to recursively check if a type or any of its descendants have referenceFields
const hasReferenceFieldsInTree = (
  type: InvestmentType,
  getTypesByParent: (id: string) => InvestmentType[]
): boolean => {
  // Check if type itself has referenceFields
  if (type?.objectValue) {
    try {
      const parsed = typeof type.objectValue === 'string' ? JSON.parse(type.objectValue) : type.objectValue
      if (parsed?.referenceFields && Array.isArray(parsed.referenceFields) && parsed.referenceFields.length > 0) {
        return true
      }
    } catch {
      // Continue to check children
    }
  }

  // Recursively check all descendants
  const childTypes = getTypesByParent(type.id)
  for (const childType of childTypes) {
    if (hasReferenceFieldsInTree(childType, getTypesByParent)) {
      return true
    }
  }

  return false
}

export interface InvestmentProspectLayoutProps {
  businessAppContext: BusinessAppContextProps
  formFieldsDefinition: DynamicFormConfiguration | null
  investmentCatalogLoading: boolean
  getTypesByLevel?: (level: number) => InvestmentType[]
  getTypesByParent?: (parentId: string) => InvestmentType[]
  getPathByType?: (typeId: string | null | undefined) => InvestmentType[]
  currencySymbol?: string
  testIdPrefix?: string
}

export const InvestmentProspectLayout: React.FC<InvestmentProspectLayoutProps> = ({
  businessAppContext,
  formFieldsDefinition,
  investmentCatalogLoading,
  getTypesByLevel,
  getTypesByParent,
  getPathByType,
  currencySymbol,
  testIdPrefix = prefixDataTestId
}) => {
  const form = useFormContext()

  // Watch investmentTypeId from form state
  const investmentTypeId = useWatch({ control: form.control, name: 'investmentTypeId' })

  // Derive baseTypeId (level 0) from investmentTypeId
  const baseTypeId = useMemo(() => {
    if (!investmentTypeId || !getPathByType) return null
    const path = getPathByType(investmentTypeId)
    const rootType = path.find(t => t.level === 0)
    return rootType?.id || null
  }, [investmentTypeId, getPathByType])

  // Get groups with referenceFields (level 0 types that have referenceFields)
  // A group is included if it has referenceFields directly OR if any type in its entire subtree has referenceFields
  const groupsWithReferenceFields = useMemo(() => {
    if (!getTypesByLevel || !getTypesByParent) return []
    const level0Types = getTypesByLevel(0)
    return level0Types.filter(type => hasReferenceFieldsInTree(type, getTypesByParent))
  }, [getTypesByLevel, getTypesByParent])

  // Get currency symbol from formValues.currencyRef (if available)
  const effectiveCurrencySymbol = useMemo(() => {
    if (currencySymbol) return currencySymbol
    const currencyRef: any = form.watch('currencyRef')
    if (!currencyRef) return ''
    if (typeof currencyRef === 'string') {
      const parts = currencyRef.split(':')
      return parts.length > 0 ? parts[parts.length - 1] : currencyRef
    }
    return ''
  }, [currencySymbol, form])

  return (
    <div data-testid={formatDataTestId(testIdPrefix, 'content')} className="gba:space-y-6">
      {/* Investment Name - Always visible */}
      <FormField
        control={form.control}
        name="investmentName"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="gba:text-foreground">Investment Name</FormLabel>
            <FormControl>
              <Input
                placeholder="Enter investment name..."
                data-testid={formatDataTestId(testIdPrefix, 'investment-name')}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Investment Group Selection - Only groups with referenceFields */}
      {/* Bound to investmentTypeId (single source of truth) - derives baseTypeId for display */}
      <FormField
        control={form.control}
        name="investmentTypeId"
        render={() => (
          <FormItem>
            <FormLabel className="gba:text-foreground">Investment Group</FormLabel>
            <FormControl>
              <Select
                value={baseTypeId || ''}
                onValueChange={v => {
                  // Set investmentTypeId to the selected group ID (will be updated by InvestmentTypeSelect)
                  form.setValue('investmentTypeId', v || null)
                }}
                disabled={investmentCatalogLoading}
                data-testid={formatDataTestId(testIdPrefix, 'investment-group')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select investment group..." />
                </SelectTrigger>
                <SelectContent>
                  {groupsWithReferenceFields.map(group => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.value || group.displayValue || 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Dynamic Investment Segment - handles type selection and dynamic fields recursively */}
      {baseTypeId && getTypesByLevel && getTypesByParent && getPathByType && (
        <DynamicInvestmentSegment
          baseTypeId={baseTypeId}
          investmentTypeIdFieldPath="investmentTypeId"
          getTypesByLevel={getTypesByLevel}
          getTypesByParent={getTypesByParent}
          getPathByType={getPathByType}
          businessAppContext={businessAppContext}
          currencySymbol={effectiveCurrencySymbol}
          testIdPrefix={testIdPrefix}
          isUpdate={false}
          formFieldsDefinition={formFieldsDefinition}
          investmentCatalogLoading={investmentCatalogLoading}
        />
      )}
    </div>
  )
}

export default InvestmentProspectLayout
