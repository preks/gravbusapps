import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { ContactFormValues, SelectOption, ContactContextState } from "../types";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useEmployeePositions } from "@/business-apps/crm/investments/forms/lead-form/hooks/useEmployeePositions";
import { useEmployeeById } from "@/business-apps/crm/investments/forms/lead-form/hooks/useEmployeeById";
import { useSearchableCatalog } from "@/business-apps/crm/investments/forms/lead-form/hooks/useSearchableCatalog";
import {
  useInvestmentContactData,
  mapInvestmentContactToFormValues,
} from "../hooks/useContactData";
import { useEmployeeByIdGraphQL } from "../hooks/useEmployeeByIdGraphQL";
import { useAccountSelection } from "../hooks/useAccountSelection";

// ✅ UPDATED: Catalog constants for InvestmentContact
export const ACADEMIC_TITLE_CATALOG = "AcademicTitle";
export const LANGUAGES_CATALOG = "Languages";
export const CATALOG_VERSION = "v1";

interface ContactFormContextValue extends ContactContextState {
  formValues: ContactFormValues;
  setFormValues: (updates: Partial<ContactFormValues>) => void;
  onSubmit: (values: ContactFormValues) => Promise<void>;
  onCancel: () => Promise<void>;
  hideActions: boolean; // Hide submit/cancel buttons when embedded

  // Business app context for child components
  businessAppContext: BusinessAppContextProps;

  // Employee positions (for owner selection)
  employeePositions: SelectOption[];
  employeePositionsLoading: boolean;
  employeePositionsError: string | null;
  employeePositionsHasMore: boolean;
  loadMoreEmployeePositions: () => void;
  searchEmployeePositions: (search: string) => void;

  // Academic Titles with search and pagination
  academicTitles: SelectOption[];
  academicTitlesLoading: boolean;
  academicTitlesError: string | null;
  academicTitlesHasMore: boolean;
  academicTitlesNeedsMoreData: boolean;
  academicTitlesDisplayCount: number;
  academicTitlesTotalFetched: number;
  searchAcademicTitles: (search: string) => void;
  loadMoreAcademicTitles: () => void;
  showMoreAcademicTitles: () => void;

  // Languages with search and pagination
  languages: SelectOption[];
  languagesLoading: boolean;
  languagesError: string | null;
  languagesHasMore: boolean;
  languagesNeedsMoreData: boolean;
  languagesDisplayCount: number;
  languagesTotalFetched: number;
  searchLanguages: (search: string) => void;
  loadMoreLanguages: () => void;
  showMoreLanguages: () => void;

  // Account selection
  accounts: SelectOption[];
  accountsLoading: boolean;
  accountsError: string | null;
  accountsHasMore: boolean;
  searchAccounts: (search: string) => void;
  loadMoreAccounts: () => void;
  clearAccountSearch: () => void;
}

const ContactFormContext = createContext<ContactFormContextValue | null>(null);

interface ContactFormProviderProps {
  children: React.ReactNode;
  businessAppContext: BusinessAppContextProps;
  initialValues?: Partial<ContactFormValues>;
  onSubmit?: (values: ContactFormValues) => Promise<void>;
  onCancel?: () => Promise<void>;
  hideActions?: boolean; // Hide submit/cancel buttons when embedded
}

