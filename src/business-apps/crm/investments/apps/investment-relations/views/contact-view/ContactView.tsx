import React, { useState, useCallback, useEffect, useMemo } from "react";
import { 
  Button,
  Spinner,
  Alert
} from "@newwork/nw-design-system";
// import { Plus } from "lucide-react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGetInvestmentContacts } from "@/common/data/investment/hooks/useInvestmentContacts";
import type { InvestmentContact } from "@/common/data/investment/types";
import type { InvestmentContactQueryVariables } from "@/common/data/investment/queries/investmentContactQueries";
import { DataContainer } from "@/components/layout/dataContainer/DataContainer";
import { ContactStatistics } from "./components/ContactStatistics";
import { ContactList } from "./components/ContactList";
import { useInvestmentContactFilters } from "./hooks/useInvestmentContactFilters";
import { AppAction } from "@/components/app-action/AppAction";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { PlusSquareIcon } from "@phosphor-icons/react";

export interface ContactViewProps extends BusinessAppContextProps {}

export const ContactView: React.FC<ContactViewProps> = (context) => {
  const { accessToken } = context;
  
  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  // const [showDataFilter, setShowDataFilter] = useState(false);
  const { filterGroups, filterLabelMap, handleFilterChange, birthDateAfter, birthDateBefore } = useInvestmentContactFilters(context, selectedFilters, setSelectedFilters);

  // Hooks for data fetching
  const { fetchInvestmentContacts } = useGetInvestmentContacts(context);

  // Data state
  const [contacts, setContacts] = useState<InvestmentContact[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Build query variables
  const queryVariables: InvestmentContactQueryVariables = useMemo(() => {
    const vars: Partial<InvestmentContactQueryVariables> = {};
    const ownerIds: string[] = [];
    const accountIds: string[] = [];
    const fullNames: string[] = [];
    const typeVals: string[] = [];
    const departmentVals: string[] = [];
    let hasEmail = false, missingEmail = false, hasPhone = false, missingPhone = false;

    selectedFilters.forEach((f) => {
      if (f.startsWith('owner:')) ownerIds.push(f.slice(6));
      else if (f.startsWith('contact:')) fullNames.push(f.slice(8));
      else if (f.startsWith('account:')) accountIds.push(f.slice(8));
      else if (f.startsWith('type:')) typeVals.push(f.slice(5));
      else if (f.startsWith('department:')) departmentVals.push(f.slice(11));
      else if (f === 'info:HAS_EMAIL') hasEmail = true;
      else if (f === 'info:MISSING_EMAIL') missingEmail = true;
      else if (f === 'info:HAS_PHONE') hasPhone = true;
      else if (f === 'info:MISSING_PHONE') missingPhone = true;
    });

    if (ownerIds.length) vars.ownerEmployeeIds = ownerIds;
    if (accountIds.length) vars.accountIds = accountIds;
    if (fullNames.length) vars.fullNames = fullNames;
    if (typeVals.length) vars.contactTypes = typeVals;
    if (departmentVals.length) vars.departments = departmentVals;

    return {
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      search: searchTerm.trim() || undefined,
      orderBy: [{ field: sortField, direction: sortOrder }],
      ...(birthDateAfter ? { birthDateFrom: birthDateAfter } : {}),
      ...(birthDateBefore ? { birthDateTo: birthDateBefore } : {}),
      ...(hasEmail ? { hasEmail: true } : {}),
      ...(missingEmail ? { missingEmail: true } : {}),
      ...(hasPhone ? { hasPhone: true } : {}),
      ...(missingPhone ? { missingPhone: true } : {}),
      ...vars
    };
  }, [currentPage, pageSize, searchTerm, sortField, sortOrder, selectedFilters, birthDateAfter, birthDateBefore]);

  // Load data
  const loadData = useCallback(async () => {
    if (!accessToken) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchInvestmentContacts(queryVariables);
      setContacts(result.InvestmentContact || []);
      setTotalCount(result.InvestmentContactAggregate?.aggregate?.count || 0);
    } catch (err) {
      console.error('Error loading investment contacts:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, fetchInvestmentContacts, queryVariables]);

  // Load data on mount and when variables change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Initialize from URL parameters (search and common filters)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const initialFilters: string[] = [];
    const pushAll = (key: string, prefix: string) => {
      urlParams.getAll(key).forEach((v) => v && initialFilters.push(`${prefix}:${v}`));
    };
    pushAll('owner', 'owner');
    pushAll('language', 'language');
    pushAll('salutation', 'salutation');
    pushAll('title', 'title');

    if (initialFilters.length) {
      setSelectedFilters((prev) => (prev.length ? prev : initialFilters));
    }

    const search = urlParams.get('search');
    if (search) setSearchTerm(search);
  }, []);

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page on search
  }, []);

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Handle sorting
  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC");
    } else {
      setSortField(field);
      setSortOrder("ASC");
    }
  }, [sortField, sortOrder]);

  const handleSetFilter = useCallback((filters: string[]) => {
    setSelectedFilters(filters);
    setCurrentPage(1);
  }, []);

  // const toggleDataFilter = useCallback(() => {
  //   setShowDataFilter(prev => !prev);
  // }, []);

  // Loading state
  if (isLoading && contacts.length === 0) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive" className="gba:mb-4">
        <div className="gba:flex gba:items-center gba:justify-between">
          <span>Error loading contacts: {error}</span>
          <Button variant="outline" size="sm" onClick={loadData}>
            Retry
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <div data-testid="investment-contacts-view">
      {/* Header */}
      <div className="gba:mb-6">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
          <div>
            <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">Investment Contacts</h1>
            <p className="gba:text-gray-600">Manage investment client contacts and relationships</p>
          </div>
        </div>

        {/* Statistics Cards (server-based, separate fetch) */}
        <ContactStatistics {...context} />
      </div>

      {/* Data Container with Contact List */}
      <DataContainer
        dataControllerProps={{
          search: searchTerm,
          setSearch: handleSearch,
          debounceDelay: 500,
          filter: selectedFilters,
          setFilter: handleSetFilter,
          filterLabelMap,
          listTitle: (
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span>Contacts</span>
                <span className="gba:flex gba:items-center gba:gap-2">
                  <span className="gba:text-gray-500">({totalCount})</span>
                </span>
              </div>
            </div>
          ),
          actions: (
            <AppAction
              contextsArray={[FlowContextName.createInvestmentContact]}
              accessToken={accessToken}
              data-testid="add-contact-action"
              emptyStateBehavior="hide"
            >
              <button
                className="gba:flex gba:flex-row gba:justify-center gba:items-center gba:px-3 gba:py-0 gba:h-8 gba:rounded gba:gap-1"
                data-testid="add-contact-action"
                type="button"
              >
                <span className="gba:w-5 gba:h-5 gba:flex gba:items-center gba:justify-center gba:flex-none order-0 gba:grow-0">
                  <PlusSquareIcon />
                </span>
                <span className="gba:h-4 gba:font-normal gba:text-sm gba:leading-4 gba:flex gba:items-center gba:text-black gba:flex-none order-1 gba:grow-0">
                  Add
                </span>
              </button>
            </AppAction>
          ),
        }}
        dataFilterProps={{
          filterGroups,
          onFilterChange: handleFilterChange,
        }}
        dataBody={
          <ContactList
            contacts={contacts}
            isLoading={isLoading}
            totalCount={totalCount}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onSort={handleSort}
            sortField={sortField}
            sortOrder={sortOrder}
            {...context}
          />
        }
      />
    </div>
  );
};

export default ContactView;