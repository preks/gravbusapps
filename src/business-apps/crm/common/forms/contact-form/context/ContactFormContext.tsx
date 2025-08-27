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
import { useSalesCampaignsGraphQL } from "../../../hooks/useSalesCampaignsGraphQL";
import { useContactData } from "../hooks/useContactData";

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

  // Campaign suggestions (using GraphQL hook)
  campaignSuggestions: SelectOption[];
  searchCampaigns: (searchTerm: string) => void;
  loadMoreCampaigns: () => void;
  campaignsHasMore: boolean;
  campaignsLoading: boolean;

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
    academicTitle: "", // Academic title ID for selection
    birthDate: "",
    languageRef: "",
    bio: "",
    pictureUrl: "",

    // Professional Information
    jobTitle: "",
    department: "",
    contactRole: "", // Will be set to default for new contacts or actual value for existing
    contactType: "", // Will be set to default for new contacts or actual value for existing
    workExperienceYears: "",

    // Contact Information
    email: "",
    phone: "",
    fax: "",
    linkedinUrl: "",
    xingUrl: "",

    // Account Information
    accountId: "",
    account: "", // Account ID for selection
    companyName: "", // Company name for display (same as opportunity form)
    ownerEmployeeId: "",
    owner: "", // Owner employee ID for selection
    ownerOrganizationId: "",

    // Campaign Information
    salesCampaignId: "",

    // Additional Information
    notesSummary: "",

    // System fields
    id: undefined,
    version: undefined,

    // Audit fields
    createdAt: "",
    updatedAt: "",

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

  // Campaign search hook (using GraphQL hook)
  const {
    options: campaignSuggestions,
    loading: campaignsLoading,
    error: campaignsError,
    hasMore: campaignsHasMore,
    search: searchCampaigns,
    loadMore: loadMoreCampaigns,
  } = useSalesCampaignsGraphQL(businessAppContext.accessToken);

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

  // Create search wrapper for campaign autocomplete
  const searchCampaignsWrapper = useCallback(
    (searchTerm: string) => {
      // Allow empty search to load all campaigns, or search with 3+ characters
      if (searchTerm.trim().length === 0 || searchTerm.trim().length > 2) {
        searchCampaigns(searchTerm);
      }
    },
    [searchCampaigns]
  );

  // Create wrapper function to match interface
  const loadMoreAccountsWrapper = useCallback((): void => {
    loadMoreAccounts();
  }, [loadMoreAccounts]);

  // Create wrapper function for campaigns to match interface
  const loadMoreCampaignsWrapper = useCallback((): void => {
    loadMoreCampaigns();
  }, [loadMoreCampaigns]);

  // Auto-selection reference
  const autoSelectionDone = useRef(false);
  const accountInitializationDone = useRef(false);
  const contactDataPopulated = useRef(false); // Track if contact data has been populated

  // Current user employee data
  const { employee: currentUserEmployee } = useEmployeeById({
    employeeId: businessAppContext.userInfo?.employeeDetails?.employeeId || "",
    accessToken: businessAppContext.accessToken,
  });

  // Contact data hook for populating form when editing existing contact
  const {
    contactData,
    isLoading: contactDataLoading,
    error: contactDataError,
    mapContactToFormValues,
  } = useContactData({ businessAppContext });

  // Extract contactId for tracking changes
  const contactId =
    businessAppContext.additionalData?.contactId ||
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters
      ?.contactId;

  // Populate form values when contact data is loaded (for editing existing contacts)
  useEffect(() => {
    // Only populate if we have contact data, form doesn't already have this contact's data,
    // and we haven't already populated it to prevent overriding user changes
    if (
      contactData &&
      contactData.id &&
      (!formValues.id || formValues.id !== contactData.id) &&
      !contactDataPopulated.current
    ) {
      const mappedValues = mapContactToFormValues(contactData);

      console.log("📝 Form values being set:", {
        owner: mappedValues.owner,
        firstName: mappedValues.firstName,
        lastName: mappedValues.lastName,
        email: mappedValues.email,
        contactRole: mappedValues.contactRole,
        contactType: mappedValues.contactType,
        birthDate: mappedValues.birthDate,
        salesCampaignId: mappedValues.salesCampaignId,
        originalContactRole: contactData.contactRole,
        originalContactType: contactData.contactType,
        currentFormContactRole: formValues.contactRole,
        currentFormContactType: formValues.contactType,
        willOverrideUserSelection:
          !!formValues.contactRole &&
          formValues.contactRole !== mappedValues.contactRole,
      });

      // Special warning if we're about to override a user selection
      if (
        formValues.contactRole &&
        formValues.contactRole !== mappedValues.contactRole
      ) {
        console.warn(
          "⚠️ POTENTIAL OVERRIDE: User had contactRole:",
          formValues.contactRole,
          "but mapping will set:",
          mappedValues.contactRole
        );
      }

      // Check if we would override any user selections
      const userSelections = [];
      if (
        formValues.contactRole &&
        formValues.contactRole !== mappedValues.contactRole
      ) {
        userSelections.push(
          `contactRole (user: ${formValues.contactRole}, db: ${mappedValues.contactRole})`
        );
      }
      if (
        formValues.accountId &&
        formValues.accountId !== mappedValues.accountId
      ) {
        userSelections.push(
          `accountId (user: ${formValues.accountId}, db: ${mappedValues.accountId})`
        );
      }

      if (userSelections.length > 0) {
        console.error(
          "🚨 WOULD OVERRIDE USER SELECTIONS:",
          userSelections.join(", ")
        );
        console.error(
          "   This should not happen if contactDataPopulated flag is working!"
        );
      }

      setFormValuesState((prev) => ({
        ...prev,
        ...mappedValues,
      }));

      // Mark as populated to prevent overriding user changes
      contactDataPopulated.current = true;
      // Don't auto-select current user if we're editing an existing contact
      autoSelectionDone.current = true;
    }
  }, [
    contactData,
    mapContactToFormValues,
    businessAppContext.additionalData?.contactId,
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters
      ?.contactId,
  ]);

  // Initialize account data when form has accountId (for both new and existing contacts)
  useEffect(() => {
    if (
      formValues.accountId &&
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
        console.log("🏢 Contact Context: Found account in suggestions:", {
          accountId: formValues.accountId,
          foundAccount: foundAccount,
          currentCompanyName: formValues.companyName,
          foundAccountName: foundAccount.name,
          shouldUpdateCompanyName:
            !formValues.companyName ||
            formValues.companyName !== foundAccount.name,
        });
        // Update companyName if not already set or if different
        if (
          !formValues.companyName ||
          formValues.companyName !== foundAccount.name
        ) {
          console.log(
            "🔄 Contact Context: Updating companyName from account suggestion"
          );
          setFormValuesState((prev) => ({
            ...prev,
            companyName: foundAccount.name,
          }));
        }
      } else {
        console.log(
          "🔍 Contact Context: Account not found in suggestions, loading accounts:",
          {
            accountId: formValues.accountId,
            suggestionsLength: accountSuggestions.length,
          }
        );
        // If account not found in current list, trigger a search to load it
        searchAccounts("");
      }
    }
  }, [formValues.accountId, accountSuggestions, searchAccounts]);

  // Initial load of accounts when form opens with existing accountId (for both new and update scenarios)
  useEffect(() => {
    if (formValues.accountId && accountSuggestions.length === 0) {
      console.log(
        "🔍 Contact Context: Loading initial accounts for existing accountId:",
        formValues.accountId
      );
      searchAccounts(""); // Load initial accounts to find the existing one
    }
  }, [formValues.accountId, accountSuggestions.length, searchAccounts]);

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
        regularEmployees.unshift(currentUserOption);
      }
    }

    // Add contact owner employee if they exist and are not already in the list
    if (contactData?.ownerEmployee) {
      const ownerEmployee = contactData.ownerEmployee;
      const ownerDisplayName =
        ownerEmployee.displayName ||
        `${ownerEmployee.firstName} ${ownerEmployee.lastName}`;

      const isOwnerAlreadyInList = regularEmployees.some(
        (emp) => emp.value === ownerEmployee.id
      );

      if (!isOwnerAlreadyInList) {
        const ownerOption: SelectOption = {
          id: ownerEmployee.id,
          value: ownerEmployee.id,
          label: `${ownerDisplayName} - Owner`,
          name: ownerDisplayName,
          extraInfo: {
            picture: undefined,
            pictureThumbnail: ownerEmployee.pictureThumbnail || undefined,
            jobPosition: "Owner",
            organizationalUnit: "N/A",
            userId: undefined,
          },
        };

        console.log("🔍 Adding contact owner to employee list:", {
          contactOwnerEmployeeId: contactData.ownerEmployeeId,
          contactOwnerDisplayName: ownerDisplayName,
          contactOwnerOption: ownerOption,
        });

        // Add owner at the beginning (after current user if present)
        const currentUserIndex = regularEmployees.findIndex(
          (emp) =>
            currentUserEmployee && emp.value === currentUserEmployee.employeeId
        );

        if (currentUserIndex >= 0) {
          regularEmployees.splice(currentUserIndex + 1, 0, ownerOption);
        } else {
          regularEmployees.unshift(ownerOption);
        }
      }
    }

    return regularEmployees;
  }, [employeePositionData, currentUserEmployee, contactData]);

  // Contact Types - Backend Enum Values
  const contactTypes: SelectOption[] = useMemo(
    () => [
      {
        id: "PRIMARY_CONTACT",
        value: "PRIMARY_CONTACT",
        label: "Primary Contact",
        name: "Primary Contact",
      },
      {
        id: "SECONDARY_CONTACT",
        value: "SECONDARY_CONTACT",
        label: "Secondary Contact",
        name: "Secondary Contact",
      },
      {
        id: "FOUNDER_CONTACT",
        value: "FOUNDER_CONTACT",
        label: "Founder Contact",
        name: "Founder Contact",
      },
      {
        id: "UNKNOWN_CONTACT",
        value: "UNKNOWN_CONTACT",
        label: "Unknown Contact",
        name: "Unknown Contact",
      },
    ],
    []
  );

  // Dynamic Contact Roles - fetched from database like ContactType pattern
  const contactRoles: SelectOption[] = useMemo(() => {
    // Base contact roles that are always available
    const baseRoles = [
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
    ];

    // TODO: Consider using useGetContactRoles hook for dynamic values
    // This would fetch actual contactRole values from database like ContactType
    return baseRoles;
  }, []);

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

  // Reset auto-selection flag when contactId changes or when creating new contact (MATCHES LEAD FORM PATTERN)
  useEffect(() => {
    console.log("🔄 Contact Context: Resetting flags for contact:", contactId);
    autoSelectionDone.current = false;
    contactDataPopulated.current = false; // Allow new contact data to be populated

    // Set defaults for NEW contacts only (when no contactId)
    if (!contactId && !formValues.contactType && !formValues.contactRole) {
      console.log("🆕 Setting defaults for new contact");
      setFormValuesState((prev) => ({
        ...prev,
        contactType: "PRIMARY_CONTACT",
        contactRole: "primary",
      }));
    }
  }, [contactId]);

  // Auto-select current user as owner (only if not editing existing contact) - MATCHES LEAD FORM PATTERN
  useEffect(() => {
    const currentContactId = contactId;

    console.log(
      "🔍 Contact Context: Auto-selection useEffect triggered with:",
      {
        hasCurrentUserEmployee: !!currentUserEmployee,
        currentUserEmployeeId: currentUserEmployee?.employeeId,
        formOwner: formValues.owner,
        formOwnerEmployeeId: formValues.ownerEmployeeId,
        autoSelectionDone: autoSelectionDone.current,
        currentContactId: currentContactId,
        hasContactData: !!contactData,
        formValuesId: formValues.id,
        shouldAutoSelect:
          currentUserEmployee &&
          !formValues.owner &&
          !formValues.ownerEmployeeId &&
          !autoSelectionDone.current &&
          !currentContactId &&
          !contactData &&
          !formValues.id,
      }
    );

    // Only auto-select if:
    // 1. We have current user employee data
    // 2. No owner is set yet (either field)
    // 3. We haven't already done auto-selection
    // 4. We're NOT editing an existing contact (no contactId)
    // 5. We don't have contact data loaded
    // 6. No form ID is set
    if (
      currentUserEmployee &&
      !formValues.owner &&
      !formValues.ownerEmployeeId &&
      !autoSelectionDone.current &&
      !currentContactId && // Don't auto-select when editing existing contact
      !contactData && // Don't auto-select when we have contact data
      !formValues.id // Don't auto-select when form has ID
    ) {
      console.log(
        "✅ Contact Context: Auto-selecting current user as owner:",
        currentUserEmployee.employeeId
      );
      setFormValuesState((prev) => ({
        ...prev,
        ownerEmployeeId: currentUserEmployee.employeeId,
        owner: currentUserEmployee.employeeId, // Update both fields
      }));
      autoSelectionDone.current = true;
    } else {
      console.log("❌ Contact Context: Auto-selection skipped");
    }
  }, [
    currentUserEmployee,
    formValues.owner,
    formValues.ownerEmployeeId,
    formValues.id,
    contactId,
    contactData,
  ]);

  // Update global loading and error state to include contact data loading (MATCHES LEAD FORM PATTERN)
  useEffect(() => {
    setIsLoading(contactDataLoading);
  }, [contactDataLoading]);

  useEffect(() => {
    setError(contactDataError);
  }, [contactDataError]);

  // Watcher for form values changes - to detect unexpected overrides
  const prevFormValues = useRef<ContactFormValues>();
  useEffect(() => {
    if (prevFormValues.current) {
      const changes = [];
      if (prevFormValues.current.contactRole !== formValues.contactRole) {
        changes.push(
          `contactRole: ${prevFormValues.current.contactRole} → ${formValues.contactRole}`
        );
      }
      if (prevFormValues.current.accountId !== formValues.accountId) {
        changes.push(
          `accountId: ${prevFormValues.current.accountId} → ${formValues.accountId}`
        );
      }
      if (prevFormValues.current.contactType !== formValues.contactType) {
        changes.push(
          `contactType: ${prevFormValues.current.contactType} → ${formValues.contactType}`
        );
      }

      if (changes.length > 0) {
        console.log("👀 Form values changed:", changes.join(", "));
      }
    }
    prevFormValues.current = { ...formValues };
  }, [formValues.contactRole, formValues.accountId, formValues.contactType]);

  // Form values update handler
  const setFormValues = useCallback(
    (updates: Partial<ContactFormValues>) => {
      console.log("🔄 setFormValues called with:", {
        updates: updates,
        currentContactRole: formValues.contactRole,
        currentAccountId: formValues.accountId,
        hasContactRole: "contactRole" in updates,
        hasAccountId: "accountId" in updates,
        contactRoleChange:
          "contactRole" in updates
            ? `${formValues.contactRole} → ${updates.contactRole}`
            : "no change",
        accountIdChange:
          "accountId" in updates
            ? `${formValues.accountId} → ${updates.accountId}`
            : "no change",
        stackTrace: new Error().stack?.split("\n")[2]?.trim(), // Show where it was called from
      });

      setFormValuesState((prev) => ({ ...prev, ...updates }));
    },
    [formValues.contactRole, formValues.accountId]
  );

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

    // Loading states (include contact data loading)
    isLoading: isLoading || contactDataLoading,
    error: error || contactDataError,

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

    // Campaign suggestions (using GraphQL hook)
    campaignSuggestions: campaignSuggestions,
    searchCampaigns: searchCampaignsWrapper,
    loadMoreCampaigns: loadMoreCampaignsWrapper,
    campaignsHasMore: campaignsHasMore,
    campaignsLoading: campaignsLoading,

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
