import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { SalesTaskFormValues, SelectOption, EntityOption, SalesTaskContextState } from '../types';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useSalesTaskTypes } from '../hooks/useSalesTaskTypes';
import { useSalesTaskPriorities } from '../hooks/useSalesTaskPriorities';
import { useSalesTaskEmployees } from '../hooks/useSalesTaskEmployees';
import { useSalesTaskEntities } from '../hooks/useSalesTaskEntities';
import { useFileClient } from '@/common/network/files/useFileClient';
import { useRestClient } from '@/common/network/rest/useRestClient';
import { env } from '@/common/env/EnvUtils';
import dayjs from 'dayjs';

interface SalesTaskFormContextValue extends SalesTaskContextState {
  formValues: SalesTaskFormValues;
  setFormValues: (updates: Partial<SalesTaskFormValues>) => void;
  onSubmit: (values: SalesTaskFormValues) => Promise<void>;
  onCancel: () => Promise<void>;
  
  // Data fetching
  taskTypesLoading: boolean;
  prioritiesLoading: boolean;
  employeesLoading: boolean;
  entitiesLoading: boolean;
  
  // Search functions
  searchTaskTypes: (search: string) => void;
  searchPriorities: (search: string) => void;
  searchEmployees: (search: string) => void;
  searchEntities: (search: string) => void;
  
  // Entity selection
  setSelectedEntity: (entity: EntityOption | null) => void;
  
  // File management
  setFileList: (files: any[]) => void;
  
  // Business app context
  businessAppContext: BusinessAppContextProps;
}

const SalesTaskFormContext = createContext<SalesTaskFormContextValue | null>(null);

interface SalesTaskFormProviderProps {
  children: React.ReactNode;
  businessAppContext: BusinessAppContextProps;
  initialValues?: Partial<SalesTaskFormValues>;
  onSubmit?: (values: SalesTaskFormValues) => Promise<void>;
  onCancel?: () => Promise<void>;
  taskData?: any;
}

