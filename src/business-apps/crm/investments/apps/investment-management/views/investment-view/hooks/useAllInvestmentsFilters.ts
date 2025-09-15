import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { DateRangeFilter } from '@/business-apps/crm/customers/apps/customer-relations/views/lead-view/components/DateRangeFilter';
import { useEmployeeSearch } from '@/common/data/employee/useEmployeeSearch';
import ExpenseAmountRangeFilter from '@/business-apps/fin/expenses/apps/personal-expenses/components/tabs/expense-items-tab/ExpenseAmountRangeFilter';

export interface AllInvestmentsFilters {
  investmentGroupIds?: string[];
  investmentTypeIds?: string[];
  investmentStatusIds?: string[];
  investmentPhaseIds?: string[];
  investmentRiskLevelIds?: string[];
  ownerEmployeeIds?: string[];
  currencyIds?: string[];
  countryIds?: string[];
  // Creation date range
  createdAfter?: string;
  createdBefore?: string;
  // Amount ranges
  initialInvestmentMinAmount?: number;
  initialInvestmentMaxAmount?: number;
  marketValueMinAmount?: number;
  marketValueMaxAmount?: number;
  totalInvestmentMinAmount?: number;
  totalInvestmentMaxAmount?: number;
  debtFinancingMinAmount?: number;
  debtFinancingMaxAmount?: number;
  forecastedProfitMinAmount?: number;
  forecastedProfitMaxAmount?: number;
  // Performance filtering removed (no backend field)
  acquisitionDateFrom?: string;
  acquisitionDateTo?: string;
  exitDateFrom?: string;
  exitDateTo?: string;
  plannedExitDateFrom?: string;
  plannedExitDateTo?: string;
  isinContains?: string;
  fundManagerNameContains?: string;
  stakePercentageMin?: number;
  stakePercentageMax?: number;
  // phase/risk/currency are represented via selectedFilters groups already
}

export interface FilterGroup {
  id: string;
  title: string;
  filters: Array<{
    id: string;
    label: string;
    value: any;
    selected: boolean;
  }>;
  backendSearch?: (search: string) => {
    filters: Array<{
      id: string;
      label: string;
      value: any;
      selected: boolean;
    }>;
    loading: boolean;
    error: string | null;
  };
  customComponent?: React.ReactNode;
  hideSearch?: boolean;
}

/**
 * Centralized filters hook for All Investments List
 * Following the pattern from AccountList filters
 */
