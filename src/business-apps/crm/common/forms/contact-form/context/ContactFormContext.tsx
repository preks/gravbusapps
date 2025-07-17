import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ContactFormValues, SelectOption, ContactContextState } from '../types';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useEmployeeById } from '@/business-apps/crm/common/forms/lead-form/hooks/useEmployeeById';
import { useEmployeePositions } from '@/business-apps/crm/common/forms/lead-form/hooks/useEmployeePositions';

interface ContactFormContextValue extends ContactContextState {
  formValues: ContactFormValues;
  setFormValues: (updates: Partial<ContactFormValues>) => void;
  onSubmit: (values: ContactFormValues) => Promise<void>;
  onCancel: () => Promise<void>;
  
  // Employee positions (for owner selection)
  employeePositions: SelectOption[];
  employeePositionsLoading: boolean;
  employeePositionsError: string | null;
  employeePositionsHasMore: boolean;
  loadMoreEmployeePositions: () => void;
  searchEmployeePositions: (search: string) => void;
  
  // Static data
  contactTypes: SelectOption[];
  contactRoles: SelectOption[];
  academicTitles: SelectOption[];
  languages: SelectOption[];
  departments: SelectOption[];
  
  // Account autocomplete
  accountSuggestions: SelectOption[];
  searchAccounts: (search: string) => Promise<SelectOption[]>;
  isSearchingAccounts: boolean;
  setIsSearchingAccounts: (loading: boolean) => void;
  setAccountSuggestions: (suggestions: SelectOption[]) => void;
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
    firstName: '',
    lastName: '',
    academicTitleRef: '',
    birthDate: '',
    languageRef: '',
    bio: '',
    pictureUrl: '',
    
    // Professional Information
    jobTitle: '',
    department: '',
    contactRole: '',
    contactType: '',
    workExperienceYears: '',
    
    // Contact Information
    email: '',
    phone: '',
    fax: '',
    linkedinUrl: '',
    xingUrl: '',
    
    // Account Information
    accountId: '',
    ownerEmployeeId: '',
    ownerOrganizationId: '',
    
    // Additional Information
    notesSummary: '',
    
    // System fields
    id: undefined,
    version: undefined,
    
    // Source tracking
    sourceApp: 'CRM',
    recordState: 'ACTIVE',
    
