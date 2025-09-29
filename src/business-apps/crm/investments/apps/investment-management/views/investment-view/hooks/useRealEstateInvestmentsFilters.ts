import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { DateRangeFilter } from '@/business-apps/crm/customers/apps/customer-relations/views/lead-view/components/DateRangeFilter';
import ExpenseAmountRangeFilter from '@/business-apps/fin/expenses/apps/personal-expenses/components/tabs/expense-items-tab/ExpenseAmountRangeFilter';

export interface RealEstateInvestmentsFilters {
  investmentGroupIds?: string[];
  investmentTypeIds?: string[];
  investmentStatusIds?: string[];
  ownerEmployeeIds?: string[];
  currencyIds?: string[];
  createdAfter?: string;
  createdBefore?: string;
  acquisitionDateFrom?: string;
  acquisitionDateTo?: string;
  exitDateFrom?: string;
  exitDateTo?: string;
  // Amount range filters for all 8 columns
  initialInvestmentMinAmount?: number;
  initialInvestmentMaxAmount?: number;
  marketValueMinAmount?: number;
  marketValueMaxAmount?: number;
  // Performance range filters
  performanceMinPercent?: number;
  performanceMaxPercent?: number;
  // Investment role filters
  investmentRoleTypes?: string[];
  // Owner assignment filters
  hasOwner?: boolean;
  // Real estate specialization filters
  realEstateLocalityContains?: string;
  realEstateBuildingYearMin?: number;
  realEstateBuildingYearMax?: number;
  realEstateOccupancyPercentMin?: number;
  realEstateOccupancyPercentMax?: number;
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
  customComponent?: React.ReactNode;
}

/**
 * Centralized filters hook for Real Estate Investments List
 * Following the pattern from AccountList filters
 */
