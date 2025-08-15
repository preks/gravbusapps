import React, { useState } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import TravelRegionSetCardView from './TravelRegionSetCardView';
import TravelRegionMatrixView from './TravelRegionMatrixView';
import UnassignedRulesView from './UnassignedRulesView';
import TravelRegionRulesList from './TravelRegionRulesList';

export interface TravelRegionRulesViewProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

type ViewMode = 'sets' | 'matrix' | 'unassigned' | 'legacy';

interface SelectedSet {
  id: string;
  name: string;
}

const TravelRegionRulesView: React.FC<TravelRegionRulesViewProps> = (context) => {
  const { prefixDataTestId = '' } = context;
  
  const [viewMode, setViewMode] = useState<ViewMode>('sets');
  const [selectedSet, setSelectedSet] = useState<SelectedSet | null>(null);

  const handleSelectSet = (setId: string, setName: string) => {
    setSelectedSet({ id: setId, name: setName });
    setViewMode('matrix');
  };

  const handleViewUnassigned = () => {
    setViewMode('unassigned');
  };

  const handleBackToSets = () => {
    setSelectedSet(null);
    setViewMode('sets');
  };

  const handleViewLegacy = () => {
    setViewMode('legacy');
  };

  // Render based on current view mode
  switch (viewMode) {
    case 'matrix':
      return selectedSet ? (
        <TravelRegionMatrixView
          {...context}
          prefixDataTestId={prefixDataTestId}
          travelRegionSetId={selectedSet.id}
          travelRegionSetName={selectedSet.name}
          onBack={handleBackToSets}
        />
      ) : null;

    case 'unassigned':
      return (
        <UnassignedRulesView
          {...context}
          prefixDataTestId={prefixDataTestId}
          onBack={handleBackToSets}
        />
      );

    case 'legacy':
      return (
        <div 
          data-testid={`${prefixDataTestId}-allowance-region-rules-view`}
          className="gba:p-6"
        >
          <TravelRegionRulesList
            {...context}
            prefixDataTestId={prefixDataTestId}
            onBackToNew={handleBackToSets}
          />
        </div>
      );

    case 'sets':
    default:
      return (
        <TravelRegionSetCardView
          {...context}
          prefixDataTestId={prefixDataTestId}
          onSelectSet={handleSelectSet}
          onViewUnassigned={handleViewUnassigned}
        />
      );
  }
};

export default TravelRegionRulesView; 