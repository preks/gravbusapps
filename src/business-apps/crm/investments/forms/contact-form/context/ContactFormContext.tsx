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

// ✅ UPDATED: Catalog constants for InvestmentContact
export const ACADEMIC_TITLE_CATALOG = "AcademicTitle";
export const LANGUAGES_CATALOG = "Languages";
export const CATALOG_VERSION = "v1";

interface ContactFormContextValue extends ContactContextState {
  formValues: ContactFormValues;
  setFormValues: (updates: Partial<ContactFormValues>) => void;
  onSubmit: (values: ContactFormValues) => Promise<void>;
  onCancel: () => Promise<void>;

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
    fullName: "",
    academicTitleRef: "",
    birthDate: "",
    languageRef: "",
    description: "",

    // Professional Information
    jobPosition: "",
    department: "",
    code: "",

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

  // Global state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-selection tracking
  const autoSelectionDone = useRef(false);

  // Get current user's employee data for auto-owner selection
  const contactId = businessAppContext.additionalData?.contactId;

  // Get current user as employee (for auto-owner selection)
  console.log("🔍 Investment Contact Context: Current user info:", {
    hasUserInfo: !!businessAppContext.userInfo,
    employeeId: businessAppContext.userInfo?.employeeId,
    employeeDetailsEmployeeId:
      businessAppContext.userInfo?.employeeDetails?.employeeId,
    hasAccessToken: !!businessAppContext.accessToken,
  });

  const { employee: currentUserEmployee } = useEmployeeById({
    employeeId:
      businessAppContext.userInfo?.employeeDetails?.employeeId ||
      businessAppContext.userInfo?.employeeId ||
      "",
    accessToken: businessAppContext.accessToken,
  });

  console.log("🔍 Investment Contact Context: Current user employee:", {
    hasCurrentUserEmployee: !!currentUserEmployee,
    employeeId: currentUserEmployee?.employeeId,
    firstName: currentUserEmployee?.firstName,
    lastName: currentUserEmployee?.lastName,
  });

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

  console.log("🔍 Investment Contact Context: Academic Titles Hook:", {
    catalog: ACADEMIC_TITLE_CATALOG,
    version: CATALOG_VERSION,
    hasAccessToken: !!businessAppContext.accessToken,
    allOptionsLength: academicTitlesHook.allOptions?.length || 0,
    loading: academicTitlesHook.loading,
    error: academicTitlesHook.error,
    hasMore: academicTitlesHook.hasMore,
  });

  // Languages hook
  const languagesHook = useSearchableCatalog({
    catalogIdentifier: LANGUAGES_CATALOG,
    version: CATALOG_VERSION,
    accessToken: businessAppContext.accessToken,
  });

  console.log("🔍 Investment Contact Context: Languages Hook:", {
    catalog: LANGUAGES_CATALOG,
    version: CATALOG_VERSION,
    hasAccessToken: !!businessAppContext.accessToken,
    allOptionsLength: languagesHook.allOptions?.length || 0,
    loading: languagesHook.loading,
    error: languagesHook.error,
    hasMore: languagesHook.hasMore,
  });

  // ✅ CRITICAL: Initialize catalogs on mount (MATCHES CRM PATTERN)
  useEffect(() => {
    console.log("🚀 Investment Contact Context: Initializing catalogs...");
    academicTitlesHook.initialize();
    languagesHook.initialize();
  }, []); // ✅ FIX: Empty dependency array to run only once on mount

  // ✅ UPDATED: Populate form values when contact data is loaded (for editing existing contacts)
  useEffect(() => {
    console.log("🔍 Investment Contact Form Context - Data Check:", {
      hasContactData: !!contactData,
      investmentContactExists: !!contactData?.InvestmentContact?.[0],
      investmentContactId: contactData?.InvestmentContact?.[0]?.id,
      currentFormId: formValues.id,
      additionalDataContactId: businessAppContext.additionalData?.contactId,
      taskPayloadContactId:
        businessAppContext.additionalData?.psi_taskPayload
          ?.psi_initialParameters?.contactId,
    });

    // Only populate if we have investment contact data and the form doesn't already have this contact's data
    if (
      contactData &&
      contactData.InvestmentContact?.[0]?.id &&
      (!formValues.id || formValues.id !== contactData.InvestmentContact[0].id)
    ) {
      console.log(
        "✅ Investment Contact Form Context - Loading existing contact data:",
        {
          contactId: contactData.InvestmentContact[0].id,
          contactName: `${contactData.InvestmentContact[0].firstName || ""} ${
            contactData.InvestmentContact[0].lastName || ""
          }`.trim(),
        }
      );

      const mappedData = mapInvestmentContactToFormValues(contactData);
      console.log(
        "🔄 Investment Contact Form Context - Mapped data:",
        mappedData
      );

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

    return regularEmployees;
  }, [employeePositions, currentUserEmployee, contactData]);

  // Wrapper functions for hook methods (without hook dependencies to prevent infinite re-renders)
  const searchAcademicTitlesWrapper = useCallback(
    (search: string) => {
      console.log(`🔍 Searching academic titles for: "${search}"`);
      academicTitlesHook.search(search);
    },
    [academicTitlesHook.search]
  );

  const loadMoreAcademicTitlesWrapper = useCallback(() => {
    console.log("Loading more academic titles...");
    academicTitlesHook.loadMore();
  }, [academicTitlesHook.loadMore]);

  const showMoreAcademicTitlesWrapper = useCallback(() => {
    console.log("👁️ Showing more academic titles from cache...");
    academicTitlesHook.showMore();
  }, [academicTitlesHook.showMore]);

  const searchLanguagesWrapper = useCallback(
    (search: string) => {
      console.log(`🔍 Searching languages for: "${search}"`);
      languagesHook.search(search);
    },
    [languagesHook.search]
  );

  const loadMoreLanguagesWrapper = useCallback(() => {
    console.log("Loading more languages...");
    languagesHook.loadMore();
  }, [languagesHook.loadMore]);

  const showMoreLanguagesWrapper = useCallback(() => {
    console.log("👁️ Showing more languages from cache...");
    languagesHook.showMore();
  }, [languagesHook.showMore]);

  const searchEmployees = useCallback(
    (search: string) => {
      console.log(`🔍 Searching employees for: "${search}"`);
      searchEmployeePositions(search);
    },
    [searchEmployeePositions]
  );

  // Auto-select current user as owner (only if not editing existing contact) - MATCHES CRM PATTERN
  useEffect(() => {
    const currentContactId = contactId;

    console.log(
      "🔍 Investment Contact Context: Auto-selection useEffect triggered with:",
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
        "✅ Investment Contact Context: Auto-selecting current user as owner:",
        currentUserEmployee.employeeId
      );
      setFormValuesState((prev) => ({
        ...prev,
        ownerEmployeeId: currentUserEmployee.employeeId,
        owner: currentUserEmployee.employeeId, // Update both fields
      }));
      autoSelectionDone.current = true;
    } else {
      console.log("❌ Investment Contact Context: Auto-selection skipped");
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