    ...initialValues
  });

  // Global state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Account autocomplete state
  const [accountSuggestions, setAccountSuggestions] = useState<SelectOption[]>([]);
  const [isSearchingAccounts, setIsSearchingAccounts] = useState(false);

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
  }) || {
    employee: null,
    loading: false,
    error: null
  };

  // Employee positions hook
  const {
    employeePositions: employeePositionData,
    loading: employeePositionsLoading,
    error: employeePositionsError,
    hasMore: employeePositionsHasMore,
    searchEmployees,
    loadMore: loadMoreEmployeePositions
  } = useEmployeePositions({ accessToken: businessAppContext.accessToken }) || {
    employeePositions: [],
    loading: false,
    error: null,
    hasMore: false,
    searchEmployees: () => {},
    loadMore: () => {}
  };

  // Convert employee position data to SelectOption format
  const employeePositions: SelectOption[] = useMemo(() => {
    if (!Array.isArray(employeePositionData)) {
      return [];
    }
    
    const regularEmployees = employeePositionData
      .filter(emp => emp && emp.employeeId && emp.employee)
      .map(emp => {
        const displayName = emp.employee.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown Employee';
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
  const contactTypes: SelectOption[] = useMemo(() => [
    { id: 'primary', value: 'primary', label: 'Primary Contact', name: 'Primary Contact' },
    { id: 'secondary', value: 'secondary', label: 'Secondary Contact', name: 'Secondary Contact' },
    { id: 'technical', value: 'technical', label: 'Technical Contact', name: 'Technical Contact' },
    { id: 'billing', value: 'billing', label: 'Billing Contact', name: 'Billing Contact' },
    { id: 'executive', value: 'executive', label: 'Executive Contact', name: 'Executive Contact' },
  ], []);

  const contactRoles: SelectOption[] = useMemo(() => [
    { id: 'decision-maker', value: 'decision-maker', label: 'Decision Maker', name: 'Decision Maker' },
    { id: 'influencer', value: 'influencer', label: 'Influencer', name: 'Influencer' },
    { id: 'gatekeeper', value: 'gatekeeper', label: 'Gatekeeper', name: 'Gatekeeper' },
    { id: 'end-user', value: 'end-user', label: 'End User', name: 'End User' },
    { id: 'champion', value: 'champion', label: 'Champion', name: 'Champion' },
  ], []);

  const academicTitles: SelectOption[] = useMemo(() => [
    { id: 'dr', value: 'dr', label: 'Dr.', name: 'Dr.' },
    { id: 'prof', value: 'prof', label: 'Prof.', name: 'Prof.' },
    { id: 'prof-dr', value: 'prof-dr', label: 'Prof. Dr.', name: 'Prof. Dr.' },
    { id: 'dipl-ing', value: 'dipl-ing', label: 'Dipl.-Ing.', name: 'Dipl.-Ing.' },
    { id: 'mba', value: 'mba', label: 'MBA', name: 'MBA' },
  ], []);

  const languages: SelectOption[] = useMemo(() => [
    { id: 'en', value: 'en', label: 'English', name: 'English' },
    { id: 'de', value: 'de', label: 'German', name: 'German' },
    { id: 'fr', value: 'fr', label: 'French', name: 'French' },
    { id: 'es', value: 'es', label: 'Spanish', name: 'Spanish' },
    { id: 'it', value: 'it', label: 'Italian', name: 'Italian' },
  ], []);

  const departments: SelectOption[] = useMemo(() => [
    { id: 'sales', value: 'sales', label: 'Sales', name: 'Sales' },
    { id: 'marketing', value: 'marketing', label: 'Marketing', name: 'Marketing' },
    { id: 'engineering', value: 'engineering', label: 'Engineering', name: 'Engineering' },
    { id: 'finance', value: 'finance', label: 'Finance', name: 'Finance' },
    { id: 'hr', value: 'hr', label: 'Human Resources', name: 'Human Resources' },
    { id: 'it', value: 'it', label: 'IT', name: 'IT' },
    { id: 'operations', value: 'operations', label: 'Operations', name: 'Operations' },
    { id: 'legal', value: 'legal', label: 'Legal', name: 'Legal' },
    { id: 'procurement', value: 'procurement', label: 'Procurement', name: 'Procurement' },
  ], []);

  // Auto-select current user as owner
  useEffect(() => {
    if (!autoSelectionDone.current && currentUserEmployee && !formValues.ownerEmployeeId) {
      setFormValues({ ownerEmployeeId: currentUserEmployee.employeeId });
      autoSelectionDone.current = true;
    }
  }, [currentUserEmployee, formValues.ownerEmployeeId]);

  // Form values update handler
  const setFormValues = useCallback((updates: Partial<ContactFormValues>) => {
    setFormValuesState(prev => ({ ...prev, ...updates }));
  }, []);

  // Employee positions search
  const searchEmployeePositions = useCallback((search: string) => {
    searchEmployees(search);
  }, [searchEmployees]);

  // Account search placeholder - TODO: Implement actual account search
  const searchAccounts = useCallback(async (search: string): Promise<SelectOption[]> => {
    setIsSearchingAccounts(true);
    try {
      // TODO: Implement actual GraphQL account search
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      
      const mockAccounts: SelectOption[] = [
        { id: '1', value: '1', label: `${search} Company`, name: `${search} Company` },
        { id: '2', value: '2', label: `${search} Corp`, name: `${search} Corp` },
        { id: '3', value: '3', label: `${search} Inc`, name: `${search} Inc` },
      ];
      
      setAccountSuggestions(mockAccounts);
      return mockAccounts;
    } catch (error) {
      console.error('Error searching accounts:', error);
      return [];
    } finally {
      setIsSearchingAccounts(false);
    }
  }, []);

  const value: ContactFormContextValue = {
    // Form state
    formValues,
    setFormValues,
    onSubmit,
    onCancel,
    
    // Loading states
    isLoading,
    error,
    
    // Employee positions
    employeePositions,
    employeePositionsLoading,
    employeePositionsError,
    employeePositionsHasMore,
    loadMoreEmployeePositions,
    searchEmployeePositions,
    
    // Static data
    contactTypes,
    contactRoles,
    academicTitles,
    languages,
    departments,
    accounts: [],
    
    // Account autocomplete
    accountSuggestions,
    searchAccounts,
    isSearchingAccounts,
    setIsSearchingAccounts,
    setAccountSuggestions,
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
    throw new Error('useContactFormContext must be used within a ContactFormProvider');
  }
  return context;
}; 