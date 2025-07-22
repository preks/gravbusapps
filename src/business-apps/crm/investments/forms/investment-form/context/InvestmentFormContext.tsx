import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { InvestmentFormValues, SelectOption, InvestmentContextState } from '../types';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useEmployeePositions } from '../hooks/useEmployeePositions';
import { useEmployeeById, EmployeeByIdData } from '../hooks/useEmployeeById';
import { useAccountsData } from '../hooks/useAccountsData';
import { useInvestmentGroups } from '../hooks/useInvestmentGroupCatalog';
import { useInvestmentRoleCatalog } from '../hooks/useInvestmentRoleCatalog';
import { useRealEstateTypes } from '../hooks/useRealEstateTypeCatalog';
import { useInvestmentOwnershipStructures } from '../hooks/useInvestmentOwnershipStructureCatalog';
import { useInterestPaymentFrequencies } from '../hooks/useInterestPaymentFrequencyCatalog';
import { validateInvestmentForm } from '../utils/validationUtils';
import { useGetInvestmentById, InvestmentData } from '../queries/InvestmentQueries';

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
  interestPaymentFrequenciesHasMore: boolean;
  searchInterestPaymentFrequencies: (search: string) => void;
  loadMoreInterestPaymentFrequencies: () => void;
  
  // Account autocomplete
  accountSuggestions: SelectOption[];
  searchAccounts: (search: string) => Promise<SelectOption[]>;
  isSearchingAccounts: boolean;
  setIsSearchingAccounts: (loading: boolean) => void;
  setAccountSuggestions: (suggestions: SelectOption[]) => void;
  
  // Validation
  validationErrors: Record<string, string>;
  isFormValid: boolean;
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
    console.log('Initial form state being set:', initialFormValues);
    return initialFormValues;
  });

  // Debug when form values change
  useEffect(() => {
    console.log('Form values changed:', formValues);
  }, [formValues]);

  // Global state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Debug loading state changes
  useEffect(() => {
    console.log('Global loading state changed to:', isLoading);
  }, [isLoading]);

  // Account autocomplete state
  const [accountSuggestions, setAccountSuggestions] = useState<SelectOption[]>([]);
  const [isSearchingAccounts, setIsSearchingAccounts] = useState(false);

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

  // Accounts data hook for account autocomplete
  const { searchAccounts, loadDefaultAccounts } = useAccountsData(businessAppContext);

  // Investment data hook for loading existing investment
  const { fetchInvestmentById } = useGetInvestmentById(businessAppContext);

  // Transform investment data to form values
  const transformInvestmentToFormValues = useCallback((investment: InvestmentData): InvestmentFormValues => {
    console.log('Investment data being transformed:', investment);
    console.log('Raw initialInvestmentAmount from API:', investment.initialInvestmentAmount, typeof investment.initialInvestmentAmount);
    
    const formValues: InvestmentFormValues = {
      id: investment.id,
      version: investment.version,
      ownerEmployeeId: investment.ownerEmployeeId || businessAppContext.userInfo?.employeeDetails?.employeeId || '',
      name: investment.name,
      accountId: investment.accountId,
      // Direct mapping since field names now match
      initialInvestmentAmount: (() => {
        const amount = investment.initialInvestmentAmount;
        console.log('Processing amount:', amount, 'type:', typeof amount);
        
        if (amount === null || amount === undefined) {
          console.log('Amount is null/undefined, returning empty string');
          return '';
        }
        
        // Handle both string and number types, preserve decimal values
        const numValue = typeof amount === 'string' ? parseFloat(amount) : amount;
        const result = isNaN(numValue) ? '' : String(numValue);
        console.log('Final transformed value:', result);
        return result;
      })(),
      // Use investmentGroupRef for the group field since we're using investmentGroup catalog
      group: investment.investmentGroupRef || ''
    };

    console.log('Transformed initialInvestmentAmount in formValues:', formValues.initialInvestmentAmount);

    // Add equity information if available
    if (investment.equityInvestment) {
      formValues.equityInvestmentId = investment.equityInvestment.id || '';
      formValues.equityInvestmentVersion = investment.equityInvestment.version || '';
      formValues.equityRole = investment.equityInvestment.investmentRoleRef || '';
      formValues.currentCompanyValue = investment.equityInvestment.currentCompanyValuation?.toString() || '';
      formValues.lastReportedTurnover = investment.equityInvestment.lastReportedTurnover?.toString() || '';
      formValues.lastReportedEbitda = investment.equityInvestment.lastReportedEbitda?.toString() || '';
    }

    // Add private equity information if available
    if (investment.privateEquityInvestment) {
      formValues.privateEquityInvestmentId = investment.privateEquityInvestment.id || '';
      formValues.privateEquityInvestmentVersion = investment.privateEquityInvestment.version || '';
      formValues.privateEquityRole = investment.privateEquityInvestment.investmentRoleRef || '';
    }

    // Add real estate information if available
    if (investment.realEstateInvestment) {
      formValues.realEstateInvestmentId = investment.realEstateInvestment.id || '';
      formValues.realEstateInvestmentVersion = investment.realEstateInvestment.version || '';
      formValues.realEstateTypeRef = investment.realEstateInvestment.realEstateTypeRef || '';
      formValues.investmentOwnershipStructureRef = investment.realEstateInvestment.investmentOwnershipStructureRef || '';
      formValues.numberOfUnits = investment.realEstateInvestment.numberOfUnits?.toString() || '';
      formValues.buildingYear = investment.realEstateInvestment.buildingYear?.toString() || '';
    }

    // Add liquid fund information if available
    if (investment.liquidFundInvestment) {
      formValues.liquidFundInvestmentId = investment.liquidFundInvestment.id || '';
      formValues.liquidFundInvestmentVersion = investment.liquidFundInvestment.version || '';
      formValues.accountNumber = investment.liquidFundInvestment.accountNumber || '';
      formValues.earlyTerminationAllowed = investment.liquidFundInvestment.earlyTerminationAllowed || false;
      formValues.interestRate = investment.liquidFundInvestment.interestRate?.toString() || '';
      formValues.interestPaymentFrequencyRef = investment.liquidFundInvestment.interestPaymentFrequencyRef || '';
      
      // Handle maturity date format conversion
      const rawMaturityDate = investment.liquidFundInvestment.maturityDate;
      console.log('Raw maturityDate from API:', rawMaturityDate, 'type:', typeof rawMaturityDate);
      
      if (rawMaturityDate) {
        // Convert date to YYYY-MM-DD format for HTML date input (timezone-safe)
        let formattedDate = '';
        try {
          const date = new Date(rawMaturityDate);
          if (!isNaN(date.getTime())) {
            // Use local date components to avoid timezone issues
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            formattedDate = `${year}-${month}-${day}`;
            console.log('Formatted maturityDate for form (timezone-safe):', formattedDate);
          } else {
            console.warn('Invalid date format for maturityDate:', rawMaturityDate);
          }
        } catch (error) {
          console.error('Error parsing maturityDate:', error);
        }
        formValues.maturityDate = formattedDate;
      } else {
        formValues.maturityDate = '';
      }
      
      console.log('Final maturityDate in form values:', formValues.maturityDate);
    }

    console.log('Final transformed form values:', formValues);

    return formValues;
  }, [businessAppContext.userInfo?.employeeDetails?.employeeId]);

  // Load investment data when investmentId is provided and catalogs are loaded
  useEffect(() => {
    console.log('Investment data loading useEffect triggered');
    console.log('Conditions:', {
      hasId: !!initialValues?.id,
      hasToken: !!businessAppContext.accessToken,
      catalogsNotLoading: !investmentGroupsHook.loading,
      hasOptions: investmentGroupsHook.options.length > 0
    });
    
    const loadInvestmentData = async () => {
      if (
        initialValues?.id && 
        businessAppContext.accessToken && 
        !investmentGroupsHook.loading && 
        investmentGroupsHook.options.length > 0
      ) {
        console.log('Loading investment data for ID:', initialValues.id);
        setIsLoading(true);
        setError(null);
        
        try {
          const investmentData = await fetchInvestmentById({ id: initialValues.id });
          
          if (investmentData) {
            const transformedValues = transformInvestmentToFormValues(investmentData);
            console.log('About to set form values to:', transformedValues);
            setFormValuesState(transformedValues);
            console.log('Form values set successfully');
            
            // Pre-populate account suggestions with the loaded account
            if (investmentData.account) {
              setAccountSuggestions([{
                id: investmentData.account.id,
                name: investmentData.account.name,
                label: investmentData.account.name,
                value: investmentData.account.id,
              }]);
            }
          } else {
            // Investment ID was provided but no investment was found
            console.error('Investment not found for ID:', initialValues.id);
            setError(`Investment with ID "${initialValues.id}" was not found`);
          }
        } catch (err) {
          console.error('Error loading investment data:', err);
          setError(err instanceof Error ? err.message : 'Failed to load investment data');
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadInvestmentData();
  }, [
    initialValues?.id, 
    businessAppContext.accessToken, 
    investmentGroupsHook.loading, 
    investmentGroupsHook.options.length
    // Note: fetchInvestmentById and transformInvestmentToFormValues are stable functions, no need to include in deps
  ]);

  // Initialize investment groups and roles on mount
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (businessAppContext.accessToken && !hasInitialized.current) {
      console.log('Initializing investment catalogs...');
      hasInitialized.current = true;
      console.log('Initializing investmentGroupsHook...');
      investmentGroupsHook.initialize();
      console.log('Initializing investmentRolesHook...');
      investmentRolesHook.initialize();
      console.log('Initializing realEstateTypesHook...');
      realEstateTypesHook.initialize();
      console.log('Initializing investmentOwnershipStructuresHook...');
      investmentOwnershipStructuresHook.initialize();
      console.log('Initializing interestPaymentFrequenciesHook...');
      interestPaymentFrequenciesHook.initialize();
    }
  }, [businessAppContext.accessToken]); // Hook functions are stable, no need to include in deps

  // Debug logging for catalog loading states
  useEffect(() => {
    console.log('Investment groups hook state:', {
      loading: investmentGroupsHook.loading,
      optionsCount: investmentGroupsHook.options.length,
      error: investmentGroupsHook.error
    });
  }, [investmentGroupsHook.loading, investmentGroupsHook.options.length, investmentGroupsHook.error]);

  useEffect(() => {
    console.log('Investment roles hook state:', {
      loading: investmentRolesHook.loading,
      optionsCount: investmentRolesHook.options.length,
      error: investmentRolesHook.error
    });
  }, [investmentRolesHook.loading, investmentRolesHook.options.length, investmentRolesHook.error]);

  useEffect(() => {
    console.log('Real estate types hook state:', {
      loading: realEstateTypesHook.loading,
      optionsCount: realEstateTypesHook.options.length,
      error: realEstateTypesHook.error,
      options: realEstateTypesHook.options
    });
  }, [realEstateTypesHook.loading, realEstateTypesHook.options.length, realEstateTypesHook.error]);

  useEffect(() => {
    console.log('Investment ownership structures hook state:', {
      loading: investmentOwnershipStructuresHook.loading,
      optionsCount: investmentOwnershipStructuresHook.options.length,
      error: investmentOwnershipStructuresHook.error,
      options: investmentOwnershipStructuresHook.options
    });
  }, [investmentOwnershipStructuresHook.loading, investmentOwnershipStructuresHook.options.length, investmentOwnershipStructuresHook.error]);

  useEffect(() => {
    console.log('Interest payment frequencies hook state:', {
      loading: interestPaymentFrequenciesHook.loading,
      optionsCount: interestPaymentFrequenciesHook.options.length,
      error: interestPaymentFrequenciesHook.error,
      options: interestPaymentFrequenciesHook.options
    });
  }, [interestPaymentFrequenciesHook.loading, interestPaymentFrequenciesHook.options.length, interestPaymentFrequenciesHook.error]);

  // Load default accounts on mount
  const hasLoadedDefaultAccounts = useRef(false);
  useEffect(() => {
    const loadInitialAccounts = async () => {
      if (businessAppContext.accessToken && !hasLoadedDefaultAccounts.current) {
        hasLoadedDefaultAccounts.current = true;
        try {
          const defaultAccounts = await loadDefaultAccounts();
          setAccountSuggestions(defaultAccounts);
        } catch (err) {
          console.error('Error loading default accounts:', err);
        }
      }
    };

    loadInitialAccounts();
  }, [businessAppContext.accessToken]);

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

  // Form validation
  const validateForm = useCallback(() => {
    const validation = validateInvestmentForm(formValues);
    setValidationErrors(validation.errors);
    return validation.isValid;
  }, [formValues]);

  // Check if form is valid
  const isFormValid = useMemo(() => {
    const validation = validateInvestmentForm(formValues);
    return validation.isValid;
  }, [formValues]);

  // Update form values
  const setFormValues = useCallback((updates: Partial<InvestmentFormValues>) => {
    setFormValuesState(prev => ({ ...prev, ...updates }));
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async (values: InvestmentFormValues) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!validateForm()) {
        setError('Please fix the validation errors before submitting');
        return;
      }
      
      await onSubmit(values);
    } catch (err) {
      console.error('Error submitting investment form:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [onSubmit, validateForm]);

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
    employeePositions: employeePositionData,
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
    
    // Account autocomplete
    accountSuggestions,
    searchAccounts,
    isSearchingAccounts,
    setIsSearchingAccounts,
    setAccountSuggestions,
    
    // Data collections
    accounts: accountSuggestions,
  };

  return (
    <InvestmentFormContext.Provider value={contextValue}>
      {children}
    </InvestmentFormContext.Provider>
  );
}; 