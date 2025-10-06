import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useEmployeePositions } from "@/business-apps/crm/investments/forms/lead-form/hooks/useEmployeePositions";
import { useEmployeeById } from "@/business-apps/crm/investments/forms/lead-form/hooks/useEmployeeById";
import {
  InvestmentOpportunityFormValues,
  SelectOption,
  DEAL_TYPES,
} from "../types";
import { useInvestmentOpportunityData } from "../hooks/useOpportunityData";
import { useGetInvestmentById } from "@/common/data/investment";
import { usePipelineCatalogs } from "../hooks/usePipelineCatalogs";
import { useSearchableCatalog } from "../hooks/useSearchableCatalog";
import { useInvestmentGroupTypes } from "../hooks/useInvestmentGroupTypes";
import { 
  INVESTMENT_GROUP_CATALOG, 
  INVESTMENT_GROUP_VERSION,
  INVESTMENT_ROLE_CATALOG,
  INVESTMENT_ROLE_VERSION,
  INVESTMENT_STAKE_TYPE_CATALOG,
  INVESTMENT_STAKE_TYPE_VERSION,
  MEASUREMENT_UNIT_CATALOG,
  MEASUREMENT_UNIT_VERSION
} from "../hooks/useInvestmentCatalogs";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";

// Interface for raw GraphQL Investment data with nested specializations
// This represents the actual structure returned by the GraphQL API before mapping
interface RawInvestmentData {
  id?: string;
  code?: string;
  name?: string;
  dealType?: string;
  businessKey?: string;
  estimatedAmount?: number;
  forecastedProfitAmount?: number;
  initialInvestmentAmount?: number;
  investmentMarketValue?: number;
  requiredCapitalAmount?: number;
  stakePercentage?: number;
  loanAmount?: number;
  loanInterestRate?: number;
  closeDate?: string;
  notesSummary?: string;
  
  // Catalog references (raw format)
  currency?: { id: string } | null;
  currencyRef?: string;
  investmentGroup?: { id: string } | null;
  investmentRole?: { id: string } | null;
  
  // Entity references
  investmentAccount?: { id: string } | null;
  ownerEmployee?: { id: string } | null;
  
  // Nested specialization arrays (as returned by GraphQL)
  equityInvestment?: Array<{
    marketValue?: number;
    [key: string]: any;
  }>;
  realEstateInvestment?: Array<{
    annualNetColdRent?: number;
    buildingYear?: number;
    size?: number;
    sizeMeasurementUnit?: { id: string } | null;
    [key: string]: any;
  }>;
  liquidFundInvestment?: Array<{
    interestRate?: number;
    [key: string]: any;
  }>;
  
  [key: string]: any; // Allow additional properties from GraphQL
}

interface InvestmentOpportunityFormContextValue {
  formValues: InvestmentOpportunityFormValues;
  setFormValues: (updates: Partial<InvestmentOpportunityFormValues>) => void;
  onSubmit: (values: InvestmentOpportunityFormValues) => Promise<void>;
  onCancel: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  hideActions: boolean;

  // Employee positions (for owner selection)
  employeePositions: SelectOption[];
  employeePositionsLoading: boolean;
  employeePositionsError: string | null;
  employeePositionsHasMore: boolean;
  loadMoreEmployeePositions: () => void;
  searchEmployeePositions: (search: string) => void;

  // Static data
  dealTypes: SelectOption[];

  // Pipeline data
  pipelines: SelectOption[];
  pipelineStages: SelectOption[];
  pipelinesLoading: boolean;
  pipelineStagesLoading: boolean;
  pipelineError: string | null;
  pipelineStageError: string | null;
  refetchStages: (selectedPipelineId?: string) => void;

  // Investment Group data
  investmentGroupsSearchable: SelectOption[];
  investmentGroupsLoading: boolean;
  investmentGroupsError: string | null;
  investmentGroupsHasMore: boolean;
  searchInvestmentGroups: (search: string) => void;
  loadMoreInvestmentGroups: () => void;

  // Investment Role data
  investmentRolesSearchable: SelectOption[];
  investmentRolesLoading: boolean;
  investmentRolesError: string | null;
  investmentRolesHasMore: boolean;
  searchInvestmentRoles: (search: string) => void;
  loadMoreInvestmentRoles: () => void;

