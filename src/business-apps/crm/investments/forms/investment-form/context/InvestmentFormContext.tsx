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
  getFormFieldsDefinition: () => FormFieldsDefinition | null;
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
  // Form state
  const [formValues, setFormValuesState] = useState<InvestmentFormValues>(() => {
    const initialFormValues = {
      ownerEmployeeId: initialValues.ownerEmployeeId || businessAppContext.userInfo?.employeeDetails?.employeeId || '',
      name: initialValues.name || '',
      accountId: initialValues.accountId || '',
      initialInvestmentAmount: initialValues.initialInvestmentAmount || '',
      group: initialValues.group || '',
      id: initialValues.id,
      version: initialValues.version,
      // Spread any additional initial values
      ...initialValues
    };

    return initialFormValues;
  });



  // Enhanced setFormValues that handles investment type clearing when group changes
  const setFormValues = useCallback((updates: Partial<InvestmentFormValues>) => {
    setFormValuesState(prev => {
      const newValues = { ...prev, ...updates };
      
      // If group is changing, clear investment type only when no explicit type is provided
      if (
        updates.group !== undefined &&
        updates.group !== prev.group &&
        updates.investmentTypeRef === undefined
      ) {
        newValues.investmentTypeRef = '';
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
  const {
    employee: currentEmployee,
    loading: currentEmployeeLoading,
    error: currentEmployeeError
  } = useEmployeeById({ 
    accessToken: businessAppContext.accessToken,
    employeeId: formValues.ownerEmployeeId 
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
  const getFormFieldsDefinition = useCallback((): FormFieldsDefinition | null => {
    if (!investmentCatalogData) return null;

    // Extract codes
    const groupCode = formValues.group ? formValues.group.split(':').pop() : null;
    const typeCode = formValues.investmentTypeRef ? formValues.investmentTypeRef.split(':').pop() : null;

    // First, try to get from investment type
    if (typeCode) {
      const typeEntry = investmentCatalogData.investmentTypes.find(type => type.code === typeCode);
      if (typeEntry && typeEntry.objectValue && typeEntry.objectValue.formFields?.length > 0) {
        return typeEntry.objectValue;
      }
    }

    // Fallback to investment group
    if (groupCode) {
      const groupEntry = investmentCatalogData.investmentGroups.find(group => group.code === groupCode);
      if (groupEntry && groupEntry.objectValue && groupEntry.objectValue.formFields?.length > 0) {
        return groupEntry.objectValue;
      }
    }

    return null;
  }, [investmentCatalogData, formValues.group, formValues.investmentTypeRef]);

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
  const investmentTypesHook = useInvestmentTypeCatalog(businessAppContext.accessToken, formValues.group);

  // Accounts data hook for account autocomplete  
  const { fetchInvestmentAccounts } = useGetInvestmentAccounts(businessAppContext);

  // TODO: Need to implement form-specific investment loading for update mode

  // TODO: Re-implement investment data transformation when investment loading is restored
  // removed unused transform helper

  // Removed obsolete update-mode warning; update loading is handled in component

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

  // Auto-select current user as owner when ownerEmployeeId is null or not provided
  useEffect(() => {
    if (
      businessAppContext.userInfo?.employeeDetails?.employeeId && 
      (!formValues.ownerEmployeeId || formValues.ownerEmployeeId.trim() === '') && 
      !autoSelectionDone.current
    ) {
      setFormValuesState(prev => ({
        ...prev,
        ownerEmployeeId: businessAppContext.userInfo?.employeeDetails?.employeeId || ''
      }));
      autoSelectionDone.current = true;
    }
  }, [businessAppContext.userInfo?.employeeDetails?.employeeId, formValues.ownerEmployeeId]);

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
    if (currentEmployee && formValues.ownerEmployeeId &&
        !positions.some(emp => emp.value === formValues.ownerEmployeeId)) {
      const ownerDisplayName = currentEmployee.employee?.displayName || 
        `${currentEmployee.firstName || ''} ${currentEmployee.lastName || ''}`.trim();
      const ownerOption: SelectOption = {
        id: formValues.ownerEmployeeId,
        value: formValues.ownerEmployeeId,
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