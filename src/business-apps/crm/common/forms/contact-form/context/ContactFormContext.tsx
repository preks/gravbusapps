import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { ContactFormValues, SelectOption } from "../types";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useEmployeePositions } from "../../lead-form/hooks/useEmployeePositions";
import { useEmployeeById } from "../../lead-form/hooks/useEmployeeById";
import { useAccountsGraphQL } from "../../opportunity-form/hooks/useAccountsGraphQL";
import { useSearchableCatalog } from "../../lead-form/hooks/useSearchableCatalog";

// Academic Title and Languages catalog constants
export const ACADEMIC_TITLE_CATALOG = "AcademicTitle";
export const LANGUAGES_CATALOG = "Languages";
export const CATALOG_VERSION = "v1";

interface ContactFormContextValue {
  formValues: ContactFormValues;
  setFormValues: (updates: Partial<ContactFormValues>) => void;
  onSubmit: (values: ContactFormValues) => Promise<void>;
  onCancel: () => Promise<void>;
  isLoading: boolean;
  error: string | null;

  // Employee positions
  employeePositions: SelectOption[];
  employeePositionsLoading: boolean;
  employeePositionsError: string | null;
  employeePositionsHasMore: boolean;
  loadMoreEmployeePositions: () => Promise<void>;
  searchEmployeePositions: (search: string) => void;

  // Account suggestions (using GraphQL hook like opportunity form)
  accountSuggestions: SelectOption[];
  searchAccounts: (searchTerm: string) => void;
  loadMoreAccounts: () => void;
  accountsHasMore: boolean;
  accountsLoading: boolean;

  // Catalog data
  academicTitles: SelectOption[];
  academicTitlesLoading: boolean;
  academicTitlesError: string | null;
  academicTitlesHasMore: boolean;
  searchAcademicTitles: (search: string) => void;
  loadMoreAcademicTitles: () => void;

  languages: SelectOption[];
  languagesLoading: boolean;
  languagesError: string | null;
  languagesHasMore: boolean;
  searchLanguages: (search: string) => void;
  loadMoreLanguages: () => void;

  // Static dropdown options
  contactTypes: SelectOption[];
  contactRoles: SelectOption[];
  departments: SelectOption[];

  // Business app context for child components
  businessAppContext: BusinessAppContextProps;
}

const ContactFormContext = createContext<ContactFormContextValue | null>(null);

interface ContactFormProviderProps {
  children: React.ReactNode;
  businessAppContext: BusinessAppContextProps;
  initialValues?: Partial<ContactFormValues>;
  onSubmit?: (values: ContactFormValues) => Promise<void>;
  onCancel?: () => Promise<void>;
}