export const useAllInvestmentsFilters = (context: BusinessAppContextProps) => {
  const [search, setSearch] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  // Creation date range state
  const [createdAfter, setCreatedAfter] = useState<string | undefined>(undefined);
  const [createdBefore, setCreatedBefore] = useState<string | undefined>(undefined);
  // Numeric ranges
  const [initialRange, setInitialRange] = useState<{ min?: number; max?: number } | null>(null);
  const [marketRange, setMarketRange] = useState<{ min?: number; max?: number } | null>(null);
  const [totalRange, setTotalRange] = useState<{ min?: number; max?: number } | null>(null);
  const [debtRange, setDebtRange] = useState<{ min?: number; max?: number } | null>(null);
  const [forecastRange, setForecastRange] = useState<{ min?: number; max?: number } | null>(null);
  const [stakeRange, setStakeRange] = useState<{ min?: number; max?: number } | null>(null);
  const [isin, setIsin] = useState<string>('');
  const [fundManager, setFundManager] = useState<string>('');
  // Additional date ranges
  const [acqAfter, setAcqAfter] = useState<string | undefined>(undefined);
  const [acqBefore, setAcqBefore] = useState<string | undefined>(undefined);
  const [exitAfter, setExitAfter] = useState<string | undefined>(undefined);
  const [exitBefore, setExitBefore] = useState<string | undefined>(undefined);
  const [plannedAfter, setPlannedAfter] = useState<string | undefined>(undefined);
  const [plannedBefore, setPlannedBefore] = useState<string | undefined>(undefined);
  // No performance range; computed client value not filterable server-side

  // Catalog data state
  const [investmentGroups, setInvestmentGroups] = useState<Array<{id: string, label: string}>>([]);
  const [investmentTypes, setInvestmentTypes] = useState<Array<{id: string, label: string}>>([]);
  const [investmentStatuses, setInvestmentStatuses] = useState<Array<{id: string, label: string}>>([]);
  const [investmentPhases, setInvestmentPhases] = useState<Array<{id: string, label: string}>>([]);
  const [riskLevels, setRiskLevels] = useState<Array<{id: string, label: string}>>([]);
  const [currencies, setCurrencies] = useState<Array<{id: string, label: string}>>([]);
  const [employees, setEmployees] = useState<Array<{id: string, label: string}>>([]);
  // Owner backend search
  const { employees: employeeOptions, search: searchEmployees, loading: loadingEmployees, error: employeeError } = useEmployeeSearch(context.accessToken);
  const lastOwnerSearchRef = useRef<string>("");

  const catalogClient = useCatalogManagerClient(context.accessToken);

  // Fetch catalog data
  useEffect(() => {
    const loadCatalogs = async () => {
      if (!context.accessToken) return;

      console.log('🔍 Loading investment catalogs...');
      
      try {
        // Use the exact catalog data we got from MCP
        const hardcodedGroups = [
          { id: "InvestmentGroup:v1:LIQUID_FUND", label: "Liquid Fund" },
          { id: "InvestmentGroup:v1:EQUITY", label: "Equity" },
          { id: "InvestmentGroup:v1:REAL_ESTATE", label: "Real Estate" }
        ];
        
        const hardcodedTypes = [
          { id: "InvestmentType:v1:PHARMA", label: "Pharma" },
          { id: "InvestmentType:v1:BANK", label: "Bank" },
          { id: "InvestmentType:v1:CAPTIAL_MARKET", label: "Strategic Liquidity" },
          { id: "InvestmentType:v1:LIFE_SCEINCE", label: "Life Science" },
          { id: "InvestmentType:v1:CO_INVESTMENTS", label: "Co-Investments" },
          { id: "InvestmentType:v1:DISRUPTIVE_TECHNOLOGY", label: "Technology" },
          { id: "InvestmentType:v1:MEZZANINE_LOANS", label: "Mezzanine Loans" },
          { id: "InvestmentType:v1:PROJECT_DEVELOPMENT", label: "Project Development" },
          { id: "InvestmentType:v1:EXISTING_PROPERTY", label: "Existing Properties" },
          { id: "InvestmentType:v1:OTHER_REAL_ESTATE", label: "Others" }
        ];
        
        const hardcodedStatuses = [
          { id: "InvestmentStatus:v1:ACTIVE", label: "Active" },
          { id: "InvestmentStatus:v1:EXITED", label: "Exited" },
          { id: "InvestmentStatus:v1:ON_HOLD", label: "On Hold" }
        ];

        // Set the hardcoded data directly (from MCP results)
        setInvestmentGroups(hardcodedGroups);
        setInvestmentTypes(hardcodedTypes);
        setInvestmentStatuses(hardcodedStatuses);
        setInvestmentPhases([
          { id: 'InvestmentPhase:v1:ACQUISITION', label: 'Acquisition' },
          { id: 'InvestmentPhase:v1:HOLD', label: 'Hold' },
          { id: 'InvestmentPhase:v1:EXIT', label: 'Exit' },
        ]);
        setRiskLevels([
          { id: 'InvestmentRiskLevel:v1:LOW', label: 'Low' },
          { id: 'InvestmentRiskLevel:v1:MEDIUM', label: 'Medium' },
          { id: 'InvestmentRiskLevel:v1:HIGH', label: 'High' },
        ]);
        setCurrencies([
          { id: 'Currency:v1:EUR', label: 'EUR' },
          { id: 'Currency:v1:USD', label: 'USD' },
          { id: 'Currency:v1:GBP', label: 'GBP' },
        ]);

        // Prefill with empty list; backend search will populate dynamically
        setEmployees([]);

        console.log('✅ Loaded catalogs:', {
          groups: hardcodedGroups.length,
          types: hardcodedTypes.length, 
          statuses: hardcodedStatuses.length,
          employees: 0
        });

        setFiltersInitialized(true);
      } catch (error) {
        console.error('Error loading investment catalogs:', error);
        setFiltersInitialized(true); // Still allow the component to work
      }
    };

    loadCatalogs();
  }, [context.accessToken, catalogClient]);

  // Define filter groups that match the visible columns exactly
  const filterGroups: FilterGroup[] = useMemo(() => [
    {
      id: "investmentGroup",
      title: "Investment Group",
      filters: (investmentGroups || []).map((group) => ({
        id: group.id,
        label: group.label,
        value: group.id,
        selected: selectedFilters.includes(group.id),
      })),
    },
    {
      id: "investmentType",
      title: "Investment Type", 
      filters: (investmentTypes || []).map((type) => ({
        id: type.id,
        label: type.label,
        value: type.id,
        selected: selectedFilters.includes(type.id),
      })),
    },
    {
      id: "investmentStatus",
      title: "Investment Status",
      filters: (investmentStatuses || []).map((status) => ({
        id: status.id,
        label: status.label,
        value: status.id,
        selected: selectedFilters.includes(status.id),
      })),
    },
    {
      id: "owner",
      title: "Owner",
      filters: (employees || []).map((employee) => ({
        id: employee.id,
        label: employee.label,
        value: employee.id,
        selected: selectedFilters.includes(employee.id),
      })),
      backendSearch: (search: string) => {
        const term = (search || '').trim();
        if (term !== lastOwnerSearchRef.current) {
          lastOwnerSearchRef.current = term;
          if (term.length >= 2) {
            void searchEmployees(term);
          }
        }
        const opts = (employeeOptions || []).map((e) => ({ id: e.id, label: e.displayName, value: e.id, selected: selectedFilters.includes(e.id) }));
        return {
          filters: term.length >= 2 ? opts : [],
          loading: loadingEmployees,
          error: employeeError || null,
        } as any;
      },
    },
    {
      id: "creationDate",
      title: "Creation Date",
      filters: [],
      customComponent: React.createElement(DateRangeFilter, {
        createdAfter,
        createdBefore,
        onDateRangeChange: (after?: string, before?: string) => {
          setCreatedAfter(after);
          setCreatedBefore(before);
        },
        className: 'gba:border-0 gba:shadow-none gba:p-0 gba:bg-transparent',
      }),
      hideSearch: true,
    },
    // Initial Investment amount range
    {
      id: "initialInvestmentRange",
      title: "Initial Investment",
      filters: [],
      customComponent: React.createElement(ExpenseAmountRangeFilter, {
        amountRange: initialRange,
        onAmountRangeChange: setInitialRange,
        label: 'Initial Investment',
        dataTestIdPrefix: 'all-investments-initial-range',
        className: 'gba:border-0 gba:shadow-none gba:p-0 gba:bg-transparent',
      }),
      hideSearch: true,
    },
    // Market Value amount range
    {
      id: "marketValueRange",
      title: "Market Value",
      filters: [],
      customComponent: React.createElement(ExpenseAmountRangeFilter, {
        amountRange: marketRange,
        onAmountRangeChange: setMarketRange,
        label: 'Market Value',
        dataTestIdPrefix: 'all-investments-market-range',
        className: 'gba:border-0 gba:shadow-none gba:p-0 gba:bg-transparent',
      }),
      hideSearch: true,
    },
    // Total Investment range
    {
      id: "totalInvestmentRange",
      title: "Total Investment",
      filters: [],
      customComponent: React.createElement(ExpenseAmountRangeFilter, {
        amountRange: totalRange,
        onAmountRangeChange: setTotalRange,
        label: 'Total Investment',
        dataTestIdPrefix: 'all-investments-total-range',
        className: 'gba:border-0 gba:shadow-none gba:p-0 gba:bg-transparent',
      }),
      hideSearch: true,
    },
    // Debt Financing range
    {
      id: "debtFinancingRange",
      title: "Debt Financing",
      filters: [],
      customComponent: React.createElement(ExpenseAmountRangeFilter, {
        amountRange: debtRange,
        onAmountRangeChange: setDebtRange,
        label: 'Debt Financing',
        dataTestIdPrefix: 'all-investments-debt-range',
        className: 'gba:border-0 gba:shadow-none gba:p-0 gba:bg-transparent',
      }),
      hideSearch: true,
    },
    // Forecasted Profit range
    {
      id: "forecastedProfitRange",
      title: "Forecasted Profit",
      filters: [],
      customComponent: React.createElement(ExpenseAmountRangeFilter, {
        amountRange: forecastRange,
        onAmountRangeChange: setForecastRange,
        label: 'Forecasted Profit',
        dataTestIdPrefix: 'all-investments-forecast-range',
        className: 'gba:border-0 gba:shadow-none gba:p-0 gba:bg-transparent',
      }),
      hideSearch: true,
    },
    // ISIN
    {
      id: 'isin',
      title: 'ISIN',
      filters: [],
      customComponent: React.createElement('input', {
        value: isin,
        onChange: (e: any) => setIsin(e?.target?.value || ''),
        placeholder: 'Search ISIN',
        className: 'gba:w-full gba:h-8 gba:px-2 gba:text-sm gba:bg-gray-100/40 gba:rounded gba:border-none gba:outline-none',
        'data-testid': 'all-investments-isin-input'
      }),
      hideSearch: true,
    },
    // Currency
    {
      id: 'currency',
      title: 'Currency',
      filters: (currencies || []).map((c) => ({ id: c.id, label: c.label, value: c.id, selected: selectedFilters.includes(c.id) })),
    },
    // Fund Manager
    {
      id: 'fundManager',
      title: 'Fund Manager',
      filters: [],
      customComponent: React.createElement('input', {
        value: fundManager,
        onChange: (e: any) => setFundManager(e?.target?.value || ''),
        placeholder: 'Search Fund Manager',
        className: 'gba:w-full gba:h-8 gba:px-2 gba:text-sm gba:bg-gray-100/40 gba:rounded gba:border-none gba:outline-none',
        'data-testid': 'all-investments-fund-manager-input'
      }),
      hideSearch: true,
    },
    // Phase
    {
      id: 'investmentPhase',
      title: 'Phase',
      filters: (investmentPhases || []).map((p) => ({ id: p.id, label: p.label, value: p.id, selected: selectedFilters.includes(p.id) })),
    },
    // Risk Level
    {
      id: 'investmentRiskLevel',
      title: 'Risk Level',
      filters: (riskLevels || []).map((r) => ({ id: r.id, label: r.label, value: r.id, selected: selectedFilters.includes(r.id) })),
    },
    // Stake %
    {
      id: 'stakeRange',
      title: 'Stake %',
      filters: [],
      customComponent: React.createElement(ExpenseAmountRangeFilter, {
        amountRange: stakeRange,
        onAmountRangeChange: setStakeRange,
        label: 'Stake %',
        dataTestIdPrefix: 'all-investments-stake-range',
        className: 'gba:border-0 gba:shadow-none gba:p-0 gba:bg-transparent',
      }),
      hideSearch: true,
    },
    // Acquisition Date
    {
      id: 'acquisitionDate',
      title: 'Acquisition Date',
      filters: [],
      customComponent: React.createElement(DateRangeFilter, {
        createdAfter: acqAfter,
        createdBefore: acqBefore,
        onDateRangeChange: (after?: string, before?: string) => { setAcqAfter(after); setAcqBefore(before); },
        className: 'gba:border-0 gba:shadow-none gba:p-0 gba:bg-transparent',
      }),
      hideSearch: true,
    },
    // Exit Date
    {
      id: 'exitDate',
      title: 'Exit Date',
      filters: [],
      customComponent: React.createElement(DateRangeFilter, {
        createdAfter: exitAfter,
        createdBefore: exitBefore,
        onDateRangeChange: (after?: string, before?: string) => { setExitAfter(after); setExitBefore(before); },
        className: 'gba:border-0 gba:shadow-none gba:p-0 gba:bg-transparent',
      }),
      hideSearch: true,
    },
    // Planned Exit Date
    {
      id: 'plannedExitDate',
      title: 'Planned Exit Date',
      filters: [],
      customComponent: React.createElement(DateRangeFilter, {
        createdAfter: plannedAfter,
        createdBefore: plannedBefore,
        onDateRangeChange: (after?: string, before?: string) => { setPlannedAfter(after); setPlannedBefore(before); },
        className: 'gba:border-0 gba:shadow-none gba:p-0 gba:bg-transparent',
      }),
      hideSearch: true,
    },
    // Total Investment range
    {
      id: "totalInvestmentRange",
      title: "Total Investment",
      filters: [],
      customComponent: React.createElement(ExpenseAmountRangeFilter, {
        amountRange: totalRange,
        onAmountRangeChange: setTotalRange,
        label: 'Total Investment',
        dataTestIdPrefix: 'all-investments-total-range',
        className: 'gba:border-0 gba:shadow-none gba:p-0 gba:bg-transparent',
      }),
      hideSearch: true,
    },
    // Debt Financing range
    {
      id: "debtFinancingRange",
      title: "Debt Financing",
      filters: [],
      customComponent: React.createElement(ExpenseAmountRangeFilter, {
        amountRange: debtRange,
        onAmountRangeChange: setDebtRange,
        label: 'Debt Financing',
        dataTestIdPrefix: 'all-investments-debt-range',
        className: 'gba:border-0 gba:shadow-none gba:p-0 gba:bg-transparent',
      }),
      hideSearch: true,
    },
    // Forecasted Profit range
    {
      id: "forecastedProfitRange",
      title: "Forecasted Profit",
      filters: [],
      customComponent: React.createElement(ExpenseAmountRangeFilter, {
        amountRange: forecastRange,
        onAmountRangeChange: setForecastRange,
        label: 'Forecasted Profit',
        dataTestIdPrefix: 'all-investments-forecast-range',
        className: 'gba:border-0 gba:shadow-none gba:p-0 gba:bg-transparent',
      }),
      hideSearch: true,
    },
    // ISIN text
    {
      id: 'isin',
      title: 'ISIN',
      filters: [],
      customComponent: React.createElement('input', {
        value: isin,
        onChange: (e: any) => setIsin(e?.target?.value || ''),
        placeholder: 'Search ISIN',
        className: 'gba:w-full gba:h-8 gba:px-2 gba:text-sm gba:bg-gray-100/40 gba:rounded gba:border-none gba:outline-none',
        'data-testid': 'all-investments-isin-input'
      }),
      hideSearch: true,
    },
    // Fund Manager text
    {
      id: 'fundManager',
      title: 'Fund Manager',
      filters: [],
      customComponent: React.createElement('input', {
        value: fundManager,
        onChange: (e: any) => setFundManager(e?.target?.value || ''),
        placeholder: 'Search Fund Manager',
        className: 'gba:w-full gba:h-8 gba:px-2 gba:text-sm gba:bg-gray-100/40 gba:rounded gba:border-none gba:outline-none',
        'data-testid': 'all-investments-fund-manager-input'
      }),
      hideSearch: true,
    },
    // Stake % range
    {
      id: 'stakeRange',
      title: 'Stake %',
      filters: [],
      customComponent: React.createElement(ExpenseAmountRangeFilter, {
        amountRange: stakeRange,
        onAmountRangeChange: setStakeRange,
        label: 'Stake %',
        dataTestIdPrefix: 'all-investments-stake-range',
        className: 'gba:border-0 gba:shadow-none gba:p-0 gba:bg-transparent',
      }),
      hideSearch: true,
    },
    // Performance filter intentionally omitted (no server-side field)
  ], [investmentGroups, investmentTypes, investmentStatuses, employees, selectedFilters, createdAfter, createdBefore, searchEmployees, employeeOptions, loadingEmployees, employeeError]);

  // Debug logging
  useEffect(() => {
    console.log('🔍 Filter groups updated:', {
      totalGroups: filterGroups.length,
      groupsWithFilters: filterGroups.filter(g => g.filters.length > 0).length,
      filterGroups: filterGroups.map(g => ({ id: g.id, title: g.title, filterCount: g.filters.length }))
    });
  }, [filterGroups]);

  // Create filter label map for display
  const filterLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    filterGroups.forEach(group => {
      group.filters.forEach(filter => {
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
  const getFilters = useCallback((): AllInvestmentsFilters => {
    const filters: AllInvestmentsFilters = {
      createdAfter,
      createdBefore,
    };

    // Process selected filters by group
    selectedFilters.forEach((filterId) => {
      for (const group of filterGroups) {
        const filter = group.filters.find((f) => f.id === filterId);
        if (filter) {
          if (group.id === "investmentGroup") {
            if (!filters.investmentGroupIds) filters.investmentGroupIds = [];
            filters.investmentGroupIds.push(filter.value);
          } else if (group.id === "investmentType") {
            if (!filters.investmentTypeIds) filters.investmentTypeIds = [];
            filters.investmentTypeIds.push(filter.value);
          } else if (group.id === "investmentStatus") {
            if (!filters.investmentStatusIds) filters.investmentStatusIds = [];
            filters.investmentStatusIds.push(filter.value);
          } else if (group.id === "owner") {
            if (!filters.ownerEmployeeIds) filters.ownerEmployeeIds = [];
            filters.ownerEmployeeIds.push(filter.value);
          }
          break;
        }
      }
    });

    // Apply ranges
    if (initialRange?.min !== undefined) filters.initialInvestmentMinAmount = initialRange.min;
    if (initialRange?.max !== undefined) filters.initialInvestmentMaxAmount = initialRange.max;
    if (marketRange?.min !== undefined) filters.marketValueMinAmount = marketRange.min;
    if (marketRange?.max !== undefined) filters.marketValueMaxAmount = marketRange.max;
    if (totalRange?.min !== undefined) filters.totalInvestmentMinAmount = totalRange.min;
    if (totalRange?.max !== undefined) filters.totalInvestmentMaxAmount = totalRange.max;
    if (debtRange?.min !== undefined) filters.debtFinancingMinAmount = debtRange.min;
    if (debtRange?.max !== undefined) filters.debtFinancingMaxAmount = debtRange.max;
    if (forecastRange?.min !== undefined) filters.forecastedProfitMinAmount = forecastRange.min;
    if (forecastRange?.max !== undefined) filters.forecastedProfitMaxAmount = forecastRange.max;
    if (isin?.trim()) filters.isinContains = isin.trim();
    if (fundManager?.trim()) filters.fundManagerNameContains = fundManager.trim();
    if (stakeRange?.min !== undefined) filters.stakePercentageMin = stakeRange.min;
    if (stakeRange?.max !== undefined) filters.stakePercentageMax = stakeRange.max;
    // Performance filtering removed

    return filters;
  }, [selectedFilters, filterGroups, createdAfter, createdBefore, initialRange, marketRange, totalRange, debtRange, forecastRange, isin, fundManager, stakeRange]);

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
    createdAfter,
    createdBefore,
    setCreatedAfter,
    setCreatedBefore,
    initialRange,
    marketRange,
    totalRange,
    debtRange,
    forecastRange,
    isin,
    fundManager,
    stakeRange,
    setInitialRange,
    setMarketRange,
    setTotalRange,
    setDebtRange,
    setForecastRange,
    setIsin,
    setFundManager,
    setStakeRange,
  };
};
