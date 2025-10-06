import { useState, useCallback, useMemo, useEffect } from "react";
import type { DataFilterGroup, DataFilter } from "@/components/data-filter/DataFilter";
import { useDebounce } from "@/common/hooks/useDebounce";
import { ExpenseStatus, getAdvancePaymentStatusDisplay } from "../utils";
import { useCurrencyStore } from "../store/useCurrencyStore";
import { useAdvancePaymentCurrencies } from "./useAdvancePaymentCurrencies";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";

export interface UseAdvancePaymentFiltersProps {
  accessToken?: string;
  managerId?: string;
}

export interface UseAdvancePaymentFiltersReturn {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  debouncedSearchTerm: string;
  statusFilter: string[] | null;
  setStatusFilter: (status: string[] | null) => void;
  filterGroups: DataFilterGroup[];
  handleDataFilterChange: (filterId: string, selected: boolean) => void;
  filterLabelMap: Record<string, string>;
  // Currency filter related properties
  currencyFilter: string;
  setCurrencyFilter: (currency: string) => void;
  // Loading state for currency data
  currenciesLoading: boolean;
  // Initialization flag (set true once filter data is ready)
  filtersInitialized: boolean;
}

export const useAdvancePaymentFilters = ({
  accessToken,
  managerId,
}: UseAdvancePaymentFiltersProps = {}): UseAdvancePaymentFiltersReturn => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  // No default filter - show all advance payments initially
  const [statusFilter, setStatusFilter] = useState<string[] | null>(null);
  // Local primary currency for advance payments (independent from global store)
  const [localPrimaryCurrency, setLocalPrimaryCurrency] = useState<string>("");
  const [userHasSelectedCurrency, setUserHasSelectedCurrency] = useState(false);
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  // Use the global currency store with enhanced properties
  const {
    primaryCurrency,
    setPrimaryCurrency,
    setUserSelected,
    mostUsedCurrency,
    isInitialized: storeInitialized,
  } = useCurrencyStore();

  // Fetch dynamic currency data if accessToken and managerId are provided
  const {
    availableCurrencies: dynamicCurrencies,
    mostUsedCurrency: advancePaymentMostUsedCurrency,
    isLoading: currenciesLoading,
    isInitialized: currenciesInitialized,
  } = useAdvancePaymentCurrencies({
    accessToken: accessToken || "",
    managerId: managerId || "",
  });

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Set local primary currency from advance payment's most used currency
  useEffect(() => {
    if (advancePaymentMostUsedCurrency && !userHasSelectedCurrency) {
      setLocalPrimaryCurrency(advancePaymentMostUsedCurrency);
    }
  }, [advancePaymentMostUsedCurrency, userHasSelectedCurrency]);

  // Mark filters as initialized once currency data is ready
  useEffect(() => {
    if (!filtersInitialized && !currenciesLoading && currenciesInitialized) {
      setFiltersInitialized(true);
    }
  }, [filtersInitialized, currenciesLoading, currenciesInitialized]);

  // Fallback: initialize filters when no credentials to avoid deadlock
  useEffect(() => {
    if (!filtersInitialized && (!accessToken || !managerId)) {
      setFiltersInitialized(true);
    }
  }, [filtersInitialized, accessToken, managerId]);

  const handleStatusFilterChange = useCallback(
    (newStatus: string[] | null) => {
      if (newStatus === null || newStatus.length === 0) {
        setStatusFilter(null);
      } else {
        setStatusFilter(newStatus);
      }
    },
    [setStatusFilter],
  );

  const handleDataFilterChange = useCallback(
    (filterId: string, isSelected: boolean) => {
      // Check if filterId is a currency (will be in dynamicCurrencies)
      if (dynamicCurrencies.includes(filterId)) {
        // Handle currency filter selection
        if (isSelected) {
          setLocalPrimaryCurrency(filterId);
          setUserHasSelectedCurrency(true); // Mark this as a user selection
          setPrimaryCurrency(filterId); // Also update global store
          setUserSelected(true);
        }
        return;
      }

      // Handle status filters
      const currentFilters = statusFilter || [];

      if (isSelected) {
        // Add the filter
        const newFilters = [...currentFilters, filterId];
        handleStatusFilterChange(newFilters);
      } else {
        // Remove the filter
        const newFilters = currentFilters.filter((id) => id !== filterId);
        handleStatusFilterChange(newFilters.length > 0 ? newFilters : null);
      }
    },
    [statusFilter, handleStatusFilterChange, setPrimaryCurrency, setUserSelected, dynamicCurrencies],
  );

  // Define the statuses that should be used for filtering with the correct mappings
  // Include all relevant statuses from the ExpenseStatus enum to match backend values
  const availableFilterStatuses: ExpenseStatus[] = [
    ExpenseStatus.PREPARED,
    ExpenseStatus.CREATED,
    ExpenseStatus.ASSIGNED,
    ExpenseStatus.PENDING,
    ExpenseStatus.APPROVED,
    ExpenseStatus.RETURNED,
    ExpenseStatus.REJECTED,
    ExpenseStatus.VERIFIED,
    ExpenseStatus.BOOKED,
    ExpenseStatus.PAID,
    ExpenseStatus.CLOSED,
    ExpenseStatus.DISCARDED,
    ExpenseStatus.TRANSFERRED,
  ];

  // Create a mapping of filter IDs to their display labels
  const filterLabelMap = useMemo(() => {
    const map: Record<string, string> = {};

    // Add status filters - use the getAdvancePaymentStatusDisplay function for consistent translated labels
    for (const status of availableFilterStatuses) {
      const display = getAdvancePaymentStatusDisplay(status);
      map[status] = display.label;
    }

    // Add currency filters from dynamic data
    for (const currency of dynamicCurrencies) {
      map[currency] = currency;
    }

    return map;
  }, [availableFilterStatuses, dynamicCurrencies]);

  // Create filter groups for the DataFilter component
  const filterGroups = useMemo<DataFilterGroup[]>(() => {
    // Status filter items
    const statusItems: DataFilter[] = availableFilterStatuses.map((status) => ({
      id: status,
      label: filterLabelMap[status],
      selected: statusFilter ? statusFilter.includes(status) : false,
      group: "statusGroup",
    }));

    // Use dynamic currency options from actual data
    const currencyItems: DataFilter[] = [];
    for (const currency of dynamicCurrencies) {
      currencyItems.push({
        id: currency,
        label: currency,
        selected: currency === localPrimaryCurrency,
        group: "currencyGroup",
      });
    }

    return [
      {
        id: "statusGroup",
        title: getTranslationFromI18nKeyAndLabel(
          "lowcoder:expense_request_list.expense_plan_table.status",
          "Status",
        ),
        filters: statusItems,
        selectionMode: "multiple",
      },
      {
        id: "currencyGroup",
        title: getTranslationFromI18nKeyAndLabel(
          "lowcoder:expense_calculation_rule.expense_table.currency",
          "Currency",
        ),
        filters: currencyItems,
        selectionMode: "single",
      },
    ];
  }, [
    availableFilterStatuses,
    statusFilter,
    filterLabelMap,
    localPrimaryCurrency,
    dynamicCurrencies,
    currenciesInitialized,
  ]);

  // Unified currency setter that updates all related states (local + global)
  const setUnifiedCurrency = useCallback(
    (currency: string) => {
      setLocalPrimaryCurrency(currency);
      setUserHasSelectedCurrency(true); // Mark as user selection
      setPrimaryCurrency(currency); // Update global store
      setUserSelected(true); // Mark global store as user-selected
    },
    [setPrimaryCurrency, setUserSelected],
  );

  return {
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    statusFilter,
    setStatusFilter,
    filterGroups,
    handleDataFilterChange,
    filterLabelMap,
    currencyFilter: localPrimaryCurrency,
    setCurrencyFilter: setUnifiedCurrency,
    currenciesLoading,
    filtersInitialized,
  };
};
