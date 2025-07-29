import { useState, useEffect, useMemo, useCallback } from "react";

interface Employee {
  id: string;
  name: string;
}

interface UseExpenseRequestFiltersProps {
  searchEmployees: (searchText: string) => Promise<Employee[]>;
  handleEmployeeFilter: (filter: string) => void;
  handleStatusFilter: (filter: string) => void;
  handleAmountFilter: (min: string, max: string) => void;
  amountMinFilter: string;
  amountMaxFilter: string;
  availableStatuses: string[];
}

export const useExpenseRequestFilters = ({
  searchEmployees,
  handleEmployeeFilter,
  handleStatusFilter,
  handleAmountFilter,
  amountMinFilter,
  amountMaxFilter,
  availableStatuses,
}: UseExpenseRequestFiltersProps) => {
  // Employee filter state
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [employeeSearchText, setEmployeeSearchText] = useState("");
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [employeeSearchResults, setEmployeeSearchResults] = useState<
    Employee[]
  >([]);
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);

  // Status filter state
  const [statusFilter, setStatusFilter] = useState<string[]>(["BOOKED"]);

  // Amount filter state
  const [localAmountMin, setLocalAmountMin] = useState(amountMinFilter);
  const [localAmountMax, setLocalAmountMax] = useState(amountMaxFilter);

  // Debounced search function
  const debouncedSearchEmployees = useMemo(() => {
    let timeout: NodeJS.Timeout;
    return async (searchText: string) => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        if (searchText.trim().length >= 2) {
          setEmployeeSearchLoading(true);
          try {
            const results = await searchEmployees(searchText);
            setEmployeeSearchResults(results);
          } catch (error) {
            console.error("Error searching employees:", error);
            setEmployeeSearchResults([]);
          } finally {
            setEmployeeSearchLoading(false);
          }
        } else {
          setEmployeeSearchResults([]);
        }
      }, 300);
    };
  }, [searchEmployees]);

  // Debounced amount filter
  const debouncedAmountFilter = useMemo(() => {
    let timeout: NodeJS.Timeout;
    return (min: string, max: string) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        handleAmountFilter(min, max);
      }, 500);
    };
  }, [handleAmountFilter]);

  // Update local amount filters when props change
  useEffect(() => {
    setLocalAmountMin(amountMinFilter);
    setLocalAmountMax(amountMaxFilter);
  }, [amountMinFilter, amountMaxFilter]);

  // Status filter change handler
  const handleStatusFilterChange = useCallback(
    (status: string, selected: boolean) => {
      const newStatusFilter = selected
        ? [...statusFilter, status]
        : statusFilter.filter((s) => s !== status);

      setStatusFilter(newStatusFilter);
      handleStatusFilter(newStatusFilter.join(","));
    },
    [statusFilter, handleStatusFilter]
  );

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setEmployeeFilter("");
    setSelectedEmployees([]);
    setEmployeeSearchText("");
    setStatusFilter([]);
    setLocalAmountMin("");
    setLocalAmountMax("");

    handleEmployeeFilter("");
    handleStatusFilter("");
    handleAmountFilter("", "");
  }, [handleEmployeeFilter, handleStatusFilter, handleAmountFilter]);

  return {
    // Employee filter
    employeeFilter,
    setEmployeeFilter,
    employeeSearchText,
    setEmployeeSearchText,
    showEmployeeDropdown,
    setShowEmployeeDropdown,
    employeeSearchResults,
    employeeSearchLoading,
    selectedEmployees,
    setSelectedEmployees,
    debouncedSearchEmployees,

    // Status filter
    statusFilter,
    setStatusFilter,
    handleStatusFilterChange,

    // Amount filter
    localAmountMin,
    setLocalAmountMin,
    localAmountMax,
    setLocalAmountMax,
    debouncedAmountFilter,

    // Clear filters
    clearAllFilters,
  };
};
