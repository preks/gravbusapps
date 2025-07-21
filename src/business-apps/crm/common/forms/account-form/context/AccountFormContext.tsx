import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AccountFormValues, SelectOption, AccountContextState } from '../types';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useEmployeeById } from '@/business-apps/crm/common/forms/lead-form/hooks/useEmployeeById';
import { useEmployeePositions } from '@/business-apps/crm/common/forms/lead-form/hooks/useEmployeePositions';
import { useCountriesGraphQL } from '../hooks';

interface AccountFormContextValue extends AccountContextState {
  formValues: AccountFormValues;
  setFormValues: (updates: Partial<AccountFormValues>) => void;
  onSubmit: (values: AccountFormValues) => Promise<void>;
  onCancel: () => Promise<void>;
  
  // Employee positions (for owner selection)
  employeePositions: SelectOption[];
  employeePositionsLoading: boolean;
  employeePositionsError: string | null;
  employeePositionsHasMore: boolean;
  loadMoreEmployeePositions: () => void;
  searchEmployeePositions: (search: string) => void;
  
  // Static data
  accountTypes: SelectOption[];
  accountStatuses: SelectOption[];
  priorities: SelectOption[];
  legalForms: SelectOption[];
  industries: SelectOption[];
  currencies: SelectOption[];
  timeZones: SelectOption[];
  numberOfEmployeesOptions: SelectOption[];
  
  // Countries with search and pagination
  countries: SelectOption[];
  countriesLoading: boolean;
  countriesError: string | null;
  countriesHasMore: boolean;
  searchCountries: (searchTerm: string) => void;
  loadMoreCountries: () => void;
  
  // Parent account autocomplete
  parentAccountSuggestions: SelectOption[];
  searchParentAccounts: (search: string) => Promise<SelectOption[]>;
  isSearchingParentAccounts: boolean;
  setIsSearchingParentAccounts: (loading: boolean) => void;
  setParentAccountSuggestions: (suggestions: SelectOption[]) => void;
  
  // Address lines management
  addressLineCount: number;
  addAddressLine: () => void;
  removeAddressLine: () => void;
}

const AccountFormContext = createContext<AccountFormContextValue | null>(null);

interface AccountFormProviderProps {
  children: React.ReactNode;
  businessAppContext: BusinessAppContextProps;
  initialValues?: Partial<AccountFormValues>;
  onSubmit?: (values: AccountFormValues) => Promise<void>;
  onCancel?: () => Promise<void>;
}