export const ContactFormProvider: React.FC<ContactFormProviderProps> = ({
  children,
  businessAppContext,
  initialValues = {},
  onSubmit = async () => {},
  onCancel = async () => {},
  hideActions = false,
}) => {
  // Form state
  const [formValues, setFormValuesState] = useState<ContactFormValues>({
    // Personal Information
    firstName: "",
    lastName: "",
    fullName: "",
    type: "",
    academicTitleRef: "",
    birthDate: "",
    languageRef: "",

    // Professional Information
    jobPosition: "",
    department: "",

    // Social Media Information
    linkedinUrl: "",
    xingUrl: "",

    // Contact Information
    email: "",
    phone: "",

    // ✅ REMOVED: Fields NOT in InvestmentContact database
    // salutationRef: "", // ❌ NOT in InvestmentContact schema
    // type: "UNKNOWN_CONTACT", // ❌ NOT in InvestmentContact schema
    // picture: "", // ❌ NOT in InvestmentContact schema
    // pictureThumbnail: "", // ❌ NOT in InvestmentContact schema

    // Owner Information
    ownerEmployeeId: "",
    owner: "",

    // Account Information
    accountIds: [], // ✅ NEW: Array of account IDs

    // Additional Information
    notesSummary: "",
    businessKey: "",

    // System fields
    id: undefined,
    version: undefined,

    // Audit fields
    createdAt: "",
    createdBy: "",

    // Additional properties
    additionalProperties: null,

    ...initialValues,
  });

  // 🎯 DEBUG: Log initial values and form state for owner field debugging

  // Global state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-selection tracking
  const autoSelectionDone = useRef(false);

  // Get current user's employee data for auto-owner selection
  const contactId = businessAppContext.additionalData?.contactId;

  // Get current user as employee (for auto-owner selection)

  const { employee: currentUserEmployee } = useEmployeeById({
    employeeId:
      businessAppContext.userInfo?.employeeDetails?.employeeId ||
      businessAppContext.userInfo?.employeeId ||
      "",
    accessToken: businessAppContext.accessToken,
  });


  // 🎯 Lead owner employee hook - for lead conversion scenarios
  const isLeadConversion = businessAppContext.additionalData?.isLeadConversion === true;
  const leadOwnerId = businessAppContext.additionalData?.leadOwnerId;
  const {
    employeeData: leadOwnerEmployee,
    isLoading: leadOwnerLoading,
    error: leadOwnerError,
  } = useEmployeeByIdGraphQL(
    businessAppContext.accessToken,
    isLeadConversion && leadOwnerId ? leadOwnerId : undefined
  );

  // ✅ UPDATED: Load contact data when contactId is available
  const {
    contactData,
    loading: contactDataLoading,
    error: contactDataError,
  } = useInvestmentContactData(businessAppContext);

  // Employee positions hook
  const {
    employeePositions,
    loading: employeePositionsLoading,
    error: employeePositionsError,
    hasMore: employeePositionsHasMore,
    loadMore: loadMoreEmployeePositions,
    searchEmployees: searchEmployeePositions,
  } = useEmployeePositions({ accessToken: businessAppContext.accessToken });

  // Academic Titles hook
  const academicTitlesHook = useSearchableCatalog({
    catalogIdentifier: ACADEMIC_TITLE_CATALOG,
    version: CATALOG_VERSION,
    accessToken: businessAppContext.accessToken,
  });


  // Languages hook
  const languagesHook = useSearchableCatalog({
    catalogIdentifier: LANGUAGES_CATALOG,
    version: CATALOG_VERSION,
    accessToken: businessAppContext.accessToken,
  });

  // Account selection hook
  const {
    accounts: accountOptions,
    loading: accountsLoading,
    error: accountsError,
    hasMore: accountsHasMore,
    search: searchAccounts,
    loadMore: loadMoreAccounts,
    clearSearch: clearAccountSearch,
  } = useAccountSelection(businessAppContext);


  // ✅ CRITICAL: Initialize catalogs on mount (MATCHES CRM PATTERN)
  useEffect(() => {
    academicTitlesHook.initialize();
    languagesHook.initialize();
  }, []); // ✅ FIX: Empty dependency array to run only once on mount

  // ✅ UPDATED: Populate form values when contact data is loaded (for editing existing contacts)
  useEffect(() => {

    // Only populate if we have investment contact data and the form doesn't already have this contact's data
    if (
      contactData &&
      contactData.InvestmentContact?.[0]?.id &&
      (!formValues.id || formValues.id !== contactData.InvestmentContact[0].id)
    ) {

      const mappedData = mapInvestmentContactToFormValues(contactData);

      setFormValuesState((prev) => ({
        ...prev,
        ...mappedData,
      }));
    }
  }, [contactData, formValues.id, businessAppContext.additionalData]);

  // Helper function to update form values
  const setFormValues = useCallback((updates: Partial<ContactFormValues>) => {
    setFormValuesState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Convert employee position data to SelectOption format (MATCHES CRM PATTERN)
  const employeePositionsSelectOptions: SelectOption[] = useMemo(() => {
    if (!employeePositions) {
      return [];
    }

    // Convert regular employee position data (MATCHES CRM TRANSFORMATION)
    const regularEmployees = employeePositions.map((emp: any) => ({
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

    // Ensure current user is included in the employee positions list (MATCHES CRM LOGIC)
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
        // Add current user to the beginning of the list
        regularEmployees.unshift(currentUserOption);
      } else {
        // Update existing current user entry with proper formatting
        const currentUserIndex = regularEmployees.findIndex(
          (emp) => emp.value === currentUserEmployee.employeeId
        );
        if (currentUserIndex >= 0) {
          regularEmployees[currentUserIndex] = currentUserOption;
        }
      }
    }

    // Add contact's owner employee if we have contact data and owner is not in the list
    if (contactData && contactData.InvestmentContact?.[0]?.ownerEmployee) {
      const contactOwner = contactData.InvestmentContact[0].ownerEmployee;
      const isContactOwnerInList = regularEmployees.some(
        (emp) => emp.value === contactOwner.id
      );

      if (!isContactOwnerInList) {
        const contactOwnerDisplayName =
          contactOwner.displayName ||
          `${contactOwner.firstName} ${contactOwner.lastName}`.trim();

        const contactOwnerOption: SelectOption = {
          id: contactOwner.id,
          value: contactOwner.id,
          label: `${contactOwnerDisplayName} - Owner`,
          name: contactOwnerDisplayName,
          extraInfo: {
            picture: undefined,
            pictureThumbnail: contactOwner.pictureThumbnail,
            jobPosition: "Owner",
            organizationalUnit: "N/A",
            userId: undefined,
          },
        };

        regularEmployees.unshift(contactOwnerOption);
      }
    }

    // 🎯 Add lead owner employee for lead conversion scenarios
    if (isLeadConversion && leadOwnerEmployee && leadOwnerId) {
      const isLeadOwnerInList = regularEmployees.some(
        (emp) => emp.value === leadOwnerId
      );

      if (!isLeadOwnerInList) {
        const leadOwnerDisplayName =
          leadOwnerEmployee.employee.displayName ||
          `${leadOwnerEmployee.employee.firstName} ${leadOwnerEmployee.employee.lastName}`.trim();
        const leadOwnerJobTitle =
          leadOwnerEmployee.jobPosition?.name || "Lead Owner";
        const leadOwnerOrgUnit =
          leadOwnerEmployee.organizationalUnit?.name || "Unknown";

        const leadOwnerOption: SelectOption = {
          id: leadOwnerId,
          value: leadOwnerId,
          label: `${leadOwnerDisplayName} - ${leadOwnerJobTitle}`,
          name: leadOwnerDisplayName,
          extraInfo: {
            picture: leadOwnerEmployee.employee.picture,
            pictureThumbnail: leadOwnerEmployee.employee.pictureThumbnail,
            jobPosition: leadOwnerJobTitle,
            organizationalUnit: leadOwnerOrgUnit,
            userId: leadOwnerEmployee.employee.userId,
          },
        };

        // Add lead owner at the beginning for easy access
        regularEmployees.unshift(leadOwnerOption);
        
      }
    }

    return regularEmployees;
  }, [employeePositions, currentUserEmployee, contactData, isLeadConversion, leadOwnerEmployee, leadOwnerId]);

  // Wrapper functions for hook methods (without hook dependencies to prevent infinite re-renders)
  const searchAcademicTitlesWrapper = useCallback(
    (search: string) => {
      academicTitlesHook.search(search);
    },
    [academicTitlesHook.search]
  );

  const loadMoreAcademicTitlesWrapper = useCallback(() => {
    academicTitlesHook.loadMore();
  }, [academicTitlesHook.loadMore]);

  const showMoreAcademicTitlesWrapper = useCallback(() => {
    academicTitlesHook.showMore();
  }, [academicTitlesHook.showMore]);

  const searchLanguagesWrapper = useCallback(
    (search: string) => {
      languagesHook.search(search);
    },
    [languagesHook.search]
  );

  const loadMoreLanguagesWrapper = useCallback(() => {
    languagesHook.loadMore();
  }, [languagesHook.loadMore]);

  const showMoreLanguagesWrapper = useCallback(() => {
    languagesHook.showMore();
  }, [languagesHook.showMore]);

  const searchEmployees = useCallback(
    (search: string) => {
      searchEmployeePositions(search);
    },
    [searchEmployeePositions]
  );

  // Auto-select current user as owner (only if not editing existing contact) - MATCHES CRM PATTERN
  useEffect(() => {
    const currentContactId = contactId;


    // Only auto-select if:
    // 1. We have current user employee data
    // 2. No owner is set yet (either field)
    // 3. We haven't already done auto-selection
    // 4. We're NOT editing an existing contact (no contactId)
    // 5. We don't have contact data loaded
    // 6. No form ID is set
    // 7. We're NOT in a lead conversion context (preserve lead's owner)
    if (
      currentUserEmployee &&
      !formValues.owner &&
      !formValues.ownerEmployeeId &&
      !autoSelectionDone.current &&
      !currentContactId && // Don't auto-select when editing existing contact
      !contactData && // Don't auto-select when we have contact data
      !formValues.id && // Don't auto-select when form has ID
      !businessAppContext.additionalData?.isLeadConversion // Don't auto-select during lead conversion
    ) {
      setFormValuesState((prev) => ({
        ...prev,
        ownerEmployeeId: currentUserEmployee.employeeId,
        owner: currentUserEmployee.employeeId, // Update both fields
      }));
      autoSelectionDone.current = true;
    } else {
    }
  }, [
    currentUserEmployee,
    formValues.owner,
    formValues.ownerEmployeeId,
    formValues.id,
    contactId,
    contactData,
  ]);

  // Context value
  const value: ContactFormContextValue = {
    // Form state
    formValues,
    setFormValues,
    onSubmit,
    onCancel,
    hideActions,
    isLoading: false, // Simplified form doesn't track global loading state
    error: null, // Simplified form doesn't track global error state

    // Business app context
    businessAppContext,

    // Employee positions (with safe fallbacks and CRM-matching transformation)
    employeePositions: employeePositionsSelectOptions || [],
    employeePositionsLoading,
    employeePositionsError,
    employeePositionsHasMore,
    loadMoreEmployeePositions,
    searchEmployeePositions: searchEmployees,

    // Academic Titles with search and pagination (with safe fallbacks)
    academicTitles: academicTitlesHook.allOptions || [],
    academicTitlesLoading: academicTitlesHook.loading || false,
    academicTitlesError: academicTitlesHook.error || null,
    academicTitlesHasMore: academicTitlesHook.hasMore || false,
    academicTitlesNeedsMoreData: academicTitlesHook.needsMoreData || false,
    academicTitlesDisplayCount: academicTitlesHook.displayCount || 0,
    academicTitlesTotalFetched: academicTitlesHook.totalFetched || 0,
    searchAcademicTitles: searchAcademicTitlesWrapper,
    loadMoreAcademicTitles: loadMoreAcademicTitlesWrapper,
    showMoreAcademicTitles: showMoreAcademicTitlesWrapper,

    // Languages with search and pagination (with safe fallbacks)
    languages: languagesHook.allOptions || [],
    languagesLoading: languagesHook.loading || false,
    languagesError: languagesHook.error || null,
    languagesHasMore: languagesHook.hasMore || false,
    languagesNeedsMoreData: languagesHook.needsMoreData || false,
    languagesDisplayCount: languagesHook.displayCount || 0,
    languagesTotalFetched: languagesHook.totalFetched || 0,
    searchLanguages: searchLanguagesWrapper,
    loadMoreLanguages: loadMoreLanguagesWrapper,
    showMoreLanguages: showMoreLanguagesWrapper,

    // Account selection (with safe fallbacks)
    accounts: accountOptions || [],
    accountsLoading: accountsLoading || false,
    accountsError: accountsError || null,
    accountsHasMore: accountsHasMore || false,
    searchAccounts: searchAccounts,
    loadMoreAccounts: loadMoreAccounts,
    clearAccountSearch: clearAccountSearch,

    // Additional required from ContactContextState interface
    departments: [], // Not used in simplified InvestmentContact form
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