export const ContactFormProvider: React.FC<ContactFormProviderProps> = ({
  children,
  businessAppContext,
  initialValues = {},
  onSubmit = async () => {},
  onCancel = async () => {},
}) => {
  // Form state
  const [formValues, setFormValuesState] = useState<ContactFormValues>({
    // Personal Information
    firstName: "",
    lastName: "",
    academicTitleRef: "",
    birthDate: "",
    languageRef: "",
    bio: "",
    pictureUrl: "",

    // Professional Information
    jobTitle: "",
    department: "",
    contactRole: "",
    contactType: "",
    workExperienceYears: "",

    // Contact Information
    email: "",
    phone: "",
    fax: "",
    linkedinUrl: "",
    xingUrl: "",

    // Account Information
    accountId: "",
    companyName: "", // Company name for display (same as opportunity form)
    ownerEmployeeId: "",
    ownerOrganizationId: "",

    // Additional Information
    notesSummary: "",

    // System fields
    id: undefined,
    version: undefined,

    // Source tracking
    sourceApp: "CRM",
    recordState: "ACTIVE",

    ...initialValues,
  });

  // Global state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Employee positions hook
  const {
    employeePositions: employeePositionData,
    loading: employeePositionsLoading,
    error: employeePositionsError,
    hasMore: employeePositionsHasMore,
    loadMore: loadMoreEmployeePositions,
    searchEmployees,
  } = useEmployeePositions({ accessToken: businessAppContext.accessToken });

  // Account search hook (using GraphQL hook like opportunity form)
  const {
    options: accountSuggestions,
    loading: accountsLoading,
    error: accountsError,
    hasMore: accountsHasMore,
    search: searchAccounts,
    loadMore: loadMoreAccounts,
  } = useAccountsGraphQL({ accessToken: businessAppContext.accessToken });

  // Create search wrapper for account autocomplete
  const searchAccountsWrapper = useCallback(
    (searchTerm: string) => {
      // Allow empty search to load all companies, or search with 3+ characters
      if (searchTerm.trim().length === 0 || searchTerm.trim().length > 2) {
        searchAccounts(searchTerm);
      }
    },
    [searchAccounts]
  );

  // Create wrapper function to match interface
  const loadMoreAccountsWrapper = useCallback((): void => {
    loadMoreAccounts();
  }, [loadMoreAccounts]);

  // Auto-selection reference
  const autoSelectionDone = useRef(false);
  const accountInitializationDone = useRef(false);

  // Current user employee data
  const { employee: currentUserEmployee } = useEmployeeById({
    employeeId: businessAppContext.userInfo?.employeeDetails?.employeeId || "",
    accessToken: businessAppContext.accessToken,
  });

  // Initialize account data when form has accountId but no companyName
  useEffect(() => {
    if (
      formValues.accountId &&
      !formValues.companyName &&
      accountSuggestions.length > 0 &&
      !accountInitializationDone.current
    ) {
      accountInitializationDone.current = true;

      const foundAccount = accountSuggestions.find(
        (account: any) =>
          account.value === formValues.accountId ||
          account.id === formValues.accountId
      );

      if (foundAccount) {
        setFormValuesState((prev) => ({
          ...prev,
          companyName: foundAccount.name,
        }));
      } else {
        // If account not found in current list, trigger a search to load it
        searchAccounts("");
      }
    }
  }, [
    formValues.accountId,
    formValues.companyName,
    accountSuggestions,
    searchAccounts,
  ]);

  // Initial load of accounts when form opens with existing accountId
  useEffect(() => {
    if (
      formValues.accountId &&
      !formValues.companyName &&
      accountSuggestions.length === 0
    ) {
      searchAccounts(""); // Load initial accounts to find the existing one
    }
  }, [
    formValues.accountId,
    formValues.companyName,
    accountSuggestions.length,
    searchAccounts,
  ]);

  // Academic Titles catalog configuration
  const academicTitlesConfig = useMemo(
    () => ({
      accessToken: businessAppContext.accessToken,
      catalogIdentifier: ACADEMIC_TITLE_CATALOG,
      version: CATALOG_VERSION,
      pageSize: 100, // Load 100 items per query for better performance
    }),
    [businessAppContext.accessToken]
  );

  // Languages catalog configuration
  const languagesConfig = useMemo(
    () => ({
      accessToken: businessAppContext.accessToken,
      catalogIdentifier: LANGUAGES_CATALOG,
      version: CATALOG_VERSION,
      pageSize: 100, // Load 100 items per query for better performance
    }),
    [businessAppContext.accessToken]
  );

  // Initialize catalog hooks
  const academicTitlesHook = useSearchableCatalog(academicTitlesConfig);
  const languagesHook = useSearchableCatalog(languagesConfig);

  // Initialize catalogs on mount
  useEffect(() => {
    academicTitlesHook.initialize();
    languagesHook.initialize();
  }, []);

  // Convert employee position data to SelectOption format
  const employeePositions: SelectOption[] = useMemo(() => {
    if (!employeePositionData) {
      return [];
    }

    // Convert regular employee position data
    const regularEmployees = employeePositionData.map((emp: any) => ({
      id: emp.id,
      value: emp.employeeId,
      label: emp.employee?.displayName || `${emp.firstName} ${emp.lastName}`,
      name: emp.employee?.displayName || `${emp.firstName} ${emp.lastName}`,
      extraInfo: {
        jobPosition: emp.jobPosition?.name || "",
        organizationalUnit: emp.organizationalUnit?.name || "",
        pictureThumbnail: emp.employee?.pictureThumbnail || null,
        email: "",
      },
    }));

    // Ensure current user is included in the employee positions list
    // (same logic as lead form to fix the owner display issue)
    if (currentUserEmployee) {
      const currentUserDisplayName =
        currentUserEmployee.employee?.displayName ||
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
          picture: currentUserEmployee.employee?.picture,
          pictureThumbnail: currentUserEmployee.employee?.pictureThumbnail,
          jobPosition: currentUserJobTitle,
          organizationalUnit: currentUserOrgUnit,
          userId: currentUserEmployee.employee?.userId,
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

  // Static dropdown options - TODO: Replace with actual catalog data
  const contactTypes: SelectOption[] = useMemo(
    () => [
      {
        id: "primary",
        value: "primary",
        label: "Primary Contact",
        name: "Primary Contact",
      },
      {
        id: "secondary",
        value: "secondary",
        label: "Secondary Contact",
        name: "Secondary Contact",
      },
      {
        id: "technical",
        value: "technical",
        label: "Technical Contact",
        name: "Technical Contact",
      },
      {
        id: "billing",
        value: "billing",
        label: "Billing Contact",
        name: "Billing Contact",
      },
      {
        id: "executive",
        value: "executive",
        label: "Executive Contact",
        name: "Executive Contact",
      },
    ],
    []
  );

  const contactRoles: SelectOption[] = useMemo(
    () => [
      {
        id: "primary",
        value: "primary",
        label: "Primary Contact",
        name: "Primary Contact",
      },
      {
        id: "secondary",
        value: "secondary",
        label: "Secondary Contact",
        name: "Secondary Contact",
      },
      {
        id: "decision-maker",
        value: "decision-maker",
        label: "Decision Maker",
        name: "Decision Maker",
      },
      {
        id: "influencer",
        value: "influencer",
        label: "Influencer",
        name: "Influencer",
      },
      {
        id: "champion",
        value: "champion",
        label: "Champion",
        name: "Champion",
      },
    ],
    []
  );

  // Academic Titles and Languages now come from catalog hooks (removed hardcoded data)

  const departments: SelectOption[] = useMemo(
    () => [
      { id: "sales", value: "sales", label: "Sales", name: "Sales" },
      {
        id: "marketing",
        value: "marketing",
        label: "Marketing",
        name: "Marketing",
      },
      {
        id: "engineering",
        value: "engineering",
        label: "Engineering",
        name: "Engineering",
      },
      { id: "finance", value: "finance", label: "Finance", name: "Finance" },
      {
        id: "hr",
        value: "hr",
        label: "Human Resources",
        name: "Human Resources",
      },
      { id: "it", value: "it", label: "IT", name: "IT" },
      {
        id: "operations",
        value: "operations",
        label: "Operations",
        name: "Operations",
      },
    ],
    []
  );

  // Auto-select current user as owner
  useEffect(() => {
    if (
      currentUserEmployee &&
      !autoSelectionDone.current &&
      !formValues.ownerEmployeeId
    ) {
      setFormValuesState((prev) => ({
        ...prev,
        ownerEmployeeId: currentUserEmployee.employeeId,
      }));
      autoSelectionDone.current = true;
    }
  }, [currentUserEmployee, formValues.ownerEmployeeId]);

  // Form values update handler
  const setFormValues = useCallback((updates: Partial<ContactFormValues>) => {
    setFormValuesState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Employee positions search
  const searchEmployeePositions = useCallback(
    (search: string) => {
      searchEmployees(search);
    },
    [searchEmployees]
  );

  const value: ContactFormContextValue = {
    // Form state
    formValues,
    setFormValues,
    onSubmit,
    onCancel,

    // Loading states
    isLoading,
    error,

    // Employee positions
    employeePositions,
    employeePositionsLoading,
    employeePositionsError,
    employeePositionsHasMore,
    loadMoreEmployeePositions,
    searchEmployeePositions,

    // Account suggestions (using GraphQL hook like opportunity form)
    accountSuggestions: accountSuggestions,
    searchAccounts: searchAccountsWrapper,
    loadMoreAccounts: loadMoreAccountsWrapper,
    accountsHasMore: accountsHasMore,
    accountsLoading: accountsLoading,

    // Academic Titles (using AcademicTitle catalog)
    academicTitles: academicTitlesHook.options,
    academicTitlesLoading: academicTitlesHook.loading,
    academicTitlesError: academicTitlesHook.error,
    academicTitlesHasMore: academicTitlesHook.hasMore,
    searchAcademicTitles: academicTitlesHook.search,
    loadMoreAcademicTitles: academicTitlesHook.loadMore,

    // Languages (using Languages catalog)
    languages: languagesHook.options,
    languagesLoading: languagesHook.loading,
    languagesError: languagesHook.error,
    languagesHasMore: languagesHook.hasMore,
    searchLanguages: languagesHook.search,
    loadMoreLanguages: languagesHook.loadMore,

    // Static dropdown options
    contactTypes,
    contactRoles,
    departments,

    // Business app context for child components
    businessAppContext,
  };

  return (
    <ContactFormContext.Provider value={value}>
      {children}
    </ContactFormContext.Provider>
  );
};

export const useContactFormContext = (): ContactFormContextValue => {
  const context = useContext(ContactFormContext);
  if (!context) {
    throw new Error(
      "useContactFormContext must be used within a ContactFormProvider"
    );
  }
  return context;
};