  // Investment Stake Type data
  investmentStakeTypesSearchable: SelectOption[];
  investmentStakeTypesLoading: boolean;
  investmentStakeTypesError: string | null;
  investmentStakeTypesHasMore: boolean;
  searchInvestmentStakeTypes: (search: string) => void;
  loadMoreInvestmentStakeTypes: () => void;

  // Measurement Unit data
  measurementUnitsSearchable: SelectOption[];
  measurementUnitsLoading: boolean;
  measurementUnitsError: string | null;
  measurementUnitsHasMore: boolean;
  searchMeasurementUnits: (search: string) => void;
  loadMoreMeasurementUnits: () => void;

  // Dependent Investment Types (based on selected group)
  dependentInvestmentTypes: SelectOption[];
  dependentInvestmentTypesLoading: boolean;
  dependentInvestmentTypesError: string | null;

  // Business app context for child components
  businessAppContext: BusinessAppContextProps;
}

const OpportunityFormContext =
  createContext<InvestmentOpportunityFormContextValue | null>(null);

interface InvestmentOpportunityFormProviderProps {
  children: React.ReactNode;
  businessAppContext: BusinessAppContextProps;
  initialValues?: Partial<InvestmentOpportunityFormValues>;
  onSubmit?: (values: InvestmentOpportunityFormValues) => Promise<void>;
  onCancel?: () => Promise<void>;
  hideActions?: boolean;
}

export const OpportunityFormProvider: React.FC<
  InvestmentOpportunityFormProviderProps
