import React from 'react'
import { useFormContext } from 'react-hook-form'
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Button, Badge } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentTypeCatalog } from '@/business-apps/irm/investments/forms/investment-form/hooks/useInvestmentTypeCatalog'

interface InvestmentTypeSelectProps {
  /** Investment Group ID (catalog entry ID) - used to filter investment types */
  investmentGroupId?: string | null
  /** Form field name for investment type (default: "investmentType") */
  fieldName?: string
  /** Business app context for API access */
  businessAppContext?: BusinessAppContextProps
  /** Optional data-testid prefix */
  testIdPrefix?: string
  /** Whether the field is required */
  required?: boolean
  /** Whether to show read-only mode (for update forms) */
  readOnly?: boolean
  /** Label text (default: "Investment Type") */
  label?: string
  /** Description text */
  description?: string
}

/**
 * InvestmentTypeSelect Component
 *
 * Renders investment type selection based on selected investment group.
 * Filters investment types by the parent investment group.
 * Supports both create mode (button grid) and update mode (read-only badge).
 *
 * @example
 * ```tsx
 * <InvestmentTypeSelect
 *   investmentGroupId={formValues.investmentGroup?.id}
 *   fieldName="investmentType"
 *   businessAppContext={businessAppContext}
 *   testIdPrefix="LeadForm"
 *   required
 * />
 * ```
 */
export const InvestmentTypeSelect: React.FC<InvestmentTypeSelectProps> = ({
  investmentGroupId,
  fieldName = 'investmentType',
  businessAppContext,
  testIdPrefix = 'InvestmentTypeSelect',
  required = false,
  readOnly = false,
  label = 'Investment Type',
  description
}) => {
  const { control, setValue } = useFormContext()

  // Fetch investment types filtered by group
  const {
    options: investmentTypes,
    loading: investmentTypesLoading,
    error: investmentTypesError
  } = useInvestmentTypeCatalog(businessAppContext?.accessToken || '', investmentGroupId || undefined)

  // Don't render if no investment group selected
  if (!investmentGroupId) {
    return null
  }

  // Loading state
  if (investmentTypesLoading) {
    return (
      <div data-testid={formatDataTestId(testIdPrefix, 'Loading')} className="gba:text-muted-foreground gba:text-sm">
        Loading investment types...
      </div>
    )
  }

  // Error state
  if (investmentTypesError) {
    return (
      <div data-testid={formatDataTestId(testIdPrefix, 'Error')} className="gba:text-destructive gba:text-sm">
        {investmentTypesError}
      </div>
    )
  }

  // Empty state
  if (investmentTypes.length === 0) {
    return (
      <div data-testid={formatDataTestId(testIdPrefix, 'Empty')} className="gba:text-muted-foreground gba:text-sm">
        No investment types available for this group.
      </div>
    )
  }

  // Read-only mode (for update forms)
  if (readOnly) {
    return (
      <FormField
        control={control}
        name={fieldName}
        render={({ field }) => {
          // Extract ID from object or use string directly
          const investmentTypeId = typeof field.value === 'object' ? field.value?.id : field.value

          const selectedType = investmentTypes.find(type => type.value === investmentTypeId)

          if (selectedType) {
            return (
              <FormItem data-testid={formatDataTestId(testIdPrefix, 'ReadOnlyContainer')}>
                <FormLabel>{label}</FormLabel>
                <div className="gba:p-4 gba:bg-secondary gba:rounded-md gba:border gba:border-solid gba:border-ring">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <span className="gba:text-sm gba:text-muted-foreground">{label}:</span>
                    <Badge variant="secondary" data-testid={formatDataTestId(testIdPrefix, 'SelectedTypeBadge')}>
                      {selectedType.label}
                    </Badge>
                  </div>
                </div>
              </FormItem>
            )
          }

          // No type selected in read-only mode
          return (
            <FormItem data-testid={formatDataTestId(testIdPrefix, 'ReadOnlyContainer')}>
              <FormLabel>{label}</FormLabel>
              <div className="gba:p-4 gba:bg-secondary gba:rounded-md gba:border gba:border-solid gba:border-ring">
                <span className="gba:text-sm gba:text-muted-foreground">No investment type selected</span>
              </div>
            </FormItem>
          )
        }}
      />
    )
  }

  // Create mode - show selection UI with button grid
  return (
    <FormField
      control={control}
      name={fieldName}
      render={({ field }) => {
        // Extract ID from object or use string directly for comparison
        const investmentTypeId = typeof field.value === 'object' ? field.value?.id : field.value

        const handleTypeSelect = (typeValue: string) => {
          const newValue = { id: typeValue } as any
          field.onChange(newValue) // Update react-hook-form
          setValue(fieldName, newValue)
        }

        return (
          <FormItem data-testid={formatDataTestId(testIdPrefix, 'Container')}>
            <FormLabel>
              {label} {required && <span className="gba:text-destructive">*</span>}
            </FormLabel>
            {description && <p className="gba:m-0 gba:text-muted-foreground gba:text-sm gba:mb-4">{description}</p>}
            <FormControl>
              <div
                className="gba:grid gba:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gba:gap-4 gba:items-stretch"
                data-testid={formatDataTestId(testIdPrefix, 'TypeGrid')}
              >
                {investmentTypes.map(type => {
                  const isSelected = investmentTypeId === type.value
                  return (
                    <Button
                      key={type.id}
                      type="button"
                      variant={isSelected ? 'default' : 'outline'}
                      onClick={() => handleTypeSelect(type.value)}
                      data-testid={formatDataTestId(testIdPrefix, `type-${type.id}-button`)}
                      className="gba:min-h-12 gba:justify-center gba:text-center gba:whitespace-normal gba:px-4 gba:py-2"
                    >
                      {type.label}
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
}

export default InvestmentTypeSelect
