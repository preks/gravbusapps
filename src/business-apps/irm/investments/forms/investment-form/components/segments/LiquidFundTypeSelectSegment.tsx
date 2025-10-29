import React from 'react'
import { Button, Badge, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@newwork/nw-design-system'
import { useFormContext } from 'react-hook-form'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useInvestmentFormContext } from '../../context/InvestmentFormContext'

const prefixDataTestId = 'InvestmentForm-LiquidFundTypeSelector'

export interface LiquidFundTypeSelectSegmentProps {
  currentInvestmentType: string
  isUpdate?: boolean
}

const LiquidFundTypeSelectSegment: React.FC<LiquidFundTypeSelectSegmentProps> = ({
  // currentInvestmentType is received for consistency with other selectors, filtering handled by context
  isUpdate = false
}) => {
  const { control } = useFormContext()
  const {
    formValues,
    setFormValues,
    investmentLiquidFundTypes,
    investmentLiquidFundTypesLoading,
    investmentLiquidFundTypesError
  } = useInvestmentFormContext()

  const handleLiquidFundTypeSelect = (liquidFundTypeValue: string, onChange: (value: any) => void) => {
    const newValue = { id: liquidFundTypeValue } as any
    onChange(newValue) // Update react-hook-form
    setFormValues({
      liquidFundInvestment: { investmentLiquidFundType: newValue } // Store as minimal object
    } as Partial<typeof formValues>)
  }

  if (investmentLiquidFundTypesLoading) {
    return (
      <div data-testid={formatDataTestId(prefixDataTestId, 'Loading')}>
        {getTranslationFromI18nKeyAndLabel('LOADING_LIQUID_FUND_TYPES', 'Loading liquid fund types...')}
      </div>
    )
  }

  if (investmentLiquidFundTypesError) {
    return <div data-testid={formatDataTestId(prefixDataTestId, 'Error')}>{investmentLiquidFundTypesError}</div>
  }

  if (investmentLiquidFundTypes.length === 0) {
    return (
      <div data-testid={formatDataTestId(prefixDataTestId, 'Empty')}>
        {getTranslationFromI18nKeyAndLabel(
          'NO_LIQUID_FUND_TYPES_AVAILABLE',
          'No liquid fund types available for this investment type.'
        )}
      </div>
    )
  }

  // In update mode, show read-only selected type
  if (isUpdate) {
    // Extract ID from object or use string directly
    const liquidFundTypeId =
      typeof formValues.liquidFundInvestment?.investmentLiquidFundType === 'object'
        ? formValues.liquidFundInvestment?.investmentLiquidFundType?.id
        : formValues.liquidFundInvestment?.investmentLiquidFundType

    const selectedType = investmentLiquidFundTypes.find(type => type.value === liquidFundTypeId)

    if (selectedType) {
      return (
        <div
          data-testid={formatDataTestId(prefixDataTestId, 'ReadOnlyContainer')}
          className="gba:p-4 gba:bg-secondary gba:rounded-md gba:border gba:border-solid gba:border-ring"
        >
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('LIQUID_FUND_TYPE', 'Liquid Fund Type')}:
            </span>
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
      name="liquidFundInvestment.investmentLiquidFundType"
      render={({ field }) => {
        // Extract ID from object or use string directly for comparison
        const liquidFundTypeId = typeof field.value === 'object' ? field.value?.id : field.value

        return (
          <FormItem data-testid={formatDataTestId(prefixDataTestId, 'Container')}>
            <FormLabel className="gba:text-lg gba:font-semibold">
              {getTranslationFromI18nKeyAndLabel('LIQUID_FUND_TYPE_SELECTION', 'Liquid Fund Type Selection')}{' '}
              <span className="gba:text-destructive">*</span>
            </FormLabel>
            <p className="gba:m-0 gba:text-muted-foreground gba:text-sm gba:mb-4">
              {getTranslationFromI18nKeyAndLabel(
                'SELECT_LIQUID_FUND_TYPE_DESCRIPTION',
                'Select the specific type of liquid fund to configure type-specific fields'
              )}
            </p>
            <FormControl>
              <div
                className="gba:grid gba:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gba:gap-4 gba:items-stretch"
                data-testid={formatDataTestId(prefixDataTestId, 'TypeGrid')}
              >
                {investmentLiquidFundTypes.map(type => {
                  const isSelected = liquidFundTypeId === type.value
                  return (
                    <Button
                      key={type.id}
                      type="button"
                      variant={isSelected ? 'default' : 'outline'}
                      onClick={() => handleLiquidFundTypeSelect(type.value, field.onChange)}
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

export default LiquidFundTypeSelectSegment
