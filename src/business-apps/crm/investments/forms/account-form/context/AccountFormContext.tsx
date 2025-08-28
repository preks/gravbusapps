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
import { useSearchableCatalog } from "../hooks/useSearchableCatalog";
import {
  LEGAL_FORM_CATALOG,
  INDUSTRY_CATALOG,
  EMPLOYEE_SIZE_CATALOG,
  REVENUE_SIZE_CATALOG,
  TIMEZONE_CATALOG,
} from "../hooks/useLeadCatalogs";
import { useCurrenciesGraphQL } from "../hooks/useCurrenciesGraphQL";
import { useCountriesGraphQL } from "../hooks/useCountriesGraphQL";
import { useSalesCampaignsGraphQL } from "../../../hooks/useSalesCampaignsGraphQL";
import {
  useAccountData,
  mapAccountToFormValues,
} from "../hooks/useAccountData";

interface AccountFormContextValue extends AccountContextState {
  formValues: AccountFormValues;
  setFormValues: (updates: Partial<AccountFormValues>) => void;
  onSubmit: (values: AccountFormValues) => Promise<void>;
  onCancel: () => Promise<void>;

  // Business app context for hooks
  businessAppContext: BusinessAppContextProps;

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

  // Sales Campaigns
  salesCampaigns: SelectOption[];
  salesCampaignsLoading: boolean;
  salesCampaignsError: string | null;
  salesCampaignsHasMore: boolean;
  searchSalesCampaigns: (searchTerm: string) => void;
  loadMoreSalesCampaigns: () => void;

  // ✅ REMOVED: Address handling - not needed for InvestmentAccount (uses only geographicPresence)

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

    // ✅ REMOVED: Campaign Information - not relevant for InvestmentAccount
    // salesCampaignId: "", // Removed

    // Contact Information
    phone: "",
    email: "",
    // ✅ REMOVED: fax: "", // Not available in InvestmentAccount schema

    // Geographic Presence (simplified for InvestmentAccount)
    geographicPresence: "",

    // ✅ REMOVED: Complex address handling - InvestmentAccount only has geographicPresence field
    // Legacy fields kept for form compatibility but made optional
    country: "",
    region: "",
    addressLine1: "",
    addressLine2: "",
    addressLine3: "",
    addressLine4: "",
    postalCode: "",
    city: "",
    addresses: [], // Dynamic addresses array - not used

    // Financial Information
    annualRevenue: "",
    numberOfEmployees: "",
    // ✅ REMOVED: currency: "", // Not available in InvestmentAccount schema

    // Additional Information
    timeZone: "", // ✅ RESTORED: Available in InvestmentAccount schema as timeZoneRef
    foundationDate: "",
    tickerSymbol: "",
    // ✅ REMOVED: sicCode: "", // Not available in InvestmentAccount schema

    // System fields
    id: undefined,
    version: undefined,

    // Legacy fields
    address: "",
    state: "",

