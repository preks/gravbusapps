import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { InvestmentFormValues, SelectOption, InvestmentContextState } from '../types';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useEmployeePositions } from '../hooks/useEmployeePositions';
import { useEmployeeById, EmployeeByIdData } from '../hooks/useEmployeeById';
import { useGetInvestmentAccounts } from '@/common/data/investment';
import { useInvestmentGroups } from '../hooks/useInvestmentGroupCatalog';
import { useInvestmentRoleCatalog } from '../hooks/useInvestmentRoleCatalog';
import { useRealEstateTypes } from '../hooks/useRealEstateTypeCatalog';
import { useInvestmentOwnershipStructures } from '../hooks/useInvestmentOwnershipStructureCatalog';
import { useInterestPaymentFrequencies } from '../hooks/useInterestPaymentFrequencyCatalog';
import { useInvestmentTypeCatalog } from '../hooks/useInvestmentTypeCatalog';
import { useInvestmentLiquidFundTypeCatalog } from '../hooks/useInvestmentLiquidFundTypeCatalog';
// validation handled via zod resolver in the form component
// Note: Using centralized investment queries but with form-specific data transformation
import { useGetInvestmentCatalogData, InvestmentCatalogData, FormFieldsDefinition } from '../queries/InvestmentCatalogQueries';

interface InvestmentFormContextValue extends InvestmentContextState {
  formValues: InvestmentFormValues;
  setFormValues: (updates: Partial<InvestmentFormValues>) => void;
  onSubmit: (values: InvestmentFormValues) => Promise<void>;
  onCancel: () => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  
  // Business app context
  businessAppContext: BusinessAppContextProps;
  
  // Current employee data
  currentEmployee: EmployeeByIdData | null;
  currentEmployeeLoading: boolean;
  currentEmployeeError: string | null;
  
  // Employee positions (already searchable)
  employeePositions: SelectOption[];
  employeePositionsLoading: boolean;
  employeePositionsError: string | null;
  employeePositionsHasMore: boolean;
  loadMoreEmployeePositions: () => void;
  searchEmployeePositions: (search: string) => void;
  
  // Investment groups
  investmentGroups: SelectOption[];
  investmentGroupsLoading: boolean;
  investmentGroupsError: string | null;
  investmentGroupsHasMore: boolean;
  searchInvestmentGroups: (search: string) => void;
  loadMoreInvestmentGroups: () => void;
  
  // Investment roles
  investmentRoles: SelectOption[];
  investmentRolesLoading: boolean;
  investmentRolesError: string | null;
  investmentRolesHasMore: boolean;
  searchInvestmentRoles: (search: string) => void;
  loadMoreInvestmentRoles: () => void;
  
  // Real estate types
  realEstateTypes: SelectOption[];
  realEstateTypesLoading: boolean;
  realEstateTypesError: string | null;
  realEstateTypesHasMore: boolean;
  searchRealEstateTypes: (search: string) => void;
  loadMoreRealEstateTypes: () => void;
  
  // Investment ownership structures
  investmentOwnershipStructures: SelectOption[];
  investmentOwnershipStructuresLoading: boolean;
  investmentOwnershipStructuresError: string | null;
  investmentOwnershipStructuresHasMore: boolean;
  searchInvestmentOwnershipStructures: (search: string) => void;
  loadMoreInvestmentOwnershipStructures: () => void;
  
  // Interest payment frequencies
  interestPaymentFrequencies: SelectOption[];
  interestPaymentFrequenciesLoading: boolean;
  interestPaymentFrequenciesError: string | null;

  // Investment types (based on selected group)
  investmentTypes: SelectOption[];
  investmentTypesLoading: boolean;
  investmentTypesError: string | null;
  interestPaymentFrequenciesHasMore: boolean;
  searchInterestPaymentFrequencies: (search: string) => void;
  loadMoreInterestPaymentFrequencies: () => void;
  
  // Investment liquid fund types (based on selected investment type)
  investmentLiquidFundTypes: SelectOption[];
  investmentLiquidFundTypesLoading: boolean;
  investmentLiquidFundTypesError: string | null;
  
  // Account data (centralized)
  fetchInvestmentAccounts: (variables?: any) => Promise<any>;
  
  // Validation
  validationErrors: Record<string, string>;
  isFormValid: boolean;
  
