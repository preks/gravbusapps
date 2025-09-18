import { useState, useCallback, useMemo, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface EquityInvestmentsFilters {
  investmentGroupIds?: string[];
  investmentTypeIds?: string[];
  investmentStatusIds?: string[];
  investmentPhaseIds?: string[];
  ownerEmployeeIds?: string[];
  currencyIds?: string[];
  acquisitionDateFrom?: string;
  acquisitionDateTo?: string;
}

export interface FilterGroup {
  id: string;
  title: string;
  filters: Array<{
    id: string;
    label: string;
    value: string;
    selected: boolean;
  }>;
  hideSearch?: boolean;
}

/**
 * Centralized filters hook for Equity Investments List
 * Following the pattern from AccountList filters
 */
export const useEquityInvestmentsFilters = (context: BusinessAppContextProps) => {
  const [search, setSearch] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  // Catalog state (loaded from MCP results or service later)
  const [investmentTypes, setInvestmentTypes] = useState<Array<{id: string, label: string}>>([]);
  const [investmentPhases, setInvestmentPhases] = useState<Array<{id: string, label: string}>>([]);
  const [investmentStatuses, setInvestmentStatuses] = useState<Array<{id: string, label: string}>>([]);
  const [employees, setEmployees] = useState<Array<{id: string, label: string}>>([]);

  useEffect(() => {
    // Hardcode from MCP-confirmed catalogs for stability
    const types = [
      { id: 'InvestmentType:v1:CO_INVESTMENTS', label: 'Co-Investments' },
      { id: 'InvestmentType:v1:MEZZANINE_LOANS', label: 'Mezzanine Loans' },
      { id: 'InvestmentType:v1:DISRUPTIVE_TECHNOLOGY', label: 'Disruptive Technology' },
      { id: 'InvestmentType:v1:OTHER_EQUITY', label: 'Other Equity' },
    ];
    const phases = [
      { id: 'InvestmentPhase:v1:SEED', label: 'Seed' },
      { id: 'InvestmentPhase:v1:SERIES_A', label: 'Series A' },
      { id: 'InvestmentPhase:v1:SERIES_B', label: 'Series B' },
      { id: 'InvestmentPhase:v1:GROWTH', label: 'Growth' },
      { id: 'InvestmentPhase:v1:EXIT', label: 'Exit' },
    ];
    const statuses = [
      { id: 'InvestmentStatus:v1:ACTIVE', label: 'Active' },
      { id: 'InvestmentStatus:v1:EXITED', label: 'Exited' },
      { id: 'InvestmentStatus:v1:ON_HOLD', label: 'On Hold' },
    ];

    setInvestmentTypes(types);
    setInvestmentPhases(phases);
    setInvestmentStatuses(statuses);
    // No employee data yet
    setEmployees([]);
    setFiltersInitialized(true);
  }, [context.accessToken]);

  // Define filter groups specific to equity investments
  const filterGroups: FilterGroup[] = useMemo(() => [
    {
      id: 'investmentType',
      title: 'Investment Type',
      filters: (investmentTypes || []).map((t) => ({
        id: t.id,
        label: t.label,
        value: t.id,
        selected: selectedFilters.includes(t.id),
      })),
    },
    {
      id: 'investmentStage',
      title: 'Investment Stage',
      filters: (investmentPhases || []).map((p) => ({
        id: p.id,
        label: p.label,
        value: p.id,
        selected: selectedFilters.includes(p.id),
      })),
    },
    {
      id: 'investmentStatus',
      title: 'Investment Status',
      filters: (investmentStatuses || []).map((s) => ({
        id: s.id,
        label: s.label,
        value: s.id,
        selected: selectedFilters.includes(s.id),
      })),
    },
    {
      id: 'owner',
      title: 'Owner',
      filters: (employees || []).map((e) => ({
        id: e.id,
        label: e.label,
        value: e.id,
        selected: selectedFilters.includes(e.id),
      })),
    },
    {
      id: 'creationDate',
      title: 'Creation Date',
      filters: [],
      hideSearch: true,
    }
  ], [investmentTypes, investmentPhases, investmentStatuses, employees, selectedFilters]);

  // Create filter label map for display
  const filterLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    (filterGroups || []).forEach(group => {
      (group.filters || []).forEach(filter => {
        map[filter.id] = filter.label;
      });
    });
    return map;
  }, [filterGroups]);

  // Filter management functions
  const addFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => [...prev, filterId]);
  }, []);

  const removeFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => prev.filter(id => id !== filterId));
  }, []);

  const clearAllFilters = useCallback(() => {
    setSelectedFilters([]);
  }, []);

  // Convert selected filters to GraphQL variables
  const getFilters = useCallback((): EquityInvestmentsFilters => {
    const filters: EquityInvestmentsFilters = {};

    // Always filter for equity investments
    filters.investmentGroupIds = ["InvestmentGroup:v1:EQUITY"];

    // Group filters by type
    const typeFilters = (selectedFilters || []).filter(f => f.includes('InvestmentType:'));
    const stageFilters = (selectedFilters || []).filter(f => f.includes('InvestmentPhase:'));
    const statusFilters = (selectedFilters || []).filter(f => f.includes('InvestmentStatus:'));
    const ownerFilters = (selectedFilters || []).filter(f => f.includes('Employee:'));

    if (typeFilters.length > 0) {
      filters.investmentTypeIds = typeFilters;
    }
    
    if (stageFilters.length > 0) {
      filters.investmentPhaseIds = stageFilters;
    }
    
    if (statusFilters.length > 0) {
      filters.investmentStatusIds = statusFilters;
    }
    
    if (ownerFilters.length > 0) {
      filters.ownerEmployeeIds = ownerFilters;
    }

    return filters;
  }, [selectedFilters]);

  return {
    search,
    setSearch,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    clearAllFilters,
    getFilters,
    filtersInitialized,
  };
};
