import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { OpportunityFormValues, SelectOption, OpportunityContextState, ADDRESS_TYPES, COMMUNICATION_CHANNEL_TYPES, RECORD_STATES } from '../types';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useEmployeeById } from '@/business-apps/crm/common/forms/lead-form/hooks/useEmployeeById';
import { useEmployeePositions } from '@/business-apps/crm/common/forms/lead-form/hooks/useEmployeePositions';
import { opportunityClient, OpportunityPayload } from '@/common/network/opportunity/OpportunityClient';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';
import { message } from 'antd';

interface OpportunityFormContextValue extends OpportunityContextState {
  formValues: OpportunityFormValues;
  setFormValues: (updates: Partial<OpportunityFormValues>) => void;
  onSubmit: (values: OpportunityFormValues) => Promise<void>;
  onCancel: () => Promise<void>;
  
  // Employee positions (for owner selection)
  employeePositions: SelectOption[];
  employeePositionsLoading: boolean;
  employeePositionsError: string | null;
  employeePositionsHasMore: boolean;
  loadMoreEmployeePositions: () => void;
  searchEmployeePositions: (search: string) => void;
  
  // Static data
  opportunityStatuses: SelectOption[];
  pipelines: SelectOption[];
  salesPipelineStages: SelectOption[];
  currencies: SelectOption[];
  addressTypes: SelectOption[];
  communicationChannelTypes: SelectOption[];
  recordStates: SelectOption[];
  
  // Business app context for child components
  businessAppContext: BusinessAppContextProps;
}

const OpportunityFormContext = createContext<OpportunityFormContextValue | null>(null);

interface OpportunityFormProviderProps {
  children: React.ReactNode;
  businessAppContext: BusinessAppContextProps;
  initialValues?: Partial<OpportunityFormValues>;
  onSubmit?: (values: OpportunityFormValues) => Promise<void>;
  onCancel?: () => Promise<void>;
}

