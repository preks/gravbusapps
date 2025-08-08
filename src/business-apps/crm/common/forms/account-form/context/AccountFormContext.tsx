import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { AccountFormValues, SelectOption, AccountContextState } from "../types";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useEmployeeById } from "@/business-apps/crm/common/forms/lead-form/hooks/useEmployeeById";
import { useEmployeePositions } from "@/business-apps/crm/common/forms/lead-form/hooks/useEmployeePositions";
import { useSearchableCatalog } from "../../lead-form/hooks/useSearchableCatalog";
import {
  LEGAL_FORM_CATALOG,
  INDUSTRY_CATALOG,
  EMPLOYEE_SIZE_CATALOG,
  REVENUE_SIZE_CATALOG,
  TIMEZONE_CATALOG,
} from "@/business-apps/crm/common/forms/lead-form/hooks/useLeadCatalogs";
import { useCurrenciesGraphQL } from "../hooks/useCurrenciesGraphQL";
import { useCountriesGraphQL } from "../hooks/useCountriesGraphQL";

interface AccountFormContextValue extends AccountContextState {
  formValues: AccountFormValues;
  setFormValues: (updates: Partial<AccountFormValues>) => void;
  onSubmit: (values: AccountFormValues) => Promise<void>;
  onCancel: () => Promise<void>;

  // Employee positions (for owner selection)
  employeePositions: SelectOption[];
  employeePositionsLoading: boolean;
  employeePositionsError: string | null;
  employeePositionsHasMore: boolean;
  loadMoreEmployeePositions: () => void;
  searchEmployeePositions: (search: string) => void;

  // Legal Forms with search and pagination
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

  // Industries with search and pagination
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

  // Employee Sizes with search and pagination
  employeeSizes: SelectOption[];
  employeeSizesLoading: boolean;
  employeeSizesError: string | null;
  employeeSizesHasMore: boolean;
  employeeSizesNeedsMoreData: boolean;
  employeeSizesDisplayCount: number;
  employeeSizesTotalFetched: number;
  searchEmployeeSizes: (search: string) => void;
  loadMoreEmployeeSizes: () => void;
  showMoreEmployeeSizes: () => void;

  // Revenue Sizes with search and pagination
  revenueSizes: SelectOption[];
  revenueSizesLoading: boolean;
  revenueSizesError: string | null;
  revenueSizesHasMore: boolean;
  revenueSizesNeedsMoreData: boolean;
  revenueSizesDisplayCount: number;
  revenueSizesTotalFetched: number;
  searchRevenueSizes: (search: string) => void;
  loadMoreRevenueSizes: () => void;
  showMoreRevenueSizes: () => void;

  // Currencies with search and pagination
  currencies: SelectOption[];
  currenciesLoading: boolean;
  currenciesError: string | null;
  currenciesHasMore: boolean;
  currenciesNeedsMoreData: boolean;
  currenciesDisplayCount: number;
  currenciesTotalFetched: number;
  searchCurrencies: (search: string) => void;
  loadMoreCurrencies: () => void;
  showMoreCurrencies: () => void;

  // TimeZones with search and pagination
  timeZones: SelectOption[];
  timeZonesLoading: boolean;
  timeZonesError: string | null;
  timeZonesHasMore: boolean;
  timeZonesNeedsMoreData: boolean;
  timeZonesDisplayCount: number;
  timeZonesTotalFetched: number;
  searchTimeZones: (search: string) => void;
  loadMoreTimeZones: () => void;
  showMoreTimeZones: () => void;

  // Countries with search and pagination
  countries: SelectOption[];
  countriesLoading: boolean;
  countriesError: string | null;
  countriesHasMore: boolean;
  searchCountries: (searchTerm: string) => void;
  loadMoreCountries: () => void;

  // Parent account autocomplete
  parentAccountSuggestions: SelectOption[];
  searchParentAccounts: (search: string) => Promise<SelectOption[]>;
  isSearchingParentAccounts: boolean;
  setIsSearchingParentAccounts: (loading: boolean) => void;
  setParentAccountSuggestions: (suggestions: SelectOption[]) => void;

  // Address lines management
  addressLineCount: number;
  addAddressLine: () => void;
  removeAddressLine: () => void;

  // Legacy compatibility (using employeeSizes data)
  numberOfEmployeesOptions: SelectOption[];
}

const AccountFormContext = createContext<AccountFormContextValue | null>(null);

interface AccountFormProviderProps {
  children: React.ReactNode;
  businessAppContext: BusinessAppContextProps;
  initialValues?: Partial<AccountFormValues>;
  onSubmit?: (values: AccountFormValues) => Promise<void>;
  onCancel?: () => Promise<void>;
}

