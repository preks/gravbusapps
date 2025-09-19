import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';

export interface LiquidFundInvestmentsFilters {
  investmentGroupIds?: string[];
  investmentTypeIds?: string[];
  investmentStatusIds?: string[];
  ownerEmployeeIds?: string[];
  currencyIds?: string[];
  acquisitionDateFrom?: string;
  acquisitionDateTo?: string;
  liquidFundBankAccountContains?: string;
  liquidFundEarlyTermination?: boolean;
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
 * Centralized filters hook for Liquid Fund Investments List
 * Following the pattern from AccountList filters
 */
export const useLiquidFundInvestmentsFilters = (context: BusinessAppContextProps) => {
  const [search, setSearch] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  // Catalog data state
  const [investmentTypes, setInvestmentTypes] = useState<Array<{id: string, label: string}>>([]);
  const [investmentStatuses, setInvestmentStatuses] = useState<Array<{id: string, label: string}>>([]);
  const [employees, setEmployees] = useState<Array<{id: string, label: string}>>([]);
  const [accountNumberText, setAccountNumberText] = useState<string>('');

  const graphqlClient = useGraphQLClient(context.accessToken);

  // Fetch catalog data
  useEffect(() => {
    const loadCatalogs = async () => {
      if (!context.accessToken) return;

      console.log('🔍 Loading liquid fund catalogs...');
      
      try {
        // Use real catalog data for liquid fund specific filters
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

        // Fetch employees using GraphQL client
        const employeesQuery = `
          query GetEmployeesForOwnerFilter {
            Employee(
              where: { isDeleted: { _eq: false } }
              limit: 20
              orderBy: [{ displayName: ASC }]
            ) {
              id
              displayName
              firstName
              lastName
            }
          }
        `;
        
        await graphqlClient.request<{ Employee: any[] }>(employeesQuery);

        // Set the data with proper error handling
        setInvestmentTypes(hardcodedTypes || []);
        setInvestmentStatuses(hardcodedStatuses || []);

        // Since Employee table is empty, don't provide employee filters for now
        // This prevents GraphQL errors with invalid UUIDs
        setEmployees([]);

        console.log('✅ Loaded liquid fund catalogs:', {
          types: hardcodedTypes.length, 
          statuses: hardcodedStatuses.length,
          employees: 0
        });

        setFiltersInitialized(true);
      } catch (error) {
        console.error('Error loading liquid fund catalogs:', error);
        setFiltersInitialized(true); // Still allow the component to work
      }
    };

    loadCatalogs();
  }, [context.accessToken, graphqlClient]);

  // Define filter groups that match visible columns for liquid fund
  const filterGroups: FilterGroup[] = useMemo(() => [
    {
      id: "investmentType",
      title: "Fund Type",
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
    },
    {
      id: "creationDate",
      title: "Creation Date",
      filters: [],
      hideSearch: true,
    },
    // Account Number (text)
    {
      id: "accountNumber",
      title: "Account Number",
      filters: [],
      customComponent: React.createElement('input', {
        value: accountNumberText,
        onChange: (e: any) => setAccountNumberText(e?.target?.value || ''),
        placeholder: 'Search Account Number',
      }),
      hideSearch: true,
    },
    // Early Termination (boolean)
    {
      id: "earlyTermination",
      title: "Early Termination",
      filters: [
        { id: 'early_yes', label: 'Allowed', value: 'true', selected: selectedFilters.includes('early_yes') },
        { id: 'early_no', label: 'Not Allowed', value: 'false', selected: selectedFilters.includes('early_no') },
      ] as any,
    },
  ], [investmentTypes, investmentStatuses, employees, selectedFilters, accountNumberText]);

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
  const getFilters = useCallback((): LiquidFundInvestmentsFilters => {
    const filters: LiquidFundInvestmentsFilters = {};

    // Always filter for liquid fund investments
    filters.investmentGroupIds = ["InvestmentGroup:v1:LIQUID_FUND"];

    // Process selected filters by group with null checks
    (selectedFilters || []).forEach((filterId) => {
      for (const group of (filterGroups || [])) {
        const filter = (group.filters || []).find((f) => f.id === filterId);
        if (filter) {
          if (group.id === "investmentType") {
            if (!filters.investmentTypeIds) filters.investmentTypeIds = [];
            filters.investmentTypeIds.push(filter.value);
          } else if (group.id === "investmentStatus") {
            if (!filters.investmentStatusIds) filters.investmentStatusIds = [];
            filters.investmentStatusIds.push(filter.value);
          } else if (group.id === "owner") {
            if (!filters.ownerEmployeeIds) filters.ownerEmployeeIds = [];
            filters.ownerEmployeeIds.push(filter.value);
          } else if (group.id === 'earlyTermination') {
            filters.liquidFundEarlyTermination = filter.value === 'true';
          }
          break;
        }
      }
    });

    if ((accountNumberText || '').trim()) {
      filters.liquidFundBankAccountContains = (accountNumberText || '').trim();
    }

    return filters;
  }, [selectedFilters, filterGroups, accountNumberText]);

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
