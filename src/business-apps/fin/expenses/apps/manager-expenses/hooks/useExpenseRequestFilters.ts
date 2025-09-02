import { useState, useMemo, useCallback, useEffect } from "react";
import type { DataFilterGroup, DataFilter } from "@/components/data-filter";
import { ExpenseStatus } from "../utils";
import { useDebounce } from "@/common/hooks/useDebounce";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useExpenseRequestCurrencies } from "./useExpenseRequestCurrencies";

export interface UseExpenseRequestFiltersProps {
  accessToken?: string;
  managerId?: string;
  userInfo?: any;
  onCurrencyChange?: (currency: string) => void;
}

export interface UseExpenseRequestFiltersReturn {
  search: string;
  setSearch: (term: string) => void;
  debouncedSearch: string;
  selectedFilters: string[];
  filterGroups: DataFilterGroup[];
  filterLabelMap: Record<string, string>;
  addFilter: (filterId: string) => void;
  removeFilter: (filterId: string) => void;
  getFilters: () => Record<string, any>;
  handleDataFilterChange: (filterId: string, selected: boolean) => void;
  primaryCurrency: string | null;
  setCurrencyFilter: (currency: string) => void;
  mostUsedCurrency: string | null;
  availableCurrencies: string[];
  currenciesLoading: boolean;
  currenciesInitialized: boolean;
  resetCurrencySelection: () => void;
}

const availableFilterStatuses: ExpenseStatus[] = [
  ExpenseStatus.CREATED,
  ExpenseStatus.PENDING,
  ExpenseStatus.APPROVED,
  ExpenseStatus.REJECTED,
  ExpenseStatus.VERIFIED,
  ExpenseStatus.BOOKED,
  ExpenseStatus.TRANSFERRED,
  ExpenseStatus.DISCARDED,
];

