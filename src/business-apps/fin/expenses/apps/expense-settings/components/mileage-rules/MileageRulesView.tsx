import React from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import MileageRulesList from './MileageRulesList';

export interface MileageRulesViewProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const MileageRulesView: React.FC<MileageRulesViewProps> = (context) => {
  const { prefixDataTestId = '' } = context;

  return (
    <div 
      data-testid={`${prefixDataTestId}-mileage-rules-view`}
      className="gba:p-6"
    >
      <MileageRulesList
        {...context}
        prefixDataTestId={prefixDataTestId}
      />
    </div>
  );
};

export default MileageRulesView; 