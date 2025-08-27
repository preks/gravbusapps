import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { DataContainer } from "@/components/layout/dataContainer";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useContactListData } from "./hooks/useContactListData";
import { useContactStatisticsWithTrend } from "./hooks/useContactStatisticsWithTrend";
import { useContactFilters } from "./hooks/useContactFilters";
import { ContactStatisticsWithTrend } from "./components/ContactStatistics";
import ContactTable from "./components/ContactTable";
import { Contact } from "./types";
import {
  ColumnVisibilityDropdown,
  ColumnConfig,
} from "./components/ColumnVisibilityDropdown";
import { Alert } from "antd";
import { startProcess } from "@/common/utils/start-process";
import { useProcessCompletion } from "@/common/hooks/useProcessCompletion";

interface ContactListProps extends BusinessAppContextProps {
  sourceApp?: string;
}

const ContactList: React.FC<ContactListProps> = (context) => {
  const { sourceApp } = context;

  // State management
  const [selectedContactId, setSelectedContactId] = useState<
    string | undefined
  >(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const initialLoadDone = useRef(false);

  // Define available columns with default visibility
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(() => [
    { id: "actions", label: "Actions", visible: true, disabled: true }, // Always visible
    { id: "name", label: "Name", visible: true },
    { id: "contact", label: "Contact Info", visible: true },
    { id: "company", label: "Company", visible: true },
    { id: "role", label: "Role", visible: true },
    { id: "type", label: "Type", visible: true },
    { id: "created", label: "Creation Date", visible: true },
    { id: "owner", label: "Owner", visible: true },
    { id: "academicTitle", label: "Academic Title", visible: false },
    { id: "birthDate", label: "Birth Date", visible: false },
    { id: "account", label: "Account", visible: false },
    { id: "linkedin", label: "LinkedIn Profile", visible: false },
    { id: "xing", label: "Xing Profile", visible: false },
    { id: "jobTitle", label: "Job Title", visible: false },
    { id: "department", label: "Department", visible: false },
  ]);

  // Get visible columns for passing to table
  const visibleColumns = columnConfig
    .filter((col) => col.visible)
    .map((col) => col.id);

  // Handle column visibility change
  const handleColumnVisibilityChange = useCallback(
    (columnId: string, visible: boolean) => {
      setColumnConfig((prev) =>
        prev.map((col) => (col.id === columnId ? { ...col, visible } : col))
      );
    },
    []
  );

  // Filters
  const contactFilters = useContactFilters(context);
  const appliedFilters = contactFilters.getFilters();
  const { filtersInitialized } = contactFilters;

  // Filter groups based on visible columns
  const visibleFilterGroups = useMemo(() => {
    const columnToFilterMap: Record<string, string> = {
      role: "contactRole",
      type: "contactType",
      department: "departments",
      // Note: name, contact, company, created, owner, academicTitle, birthDate, account, linkedin, xing, jobTitle don't have corresponding filters yet
    };

    return contactFilters.filterGroups.filter((group) => {
      // Find the column that corresponds to this filter group
      const correspondingColumn = Object.keys(columnToFilterMap).find(
        (columnId) => columnToFilterMap[columnId] === group.id
      );

      // If there's no corresponding column (shouldn't happen), show the filter
      // If there is a corresponding column, only show the filter if the column is visible
      return (
        !correspondingColumn || visibleColumns.includes(correspondingColumn)
      );
    });
  }, [contactFilters.filterGroups, visibleColumns]);

  // Data hooks
  const contactListData = useContactListData({
    search: appliedFilters.search,
    sortField,
    sortOrder,
    context: context,
    sourceApp,
    contactTypes: appliedFilters.contactTypes,
    jobTitles: appliedFilters.jobTitles,
    contacts: appliedFilters.contacts,
    contactInfo: appliedFilters.contactInfo,
    accounts: appliedFilters.accounts,
    owners: appliedFilters.owners,
    createdAfter: appliedFilters.createdAfter,
    createdBefore: appliedFilters.createdBefore,
  });

  const contactStatistics = useContactStatisticsWithTrend({
    ...context,
    sourceApp,
  });

  // Listen for process completion events and refresh data when contact processes complete
  useProcessCompletion({
    onSuccess: () => {
      console.log("Process completed successfully, refreshing contact data");
      contactListData.retry();
      contactStatistics.refetch(); // Also refresh statistics
    },
    onFailure: () => {
      console.log("Process failed, no data refresh needed");
    },
  });

  // Initial load effect
  useEffect(() => {
    if (!initialLoadDone.current && context.accessToken && filtersInitialized) {
      initialLoadDone.current = true;
      contactListData.loadPage(1, pageSize);
      contactStatistics.refetch();
    }
  }, [context.accessToken, pageSize, filtersInitialized]);

  // Auto-reload when filters change
  useEffect(() => {
    if (initialLoadDone.current && context.accessToken && filtersInitialized) {
      setCurrentPage(1);
      contactListData.loadPage(1, pageSize, {}, sortField, sortOrder);
    }
  }, [
    JSON.stringify(appliedFilters.contactTypes),
    JSON.stringify(appliedFilters.jobTitles),
    JSON.stringify(appliedFilters.contacts),
    JSON.stringify(appliedFilters.contactInfo),
    JSON.stringify(appliedFilters.accounts),
    JSON.stringify(appliedFilters.owners),
    appliedFilters.createdAfter,
    appliedFilters.createdBefore,
    context.accessToken,
    pageSize,
    filtersInitialized,
  ]);

  // Auto-reload when search changes
  useEffect(() => {
    if (initialLoadDone.current && context.accessToken && filtersInitialized) {
      setCurrentPage(1);
      contactListData.loadPage(1, pageSize, {}, sortField, sortOrder);
    }
  }, [
    appliedFilters.search,
    context.accessToken,
    pageSize,
    filtersInitialized,
  ]);

  // Auto-reload when sort changes
  useEffect(() => {
    if (initialLoadDone.current && context.accessToken && filtersInitialized) {
      contactListData.loadPage(currentPage, pageSize, {}, sortField, sortOrder);
    }
  }, [
    sortField,
    sortOrder,
    context.accessToken,
    currentPage,
    pageSize,
    filtersInitialized,
  ]);

  // Handlers
  const handleContactClick = useCallback((contact: Contact) => {
    setSelectedContactId(contact.id);
    // TODO: Open contact detail side panel
    console.log("Contact clicked:", contact);
  }, []);

  const handleSort = useCallback(
    (field: string, order: "ASC" | "DESC" | "") => {
      // When order is empty, clear sorting completely
      if (order === "") {
        setSortField("");
        setSortOrder("DESC"); // Keep DESC as default for state type, but field will be empty
        setCurrentPage(1);
        // Pass empty field to loadPage immediately
        contactListData.loadPage(1, pageSize, {}, "", "DESC");
      } else {
        setSortField(field);
        setSortOrder(order);
        setCurrentPage(1);
        // Pass new sorting values to loadPage immediately
        contactListData.loadPage(1, pageSize, {}, field, order);
      }
    },
    [contactListData, pageSize]
  );

  const handlePageChange = useCallback(
    (page: number, pageSize?: number) => {
      const targetPageSize = pageSize || 20;
      setCurrentPage(page);
      setPageSize(targetPageSize);
      contactListData.loadPage(page, targetPageSize);
    },
    [contactListData]
  );

  const handleSearch = useCallback(
    (searchTerm: string) => {
      contactFilters.setSearch(searchTerm);
      setCurrentPage(1);
      contactListData.loadPage(1, pageSize, {}, sortField, sortOrder);
    },
    [contactFilters, contactListData, pageSize]
  );

  const handleAddContact = useCallback(() => {
    startProcess({
      domain: "customer-relations",
      processName: "saveContact",
      builderType: "NATIVE_SCREEN",
      payload: {},
    });
  }, []);

  const handleRetryStatistics = useCallback(() => {
    contactStatistics.refetch();
  }, [contactStatistics]);

  // If there's an error loading contacts, show error state
  if (contactListData.error) {
    return (
      <div data-testid="contact-list-error">
        <Alert
          message="Error Loading Contacts"
          description={
            contactListData.error instanceof Error
              ? contactListData.error.message
              : String(contactListData.error)
          }
          type="error"
          showIcon
          data-testid="contact-list-error"
        />
      </div>
    );
  }

  return (
    <div data-testid="contact-list-content">
      <div data-testid="contact-statistics-section" className="gba:mb-6">
        {contactStatistics.trendData ? (
          <ContactStatisticsWithTrend
            trendData={contactStatistics.trendData}
            isLoading={contactStatistics.isLoading}
            error={contactStatistics.error}
            onRetry={handleRetryStatistics}
          />
        ) : (
          <div>Loading statistics...</div>
        )}
      </div>

      <DataContainer
        dataControllerProps={{
          search: contactFilters.search,
          setSearch: handleSearch,
          debounceDelay: 500,
          filter: contactFilters.selectedFilters,
          setFilter: (filters: string[]) => {
            // This is called by DataController's "Clear all filters" button or individual filter removal
            if (filters.length === 0) {
              // Clear all filters
              contactFilters.clearAllFilters();
            } else {
              // Handle individual filter removal - find which filters were removed and remove them
              const removedFilters = contactFilters.selectedFilters.filter(
                (f) => !filters.includes(f)
              );
              removedFilters.forEach((filterId) =>
                contactFilters.removeFilter(filterId)
              );
            }
          },
          filterLabelMap: contactFilters.filterLabelMap,
          dateRange: {
            createdAfter: contactFilters.createdAfter,
            createdBefore: contactFilters.createdBefore,
            onClear: () =>
              contactFilters.handleDateRangeChange(undefined, undefined),
          },
          listTitle: (
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span>Contacts</span>
                <span className="gba:text-gray-500">
                  ({contactListData.total})
                </span>
              </div>
            </div>
          ),
          addButton: {
            onClick: handleAddContact,
            label: "Add",
            "data-testid": "add-contact-button",
          },
          actions: [
            <ColumnVisibilityDropdown
              key="column-visibility"
              columns={columnConfig}
              onColumnVisibilityChange={handleColumnVisibilityChange}
              data-testid="contact-list-column-visibility"
            />,
          ],
        }}
        dataFilterProps={{
          filterGroups: visibleFilterGroups,
          onFilterChange: (filterId: string, selected: boolean) => {
            selected
              ? contactFilters.addFilter(filterId)
              : contactFilters.removeFilter(filterId);
          },
        }}
        dataBody={
          <div data-testid="contact-table-container">
            <ContactTable
              {...context}
              contacts={contactListData.contacts}
              loading={contactListData.loading}
              error={contactListData.error}
              hasMore={contactListData.hasMore}
              loadMore={contactListData.loadMore}
              loadPage={contactListData.loadPage}
              retry={contactListData.retry}
              total={contactListData.total}
              pageSize={pageSize}
              currentPage={currentPage}
              sortField={sortField}
              sortOrder={sortOrder}
              onSelectContact={handleContactClick}
              onPaginationChange={handlePageChange}
              visibleColumns={visibleColumns}
              onSortingChange={handleSort}
              selectedContactId={selectedContactId}
            />
          </div>
        }
      />
    </div>
  );
};

export default ContactList;