export const useExpenseRequestFilters = ({
  accessToken,
  managerId,
  userInfo,
  onCurrencyChange,
}: UseExpenseRequestFiltersProps = {}): UseExpenseRequestFiltersReturn => {
  const [search, setSearch] = useState<string>("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  const [localPrimaryCurrency, setLocalPrimaryCurrency] = useState<
    string | null
  >(null);
  const [localMostUsedCurrency, setLocalMostUsedCurrency] = useState<
    string | null
  >(null);
  const [userHasManuallySelectedCurrency, setUserHasManuallySelectedCurrency] =
    useState<boolean>(false);

  const contextProps: BusinessAppContextProps = {
    accessToken: accessToken || "",
    userInfo: userInfo || null,
  };

  const {
    mostUsedCurrency: detectedCurrency,
    isLoading: currenciesLoading,
    error: currenciesError,
  } = useExpenseRequestCurrencies(contextProps, managerId || "");

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (detectedCurrency && !currenciesLoading) {
      setLocalMostUsedCurrency(detectedCurrency);

      if (!userHasManuallySelectedCurrency && localPrimaryCurrency === null) {
        setLocalPrimaryCurrency(detectedCurrency);
      }
    }
  }, [
    detectedCurrency,
    currenciesLoading,
    userHasManuallySelectedCurrency,
    localPrimaryCurrency,
  ]);

  useEffect(() => {}, [localPrimaryCurrency]);

  useEffect(() => {
    if (localPrimaryCurrency && onCurrencyChange) {
      onCurrencyChange(localPrimaryCurrency);
    }
  }, [localPrimaryCurrency, onCurrencyChange]);

  const availableCurrencies = useMemo(() => {
    const currencies = new Set<string>();

    if (localMostUsedCurrency) {
      currencies.add(localMostUsedCurrency);
    }

    currencies.add("EUR");
    currencies.add("USD");
    currencies.add("GBP");
    currencies.add("RON");

    return Array.from(currencies);
  }, [localMostUsedCurrency]);

  const handleDataFilterChange = useCallback(
    (filterId: string, selected: boolean) => {
      if (filterId.startsWith("currency:")) {
        const currency = filterId.replace("currency:", "");

        if (selected) {
          setLocalPrimaryCurrency(currency);
          setUserHasManuallySelectedCurrency(true);
        } else {
          setLocalPrimaryCurrency(localMostUsedCurrency || "EUR");
          setUserHasManuallySelectedCurrency(false);
        }
      } else {
        setSelectedFilters((prev) => {
          if (selected) {
            return [...prev, filterId];
          } else {
            return prev.filter((f) => f !== filterId);
          }
        });
      }
    },
    [localMostUsedCurrency]
  );

  const filterLabelMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    availableFilterStatuses.forEach((status) => {
      switch (status) {
        case ExpenseStatus.CREATED:
          map[status] = "Draft (Created)";
          break;
        case ExpenseStatus.PENDING:
          map[status] = "In Approval (Pending)";
          break;
        case ExpenseStatus.APPROVED:
          map[status] = "Approved";
          break;
        case ExpenseStatus.REJECTED:
          map[status] = "Revision Required (Rejected)";
          break;
        case ExpenseStatus.VERIFIED:
          map[status] = "In Transit (Verified)";
          break;
        case ExpenseStatus.BOOKED:
          map[status] = "In Transit (Booked)";
          break;
        case ExpenseStatus.TRANSFERRED:
          map[status] = "Transferred";
          break;
        case ExpenseStatus.DISCARDED:
          map[status] = "Discarded";
          break;
        default:
          map[status] = status;
      }
    });
    return map;
  }, []);

  const filterGroups = useMemo<DataFilterGroup[]>(() => {
    // Status filters
    const statusItems: DataFilter[] = availableFilterStatuses.map((status) => ({
      id: status,
      label: filterLabelMap[status],
      selected: selectedFilters.includes(status),
      group: "statusGroup",
    }));

    const currencyItems: DataFilter[] = (
      availableCurrencies.length > 0 ? availableCurrencies : ["EUR", "USD"]
    ).map((currency) => ({
      id: `currency:${currency}`,
      label: currency,
      selected: currency === (localPrimaryCurrency || "EUR"),
      group: "currencyGroup",
    }));

    return [
      {
        id: "statusGroup",
        title: "Status",
        filters: statusItems,
        selectionMode: "multiple",
      },
      {
        id: "currencyGroup",
        title: "Currency",
        filters: currencyItems,
        selectionMode: "single",
      },
    ];
  }, [
    availableFilterStatuses,
    filterLabelMap,
    selectedFilters,
    availableCurrencies,
    localPrimaryCurrency,
  ]);

  const resetCurrencySelection = useCallback(() => {
    setUserHasManuallySelectedCurrency(false);
    setLocalPrimaryCurrency("EUR");
  }, []);

  const addFilter = useCallback(
    (filterId: string) => {
      handleDataFilterChange(filterId, true);
    },
    [handleDataFilterChange]
  );

  const removeFilter = useCallback(
    (filterId: string) => {
      handleDataFilterChange(filterId, false);
    },
    [handleDataFilterChange]
  );

  const returnPrimaryCurrency = useMemo(() => {
    const currency = localPrimaryCurrency || "EUR";

    return currency;
  }, [localPrimaryCurrency]);

  return {
    search,
    setSearch,
    debouncedSearch,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    primaryCurrency: returnPrimaryCurrency,
    mostUsedCurrency: localMostUsedCurrency,
    availableCurrencies: availableCurrencies,
    currenciesLoading,
    currenciesInitialized: !currenciesError,
    handleDataFilterChange,
    setCurrencyFilter: setLocalPrimaryCurrency,
    resetCurrencySelection,
    getFilters: useCallback(() => {
      const filters: Record<string, any> = {};

      if (selectedFilters.length > 0) {
        filters.status = selectedFilters;
      }

      if (localPrimaryCurrency) {
        filters.currency = `Currency:v1:${localPrimaryCurrency}`;
      }

      return filters;
    }, [selectedFilters, localPrimaryCurrency]),
  };
};
