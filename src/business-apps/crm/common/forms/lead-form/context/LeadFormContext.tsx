import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { LeadFormValues, SelectOption, LeadContextState } from "../types";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useEmployeePositions } from "../hooks/useEmployeePositions";
import { useEmployeeById } from "../hooks/useEmployeeById";
import { useSearchableCatalog } from "../hooks/useSearchableCatalog";
import { useLeadData } from "../hooks/useLeadData";
import {
  LEAD_SOURCE_CATALOG,
  LEAD_STATUS_CATALOG,
  LEAD_RATING_CATALOG,
  LEGAL_FORM_CATALOG,
  INDUSTRY_CATALOG,
  COUNTRY_CATALOG,
  EMPLOYEE_SIZE_CATALOG,
  REVENUE_SIZE_CATALOG,
} from "../hooks/useLeadCatalogs";
import { useAccountsData } from "../hooks/useAccountsData";

interface LeadFormContextValue extends LeadContextState {
  formValues: LeadFormValues;
  setFormValues: (updates: Partial<LeadFormValues>) => void;
  onSubmit: (values: LeadFormValues) => Promise<void>;
  onCancel: () => Promise<void>;
  accessToken: string;

  // Employee positions (already searchable)
  employeePositions: SelectOption[];
  employeePositionsLoading: boolean;
  employeePositionsError: string | null;
  employeePositionsHasMore: boolean;
  loadMoreEmployeePositions: () => void;
  searchEmployeePositions: (search: string) => void;

  // Searchable catalog data
  leadSources: SelectOption[];
  leadSourcesLoading: boolean;
  leadSourcesError: string | null;
  leadSourcesHasMore: boolean;
  leadSourcesNeedsMoreData: boolean;
  leadSourcesDisplayCount: number;
  leadSourcesTotalFetched: number;
  searchLeadSources: (search: string) => void;
  loadMoreLeadSources: () => void;
  showMoreLeadSources: () => void;

  // Lead Statuses
  leadStatuses: SelectOption[];
  leadStatusesLoading: boolean;
  leadStatusesError: string | null;
  leadStatusesHasMore: boolean;
  leadStatusesNeedsMoreData: boolean;
  leadStatusesDisplayCount: number;
  leadStatusesTotalFetched: number;
  searchLeadStatuses: (search: string) => void;
  loadMoreLeadStatuses: () => void;
  showMoreLeadStatuses: () => void;

  // Lead Ratings
  leadRatings: SelectOption[];
  leadRatingsLoading: boolean;
  leadRatingsError: string | null;
  leadRatingsHasMore: boolean;
  leadRatingsNeedsMoreData: boolean;
  leadRatingsDisplayCount: number;
  leadRatingsTotalFetched: number;
  searchLeadRatings: (search: string) => void;
  loadMoreLeadRatings: () => void;
  showMoreLeadRatings: () => void;

  legalForms: SelectOption[];
  legalFormsLoading: boolean;
  legalFormsError: string | null;
  legalFormsHasMore: boolean;
  legalFormsNeedsMoreData: boolean;
  legalFormsDisplayCount: number;
  legalFormsTotalFetched: number;
  searchLegalForms: (search: string) => void;
  loadMoreLegalForms: () => void;
  showMoreLegalForms: () => void;

  // Industries
  industries: SelectOption[];
  industriesLoading: boolean;
  industriesError: string | null;
  industriesHasMore: boolean;
  industriesNeedsMoreData: boolean;
  industriesDisplayCount: number;
  industriesTotalFetched: number;
  searchIndustries: (search: string) => void;
  loadMoreIndustries: () => void;
  showMoreIndustries: () => void;

  countries: SelectOption[];
  countriesLoading: boolean;
  countriesError: string | null;
  countriesHasMore: boolean;
  countriesNeedsMoreData: boolean;
  countriesDisplayCount: number;
  countriesTotalFetched: number;
  searchCountries: (search: string) => void;
  loadMoreCountries: () => void;
  showMoreCountries: () => void;

  // Employee Size catalog
  employeeSizes: SelectOption[];
  employeeSizesLoading: boolean;
  employeeSizesError: string | null;
  employeeSizesHasMore: boolean;
  searchEmployeeSizes: (search: string) => void;
  loadMoreEmployeeSizes: () => void;

