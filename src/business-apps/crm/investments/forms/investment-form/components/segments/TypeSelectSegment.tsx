import React from 'react';
import { Button, Badge } from '@newwork/nw-design-system';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useInvestmentFormContext } from '../../context/InvestmentFormContext';

const prefixDataTestId = 'InvestmentForm-TypeSelector';

export interface TypeSelectSegmentProps {
  currentGroup: string;
  isUpdate?: boolean;
}

const TypeSelectSegment: React.FC<TypeSelectSegmentProps> = ({ isUpdate = false }) => {
  const {
    formValues,
    setFormValues,
    investmentTypes,
    investmentTypesLoading,
    investmentTypesError,
  } = useInvestmentFormContext();

  const handleTypeSelect = (typeValue: string) => {
    setFormValues({ 
      investment: { investmentType: { id: typeValue } as any } // Store as minimal object
    } as Partial<typeof formValues>);
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

  // In update mode, show read-only selected type
  if (isUpdate) {
    // Extract ID from object or use string directly
    const investmentTypeId = typeof formValues.investment.investmentType === 'object' 
      ? formValues.investment.investmentType?.id 
      : formValues.investment.investmentType;
    
    const selectedType = investmentTypes.find(type => type.value === investmentTypeId);
    
    if (selectedType) {
      return (
        <div 
          data-testid={formatDataTestId(prefixDataTestId, 'ReadOnlyContainer')}
          className="gba:p-4 gba:bg-secondary gba:rounded-md gba:border gba:border-solid gba:border-ring"
        >
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:text-muted-foreground">
              Investment Type:
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
  // Extract ID from object or use string directly for comparison
  const investmentTypeId = typeof formValues.investment.investmentType === 'object' 
    ? formValues.investment.investmentType?.id 
    : formValues.investment.investmentType;

  return (
    <div 
      data-testid={formatDataTestId(prefixDataTestId, 'Container')} 
      className="gba:space-y-4"
    >
      <div>
        <h3 className="gba:m-0 gba:text-foreground gba:text-lg gba:font-semibold gba:mb-1">
          Select Investment Type
        </h3>
        <p className="gba:m-0 gba:text-muted-foreground gba:text-sm">
          Choose the type of investment you want to create
        </p>
      </div>
      <div 
        className="gba:grid gba:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gba:gap-4 gba:items-stretch"
        data-testid={formatDataTestId(prefixDataTestId, 'TypeGrid')}
      >
        {investmentTypes.map((type) => {
          const isSelected = investmentTypeId === type.value;
          return (
            <Button
              key={type.id}
              type="button"
              variant={isSelected ? 'default' : 'outline'}
              onClick={() => handleTypeSelect(type.value)}
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

export default TypeSelectSegment;

