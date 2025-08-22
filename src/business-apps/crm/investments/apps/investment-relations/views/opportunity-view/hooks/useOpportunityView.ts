import { useState, useCallback } from 'react';
import type { InvestmentOpportunity } from '@/common/data/investment/types';

export interface UseOpportunityViewReturn {
  selectedOpportunities: Set<string>;
  toggleOpportunitySelection: (opportunityId: string) => void;
  selectAllOpportunities: () => void;
  clearSelection: () => void;
  getSelectedOpportunities: () => InvestmentOpportunity[];
  hasSelection: boolean;
}

export const useOpportunityView = (opportunities: InvestmentOpportunity[]): UseOpportunityViewReturn => {
  const [selectedOpportunities, setSelectedOpportunities] = useState<Set<string>>(new Set());

  const toggleOpportunitySelection = useCallback((opportunityId: string) => {
    setSelectedOpportunities(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(opportunityId)) {
        newSelection.delete(opportunityId);
      } else {
        newSelection.add(opportunityId);
      }
      return newSelection;
    });
  }, []);

  const selectAllOpportunities = useCallback(() => {
    setSelectedOpportunities(new Set(opportunities.map(opportunity => opportunity.id)));
  }, [opportunities]);

  const clearSelection = useCallback(() => {
    setSelectedOpportunities(new Set());
  }, []);

  const getSelectedOpportunities = useCallback(() => {
    return opportunities.filter(opportunity => selectedOpportunities.has(opportunity.id));
  }, [opportunities, selectedOpportunities]);

  const hasSelection = selectedOpportunities.size > 0;

  return {
    selectedOpportunities,
    toggleOpportunitySelection,
    selectAllOpportunities,
    clearSelection,
    getSelectedOpportunities,
    hasSelection
  };
};