export const AccountFormProvider: React.FC<AccountFormProviderProps> = ({
  children,
  businessAppContext,
  initialValues = {},
  onSubmit = async () => {},
  onCancel = async () => {},
}) => {
  // Form state
  const [formValues, setFormValuesState] = useState<AccountFormValues>({
    // Account Information
    owner: '',
    accountType: '',
    accountStatus: '',
    priority: '',
    
    // Company Information
    accountName: '',
    parentAccount: '',
    legalForm: '',
    industry: '',
    website: '',
    description: '',
    
    // Contact Information
    phone: '',
    email: '',
    fax: '',
    
    // Address Information
    country: '',
    region: '',
    addressLine1: '',
    addressLine2: '',
    addressLine3: '',
    addressLine4: '',
    postalCode: '',
    city: '',
    
    // Financial Information
    annualRevenue: '',
    numberOfEmployees: '',
    currency: '',
    
    // Additional Information
    timeZone: '',
    foundationDate: '',
    tickerSymbol: '',
    sicCode: '',
    
    // System fields
    id: undefined,
    version: undefined,
    
    // Legacy fields
    address: '',
    state: '',
    
    ...initialValues
  });

  // Global state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addressLineCount, setAddressLineCount] = useState(1);

  // Parent account autocomplete state
  const [parentAccountSuggestions, setParentAccountSuggestions] = useState<SelectOption[]>([]);
  const [isSearchingParentAccounts, setIsSearchingParentAccounts] = useState(false);

  // Auto-selection tracking
  const autoSelectionDone = useRef(false);

  // Current user employee hook for auto-selection
  const {
    employee: currentUserEmployee,
    loading: currentUserLoading,
    error: currentUserError
  } = useEmployeeById({ 
    accessToken: businessAppContext.accessToken,
    employeeId: businessAppContext.userInfo?.employeeDetails?.employeeId
  });

  // Employee positions hook
  const {
    employeePositions: employeePositionData,
    loading: employeePositionsLoading,
    error: employeePositionsError,
    hasMore: employeePositionsHasMore,
    searchEmployees,
    loadMore: loadMoreEmployeePositions
  } = useEmployeePositions({ accessToken: businessAppContext.accessToken });

  // Countries hook
  const {
    options: countries,
    loading: countriesLoading,
    error: countriesError,
    hasMore: countriesHasMore,
    search: searchCountries,
    loadMore: loadMoreCountries
  } = useCountriesGraphQL({ accessToken: businessAppContext.accessToken });

  // Convert employee position data to SelectOption format
  const employeePositions: SelectOption[] = useMemo(() => {
    const regularEmployees = employeePositionData.map(emp => {
      const displayName = emp.employee.displayName || `${emp.firstName} ${emp.lastName}`.trim();
      const jobTitle = emp.jobPosition?.name || 'No Position';
      const orgUnit = emp.organizationalUnit?.name || 'No Unit';
      
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
        }
      };
    });

    // Add current user to the beginning if they're not already in the list
    if (currentUserEmployee) {
      const currentUserDisplayName = currentUserEmployee.employee.displayName || 
        `${currentUserEmployee.firstName} ${currentUserEmployee.lastName}`.trim();
      const currentUserJobTitle = currentUserEmployee.jobPosition?.name || 'No Position';
      const currentUserOrgUnit = currentUserEmployee.organizationalUnit?.name || 'No Unit';
      
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
        }
      };

      // Check if current user is already in the regular employees list
      const isCurrentUserInList = regularEmployees.some(emp => 
        emp.value === currentUserEmployee.employeeId
      );

      if (!isCurrentUserInList) {
        return [currentUserOption, ...regularEmployees];
      }
    }

    return regularEmployees;
  }, [employeePositionData, currentUserEmployee]);

  // Static dropdown options - TODO: Replace with actual catalog data
  const accountTypes: SelectOption[] = useMemo(() => [
    { id: 'customer', value: 'customer', label: 'Customer', name: 'Customer' },
    { id: 'prospect', value: 'prospect', label: 'Prospect', name: 'Prospect' },
    { id: 'partner', value: 'partner', label: 'Partner', name: 'Partner' },
    { id: 'vendor', value: 'vendor', label: 'Vendor', name: 'Vendor' },
    { id: 'competitor', value: 'competitor', label: 'Competitor', name: 'Competitor' },
  ], []);

  const accountStatuses: SelectOption[] = useMemo(() => [
    { id: 'active', value: 'active', label: 'Active', name: 'Active' },
    { id: 'inactive', value: 'inactive', label: 'Inactive', name: 'Inactive' },
    { id: 'pending', value: 'pending', label: 'Pending', name: 'Pending' },
    { id: 'suspended', value: 'suspended', label: 'Suspended', name: 'Suspended' },
  ], []);

  const priorities: SelectOption[] = useMemo(() => [
    { id: 'high', value: 'high', label: 'High', name: 'High' },
    { id: 'medium', value: 'medium', label: 'Medium', name: 'Medium' },
    { id: 'low', value: 'low', label: 'Low', name: 'Low' },
  ], []);

  const legalForms: SelectOption[] = useMemo(() => [
    { id: 'corporation', value: 'corporation', label: 'Corporation', name: 'Corporation' },
    { id: 'llc', value: 'llc', label: 'LLC', name: 'LLC' },
    { id: 'partnership', value: 'partnership', label: 'Partnership', name: 'Partnership' },
    { id: 'sole-proprietorship', value: 'sole-proprietorship', label: 'Sole Proprietorship', name: 'Sole Proprietorship' },
  ], []);

  const industries: SelectOption[] = useMemo(() => [
    { id: 'technology', value: 'technology', label: 'Technology', name: 'Technology' },
    { id: 'healthcare', value: 'healthcare', label: 'Healthcare', name: 'Healthcare' },
    { id: 'finance', value: 'finance', label: 'Finance', name: 'Finance' },
    { id: 'manufacturing', value: 'manufacturing', label: 'Manufacturing', name: 'Manufacturing' },
    { id: 'retail', value: 'retail', label: 'Retail', name: 'Retail' },
  ], []);



  const currencies: SelectOption[] = useMemo(() => [
    { id: 'usd', value: 'usd', label: 'USD - US Dollar', name: 'USD' },
    { id: 'eur', value: 'eur', label: 'EUR - Euro', name: 'EUR' },
    { id: 'gbp', value: 'gbp', label: 'GBP - British Pound', name: 'GBP' },
    { id: 'cad', value: 'cad', label: 'CAD - Canadian Dollar', name: 'CAD' },
  ], []);

  const timeZones: SelectOption[] = useMemo(() => [
    { id: 'utc', value: 'utc', label: 'UTC', name: 'UTC' },
    { id: 'est', value: 'est', label: 'EST - Eastern Time', name: 'EST' },
    { id: 'pst', value: 'pst', label: 'PST - Pacific Time', name: 'PST' },
    { id: 'cet', value: 'cet', label: 'CET - Central European Time', name: 'CET' },
  ], []);

  const numberOfEmployeesOptions: SelectOption[] = useMemo(() => [
    { id: '1-10', value: '1-10', label: '1-10', name: '1-10' },
    { id: '11-50', value: '11-50', label: '11-50', name: '11-50' },
    { id: '51-200', value: '51-200', label: '51-200', name: '51-200' },
    { id: '201-1000', value: '201-1000', label: '201-1000', name: '201-1000' },
    { id: '1000+', value: '1000+', label: '1000+', name: '1000+' },
  ], []);

  // Form value setter
  const setFormValues = useCallback((updates: Partial<AccountFormValues>) => {
    setFormValuesState(prev => ({ ...prev, ...updates }));
  }, []);

  // Parent account search function
  const searchParentAccounts = useCallback(async (search: string): Promise<SelectOption[]> => {
    // TODO: Implement actual search API call
    setIsSearchingParentAccounts(true);
    try {
      // Mock implementation - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 300));
      const mockResults: SelectOption[] = [
        { id: '1', value: '1', label: `${search} Corp`, name: `${search} Corp` },
        { id: '2', value: '2', label: `${search} Industries`, name: `${search} Industries` },
      ];
      setParentAccountSuggestions(mockResults);
      return mockResults;
    } finally {
      setIsSearchingParentAccounts(false);
    }
  }, []);

  // Address line management
  const addAddressLine = useCallback(() => {
    if (addressLineCount < 4) {
      setAddressLineCount(prev => prev + 1);
    }
  }, [addressLineCount]);

  const removeAddressLine = useCallback(() => {
    if (addressLineCount > 1) {
      setAddressLineCount(prev => prev - 1);
      // Clear the last address line value
      const lineKey = `addressLine${addressLineCount}` as keyof AccountFormValues;
      setFormValues({ [lineKey]: '' });
    }
  }, [addressLineCount, setFormValues]);

  // Auto-select current user once their employee data has loaded
  useEffect(() => {
    if (
      currentUserEmployee && 
      !formValues.owner && 
      !autoSelectionDone.current
    ) {
      setFormValuesState(prev => ({
        ...prev,
        owner: currentUserEmployee.employeeId
      }));
      autoSelectionDone.current = true;
    }
  }, [currentUserEmployee, formValues.owner]);

  // Context value
  const value: AccountFormContextValue = {
    // Form state
    formValues,
    setFormValues,
    onSubmit,
    onCancel,
    isLoading,
    error,
    
    // Employee positions
    employeePositions,
    employeePositionsLoading,
    employeePositionsError,
    employeePositionsHasMore,
    loadMoreEmployeePositions,
    searchEmployeePositions: searchEmployees,
    
    // Static data
    accountTypes,
    accountStatuses,
    priorities,
    legalForms,
    industries,
    currencies,
    timeZones,
    numberOfEmployeesOptions,
    
    // Countries with search and pagination
    countries,
    countriesLoading,
    countriesError,
    countriesHasMore,
    searchCountries,
    loadMoreCountries,
    
    // Parent account search
    parentAccountSuggestions,
    searchParentAccounts,
    isSearchingParentAccounts,
    setIsSearchingParentAccounts,
    setParentAccountSuggestions,
    
    // Address management
    addressLineCount,
    addAddressLine,
    removeAddressLine,
  };

  return (
    <AccountFormContext.Provider value={value}>
      {children}
    </AccountFormContext.Provider>
  );
};

export const useAccountFormContext = (): AccountFormContextValue => {
  const context = useContext(AccountFormContext);
  if (!context) {
    throw new Error('useAccountFormContext must be used within AccountFormProvider');
  }
  return context;
}; 