  // Company autocomplete
  accountSuggestions: SelectOption[];
  searchAccounts: (search: string) => void;
  loadMoreAccounts: () => void;
  accountsHasMore: boolean;
  accountsLoading: boolean;

  // Dynamic address lines functionality
  addressLineCount: number;
  addAddressLine: () => void;
  removeAddressLine: () => void;
}

const LeadFormContext = createContext<LeadFormContextValue | null>(null);

interface LeadFormProviderProps {
  children: React.ReactNode;
  businessAppContext: BusinessAppContextProps;
  initialValues?: Partial<LeadFormValues>;
  onSubmit?: (values: LeadFormValues) => Promise<void>;
  onCancel?: () => Promise<void>;
}

export const LeadFormProvider: React.FC<LeadFormProviderProps> = ({
  children,
  businessAppContext,
  initialValues = {},
  onSubmit = async () => {},
  onCancel = async () => {},
}) => {
  // Form state
  const [formValues, setFormValuesState] = useState<LeadFormValues>({
    // Lead Information
    owner: "",
    leadStatus: "",
    leadSource: "",
    rating: "",

    // Contact Information
    salutation: "",
    firstName: "",
    lastName: "",
    jobPosition: "",
    phone: "",
    email: "",

    // Company Information
    legalForm: "",
    industry: "",
    company: "",
    website: "",
    companyEmail: "",
    companyPhone: "",
    timeZone: "",
    numberOfEmployees: "",
    annualRevenue: "",

    // Address Information
    country: "",
    region: "",
    addressLine1: "",
    addressLine2: "",
    addressLine3: "",
    addressLine4: "",
    postalCode: "",
    city: "",

    // Notes
    notes: "",

    // System fields
    id: undefined,
    version: undefined,

    // Legacy fields
    followUp: false,
    address: "",
    state: "",
    title: "",
    accountId: "",
    contactId: "",

    ...initialValues,
  });

  // Global state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressLineCount, setAddressLineCount] = useState(1);

  // Company autocomplete state (removed - managed by SearchableSelect now)
  // const [accountSuggestions, setAccountSuggestions] = useState<SelectOption[]>([]);
  // const [isSearchingAccounts, setIsSearchingAccounts] = useState(false);

  // Accounts data hook for company autocomplete with pagination
  const { searchAccounts, loadMoreAccounts, accountState } = useAccountsData({
    accessToken: businessAppContext.accessToken,
  });

  // Create wrapper function to match interface
  const loadMoreAccountsWrapper = useCallback(async (): Promise<void> => {
    await loadMoreAccounts();
  }, [loadMoreAccounts]);

  // Create search wrapper for SearchableSelect
  const searchAccountsWrapper = useCallback(
    (searchTerm: string) => {
      // Allow empty search to load all companies, or search with 3+ characters
      if (searchTerm.trim().length === 0 || searchTerm.trim().length > 2) {
        searchAccounts(searchTerm);
      }
    },
    [searchAccounts]
  );

  // Ref to track if auto-selection has been done
  const autoSelectionDone = useRef(false);

  // Employee positions hook
  const {
    employeePositions: employeePositionData,
    loading: employeePositionsLoading,
    error: employeePositionsError,
    hasMore: employeePositionsHasMore,
    searchEmployees,
    loadMore: loadMoreEmployeePositions,
  } = useEmployeePositions({ accessToken: businessAppContext.accessToken });

  // Current user employee hook for auto-selection
  const {
    employee: currentUserEmployee,
    loading: currentUserLoading,
    error: currentUserError,
  } = useEmployeeById({
    accessToken: businessAppContext.accessToken,
    employeeId: businessAppContext.userInfo?.employeeDetails?.employeeId,
  });

  // Convert employee position data to SelectOption format
  const employeePositions: SelectOption[] = useMemo(() => {
    const regularEmployees = employeePositionData.map((emp) => {
      const displayName =
        emp.employee.displayName || `${emp.firstName} ${emp.lastName}`.trim();
      const jobTitle = emp.jobPosition?.name || "No Position";
      const orgUnit = emp.organizationalUnit?.name || "No Unit";

      return {
        id: emp.employeeId,
        value: emp.employeeId,
        label: `${displayName} - ${jobTitle}`,
        name: displayName,
        extraInfo: {
          picture: emp.employee.picture,
          pictureThumbnail: emp.employee.pictureThumbnail,
          jobPosition: jobTitle,
          organizationalUnit: orgUnit,
          userId: emp.employee.userId,
        },
      };
    });

    // Add current user to the beginning if they're not already in the list
    if (currentUserEmployee) {
      const currentUserDisplayName =
        currentUserEmployee.employee.displayName ||
        `${currentUserEmployee.firstName} ${currentUserEmployee.lastName}`.trim();
      const currentUserJobTitle =
        currentUserEmployee.jobPosition?.name || "No Position";
      const currentUserOrgUnit =
        currentUserEmployee.organizationalUnit?.name || "No Unit";

      const currentUserOption: SelectOption = {
        id: currentUserEmployee.employeeId,
        value: currentUserEmployee.employeeId,
        label: `${currentUserDisplayName} - ${currentUserJobTitle}`,
        name: currentUserDisplayName,
        extraInfo: {
          picture: currentUserEmployee.employee.picture,
          pictureThumbnail: currentUserEmployee.employee.pictureThumbnail,
          jobPosition: currentUserJobTitle,
          organizationalUnit: currentUserOrgUnit,
          userId: currentUserEmployee.employee.userId,
        },
      };

      // Check if current user is already in the regular employees list
      const isCurrentUserInList = regularEmployees.some(
        (emp) => emp.value === currentUserEmployee.employeeId
      );

      if (!isCurrentUserInList) {
        return [currentUserOption, ...regularEmployees];
      }
    }

    return regularEmployees;
  }, [employeePositionData, currentUserEmployee]);

  // Searchable catalog hooks - memoize the config objects
  const leadSourcesConfig = useMemo(
    () => ({
      accessToken: businessAppContext.accessToken,
      catalogIdentifier: LEAD_SOURCE_CATALOG,
    }),
    [businessAppContext.accessToken]
  );

  const leadStatusesConfig = useMemo(
    () => ({
      accessToken: businessAppContext.accessToken,
      catalogIdentifier: LEAD_STATUS_CATALOG,
    }),
    [businessAppContext.accessToken]
  );

  const leadRatingsConfig = useMemo(
    () => ({
      accessToken: businessAppContext.accessToken,
      catalogIdentifier: LEAD_RATING_CATALOG,
    }),
    [businessAppContext.accessToken]
  );

  const legalFormsConfig = useMemo(
    () => ({
      accessToken: businessAppContext.accessToken,
      catalogIdentifier: LEGAL_FORM_CATALOG,
    }),
    [businessAppContext.accessToken]
  );

  const industriesConfig = useMemo(
    () => ({
      accessToken: businessAppContext.accessToken,
      catalogIdentifier: INDUSTRY_CATALOG,
    }),
    [businessAppContext.accessToken]
  );

  const countriesConfig = useMemo(
    () => ({
      accessToken: businessAppContext.accessToken,
      catalogIdentifier: COUNTRY_CATALOG,
    }),
    [businessAppContext.accessToken]
  );

  const employeeSizesConfig = useMemo(
    () => ({
      accessToken: businessAppContext.accessToken,
      catalogIdentifier: EMPLOYEE_SIZE_CATALOG,
    }),
    [businessAppContext.accessToken]
  );

  const revenueSizesConfig = useMemo(
    () => ({
      accessToken: businessAppContext.accessToken,
      catalogIdentifier: REVENUE_SIZE_CATALOG,
    }),
    [businessAppContext.accessToken]
  );

  const leadSourcesHook = useSearchableCatalog(leadSourcesConfig);
  const leadStatusesHook = useSearchableCatalog(leadStatusesConfig);
  const leadRatingsHook = useSearchableCatalog(leadRatingsConfig);
  const legalFormsHook = useSearchableCatalog(legalFormsConfig);
  const industriesHook = useSearchableCatalog(industriesConfig);
  const countriesHook = useSearchableCatalog(countriesConfig);
  const employeeSizesHook = useSearchableCatalog(employeeSizesConfig);
  const revenueSizesHook = useSearchableCatalog(revenueSizesConfig);

  // Lead data loading hook for editing existing leads
  const {
    leadData,
    isLoading: leadDataLoading,
    error: leadDataError,
    mapLeadToFormValues,
  } = useLeadData({
    businessAppContext,
  });

  // Initialize data on mount
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (businessAppContext.accessToken && !hasInitialized.current) {
      hasInitialized.current = true;
      leadSourcesHook.initialize();
      leadStatusesHook.initialize();
      leadRatingsHook.initialize();
      legalFormsHook.initialize();
      industriesHook.initialize();
      countriesHook.initialize();
      employeeSizesHook.initialize();
      revenueSizesHook.initialize();
    }
  }, [businessAppContext.accessToken]);

  // Auto-select current user once their employee data has loaded
  useEffect(() => {
    if (
      currentUserEmployee &&
      !formValues.owner &&
      !autoSelectionDone.current
    ) {
      setFormValuesState((prev) => ({
        ...prev,
        owner: currentUserEmployee.employeeId,
      }));
      autoSelectionDone.current = true;
    }
  }, [currentUserEmployee, formValues.owner]);

  // Populate form values when lead data is loaded (for editing existing leads)
  useEffect(() => {
    if (leadData && !formValues.id) {
      const mappedValues = mapLeadToFormValues(leadData);
      setFormValuesState((prev) => ({
        ...prev,
        ...mappedValues,
      }));
      // Don't auto-select current user if we're editing an existing lead
      autoSelectionDone.current = true;
    }
  }, [leadData, mapLeadToFormValues, formValues.id]);

  // Update global loading and error state to include lead data loading
  useEffect(() => {
    setIsLoading(leadDataLoading);
  }, [leadDataLoading]);

  useEffect(() => {
    setError(leadDataError);
  }, [leadDataError]);

  // Address line management
  const addAddressLine = useCallback(() => {
    if (addressLineCount < 4) {
      setAddressLineCount(addressLineCount + 1);
    }
  }, [addressLineCount]);

  const removeAddressLine = useCallback(() => {
    if (addressLineCount > 1) {
      const newCount = addressLineCount - 1;
      setAddressLineCount(newCount);

      // Clear the value of the removed address line
      const updates: Partial<LeadFormValues> = {};
      if (newCount === 1) {
        updates.addressLine2 = "";
        updates.addressLine3 = "";
        updates.addressLine4 = "";
      } else if (newCount === 2) {
        updates.addressLine3 = "";
        updates.addressLine4 = "";
      } else if (newCount === 3) {
        updates.addressLine4 = "";
      }

      setFormValuesState((prev) => ({ ...prev, ...updates }));
    }
  }, [addressLineCount]);

  const setFormValues = useCallback((updates: Partial<LeadFormValues>) => {
    setFormValuesState((prev) => ({ ...prev, ...updates }));
  }, []);

  const contextValue: LeadFormContextValue = {
    // Form state
    formValues,
    setFormValues,
    onSubmit,
    onCancel,
    accessToken: businessAppContext.accessToken,

    // Global state
    isLoading,
    error,

    // Employee positions
    employeePositions,
    employeePositionsLoading: employeePositionsLoading || currentUserLoading,
    employeePositionsError: employeePositionsError || currentUserError,
    employeePositionsHasMore,
    loadMoreEmployeePositions,
    searchEmployeePositions: searchEmployees,

    // Lead Sources
    leadSources: leadSourcesHook.allOptions,
    leadSourcesLoading: leadSourcesHook.loading,
    leadSourcesError: leadSourcesHook.error,
    leadSourcesHasMore: leadSourcesHook.hasMore,
    leadSourcesNeedsMoreData: leadSourcesHook.needsMoreData,
    leadSourcesDisplayCount: leadSourcesHook.displayCount,
    leadSourcesTotalFetched: leadSourcesHook.totalFetched,
    searchLeadSources: leadSourcesHook.search,
    loadMoreLeadSources: leadSourcesHook.loadMore,
    showMoreLeadSources: leadSourcesHook.showMore,

    // Lead Statuses
    leadStatuses: leadStatusesHook.allOptions,
    leadStatusesLoading: leadStatusesHook.loading,
    leadStatusesError: leadStatusesHook.error,
    leadStatusesHasMore: leadStatusesHook.hasMore,
    leadStatusesNeedsMoreData: leadStatusesHook.needsMoreData,
    leadStatusesDisplayCount: leadStatusesHook.displayCount,
    leadStatusesTotalFetched: leadStatusesHook.totalFetched,
    searchLeadStatuses: leadStatusesHook.search,
    loadMoreLeadStatuses: leadStatusesHook.loadMore,
    showMoreLeadStatuses: leadStatusesHook.showMore,

    // Lead Ratings
    leadRatings: leadRatingsHook.allOptions,
    leadRatingsLoading: leadRatingsHook.loading,
    leadRatingsError: leadRatingsHook.error,
    leadRatingsHasMore: leadRatingsHook.hasMore,
    leadRatingsNeedsMoreData: leadRatingsHook.needsMoreData,
    leadRatingsDisplayCount: leadRatingsHook.displayCount,
    leadRatingsTotalFetched: leadRatingsHook.totalFetched,
    searchLeadRatings: leadRatingsHook.search,
    loadMoreLeadRatings: leadRatingsHook.loadMore,
    showMoreLeadRatings: leadRatingsHook.showMore,

    // Legal forms
    legalForms: legalFormsHook.allOptions,
    legalFormsLoading: legalFormsHook.loading,
    legalFormsError: legalFormsHook.error,
    legalFormsHasMore: legalFormsHook.hasMore,
    legalFormsNeedsMoreData: legalFormsHook.needsMoreData,
    legalFormsDisplayCount: legalFormsHook.displayCount,
    legalFormsTotalFetched: legalFormsHook.totalFetched,
    searchLegalForms: legalFormsHook.search,
    loadMoreLegalForms: legalFormsHook.loadMore,
    showMoreLegalForms: legalFormsHook.showMore,

    // Industries
    industries: industriesHook.allOptions,
    industriesLoading: industriesHook.loading,
    industriesError: industriesHook.error,
    industriesHasMore: industriesHook.hasMore,
    industriesNeedsMoreData: industriesHook.needsMoreData,
    industriesDisplayCount: industriesHook.displayCount,
    industriesTotalFetched: industriesHook.totalFetched,
    searchIndustries: industriesHook.search,
    loadMoreIndustries: industriesHook.loadMore,
    showMoreIndustries: industriesHook.showMore,

    // Countries
    countries: countriesHook.allOptions,
    countriesLoading: countriesHook.loading,
    countriesError: countriesHook.error,
    countriesHasMore: countriesHook.hasMore,
    countriesNeedsMoreData: countriesHook.needsMoreData,
    countriesDisplayCount: countriesHook.displayCount,
    countriesTotalFetched: countriesHook.totalFetched,
    searchCountries: countriesHook.search,
    loadMoreCountries: countriesHook.loadMore,
    showMoreCountries: countriesHook.showMore,

    // Employee Sizes
    employeeSizes: employeeSizesHook.allOptions,
    employeeSizesLoading: employeeSizesHook.loading,
    employeeSizesError: employeeSizesHook.error,
    employeeSizesHasMore: employeeSizesHook.hasMore,
    employeeSizesNeedsMoreData: employeeSizesHook.needsMoreData,
    employeeSizesDisplayCount: employeeSizesHook.displayCount,
    employeeSizesTotalFetched: employeeSizesHook.totalFetched,
    searchEmployeeSizes: employeeSizesHook.search,
    loadMoreEmployeeSizes: employeeSizesHook.loadMore,
    showMoreEmployeeSizes: employeeSizesHook.showMore,

    // Revenue Sizes
    revenueSizes: revenueSizesHook.allOptions,
    revenueSizesLoading: revenueSizesHook.loading,
    revenueSizesError: revenueSizesHook.error,
    revenueSizesHasMore: revenueSizesHook.hasMore,
    revenueSizesNeedsMoreData: revenueSizesHook.needsMoreData,
    revenueSizesDisplayCount: revenueSizesHook.displayCount,
    revenueSizesTotalFetched: revenueSizesHook.totalFetched,
    searchRevenueSizes: revenueSizesHook.search,
    loadMoreRevenueSizes: revenueSizesHook.loadMore,
    showMoreRevenueSizes: revenueSizesHook.showMore,

    // Static data
    timeZones: [], // Not currently used but required by interface

    // Company autocomplete
    accountSuggestions: accountState.accounts,
    searchAccounts: searchAccountsWrapper,
    loadMoreAccounts: loadMoreAccountsWrapper,
    accountsHasMore: accountState.hasMore,
    accountsLoading: accountState.isLoading,

    // Address lines
    addressLineCount,
    addAddressLine,
    removeAddressLine,
  };

  return (
    <LeadFormContext.Provider value={contextValue}>
      {children}
    </LeadFormContext.Provider>
  );
};

export const useLeadFormContext = (): LeadFormContextValue => {
  const context = useContext(LeadFormContext);
  if (!context) {
    throw new Error(
      "useLeadFormContext must be used within a LeadFormProvider"
    );
  }
  return context;
};