  // Investment catalog data (form fields definitions)
  investmentCatalogData: InvestmentCatalogData | null;
  investmentCatalogLoading: boolean;
  investmentCatalogError: string | null;
  
  // Helper to get form fields for current selection
  getFormFieldsDefinition: (overrideFormValues?: Partial<InvestmentFormValues>) => FormFieldsDefinition | null;
}

interface InvestmentFormProviderProps {
  children: React.ReactNode;
  businessAppContext: BusinessAppContextProps;
  initialValues?: Partial<InvestmentFormValues>;
  onSubmit?: (values: InvestmentFormValues) => Promise<void>;
  onCancel?: () => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const InvestmentFormContext = createContext<InvestmentFormContextValue | undefined>(undefined);

export const useInvestmentFormContext = () => {
  const context = useContext(InvestmentFormContext);
  if (!context) {
    throw new Error('useInvestmentFormContext must be used within an InvestmentFormProvider');
  }
  return context;
};

export const InvestmentFormProvider: React.FC<InvestmentFormProviderProps> = ({
  children,
  businessAppContext,
  initialValues = {},
  onSubmit = async () => {},
  onCancel = async () => {},
  onDelete,
}) => {
  // Form state - nested structure matching API
  // NOTE: Form state stores full catalog/entity objects
  const [formValues, setFormValuesState] = useState<InvestmentFormValues>(() => {
    // Build initial investment data with proper defaults
    // Only create objects if we have actual data, not empty defaults
    const investment: any = {
      name: initialValues.investment?.name || '',
      // Only set these if they exist in initialValues, otherwise leave undefined
      // The auto-selection effect will handle setting defaults
    };
    
    // Add fields from initialValues if they exist
    if (initialValues.investment?.investmentGroup) {
      investment.investmentGroup = initialValues.investment.investmentGroup;
    }
    if (initialValues.investment?.ownerEmployee) {
      investment.ownerEmployee = initialValues.investment.ownerEmployee;
    }
    if (initialValues.investment?.investmentStatus) {
      investment.investmentStatus = initialValues.investment.investmentStatus;
    }
    if (initialValues.investment?.id) {
      investment.id = initialValues.investment.id;
    }
    if (initialValues.investment?.version) {
      investment.version = initialValues.investment.version;
    }
    if (initialValues.investment?.currency) {
      investment.currency = initialValues.investment.currency;
    }
    if (initialValues.investment?.investmentAccount) {
      investment.investmentAccount = initialValues.investment.investmentAccount;
    }
    
    return {
      investment,
      equityInvestment: initialValues.equityInvestment,
      realEstateInvestment: initialValues.realEstateInvestment,
      liquidFundInvestment: initialValues.liquidFundInvestment,
    };
  });



  // Enhanced setFormValues with proper nested merging and cascade clearing
  const setFormValues = useCallback((updates: Partial<InvestmentFormValues>) => {
    setFormValuesState(prev => {
      // Deep merge nested structures
      const newValues: InvestmentFormValues = {
        investment: {
          ...prev.investment,
          ...updates.investment,
        },
        // Deep merge subtype objects to preserve dynamic fields
        equityInvestment: updates.equityInvestment !== undefined 
          ? { ...prev.equityInvestment, ...updates.equityInvestment } 
          : prev.equityInvestment,
        realEstateInvestment: updates.realEstateInvestment !== undefined 
          ? { ...prev.realEstateInvestment, ...updates.realEstateInvestment } 
          : prev.realEstateInvestment,
        liquidFundInvestment: updates.liquidFundInvestment !== undefined
          ? { ...prev.liquidFundInvestment, ...updates.liquidFundInvestment }
          : prev.liquidFundInvestment,
      };
      
      // Extract group codes for cascade logic
      // NOTE: Form state stores catalog objects or string IDs
      const getGroupCode = (group: any): string | undefined => {
        if (!group) return undefined;
        const id = typeof group === 'object' ? group.id : group;
        return id?.split(':').pop();
      };
      const prevGroupCode = getGroupCode(prev.investment.investmentGroup);
      const newGroupCode = getGroupCode(newValues.investment.investmentGroup);
      
      // Clear downstream selections when group changes (but NOT if subtype data is being explicitly set in the update)
      const isExplicitlySettingSubtype = 
        updates.equityInvestment !== undefined || 
        updates.realEstateInvestment !== undefined || 
        updates.liquidFundInvestment !== undefined;
      
      if (newGroupCode !== prevGroupCode && !isExplicitlySettingSubtype) {
        if (updates.investment?.investmentType === undefined) {
          newValues.investment.investmentType = undefined; // Without Ref suffix
        }
        // Clear all subtype data when group changes (unless we're explicitly setting it)
        newValues.equityInvestment = undefined;
        newValues.realEstateInvestment = undefined;
        newValues.liquidFundInvestment = undefined;
      }
      
      return newValues;
    });
  }, []);

  // Global state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors] = useState<Record<string, string>>({});



  // Note: Account autocomplete now uses centralized fetchInvestmentAccounts

  // Ref to track if auto-selection has been done
  const autoSelectionDone = useRef(false);

  // Employee positions hook
  const {
    employeePositions: employeePositionData,
    loading: employeePositionsLoading,
    error: employeePositionsError,
    hasMore: employeePositionsHasMore,
    searchEmployees: searchEmployeePositions,
    loadMore: loadMoreEmployeePositions
  } = useEmployeePositions({ accessToken: businessAppContext.accessToken });

  // Current employee hook - for loading the owner's information
  const ownerEmployeeForFetch = React.useMemo(() => {
    const ownerEmployee = formValues.investment.ownerEmployee;
    // Handle null explicitly (typeof null === 'object' in JavaScript)
    if (ownerEmployee === null || ownerEmployee === undefined) {
      return undefined;
    }
    const result = typeof ownerEmployee === 'object' 
      ? ownerEmployee.id || undefined 
      : (ownerEmployee || undefined);
    return result;
  }, [formValues.investment.ownerEmployee]);

  const {
    employee: currentEmployee,
    loading: currentEmployeeLoading,
    error: currentEmployeeError
  } = useEmployeeById({ 
    accessToken: businessAppContext.accessToken,
    employeeId: ownerEmployeeForFetch
  });

  // Investment catalog data - load immediately when context initializes
  const [investmentCatalogData, setInvestmentCatalogData] = useState<InvestmentCatalogData | null>(null);
  const [investmentCatalogLoading, setInvestmentCatalogLoading] = useState(false);
  const [investmentCatalogError, setInvestmentCatalogError] = useState<string | null>(null);
  
  const { fetchInvestmentCatalogData } = useGetInvestmentCatalogData(businessAppContext);

  // Load investment catalog data immediately
  useEffect(() => {
    if (!businessAppContext.accessToken) return;

    const loadCatalogData = async () => {
      setInvestmentCatalogLoading(true);
      setInvestmentCatalogError(null);
      
      try {
        const data = await fetchInvestmentCatalogData();
        setInvestmentCatalogData(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch investment catalog data';
        setInvestmentCatalogError(errorMessage);
        console.error('Failed to load investment catalog data:', err);
      } finally {
        setInvestmentCatalogLoading(false);
      }
    };

    loadCatalogData();
  }, [businessAppContext.accessToken, fetchInvestmentCatalogData]);

  // Helper function to get form fields for current selection
  const getFormFieldsDefinition = useCallback((overrideFormValues?: Partial<InvestmentFormValues>): FormFieldsDefinition | null => {
    if (!investmentCatalogData) return null;

    // Use override values if provided, otherwise use current formValues
    const effectiveFormValues = overrideFormValues ? { ...formValues, ...overrideFormValues } : formValues;

    // Extract codes from nested structure
    // NOTE: Form state stores catalog objects or string IDs
    // Extract ID from object if needed: object.id or string directly
    const getIdFromField = (field: any): string | null => {
      if (!field) return null;
      const id = typeof field === 'object' ? field.id : field;
      return id || null;
    };
    const groupId = getIdFromField(effectiveFormValues.investment.investmentGroup);
    const typeId = getIdFromField(effectiveFormValues.investment.investmentType);
    const liquidFundTypeId = getIdFromField(effectiveFormValues.liquidFundInvestment?.investmentLiquidFundType);
    
    const groupCode = groupId?.split(':').pop() || null;
    const typeCode = typeId?.split(':').pop() || null;
    const liquidFundTypeCode = liquidFundTypeId?.split(':').pop() || null;

    // PRIORITY 1: Investment Liquid Fund Type (highest priority for liquid funds)
    if (groupCode === 'LIQUID_FUND' && liquidFundTypeCode) {
      const liquidFundTypeEntry = investmentCatalogData.investmentLiquidFundTypes?.find(
        entry => entry.code === liquidFundTypeCode
      );
      if (liquidFundTypeEntry?.objectValue?.formFields && liquidFundTypeEntry.objectValue.formFields.length > 0) {
        return liquidFundTypeEntry.objectValue;
      }
    }

    // PRIORITY 2: Investment Type
    if (typeCode) {
      const typeEntry = investmentCatalogData.investmentTypes.find(type => type.code === typeCode);
      if (typeEntry && typeEntry.objectValue && typeEntry.objectValue.formFields?.length > 0) {
        return typeEntry.objectValue;
      }
    }

    // PRIORITY 3: Investment Group (fallback)
    if (groupCode) {
      const groupEntry = investmentCatalogData.investmentGroups.find(group => group.code === groupCode);
      if (groupEntry && groupEntry.objectValue && groupEntry.objectValue.formFields?.length > 0) {
        return groupEntry.objectValue;
      }
    }

    return null;
  }, [investmentCatalogData, formValues.investment.investmentGroup, formValues.investment.investmentType, formValues.liquidFundInvestment]);

  // Current user employee hook - for ensuring current user is always available in the list
  const currentUserEmployeeId = businessAppContext.userInfo?.employeeDetails?.employeeId;
  const {
    employee: currentUserEmployee,
    loading: currentUserEmployeeLoading,
    error: currentUserEmployeeError
  } = useEmployeeById({ 
    accessToken: businessAppContext.accessToken,
    employeeId: currentUserEmployeeId || ''
  });
  
  // Prevent unused variable warnings
  void currentUserEmployeeLoading;
  void currentUserEmployeeError;

  // Investment groups hook
  const investmentGroupsHook = useInvestmentGroups(businessAppContext.accessToken);

  // Investment roles hook
  const investmentRolesHook = useInvestmentRoleCatalog(businessAppContext.accessToken);

  // Real estate types hook
  const realEstateTypesHook = useRealEstateTypes(businessAppContext.accessToken);

  // Investment ownership structures hook
  const investmentOwnershipStructuresHook = useInvestmentOwnershipStructures(businessAppContext.accessToken);

  // Interest payment frequencies hook
  const interestPaymentFrequenciesHook = useInterestPaymentFrequencies(businessAppContext.accessToken);

  // Investment types hook (based on selected group)
  // NOTE: Form state stores catalog objects or string IDs
  const groupId = typeof formValues.investment.investmentGroup === 'object' 
    ? formValues.investment.investmentGroup?.id 
    : formValues.investment.investmentGroup;
  const groupCode = groupId?.split(':').pop();
  const investmentTypesHook = useInvestmentTypeCatalog(businessAppContext.accessToken, groupCode);

  // Investment liquid fund types hook (based on selected investment type)
  const investmentTypeId = typeof formValues.investment.investmentType === 'object' 
    ? formValues.investment.investmentType?.id 
    : formValues.investment.investmentType;
  const investmentLiquidFundTypesHook = useInvestmentLiquidFundTypeCatalog(
    businessAppContext.accessToken, 
    investmentTypeId
  );

  // Accounts data hook for account autocomplete  
  const { fetchInvestmentAccounts } = useGetInvestmentAccounts(businessAppContext);

  // Note: Investment loading for update mode is handled in InvestmentFormComponent
  // Note: Opportunity pre-filling is handled in InvestmentFormComponent

  // Initialize investment groups and roles on mount
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (businessAppContext.accessToken && !hasInitialized.current) {
      hasInitialized.current = true;
      investmentGroupsHook.initialize();
      investmentRolesHook.initialize();
      realEstateTypesHook.initialize();
      investmentOwnershipStructuresHook.initialize();
      interestPaymentFrequenciesHook.initialize();
    }
  }, [businessAppContext.accessToken]); // Hook functions are stable, no need to include in deps