    ...initialValues,
  });

  // Global state (minimal for simplified InvestmentAccount form)
  // ✅ REMOVED: isLoading, setError, addressLineCount - not needed for simplified form

  // Auto-selection tracking
  const autoSelectionDone = useRef(false);

  // Catalog initialization tracking
  const hasInitialized = useRef(false);

  // Account data hook for fetching existing account data
  const {
    accountData,
    loading: accountDataLoading,
    error: accountDataError,
  } = useAccountData(businessAppContext);

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

  // Sales Campaigns hook
  const {
    options: salesCampaignsOptions,
    loading: salesCampaignsLoading,
    error: salesCampaignsError,
    hasMore: salesCampaignsHasMore,
    search: searchSalesCampaigns,
    loadMore: loadMoreSalesCampaigns,
  } = useSalesCampaignsGraphQL(businessAppContext.accessToken);

  // Create search wrapper for campaign autocomplete
  const searchSalesCampaignsWrapper = useCallback(
    (searchTerm: string) => {
      // Allow empty search to load all campaigns, or search with 3+ characters
      if (searchTerm.trim().length === 0 || searchTerm.trim().length > 2) {
        searchSalesCampaigns(searchTerm);
      }
    },
    [searchSalesCampaigns]
  );

  // Create wrapper function for campaigns to match interface
  const loadMoreSalesCampaignsWrapper = useCallback((): void => {
    loadMoreSalesCampaigns();
  }, [loadMoreSalesCampaigns]);

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

    let finalEmployees: SelectOption[] = [...regularEmployees];

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

      const isCurrentUserInList = finalEmployees.some(
        (emp) => emp.value === currentUserEmployee.employeeId
      );

      if (!isCurrentUserInList) {
        finalEmployees.unshift(currentUserOption);
      }
    }

    // Add account's owner employee if we have account data and owner is not in the list
    if (accountData && accountData.InvestmentAccount?.[0]?.ownerEmployee) {
      const accountOwner = accountData.InvestmentAccount[0];
      const ownerEmployeeId = accountOwner?.ownerEmployee?.id;
      const isAccountOwnerInList = finalEmployees.some(
        (emp) => emp.value === ownerEmployeeId
      );

      if (!isAccountOwnerInList) {
        const accountOwnerDisplayName =
          `${accountOwner?.ownerEmployee?.firstName} ${accountOwner?.ownerEmployee?.lastName}`.trim();

        const accountOwnerOption: SelectOption = {
          id: ownerEmployeeId || "",
          value: ownerEmployeeId || "",
          label: `${accountOwnerDisplayName} - Account Owner`,
          name: accountOwnerDisplayName,
          extraInfo: {
            picture: undefined, // We don't have this from account query
            pictureThumbnail: accountOwner?.ownerEmployee?.pictureThumbnail,
            jobPosition: "Account Owner", // Default since we don't have job position from account query
            organizationalUnit: "Unknown", // Default since we don't have org unit from account query
            userId: undefined,
          },
        };

        finalEmployees.unshift(accountOwnerOption);
      }
    }

    return finalEmployees;
  }, [employeePositionData, currentUserEmployee, accountData]);

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

  useEffect(() => {
    // ✅ DEBUG: Log the account data loading process
    console.log("🔍 Investment Account Form Context - Data Check:", {
      hasAccountData: !!accountData,
      investmentAccountExists: !!accountData?.InvestmentAccount?.[0],
      investmentAccountId: accountData?.InvestmentAccount?.[0]?.id,
      currentFormId: formValues.id,
      additionalDataAccountId: businessAppContext.additionalData?.accountId,
      taskPayloadAccountId:
        businessAppContext.additionalData?.psi_taskPayload
          ?.psi_initialParameters?.accountId,
    });

    // Only populate if we have investment account data and the form doesn't already have this account's data
    if (
      accountData &&
      accountData.InvestmentAccount?.[0]?.id &&
      (!formValues.id || formValues.id !== accountData.InvestmentAccount[0].id)
    ) {
      console.log(
        "✅ Investment Account Form Context - Loading existing account data:",
        {
          accountId: accountData.InvestmentAccount[0].id,
          accountName: accountData.InvestmentAccount[0].name,
        }
      );

      const mappedValues = mapAccountToFormValues(accountData);
      console.log(
        "🔄 Investment Account Form Context - Mapped form values:",
        mappedValues
      );

      setFormValuesState((prev) => ({
        ...prev,
        ...mappedValues,
      }));

      // Don't auto-select current user if we're editing an existing account
      autoSelectionDone.current = true;
    } else {
      console.log(
        "❌ Investment Account Form Context - Account data not loaded or already loaded"
      );
    }
  }, [
    accountData,
    businessAppContext.additionalData?.accountId,
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters
      ?.accountId,
  ]);

  // Auto-select current user once their employee data has loaded (only for new accounts, not editing)
  useEffect(() => {
    const currentAccountId =
      businessAppContext.additionalData?.accountId ||
      businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters
        ?.accountId;

    // Only auto-select if:
    // 1. We have current user employee data
    // 2. No owner is set yet
    // 3. We haven't already done auto-selection
    // 4. We're NOT editing an existing account (no accountId)
    // 5. We don't have account data (meaning it's a new account)
    if (
      currentUserEmployee &&
      !formValues.owner &&
      !autoSelectionDone.current &&
      !currentAccountId && // Don't auto-select when editing existing account
      !accountData // Don't auto-select when we have account data
    ) {
      console.log(
        "✅ Auto-selecting current user as owner:",
        currentUserEmployee.employeeId
      );
      setFormValuesState((prev) => ({
        ...prev,
        owner: currentUserEmployee.employeeId,
      }));
      autoSelectionDone.current = true;
    }
  }, [
    currentUserEmployee,
    formValues.owner,
    businessAppContext.additionalData?.accountId,
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters
      ?.accountId,
    accountData,
  ]);

  // Context value
  const value: AccountFormContextValue = {
    // Form state
    formValues,
    setFormValues,
    onSubmit,
    onCancel,
    isLoading: false, // Simplified form doesn't track global loading state
    error: null, // Simplified form doesn't track global error state

    // Business app context
    businessAppContext,

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

    // Sales Campaigns
    salesCampaigns: salesCampaignsOptions,
    salesCampaignsLoading: salesCampaignsLoading,
    salesCampaignsError: salesCampaignsError,
    salesCampaignsHasMore: salesCampaignsHasMore,
    searchSalesCampaigns: searchSalesCampaignsWrapper,
    loadMoreSalesCampaigns: loadMoreSalesCampaignsWrapper,

    // ✅ REMOVED: Address management functions - not needed for InvestmentAccount

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
