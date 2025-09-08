import React, { useState } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { InvestmentActivitiesSection } from './InvestmentActivitiesSection';
import { InvestmentTasksSection } from './InvestmentTasksSection';

interface InvestmentHomeTabProps extends BusinessAppContextProps {
  investmentId: string;
}

export const InvestmentHomeTab: React.FC<InvestmentHomeTabProps> = ({ 
  investmentId, 
  ...context 
}) => {
  return (
    <div data-testid="investment-home-tab">
      {/* Layout matching investment lead record - Activities + Tasks side by side */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-6">
        {/* Activities Section - 1/2 width */}
        <div>
          <InvestmentActivitiesSection investmentId={investmentId} context={context} />
        </div>

        {/* Tasks Section - 1/2 width */}
        <div>
          <InvestmentTasksSection investmentId={investmentId} context={context} />
        </div>
      </div>
    </div>
  );
};

export default InvestmentHomeTab;