export const OpportunityFormProvider: React.FC<OpportunityFormProviderProps> = ({
  children,
  businessAppContext,
  initialValues = {},
  onSubmit: customOnSubmit,
  onCancel = async () => {},
}) => {
  // Form state
  const [formValues, setFormValuesState] = useState<OpportunityFormValues>({
    // Opportunity Information
    owner: '',
    name: '',
    opportunityStatus: '',
    pipeline: '',
    salesPipelineStage: '',
    stage: '',
    status: '',
    
    // Sales Information
    estimatedAmount: '',
    currency: '',
    winningChance: '',
    closeDate: '',
    
    // Relationship Information
    account: '',
    lead: '',
    
    // Business Information
    businessKey: '',
    code: '',
    sourceApp: 'CRM',
    personal: false,
    
    // Additional Information
    notesSummary: '',
    lastInteraction: '',
    
    // Address Information
    addresses: [],
    
    // Communication Channels
    communicationChannels: [],
    
    // Tags
    tags: [],
    
    // Additional Properties for custom fields
    additionalProperties: {},
    
    // Express fields for dynamic configuration
    express1: {},
    express2: {},
    
    // Process and system fields
    processInstanceId: '',
    recordState: 'DRAFT',
    
    // Audit information (readonly, for display)
    activeFrom: '',
    activeTo: '',
    createdAt: '',
    createdBy: '',
    updatedAt: '',
    updatedBy: '',
    synchronizedAt: '',
    
    // System fields
    id: undefined,
    version: undefined,
    
    // Legacy fields (for backward compatibility)
    accountId: '',
    leadId: '',
    ownerEmployeeId: '',
    ownerOrganizationId: '',
    
    ...initialValues
  });

  // Global state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Account autocomplete state
  const [accountSuggestions, setAccountSuggestions] = useState<SelectOption[]>([]);
  const [isSearchingAccounts, setIsSearchingAccounts] = useState(false);

  // Lead autocomplete state
  const [leadSuggestions, setLeadSuggestions] = useState<SelectOption[]>([]);
  const [isSearchingLeads, setIsSearchingLeads] = useState(false);

  // Refs for auto-selection control
  const autoSelectionDone = useRef(false);

  // Employee positions hook
  const {
    employeePositions: employeePositionData,
    loading: employeePositionsLoading,
    error: employeePositionsError,
    hasMore: employeePositionsHasMore,
    loadMore: loadMoreEmployeePositions,
    searchEmployees,
  } = useEmployeePositions({ accessToken: businessAppContext.accessToken });

  // Current user employee hook
  const {
    employee: currentUserEmployee,
  } = useEmployeeById({ 
    accessToken: businessAppContext.accessToken, 
    employeeId: businessAppContext.userInfo?.employeeDetails?.employeeId 
  });

  // Default submit function - saves opportunity via API
  const defaultOnSubmit = useCallback(async (values: OpportunityFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      // Convert form values to API payload
      const opportunityPayload: OpportunityPayload = {
        // Basic fields
        id: values.id,
        version: values.version || 0,
        name: values.name,
        businessKey: values.businessKey,
        code: values.code,
        
        // Core opportunity fields
        estimatedAmount: values.estimatedAmount ? parseFloat(values.estimatedAmount) : undefined,
        winningChance: values.winningChance ? parseFloat(values.winningChance) : undefined,
        closeDate: values.closeDate ? new Date(values.closeDate).toISOString() : undefined,
        lastInteraction: values.lastInteraction ? new Date(values.lastInteraction).toISOString() : undefined,
        notesSummary: values.notesSummary,
        
        // Status and pipeline fields
        opportunityStatusRef: values.opportunityStatus,
        status: values.status,
        stage: values.stage,
        pipelineRef: values.pipeline,
        salesPipelineRef: values.pipeline, // Map to salesPipelineRef for backward compatibility
        salesPipelineStageRef: values.salesPipelineStage,
        
        // Relationship fields
        accountId: values.account || values.accountId,
        leadId: values.lead || values.leadId,
        ownerEmployeeId: values.owner || values.ownerEmployeeId,
        ownerOrganizationId: values.ownerOrganizationId,
        
        // Currency and system fields
        currencyRef: values.currency,
        sourceApp: values.sourceApp,
        personal: values.personal,
        
        // Additional properties
        additionalProperties: values.additionalProperties,
        express1: values.express1,
        express2: values.express2,
        
        // Process fields
        processInstanceId: values.processInstanceId,
        recordState: values.recordState,
        
        // Addresses
        addresses: values.addresses?.map(addr => ({
          id: addr.id,
          version: addr.version || 0,
          addressType: addr.addressType || 'BUSINESS',
          addressLine: addr.addressLine,
          postalCode: addr.postalCode,
          city: addr.city,
          regionRef: addr.region,
          countryRef: addr.country,
        })),
        
        // Communication channels
        communicationChannels: values.communicationChannels?.map(channel => ({
          id: channel.id,
          version: channel.version || 0,
          channelType: channel.channelType,
          channelValue: channel.channelValue,
          isPrimary: channel.isPrimary,
        })),
        
        // Tags
        tags: values.tags?.map(tag => ({
          id: tag.id,
          version: tag.version || 0,
          tagName: tag.tagName,
          tagValue: tag.tagValue,
        })),
      };

      // Determine change mode based on whether we have an ID
      const changeMode = values.id ? 'UPDATE' : 'INSERT';

      // Save via API
      const result = await opportunityClient.saveOpportunity(
        opportunityPayload,
        businessAppContext.accessToken,
        changeMode
      );

      message.success('Opportunity saved successfully');

      // If we're in a process context, dispatch continue event
      if (window.parent && typeof window.parent.postMessage === 'function') {
        const processPayload = {
          opportunityId: result?.opportunity?.id || values.id,
          ...result
        };
        dispatchProcessContinueEvent('opportunitySaved', processPayload);
      }

    } catch (error) {
      console.error('Error saving opportunity:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to save opportunity: ${errorMessage}`);
      message.error(`Failed to save opportunity: ${errorMessage}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [businessAppContext.accessToken]);

  // Use custom submit function if provided, otherwise use default
  const onSubmit = customOnSubmit || defaultOnSubmit;

  // Computed employee positions with current user prioritized
  const employeePositions = useMemo(() => {
    // Convert employee position data to SelectOption format
    const regularEmployees: SelectOption[] = (employeePositionData || []).map(emp => {
      const displayName = `${emp.firstName} ${emp.lastName}`;
      const jobTitle = emp.jobPosition?.name || 'No Position';
      const orgUnit = emp.organizationalUnit?.name || 'No Unit';
      
      return {
        id: emp.employeeId,
        value: emp.employeeId,
        label: `${displayName} - ${jobTitle}`,
        name: displayName,
        extraInfo: {
          picture: emp.employee.picture || undefined,
          pictureThumbnail: emp.employee.pictureThumbnail || undefined,
          jobPosition: jobTitle,
          organizationalUnit: orgUnit,
          userId: emp.employee.userId || undefined,
        }
      };
    });
    
    if (currentUserEmployee) {
      const currentUserDisplayName = `${currentUserEmployee.firstName} ${currentUserEmployee.lastName}`;
      const currentUserJobTitle = currentUserEmployee.jobPosition?.name || 'No Position';
      const currentUserOrgUnit = currentUserEmployee.organizationalUnit?.name || 'No Unit';
      
      const currentUserOption: SelectOption = {
        id: currentUserEmployee.employeeId,
        value: currentUserEmployee.employeeId,
        label: `${currentUserDisplayName} - ${currentUserJobTitle}`,
        name: currentUserDisplayName,
        extraInfo: {
          picture: currentUserEmployee.employee.picture || undefined,
          pictureThumbnail: currentUserEmployee.employee.pictureThumbnail || undefined,
          jobPosition: currentUserJobTitle,
          organizationalUnit: currentUserOrgUnit,
          userId: currentUserEmployee.employee.userId || undefined,
        }
      };

      const isCurrentUserAlreadyInList = regularEmployees.some(emp => emp.id === currentUserEmployee.employeeId);
      if (!isCurrentUserAlreadyInList) {
        return [currentUserOption, ...regularEmployees];
      }
    }

    return regularEmployees;
  }, [employeePositionData, currentUserEmployee]);

  // Static data arrays
  const opportunityStatuses: SelectOption[] = [
    { id: 'OPEN', value: 'OPEN', label: 'Open', name: 'Open' },
    { id: 'WON', value: 'WON', label: 'Won', name: 'Won' },
    { id: 'LOST', value: 'LOST', label: 'Lost', name: 'Lost' },
    { id: 'CANCELLED', value: 'CANCELLED', label: 'Cancelled', name: 'Cancelled' }
  ];

  const pipelines: SelectOption[] = [
    { id: 'SALES', value: 'SALES', label: 'Sales Pipeline', name: 'Sales Pipeline' },
    { id: 'MARKETING', value: 'MARKETING', label: 'Marketing Pipeline', name: 'Marketing Pipeline' },
    { id: 'PARTNER', value: 'PARTNER', label: 'Partner Pipeline', name: 'Partner Pipeline' }
  ];

  const salesPipelineStages: SelectOption[] = [
    { id: 'PROSPECTING', value: 'PROSPECTING', label: 'Prospecting', name: 'Prospecting' },
    { id: 'QUALIFICATION', value: 'QUALIFICATION', label: 'Qualification', name: 'Qualification' },
    { id: 'NEEDS_ANALYSIS', value: 'NEEDS_ANALYSIS', label: 'Needs Analysis', name: 'Needs Analysis' },
    { id: 'VALUE_PROPOSITION', value: 'VALUE_PROPOSITION', label: 'Value Proposition', name: 'Value Proposition' },
    { id: 'PROPOSAL', value: 'PROPOSAL', label: 'Proposal', name: 'Proposal' },
    { id: 'NEGOTIATION', value: 'NEGOTIATION', label: 'Negotiation', name: 'Negotiation' },
    { id: 'CLOSED_WON', value: 'CLOSED_WON', label: 'Closed Won', name: 'Closed Won' },
    { id: 'CLOSED_LOST', value: 'CLOSED_LOST', label: 'Closed Lost', name: 'Closed Lost' }
  ];

  const currencies: SelectOption[] = [
    { id: 'EUR', value: 'EUR', label: 'Euro (EUR)', name: 'Euro' },
    { id: 'USD', value: 'USD', label: 'US Dollar (USD)', name: 'US Dollar' },
    { id: 'GBP', value: 'GBP', label: 'British Pound (GBP)', name: 'British Pound' },
    { id: 'CHF', value: 'CHF', label: 'Swiss Franc (CHF)', name: 'Swiss Franc' }
  ];

  // Auto-select current user as owner
  useEffect(() => {
    if (currentUserEmployee && !autoSelectionDone.current && !formValues.owner) {
      setFormValuesState(prev => ({
        ...prev,
        owner: currentUserEmployee.employeeId,
        ownerEmployeeId: currentUserEmployee.employeeId // Update legacy field too
      }));
      autoSelectionDone.current = true;
    }
  }, [currentUserEmployee, formValues.owner]);

  // Form value setter
  const setFormValues = useCallback((updates: Partial<OpportunityFormValues>) => {
    setFormValuesState(prev => ({ ...prev, ...updates }));
  }, []);

  // Search functions
  const searchAccounts = useCallback(async (search: string): Promise<SelectOption[]> => {
    // TODO: Implement account search API integration
    return [];
  }, []);

  const searchLeads = useCallback(async (search: string): Promise<SelectOption[]> => {
    // TODO: Implement lead search API integration
    return [];
  }, []);

  const searchEmployeePositions = useCallback((search: string) => {
    searchEmployees(search);
  }, [searchEmployees]);

  const contextValue: OpportunityFormContextValue = {
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
    opportunityStatuses,
    pipelines,
    salesPipelineStages,
    currencies,
    addressTypes: ADDRESS_TYPES,
    communicationChannelTypes: COMMUNICATION_CHANNEL_TYPES,
    recordStates: RECORD_STATES,

    // Account autocomplete
    accountSuggestions,
    searchAccounts,
    isSearchingAccounts,
    setIsSearchingAccounts,
    setAccountSuggestions,

    // Lead autocomplete
    leadSuggestions,
    searchLeads,
    isSearchingLeads,
    setIsSearchingLeads,
    setLeadSuggestions,

    // Business app context for child components
    businessAppContext,
  };

  return (
    <OpportunityFormContext.Provider value={contextValue}>
      {children}
    </OpportunityFormContext.Provider>
  );
};

export const useOpportunityFormContext = (): OpportunityFormContextValue => {
  const context = useContext(OpportunityFormContext);
  if (!context) {
    throw new Error('useOpportunityFormContext must be used within an OpportunityFormProvider');
  }
  return context;
}; 