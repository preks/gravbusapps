import React from 'react'
import { Button, Badge, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@newwork/nw-design-system'
import { useFormContext, useWatch } from 'react-hook-form'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useInvestmentLiquidFundTypeCatalog } from '../../hooks/useInvestmentLiquidFundTypeCatalog'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { InvestmentFormValues } from '../../types'

const prefixDataTestId = 'InvestmentForm-LiquidFundTypeSelector'

export interface LiquidFundTypeSelectSegmentProps {
  currentInvestmentType: string
  isUpdate?: boolean
  businessAppContext: BusinessAppContextProps
}

const LiquidFundTypeSelectSegment: React.FC<LiquidFundTypeSelectSegmentProps> = ({
  isUpdate = false,
  businessAppContext
}) => {
  const { control } = useFormContext<InvestmentFormValues>()
  const investmentType = useWatch({ control, name: 'investment.investmentType' })

  // Get current liquid fund type from form - MUST be called before any early returns
  const liquidFundType = useWatch({ control, name: 'liquidFundInvestment.investmentLiquidFundType' })

  // Extract type ID for the hook
  const typeId = typeof investmentType === 'object' ? investmentType?.id : investmentType

  // Use catalog hook directly
  const {
    options: investmentLiquidFundTypes,
    loading: investmentLiquidFundTypesLoading,
    error: investmentLiquidFundTypesError
  } = useInvestmentLiquidFundTypeCatalog(businessAppContext.accessToken || '', typeId)

  const liquidFundTypeId = typeof liquidFundType === 'object' ? liquidFundType?.id : liquidFundType

  const handleLiquidFundTypeSelect = (liquidFundTypeValue: string, onChange: (value: any) => void) => {
    const newValue = { id: liquidFundTypeValue } as any
    onChange(newValue) // Update react-hook-form
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
        // Use already extracted liquidFundTypeId from useWatch above

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
