import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  LeadFormValues,
  SelectOption,
  LeadContextState,
  Address,
} from "../types";
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
  INVESTMENT_TYPE_CATALOG,
  INVESTMENT_GROUP_CATALOG,
  INVESTMENT_ROLE_CATALOG,
  INVESTMENT_STAKE_TYPE_CATALOG,
  MEASUREMENT_UNIT_CATALOG,
} from "../hooks/useLeadCatalogs";

// ✅ ADDED: New catalog constants for searchable dropdowns
export const ACADEMIC_TITLE_CATALOG = "AcademicTitle";

import { useSalesCampaignsGraphQL } from "../../../hooks/useSalesCampaignsGraphQL";
import { useInvestmentGroupTypes } from "../hooks/useInvestmentGroupTypes";

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

  // Dynamic address lines functionality
  addressLineCount: number;
  addAddressLine: () => void;
  removeAddressLine: () => void;
  removeAddressLineAtIndex: (lineIndex: number) => void;

  // Address management (new dynamic structure)
  addAddress: () => void;
  removeAddress: (addressId: string) => void;
  updateAddress: (addressId: string, updates: Partial<Address>) => void;
  addAddressLineToAddress: (addressId: string) => void;
  removeAddressLineFromAddress: (addressId: string, lineIndex: number) => void;

  // Business app context for child components
  businessAppContext: BusinessAppContextProps;

  // Sales Campaigns
  salesCampaigns: SelectOption[];
  salesCampaignsLoading: boolean;
  salesCampaignsError: string | null;
  salesCampaignsHasMore: boolean;
  salesCampaignsNeedsMoreData: boolean;
  salesCampaignsDisplayCount: number;
  salesCampaignsTotalFetched: number;
  searchSalesCampaigns: (search: string) => void;
  loadMoreSalesCampaigns: () => void;
  showMoreSalesCampaigns: () => void;

  // Dependent Investment Group Types (filtered by selected investment group)
  dependentInvestmentTypes: SelectOption[];
  dependentInvestmentTypesLoading: boolean;
  dependentInvestmentTypesError: string | null;
  refetchDependentInvestmentTypes: () => void;

  // Investment Groups
  investmentGroupsSearchable: SelectOption[];
  investmentGroupsLoading: boolean;
  investmentGroupsError: string | null;
  investmentGroupsHasMore: boolean;
  investmentGroupsNeedsMoreData: boolean;
  investmentGroupsDisplayCount: number;
  investmentGroupsTotalFetched: number;
  searchInvestmentGroups: (search: string) => void;
  loadMoreInvestmentGroups: () => void;
  showMoreInvestmentGroups: () => void;

  // Investment Roles
  investmentRolesSearchable: SelectOption[];
  investmentRolesLoading: boolean;
  investmentRolesError: string | null;
  investmentRolesHasMore: boolean;
  investmentRolesNeedsMoreData: boolean;
  investmentRolesDisplayCount: number;
  investmentRolesTotalFetched: number;
  searchInvestmentRoles: (search: string) => void;
  loadMoreInvestmentRoles: () => void;
  showMoreInvestmentRoles: () => void;

  // Investment Stake Types
  investmentStakeTypesSearchable: SelectOption[];
  investmentStakeTypesLoading: boolean;
  investmentStakeTypesError: string | null;
  investmentStakeTypesHasMore: boolean;
  investmentStakeTypesNeedsMoreData: boolean;
  investmentStakeTypesDisplayCount: number;
  investmentStakeTypesTotalFetched: number;
  searchInvestmentStakeTypes: (search: string) => void;
  loadMoreInvestmentStakeTypes: () => void;
  showMoreInvestmentStakeTypes: () => void;

  // Measurement Units
  measurementUnitsSearchable: SelectOption[];
  measurementUnitsLoading: boolean;
  measurementUnitsError: string | null;
  measurementUnitsHasMore: boolean;
  measurementUnitsNeedsMoreData: boolean;
  measurementUnitsDisplayCount: number;
  measurementUnitsTotalFetched: number;
  searchMeasurementUnits: (search: string) => void;
  loadMoreMeasurementUnits: () => void;
  showMoreMeasurementUnits: () => void;
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
    leadStatus: "InvestmentLeadStatus:v1:OPEN", // Default to OPEN status
    leadSource: "",
    rating: "",

    // Contact Information
    academicTitle: "", // ✅ ADDED: Academic title (PhD, MBA, etc.)
    firstName: "",
    lastName: "",
    jobPosition: "",
    phone: "",
    email: "",
    sensitive: false, // ✅ ADDED: Sensitive data flag

    // Social Media Information
    linkedinUrl: "",
    xingUrl: "",

    // Company Information
    legalForm: "",
    industry: "",
    company: "",
    website: "",
    companyEmail: "",
    companyPhone: "",
    numberOfEmployees: "",
    annualRevenue: "",

    // Campaign Information
    salesCampaignId: "",

    // Address Information (New dynamic structure)
    addresses: [
      {
        id: "default-address",
        addressType: "UNKNOWN_ADDRESS",
        addressLines: [""],
        postalCode: "",
        city: "",
        region: "",
        country: "",
      },
    ],

    // Address Information - ✅ UPDATED: InvestmentLead fields
    country: "",
    region: "",
    addressLine: "", // Single address line (jsonb in InvestmentLead)
    locality: "", // City field in InvestmentLead
    postalCode: "",

    // Legacy fields for backward compatibility (can be removed eventually)
    addressLine1: "",
    addressLine2: "",
    addressLine3: "",
    addressLine4: "",
    city: "",

    // Notes
    notes: "",

    // Investment-Specific Fields
    investmentName: "",
    investmentGroup: "",
    investmentType: "",
    investmentRole: "",
    investmentStakeType: "",
    stakePercentage: "",
    marketValue: "",
    initialInvestmentAmount: "",
    loanAmount: "",
    loanInterestRate: "",
    requiredCapitalAmount: "",
    forecastedProfitAmount: "",
    annualNetColdRent: "",
    
    // Real Estate Specific Fields
    buildingYear: "",
    size: "",
    measurementUnit: "",

    // Conversion Information
    conversionDate: "", // ✅ ADDED: Date when lead was converted
    convertedAccountId: "", // ✅ ADDED: ID of converted account
    convertedContactId: "", // ✅ ADDED: ID of converted contact
    convertedOpportunityId: "", // ✅ ADDED: ID of converted opportunity

    // System fields
    id: undefined,
    version: undefined,

    // Legacy fields
    followUp: false,
    address: "",
    state: "",
    title: "",
    accountId: "", // Maps to convertedAccountId for InvestmentLead
    contactId: "",

    ...initialValues,
  });

  // Global state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressLineCount, setAddressLineCount] = useState(1);

  // Investment-specific catalog states (placeholder implementation)
  const [investmentGroups] = useState<SelectOption[]>([]);
  const [investmentTypes] = useState<SelectOption[]>([]);
  const [investmentRoles] = useState<SelectOption[]>([]);
  const [investmentStakeTypes] = useState<SelectOption[]>([]);

  // Sales Campaigns hook for campaign selection
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

  // Lead data hook for populating form when editing existing lead (must be before employeePositions)
  const {
    leadData,
    isLoading: leadDataLoading,
    error: leadDataError,
    mapLeadToFormValues,
  } = useLeadData({ businessAppContext });

  // Convert employee position data to SelectOption format
  const employeePositions: SelectOption[] = useMemo(() => {
    const finalEmployees: SelectOption[] = [];

    // Add regular employees
    const regularEmployees: SelectOption[] = employeePositionData.map((emp) => {
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

    finalEmployees.push(...regularEmployees);

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
      const isCurrentUserInList = finalEmployees.some(
        (emp) => emp.value === currentUserEmployee.employeeId
      );

      if (!isCurrentUserInList) {
        finalEmployees.unshift(currentUserOption);
      }
    }

    // Add lead's owner employee if we have lead data and owner is not in the list
    if (leadData && leadData.ownerEmployee && leadData.ownerEmployeeId) {
      const isLeadOwnerInList = finalEmployees.some(
        (emp) => emp.value === leadData.ownerEmployeeId
      );

      if (!isLeadOwnerInList) {
        const leadOwnerDisplayName =
          leadData.ownerEmployee.displayName ||
          `${leadData.ownerEmployee.firstName} ${leadData.ownerEmployee.lastName}`.trim();

        const leadOwnerOption: SelectOption = {
          id: leadData.ownerEmployeeId,
          value: leadData.ownerEmployeeId,
          label: `${leadOwnerDisplayName} - Lead Owner`,
          name: leadOwnerDisplayName,
          extraInfo: {
            picture: undefined, // We don't have this from lead query
            pictureThumbnail: undefined, // We don't have this from lead query
            jobPosition: "Lead Owner", // Default since we don't have job position from lead query
            organizationalUnit: "Unknown", // Default since we don't have org unit from lead query
            userId: undefined,
          },
        };
        // Add lead owner at the beginning (after current user if present)
        finalEmployees.unshift(leadOwnerOption);
      }
    }

    return finalEmployees;
  }, [employeePositionData, currentUserEmployee, leadData]);

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

  // ✅ ADDED: New searchable catalog configs

  const academicTitlesConfig = useMemo(
    () => ({
      accessToken: businessAppContext.accessToken,
      catalogIdentifier: ACADEMIC_TITLE_CATALOG,
    }),
    [businessAppContext.accessToken]
  );


  const investmentTypesConfig = useMemo(
    () => ({
      accessToken: businessAppContext.accessToken,
      catalogIdentifier: INVESTMENT_TYPE_CATALOG,
    }),
    [businessAppContext.accessToken]
  );

  const investmentGroupsConfig = useMemo(
    () => ({
      accessToken: businessAppContext.accessToken,
      catalogIdentifier: INVESTMENT_GROUP_CATALOG,
    }),
    [businessAppContext.accessToken]
  );

  const investmentRolesConfig = useMemo(
    () => ({
      accessToken: businessAppContext.accessToken,
      catalogIdentifier: INVESTMENT_ROLE_CATALOG,
    }),
    [businessAppContext.accessToken]
  );

  const investmentStakeTypesConfig = useMemo(
    () => ({
      accessToken: businessAppContext.accessToken,
      catalogIdentifier: INVESTMENT_STAKE_TYPE_CATALOG,
    }),
    [businessAppContext.accessToken]
  );

  const measurementUnitsConfig = useMemo(
    () => ({
      accessToken: businessAppContext.accessToken,
      catalogIdentifier: MEASUREMENT_UNIT_CATALOG,
      whereConditions: { type: "AREA" },
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

  // ✅ ADDED: New searchable catalog hooks
  const academicTitlesHook = useSearchableCatalog(academicTitlesConfig);
  const investmentTypesHook = useSearchableCatalog(investmentTypesConfig);
  const investmentGroupsHook = useSearchableCatalog(investmentGroupsConfig);
  const investmentRolesHook = useSearchableCatalog(investmentRolesConfig);
  const investmentStakeTypesHook = useSearchableCatalog(
    investmentStakeTypesConfig
  );

  const measurementUnitsHook = useSearchableCatalog(
    measurementUnitsConfig
  );

  // Dependent Investment Types hook - filtered by selected investment group
  const dependentInvestmentTypesHook = useInvestmentGroupTypes(
    formValues.investmentGroup,
    businessAppContext.accessToken
  );
  // Clear investment type when investment group changes (will be defined after setFormValues)
  const previousInvestmentGroup = useRef(formValues.investmentGroup);

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
      // ✅ ADDED: Initialize new searchable catalogs
      academicTitlesHook.initialize();
      investmentTypesHook.initialize();
      investmentGroupsHook.initialize();
      investmentRolesHook.initialize();
      investmentStakeTypesHook.initialize();
      measurementUnitsHook.initialize();
    }
  }, [businessAppContext.accessToken]);

  // Auto-select current user once their employee data has loaded (only for new leads, not editing)
  useEffect(() => {
    const currentLeadId =
      businessAppContext.additionalData?.leadId ||
      businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters
        ?.leadId;
    if (
      currentUserEmployee &&
      !formValues.owner &&
      !autoSelectionDone.current &&
      !currentLeadId && // Don't auto-select when editing existing lead
      !leadData // Don't auto-select when we have lead data
    ) {
      setFormValuesState((prev) => ({
        ...prev,
        owner: currentUserEmployee.employeeId,
      }));
      autoSelectionDone.current = true;
    }
  }, [
    currentUserEmployee,
    formValues.owner,
    businessAppContext.additionalData?.leadId,
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters
      ?.leadId,
    leadData,
  ]);

  // Populate form values when lead data is loaded (for editing existing leads)
  useEffect(() => {
    // Only populate if we have lead data and the form doesn't already have this lead's data
    if (
      leadData &&
      leadData.id &&
      (!formValues.id || formValues.id !== leadData.id)
    ) {
      const mappedValues = mapLeadToFormValues(leadData);

      setFormValuesState((prev) => {
        const newFormValues = {
          ...prev,
          ...mappedValues,
        };
        
        return newFormValues;
      });

      // ✅ ADDED: Automatically set the correct addressLineCount based on filled address lines
      const filledAddressLines = [
        mappedValues.addressLine1,
        mappedValues.addressLine2,
        mappedValues.addressLine3,
        mappedValues.addressLine4,
      ].filter((line) => line && line.trim()).length;
      
      if (filledAddressLines > 0) {
        setAddressLineCount(Math.max(1, filledAddressLines));
      }
      // Don't auto-select current user if we're editing an existing lead
      autoSelectionDone.current = true;
    }
  }, [
    leadData,
    mapLeadToFormValues,
    businessAppContext.additionalData?.leadId,
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters
      ?.leadId,
  ]);

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

  // Remove specific address line by index (1-based)
  const removeAddressLineAtIndex = useCallback((lineIndex: number) => {
    if (addressLineCount > 1 && lineIndex >= 1 && lineIndex <= addressLineCount) {
      const newCount = addressLineCount - 1;
      setAddressLineCount(newCount);

      // Shift all subsequent lines up
      const updates: Partial<LeadFormValues> = {};
      for (let i = lineIndex; i < addressLineCount; i++) {
        const currentField = `addressLine${i}` as keyof LeadFormValues;
        const nextField = `addressLine${i + 1}` as keyof LeadFormValues;
        updates[currentField] = formValues[nextField] as string || "";
      }
      // Clear the last line
      const lastField = `addressLine${addressLineCount}` as keyof LeadFormValues;
      updates[lastField] = "";

      setFormValuesState((prev) => ({ ...prev, ...updates }));
    }
  }, [addressLineCount, formValues]);

  const setFormValues = useCallback((updates: Partial<LeadFormValues>) => {
    setFormValuesState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Clear investment type when investment group changes (but NOT during initial data load)
  useEffect(() => {
    if (previousInvestmentGroup.current !== formValues.investmentGroup) {
      // Check if this is the initial load from database vs user interaction
      const isInitialLoad = (
        // Case 1: First time setting group from empty to a value (initial form load)
        (previousInvestmentGroup.current === "" && formValues.investmentGroup !== "") ||
        // Case 2: Currently loading lead data from GraphQL
        (leadData && leadData.id && formValues.id === leadData.id && 
         leadData.investmentGroupRef === formValues.investmentGroup)
      );
      
      if (!isInitialLoad) {
        // This is a user interaction - clear the investment type
        setFormValues({ investmentType: "" });
      } 
      
      previousInvestmentGroup.current = formValues.investmentGroup;
    }
  }, [formValues.investmentGroup, formValues.id, leadData, setFormValues]);

  // DO NOT auto-select investment types - let user choose manually
  // This prevents confusion when switching between investment groups

  // Address management functions (new dynamic structure)
  const addAddress = useCallback(() => {
    const newAddress: Address = {
      id: `address-${Date.now()}`,
      addressType: "UNKNOWN_ADDRESS",
      addressLines: [""],
      postalCode: "",
      city: "",
      region: "",
      country: "",
    };
    setFormValuesState((prev) => ({
      ...prev,
      addresses: [...prev.addresses, newAddress],
    }));
  }, []);

  const removeAddress = useCallback((addressId: string) => {
    setFormValuesState((prev) => ({
      ...prev,
      addresses: prev.addresses.filter((addr) => addr.id !== addressId),
    }));
  }, []);

  const updateAddress = useCallback(
    (addressId: string, updates: Partial<Address>) => {
      setFormValuesState((prev) => ({
        ...prev,
        addresses: prev.addresses.map((addr) =>
          addr.id === addressId ? { ...addr, ...updates } : addr
        ),
      }));
    },
    []
  );

  const addAddressLineToAddress = useCallback((addressId: string) => {
    setFormValuesState((prev) => ({
      ...prev,
      addresses: prev.addresses.map((addr) =>
        addr.id === addressId
          ? { ...addr, addressLines: [...addr.addressLines, ""] }
          : addr
      ),
    }));
  }, []);

  const removeAddressLineFromAddress = useCallback(
    (addressId: string, lineIndex: number) => {
      setFormValuesState((prev) => ({
        ...prev,
        addresses: prev.addresses.map((addr) =>
          addr.id === addressId
            ? {
                ...addr,
                addressLines: addr.addressLines.filter(
                  (_, index) => index !== lineIndex
                ),
              }
            : addr
        ),
      }));
    },
    []
  );

  // Function to sync legacy address fields with new dynamic structure
  const syncLegacyFieldsToAddresses = useCallback(() => {
    if (formValues.addresses.length === 0) return;

    const legacyLines = [
      formValues.addressLine1,
      formValues.addressLine2,
      formValues.addressLine3,
      formValues.addressLine4,
    ].filter(
      (line): line is string =>
        line !== undefined && line !== null && line.trim() !== ""
    );

    if (
      legacyLines.length > 0 ||
      formValues.city ||
      formValues.postalCode ||
      formValues.region ||
      formValues.country
    ) {
      const firstAddress = formValues.addresses[0];
      const updatedAddress: Address = {
        ...firstAddress,
        addressLines:
          legacyLines.length > 0 ? legacyLines : firstAddress.addressLines,
        city: formValues.city || firstAddress.city,
        postalCode: formValues.postalCode || firstAddress.postalCode,
        region: formValues.region || firstAddress.region,
        country: formValues.country || firstAddress.country,
      };

      setFormValuesState((prev) => ({
        ...prev,
        addresses: [updatedAddress, ...prev.addresses.slice(1)],
      }));
    }
  }, [formValues]);

  // Sync legacy fields to dynamic structure when they change
  useEffect(() => {
    syncLegacyFieldsToAddresses();
  }, [
    formValues.addressLine1,
    formValues.addressLine2,
    formValues.addressLine3,
    formValues.addressLine4,
    formValues.city,
    formValues.postalCode,
    formValues.region,
    formValues.country,
  ]);

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

    // Address lines
    addressLineCount,
    addAddressLine,
    removeAddressLine,
    removeAddressLineAtIndex,

    // Address management (new dynamic structure)
    addAddress,
    removeAddress,
    updateAddress,
    addAddressLineToAddress,
    removeAddressLineFromAddress,

    // Business app context for child components
    businessAppContext,

    // Sales Campaigns
    salesCampaigns: salesCampaignsOptions,
    salesCampaignsLoading: salesCampaignsLoading,
    salesCampaignsError: salesCampaignsError,
    salesCampaignsHasMore: salesCampaignsHasMore,
    salesCampaignsNeedsMoreData: salesCampaignsHasMore, // Assuming needsMoreData is the same as hasMore for now
    salesCampaignsDisplayCount: salesCampaignsOptions.length,
    salesCampaignsTotalFetched: salesCampaignsOptions.length,
    searchSalesCampaigns: searchSalesCampaignsWrapper,
    loadMoreSalesCampaigns: loadMoreSalesCampaignsWrapper,
    showMoreSalesCampaigns: () => {}, // No showMore for this hook

    // Investment-specific catalogs
    investmentGroups,
    investmentTypes,
    investmentRoles,
    investmentStakeTypes,

    // ✅ ADDED: New searchable catalog properties
    regions: [], // Empty array placeholder - should be loaded from catalog


    // Academic Titles
    academicTitles: academicTitlesHook.allOptions,
    academicTitlesLoading: academicTitlesHook.loading,
    academicTitlesError: academicTitlesHook.error,
    academicTitlesHasMore: academicTitlesHook.hasMore,
    academicTitlesNeedsMoreData: academicTitlesHook.needsMoreData,
    academicTitlesDisplayCount: academicTitlesHook.displayCount,
    academicTitlesTotalFetched: academicTitlesHook.totalFetched,
    searchAcademicTitles: academicTitlesHook.search,
    loadMoreAcademicTitles: academicTitlesHook.loadMore,
    showMoreAcademicTitles: academicTitlesHook.showMore,


    // Investment Types
    investmentTypesSearchable: investmentTypesHook.allOptions,
    investmentTypesLoading: investmentTypesHook.loading,
    investmentTypesError: investmentTypesHook.error,
    investmentTypesHasMore: investmentTypesHook.hasMore,
    investmentTypesNeedsMoreData: investmentTypesHook.needsMoreData,
    investmentTypesDisplayCount: investmentTypesHook.displayCount,
    investmentTypesTotalFetched: investmentTypesHook.totalFetched,
    searchInvestmentTypes: investmentTypesHook.search,
    loadMoreInvestmentTypes: investmentTypesHook.loadMore,
    showMoreInvestmentTypes: investmentTypesHook.showMore,

    // Investment Groups
    investmentGroupsSearchable: investmentGroupsHook.allOptions,
    investmentGroupsLoading: investmentGroupsHook.loading,
    investmentGroupsError: investmentGroupsHook.error,
    investmentGroupsHasMore: investmentGroupsHook.hasMore,
    investmentGroupsNeedsMoreData: investmentGroupsHook.needsMoreData,
    investmentGroupsDisplayCount: investmentGroupsHook.displayCount,
    investmentGroupsTotalFetched: investmentGroupsHook.totalFetched,
    searchInvestmentGroups: investmentGroupsHook.search,
    loadMoreInvestmentGroups: investmentGroupsHook.loadMore,
    showMoreInvestmentGroups: investmentGroupsHook.showMore,

    // Investment Roles
    investmentRolesSearchable: investmentRolesHook.allOptions,
    investmentRolesLoading: investmentRolesHook.loading,
    investmentRolesError: investmentRolesHook.error,
    investmentRolesHasMore: investmentRolesHook.hasMore,
    investmentRolesNeedsMoreData: investmentRolesHook.needsMoreData,
    investmentRolesDisplayCount: investmentRolesHook.displayCount,
    investmentRolesTotalFetched: investmentRolesHook.totalFetched,
    searchInvestmentRoles: investmentRolesHook.search,
    loadMoreInvestmentRoles: investmentRolesHook.loadMore,
    showMoreInvestmentRoles: investmentRolesHook.showMore,

    // Investment Stake Types
    investmentStakeTypesSearchable: investmentStakeTypesHook.allOptions,
    investmentStakeTypesLoading: investmentStakeTypesHook.loading,
    investmentStakeTypesError: investmentStakeTypesHook.error,
    investmentStakeTypesHasMore: investmentStakeTypesHook.hasMore,
    investmentStakeTypesNeedsMoreData: investmentStakeTypesHook.needsMoreData,
    investmentStakeTypesDisplayCount: investmentStakeTypesHook.displayCount,
    investmentStakeTypesTotalFetched: investmentStakeTypesHook.totalFetched,
    searchInvestmentStakeTypes: investmentStakeTypesHook.search,
    loadMoreInvestmentStakeTypes: investmentStakeTypesHook.loadMore,
    showMoreInvestmentStakeTypes: investmentStakeTypesHook.showMore,

    // Measurement Units
    measurementUnitsSearchable: measurementUnitsHook.allOptions,
    measurementUnitsLoading: measurementUnitsHook.loading,
    measurementUnitsError: measurementUnitsHook.error,
    measurementUnitsHasMore: measurementUnitsHook.hasMore,
    measurementUnitsNeedsMoreData: measurementUnitsHook.needsMoreData,
    measurementUnitsDisplayCount: measurementUnitsHook.displayCount,
    measurementUnitsTotalFetched: measurementUnitsHook.totalFetched,
    searchMeasurementUnits: measurementUnitsHook.search,
    loadMoreMeasurementUnits: measurementUnitsHook.loadMore,
    showMoreMeasurementUnits: measurementUnitsHook.showMore,

    // Dependent Investment Group Types (filtered by selected investment group)
    dependentInvestmentTypes: dependentInvestmentTypesHook.investmentTypes,
    dependentInvestmentTypesLoading: dependentInvestmentTypesHook.loadingInvestmentTypes,
    dependentInvestmentTypesError: dependentInvestmentTypesHook.errorInvestmentTypes,
    refetchDependentInvestmentTypes: dependentInvestmentTypesHook.refetchInvestmentTypes,
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
