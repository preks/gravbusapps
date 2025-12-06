import React from 'react'
import { Button, Badge, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@newwork/nw-design-system'
import { useFormContext, useWatch } from 'react-hook-form'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useInvestmentTypeCatalog } from '../../hooks/useInvestmentTypeCatalog'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { InvestmentFormValues } from '../../types'

const prefixDataTestId = 'InvestmentForm-TypeSelector'

export interface TypeSelectSegmentProps {
  currentGroup: string
  isUpdate?: boolean
  businessAppContext: BusinessAppContextProps
}

const TypeSelectSegment: React.FC<TypeSelectSegmentProps> = ({ isUpdate = false, businessAppContext }) => {
  const { control, setValue } = useFormContext<InvestmentFormValues>()
  const investmentGroup = useWatch({ control, name: 'investment.investmentGroup' })

  // Get current investment type from form - MUST be called before any early returns
  const investmentType = useWatch({ control, name: 'investment.investmentType' })

  // Extract group ID for the hook
  const groupId = typeof investmentGroup === 'object' ? investmentGroup?.id : investmentGroup

  // Use catalog hook directly
  const {
    options: investmentTypes,
    loading: investmentTypesLoading,
    error: investmentTypesError
  } = useInvestmentTypeCatalog(businessAppContext.accessToken || '', groupId)

  const investmentTypeId = typeof investmentType === 'object' ? investmentType?.id : investmentType

  const handleTypeSelect = (typeValue: string, onChange: (value: any) => void) => {
    const newValue = { id: typeValue } as any
    onChange(newValue) // Update react-hook-form

    // Clear all subtype data when type changes (cascade clearing)
    setValue('equityInvestment', undefined as any)
    setValue('realEstateInvestment', undefined as any)
    setValue('liquidFundInvestment', undefined as any)
  }

  if (investmentTypesLoading) {
    return <div data-testid={formatDataTestId(prefixDataTestId, 'Loading')}>Loading investment types...</div>
  }

  if (investmentTypesError) {
    return <div data-testid={formatDataTestId(prefixDataTestId, 'Error')}>{investmentTypesError}</div>
  }

  if (investmentTypes.length === 0) {
    return (
      <div data-testid={formatDataTestId(prefixDataTestId, 'Empty')}>No investment types available for this group.</div>
    )
  }

  // In update mode, show read-only selected type
  if (isUpdate) {
    const selectedType = investmentTypes.find(type => type.value === investmentTypeId)

    if (selectedType) {
      return (
        <div
          data-testid={formatDataTestId(prefixDataTestId, 'ReadOnlyContainer')}
          className="gba:p-4 gba:bg-secondary gba:rounded-md gba:border gba:border-solid gba:border-ring"
        >
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:text-muted-foreground">Investment Type:</span>
            <Badge variant="secondary" data-testid={formatDataTestId(prefixDataTestId, 'SelectedTypeBadge')}>
              {selectedType.label}
            </Badge>
          </div>
        </div>
      )
    }
    return null // No type selected in update mode
  }

  // Create mode - show selection UI with form field integration
  return (
    <FormField
      control={control}
      name="investment.investmentType"
      render={({ field }) => {
        // Extract ID from object or use string directly for comparison
        const investmentTypeId = typeof field.value === 'object' ? field.value?.id : field.value

        return (
          <FormItem data-testid={formatDataTestId(prefixDataTestId, 'Container')}>
            <FormLabel className="gba:text-lg gba:font-semibold">
              Select Investment Type <span className="gba:text-destructive">*</span>
            </FormLabel>
            <p className="gba:m-0 gba:text-muted-foreground gba:text-sm gba:mb-4">
              Choose the type of investment you want to create
            </p>
            <FormControl>
              <div
                className="gba:grid gba:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gba:gap-4 gba:items-stretch"
                data-testid={formatDataTestId(prefixDataTestId, 'TypeGrid')}
              >
                {investmentTypes.map(type => {
                  const isSelected = investmentTypeId === type.value
                  return (
                    <Button
                      key={type.id}
                      type="button"
                      variant={isSelected ? 'default' : 'outline'}
                      onClick={() => handleTypeSelect(type.value, field.onChange)}
                      data-testid={formatDataTestId(prefixDataTestId, `type-${type.id}-button`)}
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

export default TypeSelectSegment
