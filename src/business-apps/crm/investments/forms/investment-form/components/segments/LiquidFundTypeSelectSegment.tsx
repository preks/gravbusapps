import React from 'react';
import { Button, Badge } from '@newwork/nw-design-system';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useInvestmentFormContext } from '../../context/InvestmentFormContext';

const prefixDataTestId = 'InvestmentForm-LiquidFundTypeSelector';

export interface LiquidFundTypeSelectSegmentProps {
  currentInvestmentType: string;
  isUpdate?: boolean;
}

const LiquidFundTypeSelectSegment: React.FC<LiquidFundTypeSelectSegmentProps> = ({ 
  currentInvestmentType: _currentInvestmentType, // Received for consistency with other selectors, filtering handled by context
  isUpdate = false
}) => {
  const {
    formValues,
    setFormValues,
    investmentLiquidFundTypes,
    investmentLiquidFundTypesLoading,
    investmentLiquidFundTypesError,
  } = useInvestmentFormContext();

  const handleLiquidFundTypeSelect = (liquidFundTypeValue: string) => {
    setFormValues({ 
      liquidFundInvestment: { investmentLiquidFundTypeRef: liquidFundTypeValue }
    } as Partial<typeof formValues>);
  };

  if (investmentLiquidFundTypesLoading) {
    return (
      <div data-testid={formatDataTestId(prefixDataTestId, 'Loading')}>
        {getTranslationFromI18nKeyAndLabel('LOADING_LIQUID_FUND_TYPES', 'Loading liquid fund types...')}
      </div>
    );
  }

  if (investmentLiquidFundTypesError) {
    return (
      <div data-testid={formatDataTestId(prefixDataTestId, 'Error')}>
        {investmentLiquidFundTypesError}
      </div>
    );
  }

  if (investmentLiquidFundTypes.length === 0) {
    return (
      <div data-testid={formatDataTestId(prefixDataTestId, 'Empty')}>
        {getTranslationFromI18nKeyAndLabel('NO_LIQUID_FUND_TYPES_AVAILABLE', 'No liquid fund types available for this investment type.')}
      </div>
    );
  }

  // In update mode, show read-only selected type
  if (isUpdate) {
    const selectedType = investmentLiquidFundTypes.find(
      type => type.value === formValues.liquidFundInvestment?.investmentLiquidFundTypeRef
    );
    
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
            <Badge 
              variant="secondary"
              data-testid={formatDataTestId(prefixDataTestId, 'SelectedTypeBadge')}
            >
              {selectedType.label}
            </Badge>
          </div>
        </div>
      );
    }
    return null; // No type selected in update mode
  }

  // Create mode - show selection UI
  return (
    <div 
      data-testid={formatDataTestId(prefixDataTestId, 'Container')} 
      className="gba:space-y-4"
    >
      <div>
        <h3 className="gba:m-0 gba:text-foreground gba:text-lg gba:font-semibold gba:mb-1">
          {getTranslationFromI18nKeyAndLabel('LIQUID_FUND_TYPE_SELECTION', 'Liquid Fund Type Selection')}
        </h3>
        <p className="gba:m-0 gba:text-muted-foreground gba:text-sm">
          {getTranslationFromI18nKeyAndLabel('SELECT_LIQUID_FUND_TYPE_DESCRIPTION', 'Select the specific type of liquid fund to configure type-specific fields')}
        </p>
      </div>
      <div 
        className="gba:grid gba:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gba:gap-4 gba:items-stretch"
        data-testid={formatDataTestId(prefixDataTestId, 'TypeGrid')}
      >
        {investmentLiquidFundTypes.map((type) => {
          const isSelected = formValues.liquidFundInvestment?.investmentLiquidFundTypeRef === type.value;
          return (
            <Button
              key={type.id}
              type="button"
              variant={isSelected ? 'default' : 'outline'}
              onClick={() => handleLiquidFundTypeSelect(type.value)}
              data-testid={formatDataTestId(prefixDataTestId, `type-${type.id}-button`)}
              className="gba:min-h-12 gba:justify-center gba:text-center gba:whitespace-normal gba:px-4 gba:py-2"
            >
              {type.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default LiquidFundTypeSelectSegment;