  // Note: Account loading now uses centralized fetchInvestmentAccounts

  // Auto-select current user as owner ONLY on initial mount if empty
  // This should NOT re-run when user manually clears the field
  useEffect(() => {
    // Only run once on mount
    if (autoSelectionDone.current) {
      return;
    }
    
    const ownerEmployee = formValues.investment.ownerEmployee;
    // Extract ID from object or use string directly
    const ownerIdValue = typeof ownerEmployee === 'object' && ownerEmployee 
      ? ownerEmployee.id 
      : ownerEmployee;
    
    const isOwnerEmpty = !ownerIdValue || (typeof ownerIdValue === 'string' && ownerIdValue.trim() === '');
    
    if (businessAppContext.userInfo?.employeeDetails?.employeeId && isOwnerEmpty) {
      setFormValuesState(prev => ({
        ...prev,
        investment: {
          ...prev.investment,
          ownerEmployee: { id: businessAppContext.userInfo?.employeeDetails?.employeeId || '' } as any
        }
      }));
    }
    
    // Mark as done regardless of whether we set it or not (owner might already be set from initialValues)
    autoSelectionDone.current = true;
  }, [businessAppContext.userInfo?.employeeDetails?.employeeId]); // Removed formValues dependency

  // Enhanced employee positions list that always includes current user at the top
  const enhancedEmployeePositions = useMemo(() => {
    const positions = [...employeePositionData];
    
    // If we have current user employee data and it's not already in the list, add it at the top
    if (currentUserEmployee && currentUserEmployeeId && 
        !positions.some(emp => emp.value === currentUserEmployeeId)) {
      const currentUserPosition: SelectOption = {
        id: currentUserEmployeeId,
        value: currentUserEmployeeId,
        label: currentUserEmployee.employee?.displayName || 
               `${currentUserEmployee.firstName || ''} ${currentUserEmployee.lastName || ''}`.trim(),
        name: currentUserEmployee.employee?.displayName || 
              `${currentUserEmployee.firstName || ''} ${currentUserEmployee.lastName || ''}`.trim(),
        extraInfo: {
          picture: currentUserEmployee.employee?.picture || null,
          pictureThumbnail: currentUserEmployee.employee?.pictureThumbnail || null,
          jobPosition: currentUserEmployee.jobPosition?.name || 'No Position',
          organizationalUnit: currentUserEmployee.organizationalUnit?.name || 'No Unit',
          department: currentUserEmployee.organizationalUnit?.name || 'No Department',
          position: currentUserEmployee.jobPosition?.name || 'No Position',
          userId: currentUserEmployee.employee?.userId || null,
        },
      };
      
      // Add current user at the beginning of the list
      positions.unshift(currentUserPosition);
    }
    
    // Ensure current owner (loaded from form) is present as an option
    const ownerEmployeeId = typeof formValues.investment.ownerEmployee === 'object' 
      ? formValues.investment.ownerEmployee?.id 
      : formValues.investment.ownerEmployee;
    
    if (currentEmployee && ownerEmployeeId &&
        !positions.some(emp => emp.value === ownerEmployeeId)) {
      const ownerDisplayName = currentEmployee.employee?.displayName || 
        `${currentEmployee.firstName || ''} ${currentEmployee.lastName || ''}`.trim();
      const ownerOption: SelectOption = {
        id: ownerEmployeeId,
        value: ownerEmployeeId,
        label: ownerDisplayName,
        name: ownerDisplayName,
        extraInfo: {
          picture: currentEmployee.employee?.picture || null,
          pictureThumbnail: currentEmployee.employee?.pictureThumbnail || null,
          jobPosition: currentEmployee.jobPosition?.name || 'No Position',
          organizationalUnit: currentEmployee.organizationalUnit?.name || 'No Unit',
          department: currentEmployee.organizationalUnit?.name || 'No Department',
          position: currentEmployee.jobPosition?.name || 'No Position',
          userId: currentEmployee.employee?.userId || null,
        },
      };
      positions.unshift(ownerOption);
    }
    
    return positions;
  }, [employeePositionData, currentUserEmployee, currentUserEmployeeId]);

