import React, { useState, useEffect, useMemo, useRef } from "react";
import { DataContainer } from "@/components/layout/dataContainer";
import { useContactFilters } from "@/business-apps/crm/customers/apps/customer-relations/views/contact-view/hooks/useContactFilters";
import { useEmployeeContactsData } from "../../hooks/useEmployeeContactsData";
import { ContactsTable } from "./ContactsTable";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";

interface EmployeeContactsTabProps extends BusinessAppContextProps {
  employeeId: string;
  onTotalChange?: (total: number) => void;
}

export const EmployeeContactsTab: React.FC<EmployeeContactsTabProps> = ({
  employeeId,
  accessToken,
  onTotalChange,
}) => {
  // Filters and search
  const {
    search,
    setSearch,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    getFilters,
    addFilter,
    removeFilter,
    clearAllFilters,
    createdAfter,
    createdBefore,
    handleDateRangeChange,
  } = useContactFilters({ accessToken });

  // Pagination and sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC" | "">("DESC");

  // Map filter state to GraphQL where clause
  const filters = getFilters();
  const additionalFilters = useMemo(() => {
    const andConditions: any[] = [];
    if (filters.contactTypes && filters.contactTypes.length > 0) {
      andConditions.push({ contactType: { _in: filters.contactTypes } });
    }
    if (filters.jobTitles && filters.jobTitles.length > 0) {
      andConditions.push({ jobTitle: { _in: filters.jobTitles } });
    }
    if (filters.createdAfter) {
      andConditions.push({ createdAt: { _gte: filters.createdAfter } });
    }
    if (filters.createdBefore) {
      andConditions.push({ createdAt: { _lte: filters.createdBefore } });
    }
    return andConditions.length > 0 ? { _and: andConditions } : {};
  }, [filters]);

  // Data fetching
  const { contacts, total, loading, error, hasMore, loadPage, retry } =
    useEmployeeContactsData({
      employeeId,
      search,
      sortField,
      sortOrder: sortOrder as "ASC" | "DESC",
      accessToken,
    });

  // Initial and reactive data loading
  useEffect(() => {
    loadPage(currentPage, pageSize, additionalFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    employeeId,
    accessToken,
    search,
    sortField,
    sortOrder,
    currentPage,
    pageSize,
    JSON.stringify(additionalFilters),
  ]);

  // Report total to parent
  useEffect(() => {
    if (onTotalChange) {
      onTotalChange(total);
    }
  }, [total, onTotalChange]);

  // Handlers
  const handlePaginationChange = (page: number, newPageSize?: number) => {
    setCurrentPage(page);
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize);
    }
  };
  const handleSortingChange = (field: string, order: "ASC" | "DESC" | "") => {
    setSortField(field);
    setSortOrder(order as "ASC" | "DESC");
    setCurrentPage(1);
  };

  // Handler for DataController setFilter (bulk set)
  const handleSetFilter = (filters: string[]) => {
    // Remove all, then add each
    clearAllFilters();
    filters.forEach(addFilter);
    setCurrentPage(1);
  };

  // Handler for DataFilter onFilterChange (single toggle)
  const handleFilterChange = (filterId: string, selected: boolean) => {
    if (selected) {
      addFilter(filterId);
    } else {
      removeFilter(filterId);
    }
    setCurrentPage(1);
  };

  return (
    <DataContainer
      className="gba:-ml-4"
      dataControllerProps={{
        search,
        setSearch,
        filter: selectedFilters,
        setFilter: handleSetFilter,
        filterLabelMap,
        listTitle: (
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-lg gba:font-semibold">Contacts</span>
            <span className="gba:text-gray-500">({total})</span>
          </div>
        ),
      }}
      dataFilterProps={{
        filterGroups,
        onFilterChange: handleFilterChange,
      }}
      dataBody={
        <ContactsTable
          contacts={contacts}
          loading={loading}
          error={error}
          hasMore={hasMore}
          retry={retry}
          total={total}
          pageSize={pageSize}
          currentPage={currentPage}
          sortField={sortField}
          sortOrder={sortOrder as "ASC" | "DESC" | ""}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          accessToken={accessToken}
          employeeId={employeeId}
        />
      }
    />
  );
};
