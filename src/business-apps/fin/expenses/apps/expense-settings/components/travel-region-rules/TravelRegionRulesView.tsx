import React from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import TravelRegionRulesList from './TravelRegionRulesList';

export interface TravelRegionRulesViewProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const TravelRegionRulesView: React.FC<TravelRegionRulesViewProps> = (context) => {
  const { prefixDataTestId = '' } = context;

  return (
    <div 
      data-testid={`${prefixDataTestId}-allowance-region-rules-view`}
      className="gba:p-6"
    >
      <TravelRegionRulesList
        {...context}
        prefixDataTestId={prefixDataTestId}
      />
    </div>
  );
};

export default TravelRegionRulesView; 