export const useRealEstateInvestmentsFilters = (context: BusinessAppContextProps) => {
  const [search, setSearch] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  // Additional state for custom components
  const [createdAfter, setCreatedAfter] = useState<string | undefined>(undefined);
  const [createdBefore, setCreatedBefore] = useState<string | undefined>(undefined);
  const [acqAfter, setAcqAfter] = useState<string | undefined>(undefined);
  const [acqBefore, setAcqBefore] = useState<string | undefined>(undefined);
  const [exitAfter, setExitAfter] = useState<string | undefined>(undefined);
  const [exitBefore, setExitBefore] = useState<string | undefined>(undefined);
  const [locality, setLocality] = useState<string>('');
  const [buildingYearRange, setBuildingYearRange] = useState<{ min?: number; max?: number } | null>(null);
  const [occupancyRange, setOccupancyRange] = useState<{ min?: number; max?: number } | null>(null);

  // Catalog data state
  const [investmentTypes, setInvestmentTypes] = useState<Array<{id: string, label: string}>>([]);
  const [investmentStatuses, setInvestmentStatuses] = useState<Array<{id: string, label: string}>>([]);

  // Fetch catalog data using real MCP data
  useEffect(() => {
    const loadCatalogs = async () => {
      if (!context.accessToken) return;

      console.log('🔍 Loading real estate catalogs...');
      
      try {
        // Use real catalog data from MCP - focus on real estate types
        const realEstateTypes = [
          { id: "InvestmentType:v1:EXISTING_PROPERTY", label: "Existing Properties" },
          { id: "InvestmentType:v1:PROJECT_DEVELOPMENT", label: "Project Development" },
          { id: "InvestmentType:v1:MEZZANINE_LOANS", label: "Mezzanine Loans" },
          { id: "InvestmentType:v1:OTHER_REAL_ESTATE", label: "Others" }
        ];
        
        const hardcodedStatuses = [
          { id: "InvestmentStatus:v1:ACTIVE", label: "Active" },
          { id: "InvestmentStatus:v1:EXITED", label: "Exited" },
          { id: "InvestmentStatus:v1:ON_HOLD", label: "On Hold" }
        ];

        // Set the data
        setInvestmentTypes(realEstateTypes);
        setInvestmentStatuses(hardcodedStatuses);

        console.log('✅ Loaded real estate catalogs:', {
          types: realEstateTypes.length, 
          statuses: hardcodedStatuses.length
        });

        setFiltersInitialized(true);
      } catch (error) {
        console.error('Error loading real estate catalogs:', error);
        setFiltersInitialized(true); // Still allow the component to work
      }
    };

    loadCatalogs();
  }, [context.accessToken]);

  // Define filter groups for ALL 8 columns identified from the image
  const filterGroups: FilterGroup[] = useMemo(() => [
    // 1. Investment - searchable by name (handled by main search)
    // Created Date
    {
      id: 'creationDate',
      title: 'Created Date',
      filters: [],
      customComponent: React.createElement(DateRangeFilter, {
        createdAfter,
        createdBefore,
        onDateRangeChange: (after?: string, before?: string) => { setCreatedAfter(after); setCreatedBefore(before); }
      }),
      hideSearch: true,
    },
    
    // 2. Type column filter
    {
      id: "investmentType",
      title: "Property Type", 
      filters: (investmentTypes || []).map((type) => ({
        id: type.id,
        label: type.label,
        value: type.id,
        selected: selectedFilters.includes(type.id),
      })),
    },
    
    // 3. Initial Investment - amount range filter
    {
      id: "initialInvestmentRange",
      title: "Initial Investment Range",
      filters: [
        { id: "initial_0_1M", label: "€0 - €1M", value: "0-1000000", selected: selectedFilters.includes("initial_0_1M") },
        { id: "initial_1M_5M", label: "€1M - €5M", value: "1000000-5000000", selected: selectedFilters.includes("initial_1M_5M") },
        { id: "initial_5M_10M", label: "€5M - €10M", value: "5000000-10000000", selected: selectedFilters.includes("initial_5M_10M") },
        { id: "initial_10M_plus", label: "€10M+", value: "10000000-999999999", selected: selectedFilters.includes("initial_10M_plus") },
      ],
    },
    
    // 4. Market Value - amount range filter  
    {
      id: "marketValueRange",
      title: "Market Value Range",
      filters: [
        { id: "market_0_5M", label: "€0 - €5M", value: "0-5000000", selected: selectedFilters.includes("market_0_5M") },
        { id: "market_5M_15M", label: "€5M - €15M", value: "5000000-15000000", selected: selectedFilters.includes("market_5M_15M") },
        { id: "market_15M_25M", label: "€15M - €25M", value: "15000000-25000000", selected: selectedFilters.includes("market_15M_25M") },
        { id: "market_25M_plus", label: "€25M+", value: "25000000-999999999", selected: selectedFilters.includes("market_25M_plus") },
      ],
    },
    
    // 5. Performance - percentage range filter
    {
      id: "performanceRange", 
      title: "Performance Range",
      filters: [
        { id: "perf_negative", label: "Negative", value: "-999-0", selected: selectedFilters.includes("perf_negative") },
        { id: "perf_0_100", label: "0% - 100%", value: "0-100", selected: selectedFilters.includes("perf_0_100") },
        { id: "perf_100_200", label: "100% - 200%", value: "100-200", selected: selectedFilters.includes("perf_100_200") },
        { id: "perf_200_plus", label: "200%+", value: "200-999", selected: selectedFilters.includes("perf_200_plus") },
      ],
    },
    
    // 6. Acquisition Date - date range filter
    {
      id: "acquisitionDate",
      title: "Acquisition Date",
      filters: [],
      customComponent: React.createElement(DateRangeFilter, {
        createdAfter: acqAfter,
        createdBefore: acqBefore,
        onDateRangeChange: (after?: string, before?: string) => { setAcqAfter(after); setAcqBefore(before); }
      }),
      hideSearch: true,
    },

    // Exit Date - date range filter
    {
      id: 'exitDate',
      title: 'Exit Date',
      filters: [],
      customComponent: React.createElement(DateRangeFilter, {
        createdAfter: exitAfter,
        createdBefore: exitBefore,
        onDateRangeChange: (after?: string, before?: string) => { setExitAfter(after); setExitBefore(before); }
      }),
      hideSearch: true,
    },
    
    // 7. Investment Role - role type filter
    {
      id: "investmentRole",
      title: "Investment Role",
      filters: [
        { id: "role_lead", label: "Lead Investor", value: "LEAD", selected: selectedFilters.includes("role_lead") },
        { id: "role_co", label: "Co-Investor", value: "CO_INVESTOR", selected: selectedFilters.includes("role_co") },
        { id: "role_minority", label: "Minority", value: "MINORITY", selected: selectedFilters.includes("role_minority") },
        { id: "role_na", label: "N/A", value: "NA", selected: selectedFilters.includes("role_na") },
      ],
    },
    
    // 8. Owner - owner employee filter (currently empty due to null owners)
    {
      id: "owner",
      title: "Owner",
      filters: [
        { id: "owner_assigned", label: "Assigned Owner", value: "HAS_OWNER", selected: selectedFilters.includes("owner_assigned") },
        { id: "owner_unassigned", label: "Unassigned", value: "NO_OWNER", selected: selectedFilters.includes("owner_unassigned") },
      ],
    },
    
    // Investment Status filter
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
    // Location (Locality)
    {
      id: 'location',
      title: 'Location',
      filters: [],
      customComponent: React.createElement('input', {
        value: locality,
        onChange: (e: any) => setLocality(e?.target?.value || ''),
        placeholder: 'Search location',
      }),
      hideSearch: true,
    },
    // Building Year (numeric range)
    {
      id: 'buildingYearRange',
      title: 'Building Year',
      filters: [],
      customComponent: React.createElement(ExpenseAmountRangeFilter, {
        amountRange: buildingYearRange,
        onAmountRangeChange: setBuildingYearRange,
        label: 'Building Year',
        dataTestIdPrefix: 'real-estate-building-year'
      }),
      hideSearch: true,
    },
    // Occupancy % (numeric range)
    {
      id: 'occupancyRange',
      title: 'Occupancy %',
      filters: [],
      customComponent: React.createElement(ExpenseAmountRangeFilter, {
        amountRange: occupancyRange,
        onAmountRangeChange: setOccupancyRange,
        label: 'Occupancy %',
        dataTestIdPrefix: 'real-estate-occupancy'
      }),
      hideSearch: true,
    },
  ], [investmentTypes, investmentStatuses, selectedFilters, createdAfter, createdBefore, acqAfter, acqBefore, exitAfter, exitBefore, locality, buildingYearRange, occupancyRange]);

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
  const getFilters = useCallback((): RealEstateInvestmentsFilters => {
    const filters: RealEstateInvestmentsFilters = {};

    // Always filter for real estate investments
    filters.investmentGroupIds = ["InvestmentGroup:v1:REAL_ESTATE"];

    (selectedFilters || []).forEach((filterId) => {
      // Find which filter group this filter belongs to
      for (const group of (filterGroups || [])) {
        const filter = (group.filters || []).find((f) => f.id === filterId);
        if (filter) {
          switch (group.id) {
            case "investmentType":
              if (!filters.investmentTypeIds) filters.investmentTypeIds = [];
              filters.investmentTypeIds.push(filter.value);
              break;
            case "investmentStatus":
              if (!filters.investmentStatusIds) filters.investmentStatusIds = [];
              filters.investmentStatusIds.push(filter.value);
              break;
            case "initialInvestmentRange":
              // Handle initial investment amount ranges
              const [minInitial, maxInitial] = filter.value.split('-').map(Number);
              filters.initialInvestmentMinAmount = minInitial;
              filters.initialInvestmentMaxAmount = maxInitial;
              break;
            case "marketValueRange":
              // Handle market value amount ranges
              const [minMarket, maxMarket] = filter.value.split('-').map(Number);
              filters.marketValueMinAmount = minMarket;
              filters.marketValueMaxAmount = maxMarket;
              break;
            case "performanceRange":
              // Handle performance percentage ranges
              const [minPerf, maxPerf] = filter.value.split('-').map(Number);
              filters.performanceMinPercent = minPerf;
              filters.performanceMaxPercent = maxPerf;
              break;
            case "investmentRole":
              if (!filters.investmentRoleTypes) filters.investmentRoleTypes = [];
              filters.investmentRoleTypes.push(filter.value);
              break;
            case "owner":
              if (filter.value === "HAS_OWNER") {
                filters.hasOwner = true;
              } else if (filter.value === "NO_OWNER") {
                filters.hasOwner = false;
              }
              break;
            // Date filters handled by DataContainer dateRange
          }
          break;
        }
      }
    });

    // Additional state-based filters
    if (createdAfter) filters.createdAfter = createdAfter;
    if (createdBefore) filters.createdBefore = createdBefore;
    if (acqAfter) filters.acquisitionDateFrom = acqAfter;
    if (acqBefore) filters.acquisitionDateTo = acqBefore;
    if (exitAfter) filters.exitDateFrom = exitAfter;
    if (exitBefore) filters.exitDateTo = exitBefore;
    if (locality.trim()) filters.realEstateLocalityContains = locality.trim();
    if (buildingYearRange?.min !== undefined) filters.realEstateBuildingYearMin = buildingYearRange.min;
    if (buildingYearRange?.max !== undefined) filters.realEstateBuildingYearMax = buildingYearRange.max;
    if (occupancyRange?.min !== undefined) filters.realEstateOccupancyPercentMin = occupancyRange.min;
    if (occupancyRange?.max !== undefined) filters.realEstateOccupancyPercentMax = occupancyRange.max;

    return filters;
  }, [selectedFilters, filterGroups, createdAfter, createdBefore, acqAfter, acqBefore, exitAfter, exitBefore, locality, buildingYearRange, occupancyRange]);

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