export const SalesTaskFormProvider: React.FC<SalesTaskFormProviderProps> = ({
  children,
  businessAppContext,
  initialValues = {},
  onSubmit = async () => {},
  onCancel = async () => {},
  taskData
}) => {
  const { accessToken, additionalData } = businessAppContext;
  
  // Get task data from additionalData if not provided as prop
  const actualTaskData = taskData || additionalData?.taskData;
  const isUpdateMode = !!actualTaskData;
  
  // Search states
  const [typeSearch, setTypeSearch] = useState('');
  const [prioritySearch, setPrioritySearch] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  
  // Check if typeRef is pre-filled from process payload (for approval requests)
  const processTypeRef = additionalData?.typeRef || initialValues?.taskTypeRef || '';
  
  // Form state
  const [formValues, setFormValuesState] = useState<SalesTaskFormValues>({
    title: '',
    taskTypeRef: processTypeRef,
    priorityRef: '',
    deadline: null,
    description: '',
    assignedEmployeeId: '',
    relatedEntityId: '',
    relatedEntityType: '',
    files: [],
    ...initialValues
  });
  
  const [selectedEntity, setSelectedEntity] = useState<EntityOption | null>(null);
  const [fileList, setFileList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data hooks
  const { data: taskTypes, loading: taskTypesLoading } = useSalesTaskTypes(accessToken, { search: typeSearch });
  const { data: priorities, loading: prioritiesLoading } = useSalesTaskPriorities(accessToken, { search: prioritySearch });
  const { data: employees, loading: employeesLoading } = useSalesTaskEmployees(accessToken, { search: employeeSearch, limit: employeeSearch ? 50 : 100 });
  const { entities, loading: entitiesLoading, searchEntities } = useSalesTaskEntities(accessToken);
  
  // Clients
  const fileClient = useFileClient({ accessToken } as any);
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'));
  
  // Check if entity search should be shown
  const hasEntityId = !!(additionalData?.leadId || additionalData?.contactId || additionalData?.accountId || additionalData?.opportunityId);
  const showEntitySearch = !hasEntityId && !isUpdateMode;
  
  // Map options for selectors
  const mappedTaskTypes = useMemo(() =>
    (taskTypes || []).map((entry: any) => ({
      id: entry.id,
      value: entry.id,
      label: entry.value,
    })), [taskTypes]
  );
  
  const mappedPriorities = useMemo(() =>
    (priorities || []).map((entry: any) => ({
      id: entry.id,
      value: entry.id,
      label: entry.value,
    })), [priorities]
  );
  
  const mappedEmployees = useMemo(() => {
    const options = (employees || []).map((employee: any) => ({
      id: employee.id,
      value: employee.id,
      label: employee.displayName,
      extraInfo: {
        displayName: employee.displayName,
        firstName: employee.firstName,
        lastName: employee.lastName,
      }
    }));

    // In UPDATE mode, ensure assigned employee is in the options
    if (isUpdateMode && actualTaskData?.assignedEmployee && actualTaskData.assignedEmployeeId) {
      const assignedEmployeeExists = options.some(opt => opt.value === actualTaskData.assignedEmployeeId);
      if (!assignedEmployeeExists) {
        options.unshift({
          id: actualTaskData.assignedEmployeeId,
          value: actualTaskData.assignedEmployeeId,
          label: actualTaskData.assignedEmployee.displayName || 
                 `${actualTaskData.assignedEmployee.firstName || ''} ${actualTaskData.assignedEmployee.lastName || ''}`.trim() ||
                 'Unknown Employee',
          extraInfo: {
            displayName: actualTaskData.assignedEmployee.displayName,
            firstName: actualTaskData.assignedEmployee.firstName,
            lastName: actualTaskData.assignedEmployee.lastName,
          }
        });
      }
    }

    return options;
  }, [employees, isUpdateMode, actualTaskData]);
  
  // Populate form with existing task data in UPDATE mode
  useEffect(() => {
    if (isUpdateMode && actualTaskData) {
      // Find catalog entry ID by matching the full reference
      const findCatalogEntryIdByRef = (ref: string, options: any[]) => {
        if (!ref) return '';
        const entry = options.find(opt => opt.value === ref);
        return entry ? entry.value : '';
      };

      const updateValues: Partial<SalesTaskFormValues> = {
        title: actualTaskData.name || '',
        taskTypeRef: findCatalogEntryIdByRef(actualTaskData.typeRef, mappedTaskTypes),
        priorityRef: findCatalogEntryIdByRef(actualTaskData.priorityRef, mappedPriorities),
        timingType: (actualTaskData.timingType as 'DEADLINE' | 'SCHEDULED') || 'DEADLINE',
        deadline: actualTaskData.dueDate ? dayjs(actualTaskData.dueDate).format('YYYY-MM-DDTHH:mm') : null,
        description: actualTaskData.description || '',
        assignedEmployeeId: actualTaskData.assignedEmployeeId || '',
        id: actualTaskData.id,
        version: actualTaskData.version || 0,
      };

      // Preserve existing entity relationship
      if (actualTaskData.account) {
        updateValues.relatedEntityId = actualTaskData.account.id || actualTaskData.account;
        updateValues.relatedEntityType = 'account';
        setSelectedEntity({
          id: actualTaskData.account.id || actualTaskData.account,
          name: actualTaskData.account.name || 'Account',
          type: 'account'
        });
      } else if (actualTaskData.contact) {
        updateValues.relatedEntityId = actualTaskData.contact.id || actualTaskData.contact;
        updateValues.relatedEntityType = 'contact';
        setSelectedEntity({
          id: actualTaskData.contact.id || actualTaskData.contact,
          name: `${actualTaskData.contact.firstName || ''} ${actualTaskData.contact.lastName || ''}`.trim() || 'Contact',
          type: 'contact'
        });
      } else if (actualTaskData.lead) {
        updateValues.relatedEntityId = actualTaskData.lead.id || actualTaskData.lead;
        updateValues.relatedEntityType = 'lead';
        setSelectedEntity({
          id: actualTaskData.lead.id || actualTaskData.lead,
          name: `${actualTaskData.lead.firstName || ''} ${actualTaskData.lead.lastName || ''}`.trim() || actualTaskData.lead.companyName || 'Lead',
          type: 'lead'
        });
      } else if (actualTaskData.opportunity) {
        updateValues.relatedEntityId = actualTaskData.opportunity.id || actualTaskData.opportunity;
        updateValues.relatedEntityType = 'opportunity';
        setSelectedEntity({
          id: actualTaskData.opportunity.id || actualTaskData.opportunity,
          name: actualTaskData.opportunity.name || 'Opportunity',
          type: 'opportunity'
        });
      }
      
      setFormValuesState(prev => ({ ...prev, ...updateValues }));
    }
  }, [isUpdateMode, actualTaskData, mappedTaskTypes, mappedPriorities]);
  
  // Helper to update form values
  const setFormValues = useCallback((updates: Partial<SalesTaskFormValues>) => {
    setFormValuesState(prev => ({ ...prev, ...updates }));
  }, []);
  
  const contextValue: SalesTaskFormContextValue = {
    // State
    formValues,
    setFormValues,
    onSubmit,
    onCancel,
    isLoading: loading,
    error,
    isUpdateMode,
    
    // Data
    taskTypes: mappedTaskTypes,
    priorities: mappedPriorities,
    employees: mappedEmployees,
    entities,
    selectedEntity,
    fileList,
    showEntitySearch,
    
    // Loading states
    taskTypesLoading,
    prioritiesLoading,
    employeesLoading,
    entitiesLoading,
    
    // Search functions
    searchTaskTypes: setTypeSearch,
    searchPriorities: setPrioritySearch,
    searchEmployees: setEmployeeSearch,
    searchEntities,
    
    // Entity management
    setSelectedEntity,
    
    // File management
    setFileList,
    
    // Context
    businessAppContext,
  };
  
  return (
    <SalesTaskFormContext.Provider value={contextValue}>
      {children}
    </SalesTaskFormContext.Provider>
  );
};

export const useSalesTaskFormContext = (): SalesTaskFormContextValue => {
  const context = useContext(SalesTaskFormContext);
  if (!context) {
    throw new Error('useSalesTaskFormContext must be used within a SalesTaskFormProvider');
  }
  return context;
}; 