export const AccountFormProvider: React.FC<AccountFormProviderProps> = ({
  children,
  businessAppContext,
  initialValues = {},
  onSubmit = async () => {},
  onCancel = async () => {},
}) => {
  // Form state
  const [formValues, setFormValuesState] = useState<AccountFormValues>({
    // Account Information
    owner: "",

    // Company Information
    accountName: "",
    parentAccount: "",
    legalForm: "",
    industry: "",
    website: "",
    description: "",

    // Contact Information
    phone: "",
    email: "",
    fax: "",

    // Address Information
    country: "",
    region: "",
    addressLine1: "",
    addressLine2: "",
    addressLine3: "",
    addressLine4: "",
    postalCode: "",
    city: "",

    // Financial Information
    annualRevenue: "",
    numberOfEmployees: "",
    currency: "",

    // Additional Information
    timeZone: "",
    foundationDate: "",
    tickerSymbol: "",
    sicCode: "",

    // System fields
    id: undefined,
    version: undefined,

    // Legacy fields
    address: "",
    state: "",

    ...initialValues,
  });

  // Global state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressLineCount, setAddressLineCount] = useState(1);

  // Parent account autocomplete state
  const [parentAccountSuggestions, setParentAccountSuggestions] = useState<
    SelectOption[]
  >([]);
  const [isSearchingParentAccounts, setIsSearchingParentAccounts] =
    useState(false);

  // Auto-selection tracking
  const autoSelectionDone = useRef(false);

  // Catalog initialization tracking
  const hasInitialized = useRef(false);

  // Current user employee hook for auto-selection
  const {
    employee: currentUserEmployee,
    loading: currentUserLoading,
    error: currentUserError,
  } = useEmployeeById({
    accessToken: businessAppContext.accessToken,
    employeeId: businessAppContext.userInfo?.employeeDetails?.employeeId,
  });

  // Employee positions hook
  const {
    employeePositions: employeePositionData,
    loading: employeePositionsLoading,
    error: employeePositionsError,
    hasMore: employeePositionsHasMore,
    searchEmployees,
    loadMore: loadMoreEmployeePositions,
  } = useEmployeePositions({ accessToken: businessAppContext.accessToken });

  // Countries hook
  const {
    options: countries,
    loading: countriesLoading,
    error: countriesError,
    hasMore: countriesHasMore,
    search: searchCountries,
    loadMore: loadMoreCountries,
  } = useCountriesGraphQL({
    accessToken: businessAppContext.accessToken,
  });

  // Currencies hook (simple like countries)
  const {
    options: currencies,
    loading: currenciesLoading,
    error: currenciesError,
    hasMore: currenciesHasMore,
    search: searchCurrencies,
    loadMore: loadMoreCurrencies,
  } = useCurrenciesGraphQL({
    accessToken: businessAppContext.accessToken,
  });

  // Legal form catalog hook - using searchable catalog like lead form
  const legalFormsConfig = useMemo(
    () => ({
      accessToken: businessAppContext.accessToken,
      catalogIdentifier: LEGAL_FORM_CATALOG,
    }),
    [businessAppContext.accessToken]
  );

  const legalFormsHook = useSearchableCatalog(legalFormsConfig);

  // Industries catalog hook - using searchable catalog like lead form
  const industriesConfig = useMemo(
    () => ({
      accessToken: businessAppContext.accessToken,
      catalogIdentifier: INDUSTRY_CATALOG,
    }),
    [businessAppContext.accessToken]
  );

  const industriesHook = useSearchableCatalog(industriesConfig);

  // Employee sizes catalog hook - using searchable catalog like lead form
  const employeeSizesConfig = useMemo(
    () => ({
      accessToken: businessAppContext.accessToken,
      catalogIdentifier: EMPLOYEE_SIZE_CATALOG,
    }),
    [businessAppContext.accessToken]
  );

  const employeeSizesHook = useSearchableCatalog(employeeSizesConfig);

  // Revenue sizes catalog hook - using searchable catalog like lead form
  const revenueSizesConfig = useMemo(
    () => ({
      accessToken: businessAppContext.accessToken,
      catalogIdentifier: REVENUE_SIZE_CATALOG,
    }),
    [businessAppContext.accessToken]
  );

  const revenueSizesHook = useSearchableCatalog(revenueSizesConfig);

  // TimeZones catalog hook - using searchable catalog like opportunity form
  const timeZonesConfig = useMemo(
    () => ({
      accessToken: businessAppContext.accessToken,
      catalogIdentifier: TIMEZONE_CATALOG,
    }),
    [businessAppContext.accessToken]
  );

  const timeZonesHook = useSearchableCatalog(timeZonesConfig);

  // Initialize all catalog hooks on mount
  useEffect(() => {
    legalFormsHook.initialize();
    industriesHook.initialize();
    employeeSizesHook.initialize();
    revenueSizesHook.initialize();
    timeZonesHook.initialize();
  }, [
    legalFormsHook.initialize,
    industriesHook.initialize,
    employeeSizesHook.initialize,
    revenueSizesHook.initialize,
    timeZonesHook.initialize,
  ]);

  // Custom transformation for timeZones to preserve the code field
  const transformedTimeZones = useMemo(() => {
    return timeZonesHook.options.map((option: SelectOption) => {
      // Extract code from catalog ID: "TimeZone:v1:UTC-07:00" → "UTC-07:00"
      const catalogId = option.id as string;
      const code = catalogId.includes(":")
        ? catalogId.split(":")[2]
        : option.label;

      return {
        ...option,
        code: code,
        value: catalogId, // ✅ Store full ID: "TimeZone:v1:UTC-07:00" for database
        label: code, // ✅ Display code: "UTC-07:00" to users
        name: code,
      };
    });
  }, [timeZonesHook.options]);

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

  // Use dynamic forms from catalog (same as lead form)
  const legalForms: SelectOption[] = useMemo(() => {
    return legalFormsHook.allOptions;
  }, [legalFormsHook.allOptions]);

  const industries: SelectOption[] = useMemo(() => {
    return industriesHook.allOptions;
  }, [industriesHook.allOptions]);

  const timeZones: SelectOption[] = useMemo(() => {
    return transformedTimeZones;
  }, [transformedTimeZones]);

  // Form value setter
  const setFormValues = useCallback((updates: Partial<AccountFormValues>) => {
    setFormValuesState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Parent account search function
  const searchParentAccounts = useCallback(
    async (search: string): Promise<SelectOption[]> => {
      // TODO: Implement actual search API call
      setIsSearchingParentAccounts(true);
      try {
        // Mock implementation - replace with actual API call
        await new Promise((resolve) => setTimeout(resolve, 300));
        const mockResults: SelectOption[] = [
          {
            id: "1",
            value: "1",
            label: `${search} Corp`,
            name: `${search} Corp`,
          },
          {
            id: "2",
            value: "2",
            label: `${search} Industries`,
            name: `${search} Industries`,
          },
        ];
        setParentAccountSuggestions(mockResults);
        return mockResults;
      } finally {
        setIsSearchingParentAccounts(false);
      }
    },
    []
  );

  // Address line management
  const addAddressLine = useCallback(() => {
    if (addressLineCount < 4) {
      setAddressLineCount((prev) => prev + 1);
    }
  }, [addressLineCount]);

  const removeAddressLine = useCallback(() => {
    if (addressLineCount > 1) {
      setAddressLineCount((prev) => prev - 1);
      // Clear the last address line value
      const lineKey =
        `addressLine${addressLineCount}` as keyof AccountFormValues;
      setFormValues({ [lineKey]: "" });
    }
  }, [addressLineCount, setFormValues]);

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

  // Context value
  const value: AccountFormContextValue = {
    // Form state
    formValues,
    setFormValues,
    onSubmit,
    onCancel,
    isLoading,
    error,

    // Employee positions
    employeePositions,
    employeePositionsLoading,
    employeePositionsError,
    employeePositionsHasMore,
    loadMoreEmployeePositions,
    searchEmployeePositions: searchEmployees,

    // Legal Forms with search and pagination
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

    // Industries with search and pagination
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

    // Employee Sizes with search and pagination
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

    // Revenue Sizes with search and pagination
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

    // Currencies with search and pagination
    currencies,
    currenciesLoading,
    currenciesError,
    currenciesHasMore,
    currenciesNeedsMoreData: false, // Currencies are not paginated in this hook
    currenciesDisplayCount: currencies.length,
    currenciesTotalFetched: currencies.length,
    searchCurrencies: searchCurrencies,
    loadMoreCurrencies: loadMoreCurrencies,
    showMoreCurrencies: () => {}, // No show more for simple list
    timeZones,
    timeZonesLoading: timeZonesHook.loading,
    timeZonesError: timeZonesHook.error,
    timeZonesHasMore: timeZonesHook.hasMore,
    timeZonesNeedsMoreData: timeZonesHook.needsMoreData,
    timeZonesDisplayCount: timeZonesHook.displayCount,
    timeZonesTotalFetched: timeZonesHook.totalFetched,
    searchTimeZones: timeZonesHook.search,
    loadMoreTimeZones: timeZonesHook.loadMore,
    showMoreTimeZones: timeZonesHook.showMore,

    // Countries with search and pagination
    countries,
    countriesLoading,
    countriesError,
    countriesHasMore,
    searchCountries,
    loadMoreCountries,

    // Parent account autocomplete
    parentAccountSuggestions,
    searchParentAccounts,
    isSearchingParentAccounts,
    setIsSearchingParentAccounts,
    setParentAccountSuggestions,

    // Address lines management
    addressLineCount,
    addAddressLine,
    removeAddressLine,

    // Legacy compatibility (using employeeSizes data)
    numberOfEmployeesOptions: employeeSizesHook.allOptions,
  };

  return (
    <AccountFormContext.Provider value={value}>
      {children}
    </AccountFormContext.Provider>
  );
};

export const useAccountFormContext = (): AccountFormContextValue => {
  const context = useContext(AccountFormContext);
  if (!context) {
    throw new Error(
      "useAccountFormContext must be used within AccountFormProvider"
    );
  }
  return context;
};
