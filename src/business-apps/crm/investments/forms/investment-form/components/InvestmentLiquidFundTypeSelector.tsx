import React from 'react';
import { Button } from '@newwork/nw-design-system';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useInvestmentFormContext } from '../context/InvestmentFormContext';

const prefixDataTestId = 'InvestmentForm-LiquidFundTypeSelector';

export interface InvestmentLiquidFundTypeSelectorProps {
  currentInvestmentType: string;
}

const InvestmentLiquidFundTypeSelector: React.FC<InvestmentLiquidFundTypeSelectorProps> = ({ 
  currentInvestmentType: _currentInvestmentType // Received for consistency with other selectors, filtering handled by context
}) => {
  const {
    formValues,
    setFormValues,
    investmentLiquidFundTypes,
    investmentLiquidFundTypesLoading,
    investmentLiquidFundTypesError,
  } = useInvestmentFormContext();

  const handleLiquidFundTypeSelect = (liquidFundTypeValue: string) => {
    setFormValues({ investmentLiquidFundTypeRef: liquidFundTypeValue });
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

  return (
    <div 
      data-testid={formatDataTestId(prefixDataTestId, 'Container')} 
      className="gba:space-y-4"
    >
      <div>
        <h3 style={{ 
          margin: 0, 
          color: 'var(--nw-color-text-primary)', 
          fontSize: '1.125rem', 
          fontWeight: 600,
          marginBottom: 'var(--nw-spacing-xs)'
        }}>
          {getTranslationFromI18nKeyAndLabel('LIQUID_FUND_TYPE_SELECTION', 'Liquid Fund Type Selection')}
        </h3>
        <p style={{
          margin: 0,
          color: 'var(--nw-color-text-secondary)',
          fontSize: '0.875rem'
        }}>
          {getTranslationFromI18nKeyAndLabel('SELECT_LIQUID_FUND_TYPE_DESCRIPTION', 'Select the specific type of liquid fund to configure type-specific fields')}
        </p>
      </div>
      <div 
        style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 'var(--nw-spacing-sm)',
          alignItems: 'stretch'
        }}
        data-testid={formatDataTestId(prefixDataTestId, 'TypeGrid')}
      >
        {investmentLiquidFundTypes.map((type) => {
          const isSelected = formValues.investmentLiquidFundTypeRef === type.value;
          return (
            <Button
              key={type.id}
              type="button"
              variant={isSelected ? 'default' : 'outline'}
              onClick={() => handleLiquidFundTypeSelect(type.value)}
              data-testid={formatDataTestId(prefixDataTestId, `type-${type.id}-button`)}
              style={{
                minHeight: '3rem',
                justifyContent: 'center',
                textAlign: 'center',
                whiteSpace: 'normal',
                padding: 'var(--nw-spacing-sm) var(--nw-spacing-md)'
              }}
            >
              {type.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default InvestmentLiquidFundTypeSelector;
