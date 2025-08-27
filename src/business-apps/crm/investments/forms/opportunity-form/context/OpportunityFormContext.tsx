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
  RECORD_STATES,
} from "../types";
import { useInvestmentOpportunityData } from "../hooks/useOpportunityData";
import { usePipelineCatalogs } from "../hooks/usePipelineCatalogs";

interface InvestmentOpportunityFormContextValue {
  formValues: InvestmentOpportunityFormValues;
  setFormValues: (updates: Partial<InvestmentOpportunityFormValues>) => void;
  onSubmit: (values: InvestmentOpportunityFormValues) => Promise<void>;
  onCancel: () => Promise<void>;
  isLoading: boolean;
  error: string | null;

  // Employee positions (for owner selection)
  employeePositions: SelectOption[];
  employeePositionsLoading: boolean;
  employeePositionsError: string | null;
  employeePositionsHasMore: boolean;
  loadMoreEmployeePositions: () => void;
  searchEmployeePositions: (search: string) => void;

  // Static data
  dealTypes: SelectOption[];
  recordStates: SelectOption[];

  // Pipeline data
  pipelines: SelectOption[];
  pipelineStages: SelectOption[];
  pipelinesLoading: boolean;
  pipelineStagesLoading: boolean;
  pipelineError: string | null;
  pipelineStageError: string | null;
  refetchStages: (selectedPipelineId?: string) => void;

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
}

export const OpportunityFormProvider: React.FC<
  InvestmentOpportunityFormProviderProps
> = ({
  children,
  businessAppContext,
  initialValues = {},
  onSubmit = async () => {},
  onCancel = async () => {},
}) => {
  const { accessToken } = businessAppContext;

  // Form state
  const [formValues, setFormValuesState] =
    useState<InvestmentOpportunityFormValues>({
      // Basic Information
      owner: "",
      name: "",
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

      // Relationship Information
      account: "",
      accountId: "",

      // Additional Information
      notesSummary: "",

      // System and Process fields
      processInstanceId: "",
      recordState: "ACTIVE",

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
    });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-selection tracking
  const autoSelectionDone = useRef(false);

  // Get current user for auto-owner selection (using userInfo from BusinessAppContext)
  const currentUserId =
    businessAppContext.userInfo?.employeeDetails?.employeeId;
  const { employee: currentUserEmployee } = useEmployeeById({
    accessToken,
    employeeId: currentUserId,
  });

  // Investment Opportunity data fetching hook for pre-filling form when updating existing opportunity (MUST BE BEFORE employee positions)
  const {
    opportunityData,
    loading: opportunityDataLoading,
    error: opportunityDataError,
    mapOpportunityToFormValues,
  } = useInvestmentOpportunityData({ businessAppContext });

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
          picture: emp.employee?.picture,
          pictureThumbnail: emp.employee?.pictureThumbnail,
          jobPosition: jobTitle,
          organizationalUnit: orgUnit,
          userId: emp.employee?.userId,
        },
      };
    });

    finalEmployees.push(...regularEmployees);

    // Add current user to the beginning if they're not already in the list
    if (currentUserEmployee) {
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
          picture: currentUserEmployee.employee?.picture,
          pictureThumbnail: currentUserEmployee.employee?.pictureThumbnail,
          jobPosition: currentUserJobTitle,
          organizationalUnit: currentUserOrgUnit,
          userId: currentUserEmployee.employee?.userId,
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
            pictureThumbnail: opportunityData.ownerEmployee.pictureThumbnail,
            jobPosition: "Owner",
            organizationalUnit: "N/A",
            userId: undefined,
          },
        };

        finalEmployees.unshift(opportunityOwnerOption);
      }
    }

    return finalEmployees;
  }, [rawEmployeePositions, currentUserEmployee, opportunityData]);

  // Auto-select current user once their employee data has loaded (only for new opportunities, not editing)
  useEffect(() => {
    const currentOpportunityId =
      businessAppContext.additionalData?.opportunityId ||
      businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters
        ?.opportunityId;

    console.log("👤 Auto-selection check:", {
      hasCurrentUserEmployee: !!currentUserEmployee,
      currentUserEmployeeId: currentUserEmployee?.employeeId,
      formOwner: formValues.owner,
      autoSelectionDone: autoSelectionDone.current,
      currentOpportunityId: currentOpportunityId,
      hasOpportunityData: !!opportunityData,
      shouldAutoSelect:
        currentUserEmployee &&
        !formValues.owner &&
        !autoSelectionDone.current &&
        !currentOpportunityId &&
        !opportunityData,
    });

    // Only auto-select if:
    // 1. We have current user employee data
    // 2. No owner is set yet
    // 3. We haven't already done auto-selection
    // 4. We're NOT editing an existing opportunity (no opportunityId)
    if (
      currentUserEmployee &&
      !formValues.owner &&
      !autoSelectionDone.current &&
      !currentOpportunityId && // Don't auto-select when editing existing opportunity
      !opportunityData // Don't auto-select when we have opportunity data
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

  // Extract opportunityId for tracking changes
  const opportunityId =
    businessAppContext.additionalData?.opportunityId ||
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters
      ?.opportunityId ||
    initialValues?.id;

  // Reset auto-selection flag when opportunity changes or when creating new opportunity
  useEffect(() => {
    autoSelectionDone.current = false;
  }, [opportunityId]);

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

  // Auto-load stages when pipeline is set (for loaded opportunity data)
  useEffect(() => {
    if (formValues.pipeline && refetchStages) {
      console.log("🔄 Auto-loading stages for pipeline:", formValues.pipeline);
      refetchStages(formValues.pipeline);
    }
  }, [formValues.pipeline]);

  // Update form values
  const setFormValues = useCallback(
    (updates: Partial<InvestmentOpportunityFormValues>) => {
      console.log("🔄 Form values update:", updates);
      setFormValuesState((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  // Context value
  const contextValue: InvestmentOpportunityFormContextValue = useMemo(
    () => ({
      formValues,
      setFormValues,
      onSubmit,
      onCancel,
      isLoading: isLoading || opportunityDataLoading,
      error: error || opportunityDataError,

      // Employee positions
      employeePositions: employeePositionsSelectOptions,
      employeePositionsLoading,
      employeePositionsError,
      employeePositionsHasMore,
      searchEmployeePositions,
      loadMoreEmployeePositions,

      // Static data
      dealTypes: DEAL_TYPES,
      recordStates: RECORD_STATES,

      // Pipeline data
      pipelines: pipelineSelectOptions,
      pipelineStages: pipelineStageSelectOptions,
      pipelinesLoading: isLoadingPipelines,
      pipelineStagesLoading: isLoadingStages,
      pipelineError,
      pipelineStageError: stageError,
      refetchStages,

      // Business app context
      businessAppContext,
    }),
    [
      formValues,
      setFormValues,
      onSubmit,
      onCancel,
      isLoading,
      error,
      opportunityDataLoading,
      opportunityDataError,
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