  // Validation is handled by zod in AppActionForm; treat context as always valid
  const isFormValid = useMemo(() => true, []);


  // Handle form submission
  const handleSubmit = useCallback(async (values: InvestmentFormValues) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await onSubmit(values);
    } catch (err) {
      console.error('Error submitting investment form:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [onSubmit]);

  // Handle form cancellation
  const handleCancel = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await onCancel();
    } catch (err) {
      console.error('Error cancelling investment form:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [onCancel]);

  // Handle deletion
  const handleDelete = useCallback(async (id: string) => {
    if (!onDelete) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await onDelete(id);
    } catch (err) {
      console.error('Error deleting investment:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [onDelete]);

  const contextValue: InvestmentFormContextValue = {
    // Form state
    formValues,
    setFormValues,
    onSubmit: handleSubmit,
    onCancel: handleCancel,
    onDelete: handleDelete,
    
    // Business app context
    businessAppContext,
    
    // Global state
    isLoading,
    error,
    validationErrors,
    isFormValid,
    
    // Current employee data
    currentEmployee,
    currentEmployeeLoading,
    currentEmployeeError,
    
    // Employee positions
    employeePositions: enhancedEmployeePositions,
    employeePositionsLoading,
    employeePositionsError,
    employeePositionsHasMore,
    loadMoreEmployeePositions,
    searchEmployeePositions,
    
    // Investment groups
    investmentGroups: investmentGroupsHook.options,
    investmentGroupsLoading: investmentGroupsHook.loading,
    investmentGroupsError: investmentGroupsHook.error,
    investmentGroupsHasMore: investmentGroupsHook.hasMore,
    searchInvestmentGroups: investmentGroupsHook.search,
    loadMoreInvestmentGroups: investmentGroupsHook.loadMore,
    
    // Investment roles
    investmentRoles: investmentRolesHook.options,
    investmentRolesLoading: investmentRolesHook.loading,
    investmentRolesError: investmentRolesHook.error,
    investmentRolesHasMore: investmentRolesHook.hasMore,
    searchInvestmentRoles: investmentRolesHook.search,
    loadMoreInvestmentRoles: investmentRolesHook.loadMore,
    
    // Real estate types
    realEstateTypes: realEstateTypesHook.options,
    realEstateTypesLoading: realEstateTypesHook.loading,
    realEstateTypesError: realEstateTypesHook.error,
    realEstateTypesHasMore: realEstateTypesHook.hasMore,
    searchRealEstateTypes: realEstateTypesHook.search,
    loadMoreRealEstateTypes: realEstateTypesHook.loadMore,
    
    // Investment ownership structures
    investmentOwnershipStructures: investmentOwnershipStructuresHook.options,
    investmentOwnershipStructuresLoading: investmentOwnershipStructuresHook.loading,
    investmentOwnershipStructuresError: investmentOwnershipStructuresHook.error,
    investmentOwnershipStructuresHasMore: investmentOwnershipStructuresHook.hasMore,
    searchInvestmentOwnershipStructures: investmentOwnershipStructuresHook.search,
    loadMoreInvestmentOwnershipStructures: investmentOwnershipStructuresHook.loadMore,
    
    // Interest payment frequencies
    interestPaymentFrequencies: interestPaymentFrequenciesHook.options,
    interestPaymentFrequenciesLoading: interestPaymentFrequenciesHook.loading,
    interestPaymentFrequenciesError: interestPaymentFrequenciesHook.error,
    interestPaymentFrequenciesHasMore: interestPaymentFrequenciesHook.hasMore,
    searchInterestPaymentFrequencies: interestPaymentFrequenciesHook.search,
    loadMoreInterestPaymentFrequencies: interestPaymentFrequenciesHook.loadMore,

    // Investment types (based on selected group)
    investmentTypes: investmentTypesHook.options,
    investmentTypesLoading: investmentTypesHook.loading,
    investmentTypesError: investmentTypesHook.error,
    
    // Investment liquid fund types (based on selected investment type)
    investmentLiquidFundTypes: investmentLiquidFundTypesHook.options,
    investmentLiquidFundTypesLoading: investmentLiquidFundTypesHook.loading,
    investmentLiquidFundTypesError: investmentLiquidFundTypesHook.error,
    
    // Account autocomplete (migrated to centralized)
    fetchInvestmentAccounts,
    
    // Note: Account data now accessed via fetchInvestmentAccounts
    
    // Investment catalog data (form fields definitions)
    investmentCatalogData,
    investmentCatalogLoading,
    investmentCatalogError,
    getFormFieldsDefinition,
  };

  return (
    <InvestmentFormContext.Provider value={contextValue}>
      {children}
    </InvestmentFormContext.Provider>
  );
}; 