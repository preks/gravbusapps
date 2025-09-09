import React from 'react';
import { Button } from '@newwork/nw-design-system';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useInvestmentFormContext } from '../context/InvestmentFormContext';

const prefixDataTestId = 'InvestmentForm-TypeSelector';

export interface InvestmentTypeSelectorProps {
  currentGroup: string;
}

const InvestmentTypeSelector: React.FC<InvestmentTypeSelectorProps> = () => {
  const {
    formValues,
    setFormValues,
    investmentTypes,
    investmentTypesLoading,
    investmentTypesError,
  } = useInvestmentFormContext();

  // removed unused description helper

  const handleTypeSelect = (typeValue: string) => {
    setFormValues({ investmentTypeRef: typeValue });
  };

  if (investmentTypesLoading) {
    return (
      <div data-testid={formatDataTestId(prefixDataTestId, 'Loading')}>
        Loading investment types...
      </div>
    );
  }

  if (investmentTypesError) {
    return (
      <div data-testid={formatDataTestId(prefixDataTestId, 'Error')}>
        {investmentTypesError}
      </div>
    );
  }

  if (investmentTypes.length === 0) {
    return (
      <div data-testid={formatDataTestId(prefixDataTestId, 'Empty')}>
        No investment types available for this group.
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
          Select Investment Type
        </h3>
        <p style={{
          margin: 0,
          color: 'var(--nw-color-text-secondary)',
          fontSize: '0.875rem'
        }}>
          Choose the type of investment you want to create
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
        {investmentTypes.map((type) => {
          const isSelected = formValues.investmentTypeRef === type.value;
          return (
            <Button
              key={type.id}
              type="button"
              variant={isSelected ? 'default' : 'outline'}
              onClick={() => handleTypeSelect(type.value)}
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

export default InvestmentTypeSelector;