> = ({
  children,
  businessAppContext,
  initialValues = {},
  onSubmit = async () => {},
  onCancel = async () => {},
  hideActions = false,
}) => {
  const { accessToken } = businessAppContext;

  // Form state
  const [formValues, setFormValuesState] =
    useState<InvestmentOpportunityFormValues>(() => {
      const defaultValues = {
        // Basic Information
        owner: "",
        name: "",
        investmentName: "",
        dealType: "",
        code: "",
        businessKey: "",
        sourceApp: "IRM",

        // Financial Information
        estimatedAmount: "",
        forecastedProfitAmount: "",
        initialInvestmentAmount: "",
        currency: "",
        currencyRef: "",
        closeDate: "",

        // Pipeline Information
        pipeline: "",
        pipelineStage: "",

        // Investment-Specific Information
        investmentGroupRef: "",
        investmentRoleRef: "",
        investmentStakeTypeRef: "",
        investmentTypeRef: "",
        stakePercentage: "",

        // Loan Information
        loanAmount: "",
        loanInterestRate: "",
        marketValue: "",
        requiredCapitalAmount: "",

        // Real Estate Specific
        annualNetColdRent: "",
        buildingYear: "",
        size: "",
        measurementUnit: "",

        // Relationship Information
        account: "",
        accountId: "",

        // Additional Information
        notesSummary: "",

        // System and Process fields
        processInstanceId: "",

        // Additional Properties
        additionalProperties: {},

        // Audit information
        activeFrom: "",
        activeTo: "",
        createdAt: "",
        createdBy: "",
        updatedAt: "",
        updatedBy: "",
        synchronizedAt: "",

        // System fields
        id: undefined,
        version: undefined,

        // Legacy fields
        ownerEmployeeId: "",
        ownerOrganizationId: "",

        // Apply initial values
        ...initialValues,
      };


      return defaultValues;
    });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Investment data state
  const [investmentData, setInvestmentData] = useState<RawInvestmentData | null>(null);
  const [investmentDataLoading, setInvestmentDataLoading] = useState(false);
  const [investmentDataError, setInvestmentDataError] = useState<string | null>(null);

  // Auto-selection tracking
  const autoSelectionDone = useRef(false);

  // Get current user for auto-owner selection (using userInfo from BusinessAppContext)
  const currentUserId =
    businessAppContext.userInfo?.employeeDetails?.employeeId;
  const { employee: currentUserEmployee } = useEmployeeById({
    accessToken,
    employeeId: currentUserId,
  });

  // Get initial owner employee data (for lead conversion)
  const { employee: initialOwnerEmployee } = useEmployeeById({
    accessToken,
    employeeId: initialValues?.owner,
  });

  // Investment Opportunity data fetching hook for pre-filling form when updating existing opportunity (MUST BE BEFORE employee positions)
  const {
    opportunityData,
    loading: opportunityDataLoading,
    error: opportunityDataError,
    mapOpportunityToFormValues,
  } = useInvestmentOpportunityData({ businessAppContext });

  // Investment data fetching hook for pre-filling form when creating opportunity from investment
  const { fetchInvestmentById } = useGetInvestmentById(businessAppContext);

  // Investment data mapping function
  const mapInvestmentToFormValues = useCallback((investment: RawInvestmentData): Partial<InvestmentOpportunityFormValues> => {
    if (!investment) return {};

    // Extract specialization data
    const equityInvestment = investment.equityInvestment?.[0];
    const realEstateInvestment = investment.realEstateInvestment?.[0];
    const liquidFundInvestment = investment.liquidFundInvestment?.[0];
    
    // Extract account information
    const investmentAccount = investment.investmentAccount;

    return {
      // System fields - omitted to ensure form remains in "create" mode
      // id: "", // Leave unset for new opportunity
      // version: "", // Leave unset for new opportunity

      // Basic Information - Map investment name to opportunity name
      name: investment.name || "",
      investmentName: investment.name || "",
      dealType: investment.dealType || "",
      code: investment.code || "",
      businessKey: investment.businessKey || "",

      // Pipeline Information - These might not exist on investment, so leave empty
      pipeline: "",
      pipelineStage: "",

      // Financial Information
      estimatedAmount: investment.estimatedAmount?.toString() || "",
      forecastedProfitAmount: investment.forecastedProfitAmount?.toString() || "",
      initialInvestmentAmount: investment.initialInvestmentAmount?.toString() || "",
      currencyRef: investment.currency?.id || investment.currencyRef || "",
      currency: investment.currency?.id || investment.currencyRef || "",
      closeDate: investment.closeDate ? investment.closeDate.split("T")[0] : "",

      // Investment-Specific Information (from root and specializations)
      loanAmount: investment.loanAmount?.toString() || "",
      loanInterestRate: investment.loanInterestRate?.toString() || liquidFundInvestment?.interestRate?.toString() || "",
      marketValue: equityInvestment?.marketValue?.toString() || investment.investmentMarketValue?.toString() || "",
      requiredCapitalAmount: investment.requiredCapitalAmount?.toString() || "",
      stakePercentage: investment.stakePercentage?.toString() || "",

      // Real Estate Specific Fields (from realEstateInvestment specialization)
      annualNetColdRent: realEstateInvestment?.annualNetColdRent?.toString() || "",
      buildingYear: realEstateInvestment?.buildingYear?.toString() || "",
      size: realEstateInvestment?.size?.toString() || "",
      measurementUnit: realEstateInvestment?.sizeMeasurementUnit?.id || "",

      // Relationships (corrected account mapping)
      accountId: investmentAccount?.id || "",
      account: investmentAccount?.id || "",

      // Owner Information
      owner: investment.ownerEmployee?.id || "",

      // Additional Information
      notesSummary: investment.notesSummary || "",

      // Investment Classification (corrected catalog reference mapping)
      investmentGroupRef: investment.investmentGroup?.id || "",
      investmentRoleRef: investment.investmentRole?.id || "",
      investmentStakeTypeRef: investment.investmentStakeType?.id || "",
      investmentTypeRef: investment.investmentType?.id || "",

      // Additional Properties
      additionalProperties: investment.additionalProperties || {},

      activeFrom: investment.activeFrom || "",
      activeTo: investment.activeTo || "",
    };
  }, []);

  // Employee positions hook (for owner dropdown)
  const {
    employeePositions: rawEmployeePositions,
    loading: employeePositionsLoading,
    error: employeePositionsError,
    hasMore: employeePositionsHasMore,
    searchEmployees: searchEmployeePositions,
    loadMore: loadMoreEmployeePositions,
  } = useEmployeePositions({
    accessToken: businessAppContext.accessToken,
  });

  // Convert employee position data to SelectOption format (following lead form pattern)
  const employeePositionsSelectOptions: SelectOption[] = useMemo(() => {
    if (!rawEmployeePositions) {
      return [];
    }

    const finalEmployees: SelectOption[] = [];

    // Add regular employees
    const regularEmployees: SelectOption[] = rawEmployeePositions.map((emp) => {
      const displayName =
        emp.employee?.displayName || `${emp.firstName} ${emp.lastName}`.trim();
      const jobTitle = emp.jobPosition?.name || "No Position";
      const orgUnit = emp.organizationalUnit?.name || "No Unit";

      return {
        id: emp.employeeId,
        value: emp.employeeId,
        label: `${displayName} - ${jobTitle}`,
        name: displayName,
        extraInfo: {
          picture: emp.employee?.picture || undefined,
          pictureThumbnail: emp.employee?.pictureThumbnail || undefined,
          jobPosition: jobTitle,
          organizationalUnit: orgUnit,
          userId: emp.employee?.userId || undefined,
        },
      };
    });

    finalEmployees.push(...regularEmployees);

    // Add current user to the beginning if they're not already in the list
    if (currentUserEmployee && currentUserId) {
      const currentUserDisplayName =
        currentUserEmployee.employee?.displayName ||
        `${currentUserEmployee.firstName} ${currentUserEmployee.lastName}`.trim();
      const currentUserJobTitle =
        currentUserEmployee.jobPosition?.name || "No Position";
      const currentUserOrgUnit =
        currentUserEmployee.organizationalUnit?.name || "No Unit";

      const currentUserOption: SelectOption = {
        id: currentUserId,
        value: currentUserId,
        label: `${currentUserDisplayName} - ${currentUserJobTitle}`,
        name: currentUserDisplayName,
        extraInfo: {
          picture: currentUserEmployee.employee?.picture || undefined,
          pictureThumbnail: currentUserEmployee.employee?.pictureThumbnail || undefined,
          jobPosition: currentUserJobTitle,
          organizationalUnit: currentUserOrgUnit,
          userId: currentUserEmployee.employee?.userId || undefined,
        },
      };

      // Check if current user is already in the regular employees list
      const isCurrentUserInList = finalEmployees.some(
        (emp) => emp.value === currentUserId
      );

      if (!isCurrentUserInList) {
        finalEmployees.unshift(currentUserOption);
      }
    }

    // Add opportunity's owner employee if we have opportunity data and owner is not in the list
    if (opportunityData && opportunityData.ownerEmployee) {
      const isOpportunityOwnerInList = finalEmployees.some(
        (emp) => emp.value === opportunityData?.ownerEmployee?.id
      );

      if (!isOpportunityOwnerInList) {
        const opportunityOwnerDisplayName =
          opportunityData.ownerEmployee.displayName ||
          `${opportunityData.ownerEmployee.firstName} ${opportunityData.ownerEmployee.lastName}`.trim();

        const opportunityOwnerOption: SelectOption = {
          id: opportunityData.ownerEmployee.id,
          value: opportunityData.ownerEmployee.id,
          label: `${opportunityOwnerDisplayName} - Owner`,
          name: opportunityOwnerDisplayName,
          extraInfo: {
            picture: undefined,
            pictureThumbnail: opportunityData.ownerEmployee.pictureThumbnail || undefined,
            jobPosition: "Owner",
            organizationalUnit: "N/A",
            userId: undefined,
          },
        };

        finalEmployees.unshift(opportunityOwnerOption);
      }
    }

    // Add initial values owner (e.g., from lead conversion) if not in the list
    if (initialValues?.owner && !opportunityData) {
      const isInitialOwnerInList = finalEmployees.some(
        (emp) => emp.value === initialValues.owner
      );

      if (!isInitialOwnerInList) {
        if (initialOwnerEmployee) {
          // Use actual employee data when available
          const initialOwnerDisplayName =
            initialOwnerEmployee.employee?.displayName ||
            `${initialOwnerEmployee.firstName} ${initialOwnerEmployee.lastName}`.trim();

          const initialOwnerOption: SelectOption = {
            id: initialOwnerEmployee.employeeId,
            value: initialOwnerEmployee.employeeId,
            label: `${initialOwnerDisplayName} - Lead Owner`,
            name: initialOwnerDisplayName,
            extraInfo: {
              picture: undefined,
              pictureThumbnail: initialOwnerEmployee.employee?.pictureThumbnail || undefined,
              jobPosition: initialOwnerEmployee.jobPosition?.name || "Lead Owner",
              organizationalUnit: initialOwnerEmployee.organizationalUnit?.name || "N/A",
              userId: undefined,
            },
          };

          finalEmployees.unshift(initialOwnerOption);
        } else {
          // Create a placeholder option while employee data loads
          const initialOwnerOption: SelectOption = {
            id: initialValues.owner,
            value: initialValues.owner,
            label: `Loading owner data...`,
            name: `Loading owner data...`,
            extraInfo: {
              picture: undefined,
              pictureThumbnail: undefined,
              jobPosition: "Loading...",
              organizationalUnit: "Loading...",
              userId: undefined,
            },
          };

          finalEmployees.unshift(initialOwnerOption);
        }
      }
    }

    return finalEmployees;
  }, [rawEmployeePositions, currentUserEmployee, opportunityData, initialOwnerEmployee, initialValues?.owner]);

  // Auto-select current user once their employee data has loaded (only for new opportunities, not editing)
  useEffect(() => {
    const currentOpportunityId =
      businessAppContext.additionalData?.opportunityId ||
      businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters
        ?.opportunityId;

    if (
      currentUserEmployee &&
      !formValues.owner &&
      !autoSelectionDone.current &&
      !currentOpportunityId && // Don't auto-select when editing existing opportunity
      !opportunityData && // Don't auto-select when we have opportunity data
      !initialValues?.owner // Don't auto-select when initial values already contain an owner (e.g., from lead conversion)
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
    businessAppContext.additionalData?.opportunityId,
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters
      ?.opportunityId,
    opportunityData,
    initialValues?.owner, // Add initialValues.owner to dependencies
  ]);

  // Pipeline catalogs hook (for pipeline and stage dropdowns)
  const {
    pipelineOptions,
    pipelineStageOptions,
    isLoadingPipelines,
    isLoadingStages,
    pipelineError,
    stageError,
    refetchStages,
  } = usePipelineCatalogs(businessAppContext, formValues.pipeline);

  // Transform pipeline options to SelectOption format
  const pipelineSelectOptions: SelectOption[] = useMemo(() => {
    return pipelineOptions.map((pipeline) => ({
      id: pipeline.id,
      value: pipeline.value, // This is the catalog ID for the API
      label: pipeline.label, // This is the human-readable value for display
      name: pipeline.name, // Same as label
    }));
  }, [pipelineOptions]);

  // Transform pipeline stage options to SelectOption format
  const pipelineStageSelectOptions: SelectOption[] = useMemo(() => {
    return pipelineStageOptions.map((stage) => ({
      id: stage.id,
      value: stage.value,
      label: stage.label,
      name: stage.name,
    }));
  }, [pipelineStageOptions]);

  // Investment Group Catalog Hook
  const investmentGroupsConfig = useMemo(() => ({
    catalogIdentifier: INVESTMENT_GROUP_CATALOG,
    version: INVESTMENT_GROUP_VERSION,
    businessAppContext
  }), [businessAppContext]);

  const investmentGroupsHook = useSearchableCatalog(investmentGroupsConfig);

  // Investment Role Catalog Hook  
  const investmentRolesConfig = useMemo(() => ({
    catalogIdentifier: INVESTMENT_ROLE_CATALOG,
    version: INVESTMENT_ROLE_VERSION,
    businessAppContext
  }), [businessAppContext]);

  const investmentRolesHook = useSearchableCatalog(investmentRolesConfig);

  // Investment Stake Type Catalog Hook
  const investmentStakeTypesConfig = useMemo(() => ({
    catalogIdentifier: INVESTMENT_STAKE_TYPE_CATALOG,
    version: INVESTMENT_STAKE_TYPE_VERSION,
    businessAppContext
  }), [businessAppContext]);

  const investmentStakeTypesHook = useSearchableCatalog(investmentStakeTypesConfig);

  // Measurement Unit Catalog Hook (with AREA filter same as lead form)
  const measurementUnitsConfig = useMemo(() => ({
    catalogIdentifier: MEASUREMENT_UNIT_CATALOG,
    version: MEASUREMENT_UNIT_VERSION,
    businessAppContext,
    whereConditions: { type: "AREA" }
  }), [businessAppContext]);

  const measurementUnitsHook = useSearchableCatalog(measurementUnitsConfig);

  // Dependent Investment Types Hook (based on selected investment group)
  const dependentInvestmentTypesHook = useInvestmentGroupTypes(
    formValues.investmentGroupRef,
    businessAppContext.accessToken
  );

  // Extract opportunityId and investmentId for tracking changes
  const opportunityId =
    businessAppContext.additionalData?.opportunityId ||
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters
      ?.opportunityId ||
    initialValues?.id;

  const investmentId =
    businessAppContext.additionalData?.investmentId ||
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters
      ?.investmentId;

  // Load investment data when investment ID is present
  useEffect(() => {
    let isActive = true;

    const loadInvestmentData = async () => {
      if (!investmentId || !businessAppContext.accessToken) {
        return;
      }

      try {
        if (isActive) {
          setInvestmentDataLoading(true);
          setInvestmentDataError(null);
        }

        const result = await fetchInvestmentById(investmentId);

        if (!isActive) return;

        if (result.investment) {
          setInvestmentData(result.investment);
        } else {
          // Clear stale investment data when no investment is found
          setInvestmentData(null);
          const errorMessage = getTranslationFromI18nKeyAndLabel(
            "crm.investments.errors.investmentNotFound",
            "Investment not found"
          );
          setInvestmentDataError(errorMessage);
        }
      } catch (err) {
        if (!isActive) return;

        // Clear stale investment data when an error occurs
        setInvestmentData(null);
        const errorMessage =
          err instanceof Error
            ? err.message
            : getTranslationFromI18nKeyAndLabel(
                "crm.investments.errors.unknownErrorLoadingData",
                "Unknown error loading investment data"
              );
        console.error(
          "❌ Investment Data: Error loading investment data:",
          err
        );
        setInvestmentDataError(errorMessage);
      } finally {
        if (isActive) {
          setInvestmentDataLoading(false);
        }
      }
    };

    if (investmentId) {
      loadInvestmentData();
    } else {
      // Reset investment data/loading/error immediately when investmentId becomes falsy
      setInvestmentData(null);
      setInvestmentDataLoading(false);
      setInvestmentDataError(null);
    }

    return () => {
      isActive = false;
    };
  }, [investmentId, businessAppContext.accessToken, fetchInvestmentById]);

  // Reset auto-selection flag when opportunity or investment changes or when creating new opportunity
  useEffect(() => {
    autoSelectionDone.current = false;
  }, [opportunityId, investmentId]);

  // Set auto-selection flag when initial values contain prefilled data (e.g., from lead conversion)
  useEffect(() => {
    if (
      initialValues?.owner ||
      initialValues?.investmentGroupRef ||
      initialValues?.investmentRoleRef ||
      initialValues?.investmentStakeTypeRef ||
      initialValues?.investmentTypeRef ||
      initialValues?.estimatedAmount ||
      initialValues?.initialInvestmentAmount ||
      initialValues?.name ||
      initialValues?.investmentName
    ) {
      autoSelectionDone.current = true; // Prevent auto-selection when we have prefilled data
    }
  }, [
    initialValues?.owner,
    initialValues?.investmentGroupRef,
    initialValues?.investmentRoleRef,
    initialValues?.investmentStakeTypeRef,
    initialValues?.investmentTypeRef,
    initialValues?.estimatedAmount,
    initialValues?.initialInvestmentAmount,
    initialValues?.name,
    initialValues?.investmentName,
  ]);

  // Populate form values when opportunity data is loaded (for editing existing opportunities)
  useEffect(() => {
    // Only populate if we have opportunity data and the form doesn't already have this opportunity's data
    if (
      opportunityData &&
      opportunityData.id &&
      (!formValues.id || formValues.id !== opportunityData.id)
    ) {
      const mappedValues = mapOpportunityToFormValues(opportunityData);
      setFormValuesState((prev) => ({
        ...prev,
        ...mappedValues,
      }));

      // Don't auto-select current user if we're editing an existing opportunity
      autoSelectionDone.current = true;
    }
  }, [
    opportunityData,
    mapOpportunityToFormValues,
    businessAppContext.additionalData?.opportunityId,
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters
      ?.opportunityId,
  ]);

  // Populate form values when investment data is loaded (for creating opportunity from investment)
  useEffect(() => {
    // Only populate if we have investment data and no opportunity data (to avoid conflicts)
    if (
      investmentData &&
      investmentData.id &&
      !opportunityData && // Don't populate from investment if we have opportunity data
      !formValues.id // Don't populate if form already has an ID (editing existing opportunity)
    ) {
      const mappedValues = mapInvestmentToFormValues(investmentData);
      setFormValuesState((prev) => ({
        ...prev,
        ...mappedValues,
      }));

      // Don't auto-select current user if we're creating from investment data
      autoSelectionDone.current = true;
    }
  }, [
    investmentData,
    mapInvestmentToFormValues,
    opportunityData,
    formValues.id,
    businessAppContext.additionalData?.investmentId,
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters
      ?.investmentId,
  ]);

  // Auto-load stages when pipeline is set (for loaded opportunity data)
  useEffect(() => {
    if (formValues.pipeline && refetchStages) {
      refetchStages(formValues.pipeline);
    }
  }, [formValues.pipeline]);

  // Initialize investment catalogs when context is ready
  useEffect(() => {
    if (businessAppContext.accessToken) {
      investmentGroupsHook.initialize();
      investmentRolesHook.initialize();
      investmentStakeTypesHook.initialize();
      measurementUnitsHook.initialize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessAppContext.accessToken]); // Only depend on accessToken, not the hook objects to avoid infinite loop

  // Clear investment type when investment group changes (but NOT during initial data load)
  useEffect(() => {
    if (formValues.investmentGroupRef) {
    }
  }, [formValues.investmentGroupRef]);

  // Update form values
  const setFormValues = useCallback(
    (updates: Partial<InvestmentOpportunityFormValues>) => {
      setFormValuesState((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  // Wrap onSubmit with loading state management and process completion waiting
  const handleSubmitWithLoading = useCallback(
    async (values: InvestmentOpportunityFormValues) => {
      setIsLoading(true);
      setError(null);
      try {
        await onSubmit(values); // Call the original onSubmit

        // Wait for process completion event
        await new Promise<void>((resolve) => {
          const TIMEOUT = 10000; // 10 second timeout for safety
          const timeoutId = setTimeout(() => {
            cleanup();
            resolve();
          }, TIMEOUT);

          const handleProcessCompletion = (event: Event) => {
            const customEvent = event as CustomEvent<{ resolution: 'success' | 'failure' }>;
            if (
              customEvent.detail?.resolution === 'success' ||
              customEvent.detail?.resolution === 'failure'
            ) {
              cleanup();
              resolve();
            }
          };

          const cleanup = () => {
            clearTimeout(timeoutId);
            window.removeEventListener('com.newwork.process.processCompletion', handleProcessCompletion);
            window.removeEventListener('com.newwork.process.taskCompletion', handleProcessCompletion);
          };

          window.addEventListener('com.newwork.process.processCompletion', handleProcessCompletion);
          window.addEventListener('com.newwork.process.taskCompletion', handleProcessCompletion);
        });

      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Submission error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [onSubmit]
  );

  // Context value
  const contextValue: InvestmentOpportunityFormContextValue = useMemo(
    () => ({
      formValues,
      setFormValues,
      onSubmit: handleSubmitWithLoading, // Export the wrapped function
      onCancel,
      isLoading: isLoading || opportunityDataLoading || investmentDataLoading,
      error: error || opportunityDataError || investmentDataError,
      hideActions,

      // Employee positions
      employeePositions: employeePositionsSelectOptions,
      employeePositionsLoading,
      employeePositionsError,
      employeePositionsHasMore,
      searchEmployeePositions,
      loadMoreEmployeePositions,

      // Static data
      dealTypes: DEAL_TYPES,

      // Pipeline data
      pipelines: pipelineSelectOptions,
      pipelineStages: pipelineStageSelectOptions,
      pipelinesLoading: isLoadingPipelines,
      pipelineStagesLoading: isLoadingStages,
      pipelineError,
      pipelineStageError: stageError,
      refetchStages,

      // Investment Group data
      investmentGroupsSearchable: investmentGroupsHook.options,
      investmentGroupsLoading: investmentGroupsHook.loading,
      investmentGroupsError: investmentGroupsHook.error,
      investmentGroupsHasMore: investmentGroupsHook.hasMore,
      searchInvestmentGroups: investmentGroupsHook.search,
      loadMoreInvestmentGroups: investmentGroupsHook.loadMore,

      // Investment Role data
      investmentRolesSearchable: investmentRolesHook.options,
      investmentRolesLoading: investmentRolesHook.loading,
      investmentRolesError: investmentRolesHook.error,
      investmentRolesHasMore: investmentRolesHook.hasMore,
      searchInvestmentRoles: investmentRolesHook.search,
      loadMoreInvestmentRoles: investmentRolesHook.loadMore,

      // Investment Stake Type data
      investmentStakeTypesSearchable: investmentStakeTypesHook.options,
      investmentStakeTypesLoading: investmentStakeTypesHook.loading,
      investmentStakeTypesError: investmentStakeTypesHook.error,
      investmentStakeTypesHasMore: investmentStakeTypesHook.hasMore,
      searchInvestmentStakeTypes: investmentStakeTypesHook.search,
      loadMoreInvestmentStakeTypes: investmentStakeTypesHook.loadMore,

      // Measurement Unit data
      measurementUnitsSearchable: measurementUnitsHook.options,
      measurementUnitsLoading: measurementUnitsHook.loading,
      measurementUnitsError: measurementUnitsHook.error,
      measurementUnitsHasMore: measurementUnitsHook.hasMore,
      searchMeasurementUnits: measurementUnitsHook.search,
      loadMoreMeasurementUnits: measurementUnitsHook.loadMore,

      // Dependent Investment Types (based on selected group)
      dependentInvestmentTypes: dependentInvestmentTypesHook.investmentTypes,
      dependentInvestmentTypesLoading: dependentInvestmentTypesHook.loadingInvestmentTypes,
      dependentInvestmentTypesError: dependentInvestmentTypesHook.errorInvestmentTypes,

      // Business app context
      businessAppContext,
    }),
    [
      formValues,
      setFormValues,
      handleSubmitWithLoading,
      onCancel,
      isLoading,
      error,
      opportunityDataLoading,
      opportunityDataError,
      investmentDataLoading,
      investmentDataError,
      hideActions,
      employeePositionsSelectOptions,
      employeePositionsLoading,
      employeePositionsError,
      employeePositionsHasMore,
      searchEmployeePositions,
      loadMoreEmployeePositions,
      pipelineSelectOptions,
      pipelineStageSelectOptions,
      isLoadingPipelines,
      isLoadingStages,
      pipelineError,
      stageError,
      refetchStages,
      investmentGroupsHook.options,
      investmentGroupsHook.loading,
      investmentGroupsHook.error,
      investmentGroupsHook.hasMore,
      investmentGroupsHook.search,
      investmentGroupsHook.loadMore,
      investmentRolesHook.options,
      investmentRolesHook.loading,
      investmentRolesHook.error,
      investmentRolesHook.hasMore,
      investmentRolesHook.search,
      investmentRolesHook.loadMore,
      investmentStakeTypesHook.options,
      investmentStakeTypesHook.loading,
      investmentStakeTypesHook.error,
      investmentStakeTypesHook.hasMore,
      investmentStakeTypesHook.search,
      investmentStakeTypesHook.loadMore,
      measurementUnitsHook.options,
      measurementUnitsHook.loading,
      measurementUnitsHook.error,
      measurementUnitsHook.hasMore,
      measurementUnitsHook.search,
      measurementUnitsHook.loadMore,
      dependentInvestmentTypesHook.investmentTypes,
      dependentInvestmentTypesHook.loadingInvestmentTypes,
      dependentInvestmentTypesHook.errorInvestmentTypes,
      businessAppContext,
    ]
  );

  return (
    <OpportunityFormContext.Provider value={contextValue}>
      {children}
    </OpportunityFormContext.Provider>
  );
};

export const useOpportunityFormContext = () => {
  const context = useContext(OpportunityFormContext);
  if (!context) {
    throw new Error(
      "useOpportunityFormContext must be used within an OpportunityFormProvider"
    );
  }
  return context;
};
