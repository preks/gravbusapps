import React, { useEffect, useState } from 'react';
import { message, Upload } from 'antd';
import { 
  Button, 
  Spinner, 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea
} from '@newwork/nw-design-system';
import { useForm } from 'react-hook-form';
import { Calendar, User, FileText, Clock, Search, Upload as UploadIcon } from 'lucide-react';
import { useSalesTaskFormContext } from '../context/SalesTaskFormContext';
import { SalesTaskFormValues } from '../types';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import dayjs from 'dayjs';

const prefixDataTestId = 'SalesTaskForm';

const SalesTaskFormComponent: React.FC = () => {
  const {
    formValues,
    onSubmit,
    onCancel,
    isLoading,
    error,
    isUpdateMode,
    fileList,
    businessAppContext,
    taskTypes,
    priorities,
    statuses,
    employees,
    entities,
    selectedEntity,
    showEntitySearch,
    searchEntities,
    setSelectedEntity,
    searchEmployees,
  } = useSalesTaskFormContext();

  const { accessToken, additionalData } = businessAppContext;

  // Check if this is an approval request (when Task Type should be hidden)
  // This can be set explicitly OR detected from pre-filled approval type
  const processTypeRef = additionalData?.psi_taskPayload?.psi_initialParameters?.typeRef || 
                        additionalData?.typeRef;
  
  const isApprovalRequest = additionalData?.isApprovalRequest || 
    processTypeRef === 'SalesTaskType:v1:APPROVAL' ||
    processTypeRef?.includes('APPROVAL') ||
    additionalData?.typeRef === 'SalesTaskType:v1:APPROVAL' ||
    additionalData?.typeRef?.includes('APPROVAL') ||
    formValues.taskTypeRef === 'SalesTaskType:v1:APPROVAL' ||
    formValues.taskTypeRef?.includes('APPROVAL') ||
    false;
  
  // Debug log to verify approval request mode (cleaned up)
  // console.log('🔍 SalesTaskForm - isApprovalRequest:', isApprovalRequest, 'processTypeRef:', processTypeRef);

  // Entity search state
  const [entitySearchTerm, setEntitySearchTerm] = useState('');
  const [showEntityDropdown, setShowEntityDropdown] = useState(false);

  // Employee search state
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  // Document upload state
  const [documentFileList, setDocumentFileList] = useState<any[]>([]);

  // Initialize react-hook-form
  const form = useForm<SalesTaskFormValues>({
    defaultValues: {
      title: formValues.title || '',
      taskTypeRef: formValues.taskTypeRef || '',
      priorityRef: formValues.priorityRef || '',
      statusRef: formValues.statusRef || 'SalesTaskStatus:v1:PENDING',
      timingType: formValues.timingType || 'DEADLINE',
      assignedEmployeeId: formValues.assignedEmployeeId || '',
      deadline: formValues.deadline || '',
      description: formValues.description || '',
      relatedEntityId: formValues.relatedEntityId || '',
      relatedEntityType: formValues.relatedEntityType || '',
      files: formValues.files || [],
      id: formValues.id,
      version: formValues.version || 0,
    },
    mode: 'onChange'
  });

  // Update form when context values change
  useEffect(() => {
    form.reset({
      title: formValues.title || '',
      taskTypeRef: formValues.taskTypeRef || '',
      priorityRef: formValues.priorityRef || '',
      statusRef: formValues.statusRef || 'SalesTaskStatus:v1:PENDING',
      timingType: formValues.timingType || 'DEADLINE',
      assignedEmployeeId: formValues.assignedEmployeeId || '',
      deadline: formValues.deadline || '',
      description: formValues.description || '',
      relatedEntityId: formValues.relatedEntityId || '',
      relatedEntityType: formValues.relatedEntityType || '',
      files: formValues.files || [],
      id: formValues.id,
      version: formValues.version || 0,
    });
  }, [formValues, form, isApprovalRequest, isUpdateMode]);

  // Fallback prefill for update approvals when employee list or deadline not yet resolved
  useEffect(() => {
    if (!isUpdateMode) return;
    const originalTask = (additionalData?.taskData as any) || (additionalData?.psi_taskPayload as any)?.psi_initialParameters?.taskData;
    if (!originalTask) return;

    // Prefill deadline if missing
    if (!form.getValues('deadline')) {
      const rawDeadline = originalTask.dueDate || originalTask.deadline || originalTask.dueDateTime || originalTask.scheduledAt;
      if (rawDeadline) {
        const value = dayjs(rawDeadline).isValid() ? dayjs(rawDeadline).format('YYYY-MM-DDTHH:mm') : '';
        if (value) form.setValue('deadline', value);
      }
    }

    // Prefill assigned employee if missing
    const assignedId = formValues.assignedEmployeeId || originalTask.assignedEmployeeId || originalTask.assignedEmployee?.id;
    if (assignedId && !selectedEmployee) {
      const label = originalTask.assignedEmployee?.displayName || originalTask.assignedEmployee?.fullName || '';
      if (label) setEmployeeSearchTerm(label);
      form.setValue('assignedEmployeeId', assignedId);
      setSelectedEmployee({ id: assignedId, label: label || assignedId, value: assignedId });
    }
  }, [isUpdateMode, additionalData, formValues.assignedEmployeeId, selectedEmployee, form]);

  // Update entity search term when selected entity changes
  useEffect(() => {
    if (selectedEntity) {
      setEntitySearchTerm(selectedEntity.name);
      setShowEntityDropdown(false);
    }
  }, [selectedEntity]);

  // Update employee search term when assigned employee changes
  useEffect(() => {
    console.log('👤 EMPLOYEE EFFECT - Assigned Employee ID:', formValues.assignedEmployeeId);
    console.log('👤 AVAILABLE EMPLOYEES:', employees.length, employees.map(e => ({ id: e.id, label: e.label })));
    
    if (formValues.assignedEmployeeId) {
      const employee = employees.find(emp => emp.id === formValues.assignedEmployeeId);
      console.log('👤 FOUND EMPLOYEE:', employee);
      
      if (employee) {
        setEmployeeSearchTerm(employee.label);
        setSelectedEmployee(employee);
      }
    } else {
      // Only clear if user hasn't manually entered a search term
      if (!showEmployeeDropdown) {
        setEmployeeSearchTerm('');
        setSelectedEmployee(null);
      }
    }
  }, [formValues.assignedEmployeeId, employees]); // Re-added employees dependency

  // Update employee display when employees data loads and there's an assigned employee
  useEffect(() => {
    if (formValues.assignedEmployeeId && employees.length > 0 && !selectedEmployee) {
      const employee = employees.find(emp => emp.id === formValues.assignedEmployeeId);
      if (employee) {
        setEmployeeSearchTerm(employee.label);
        setSelectedEmployee(employee);
      }
    }
  }, [employees, formValues.assignedEmployeeId, selectedEmployee]);

  // Initialize entity search term from form values
  useEffect(() => {
    if (formValues.relatedEntityId && !selectedEntity) {
      // Find entity by ID to set the search term
      const entity = entities.find(e => e.id === formValues.relatedEntityId);
      if (entity) {
        setEntitySearchTerm(entity.name);
        setSelectedEntity(entity);
      }
    }
  }, [formValues.relatedEntityId, entities, selectedEntity, setSelectedEntity]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = () => {
      setShowEntityDropdown(false);
      setShowEmployeeDropdown(false);
    };

    if (showEntityDropdown || showEmployeeDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showEntityDropdown, showEmployeeDropdown]);

  // Handle entity search input change
  const handleEntitySearchChange = (value: string) => {
    setEntitySearchTerm(value);
    setShowEntityDropdown(true);
    if (value.trim().length >= 2) {
      searchEntities(value);
    } else {
      // Clear selection if search is cleared
      if (!value.trim()) {
        setSelectedEntity(null);
        form.setValue('relatedEntityId', '');
        form.setValue('relatedEntityType', '');
      }
    }
  };

  // Handle entity selection
  const handleEntitySelect = (entity: any) => {
    setSelectedEntity(entity);
    setEntitySearchTerm(entity.name);
    setShowEntityDropdown(false);
    form.setValue('relatedEntityId', entity.id);
    form.setValue('relatedEntityType', entity.type);
  };

  // Handle employee search input change
  const handleEmployeeSearchChange = (value: string) => {
    setEmployeeSearchTerm(value);
    setShowEmployeeDropdown(true);
    // Always trigger search, even with empty value to show all employees
    searchEmployees(value);
    if (!value.trim()) {
      // Clear selection if search is cleared
      setSelectedEmployee(null);
      form.setValue('assignedEmployeeId', '');
    }
  };

  // Handle employee field focus to show all employees
  const handleEmployeeFocus = () => {
    setShowEmployeeDropdown(true);
    // If no search term, trigger search to load all employees
    // Always trigger a fetch so the dropdown is pre-populated in Update mode
    searchEmployees(employeeSearchTerm || '');
  };

  // Handle employee selection
  const handleEmployeeSelect = (employee: any) => {
    setSelectedEmployee(employee);
    setEmployeeSearchTerm(employee.label);
    setShowEmployeeDropdown(false);
    form.setValue('assignedEmployeeId', employee.id);
  };

  // Listen for process completion events to handle file upload and success message
  useEffect(() => {
    const handler = async (event: any) => {
      try {
        const response = event.detail?.response;
        const salesTask = response?.salesTask;
        if (!salesTask) return;
        
        // Handle document uploads if there are files
        if (documentFileList && documentFileList.length > 0) {
          const { useFileClient } = await import('@/common/network/files/useFileClient');
          const { useRestClient } = await import('@/common/network/rest/useRestClient');
          const { env } = await import('@/common/env/EnvUtils');
          
          const fileClient = useFileClient({ accessToken } as any);
          const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'));
          
          // Upload each document
          for (const uploadFile of documentFileList) {
            if (uploadFile && uploadFile.originFileObj) {
              try {
                const file = uploadFile.originFileObj;
                const pathParams = { accessScope: 'public' };
                const queryParams = {
                  appName: 'crm',
                  folderPath: `/sales-tasks/${salesTask.id}/documents`,
                };
                
                const uploadResponse = await fileClient.uploadFile(
                  file,
                  pathParams,
                  queryParams
                );
                
                const crmDocumentPayload = {
                  employeeId: additionalData?.employeeId,
                  managerId: additionalData?.managerId,
                  structureId: additionalData?.structureId,
                  locationId: additionalData?.locationId,
                  organizationalUnitId: additionalData?.organizationalUnitId,
                  crmDocument: {
                    name: file.name,
                    description: `Document for sales task: ${salesTask.name}`,
                    file: uploadResponse.fileInfo.fileId,
                    fileSize: file.size,
                    mimeType: file.type,
                    verified: true,
                    verificationDate: new Date().toISOString(),
                    salesTask: salesTask.id,
                    version: 0,
                  },
                  changeMode: 'INSERT',
                };
                
                await restClient.post('/customer-relations/saveCrmDocument', crmDocumentPayload, {
                  headers: { Authorization: `Bearer ${accessToken}` },
                });
                
                console.log(`Document uploaded successfully: ${file.name}`);
              } catch (docError) {
                console.error(`Failed to upload document ${uploadFile.name}:`, docError);
                message.error(`Failed to upload document: ${uploadFile.name}`);
              }
            }
          }
        }
        
        message.success(isUpdateMode ? 'Task updated successfully' : 'Task created successfully');
      } catch (err: any) {
        console.error('Error in process completion:', err);
        message.error(err?.message || 'Failed to create task');
      }
    };
    
    window.addEventListener('com.newwork.process.taskCompletion', handler as EventListener);
    
    return () => {
      window.removeEventListener('com.newwork.process.taskCompletion', handler as EventListener);
    };
  }, [accessToken, documentFileList, isUpdateMode, additionalData]);

  // Handle form submission
  const handleSubmit = async (values: SalesTaskFormValues) => {
    try {
      await onSubmit(values);
      
      // Resolve assigned employee to ensure we always send it when present
      const normalizedSearch = (employeeSearchTerm || '').trim().toLowerCase();
      const fallbackMatched = employees.find(e => (e.label || '').trim().toLowerCase() === normalizedSearch);
      const assignedEmployeeIdToUse =
        values.assignedEmployeeId || selectedEmployee?.id || fallbackMatched?.id || '';

      // Build payload for process continuation
      const payload = {
        employeeId: additionalData?.employeeId,
        managerId: additionalData?.managerId,
        structureId: additionalData?.structureId,
        locationId: additionalData?.locationId,
        organizationalUnitId: additionalData?.organizationalUnitId,
        ...(additionalData?.contactId && { contactId: additionalData.contactId }),
        changeMode: isUpdateMode ? 'UPDATE' : 'INSERT',
        salesTask: {
          ...(isUpdateMode && { id: values.id }),
          version: isUpdateMode ? values.version || 0 : 0,
          typeRef: values.taskTypeRef || '',
          name: values.title,
          priorityRef: values.priorityRef,
          statusRef: values.statusRef,
          timingType: values.timingType,
                     dueDate: values.deadline ? dayjs(values.deadline).toISOString() : null,
          description: values.description,
          ...(assignedEmployeeIdToUse && { assignedEmployee: assignedEmployeeIdToUse }),
          // Entity from additionalData (when opened from record pages)
          ...(additionalData?.leadId && { lead: additionalData.leadId }),
          ...(additionalData?.opportunityId && { opportunity: additionalData.opportunityId }),
          ...(additionalData?.contactId && { contact: additionalData.contactId }),
          ...(additionalData?.accountId && { account: additionalData.accountId }),
          // Entity from manual selection (when opened standalone)
          ...(values.relatedEntityType === 'lead' && { lead: values.relatedEntityId }),
          ...(values.relatedEntityType === 'contact' && { contact: values.relatedEntityId }),
          ...(values.relatedEntityType === 'account' && { account: values.relatedEntityId }),
          ...(values.relatedEntityType === 'opportunity' && { opportunity: values.relatedEntityId }),
        },
      };
      
      // Log the payload for debugging
      console.log(`${isUpdateMode ? 'Updating' : 'Creating'} sales task with payload:`, payload);
      console.log('Form values - relatedEntityType:', values.relatedEntityType, 'relatedEntityId:', values.relatedEntityId);
      console.log('Selected entity:', selectedEntity);
      console.log('Additional data:', additionalData);
      
      // Dispatch the process continuation event
      dispatchProcessContinueEvent('pse_submit', payload);
      
      message.success(`Sales task ${isUpdateMode ? 'updated' : 'created'} successfully`);
      onCancel();
    } catch (error) {
      console.error(`Error ${isUpdateMode ? 'updating' : 'creating'} sales task:`, error);
      message.error(`Failed to ${isUpdateMode ? 'update' : 'create'} sales task. Please try again.`);
    }
  };

  // Handle form cancellation
  const handleCancel = async () => {
    try {
      await onCancel();
      
      // Dispatch process continue event for cancellation (pause)
      dispatchProcessContinueEvent('pse_pause', {});
    } catch (err) {
      console.error('Error cancelling sales task form:', err);
    }
  };

  return (
    <div className="gba:h-full gba:flex gba:flex-col gba:max-w-2xl gba:mx-auto gba:p-6">
      <div className="gba:space-y-6" data-testid={formatDataTestId(prefixDataTestId, 'Form')}>
        {/* Header */}
        <div className="gba:mb-6">
          <h1 className="gba:text-2xl gba:font-semibold gba:flex gba:items-center gba:gap-2">
            <FileText className="gba:h-6 gba:w-6" />
            {isUpdateMode 
              ? (isApprovalRequest
                  ? getTranslationFromI18nKeyAndLabel('crm:salesTask.updateApproval', 'Update Approval')
                  : getTranslationFromI18nKeyAndLabel('crm:salesTask.update', 'Update Task')
                )
              : getTranslationFromI18nKeyAndLabel('crm:salesTask.create', 'Create Sales Task')
            }
          </h1>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="gba:space-y-6">
            
            {/* Task Name */}
            <FormField
              control={form.control}
              name="title"
              rules={{ 
                required: getTranslationFromI18nKeyAndLabel('crm:salesTask.title.required', 'Task name is required') 
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTranslationFromI18nKeyAndLabel('crm:salesTask.title', 'Task Name')}</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder={getTranslationFromI18nKeyAndLabel('crm:salesTask.title.placeholder', 'Enter task name')}
                      data-testid={formatDataTestId(prefixDataTestId, 'TitleInput')}
                      className="gba:w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

                         {/* Task Type - Hidden for approval requests (create or update) */}
             {!isApprovalRequest && (
             <FormField
              control={form.control}
              name="taskTypeRef"
              rules={{ 
                  required: !isApprovalRequest ? getTranslationFromI18nKeyAndLabel('crm:salesTask.type.required', 'Task type is required') : false 
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTranslationFromI18nKeyAndLabel('crm:salesTask.type', 'Task Type')}</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger 
                        data-testid={formatDataTestId(prefixDataTestId, 'TypeSelect')}
                        className="gba:w-full"
                      >
                        <SelectValue placeholder={getTranslationFromI18nKeyAndLabel('crm:salesTask.type.placeholder', 'Select task type')} />
                      </SelectTrigger>
                      <SelectContent>
                        {taskTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            )}

            {/* Priority */}
            <FormField
              control={form.control}
              name="priorityRef"
              rules={{ 
                required: getTranslationFromI18nKeyAndLabel('crm:salesTask.priority.required', 'Priority is required') 
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTranslationFromI18nKeyAndLabel('crm:salesTask.priority', 'Priority')}</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger 
                        data-testid={formatDataTestId(prefixDataTestId, 'PrioritySelect')}
                        className="gba:w-full"
                      >
                        <SelectValue placeholder={getTranslationFromI18nKeyAndLabel('crm:salesTask.priority.placeholder', 'Select priority')} />
                      </SelectTrigger>
                      <SelectContent>
                        {priorities.map((priority) => (
                          <SelectItem key={priority.id} value={priority.id.toString()}>
                            {priority.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status */}
            <FormField
              control={form.control}
              name="statusRef"
              rules={{ 
                required: getTranslationFromI18nKeyAndLabel('crm:salesTask.status.required', 'Status is required') 
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTranslationFromI18nKeyAndLabel('crm:salesTask.status', 'Status')}</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger 
                        data-testid={formatDataTestId(prefixDataTestId, 'StatusSelect')}
                        className="gba:w-full"
                      >
                        <SelectValue placeholder={getTranslationFromI18nKeyAndLabel('crm:salesTask.status.placeholder', 'Select status')} />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((status) => (
                          <SelectItem key={status.id} value={status.id.toString()}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Timing Type */}
            <FormField
              control={form.control}
              name="timingType"
              rules={{ 
                required: getTranslationFromI18nKeyAndLabel('crm:salesTask.timingType.required', 'Timing type is required') 
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTranslationFromI18nKeyAndLabel('crm:salesTask.timingType', 'Timing Type')}</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger 
                        data-testid={formatDataTestId(prefixDataTestId, 'TimingTypeSelect')}
                        className="gba:w-full"
                      >
                        <SelectValue placeholder={getTranslationFromI18nKeyAndLabel('crm:salesTask.timingType.placeholder', 'Select timing type')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DEADLINE">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <Clock className="gba:h-4 gba:w-4 gba:text-red-500" />
                            <span>Deadline</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="SCHEDULED">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <Calendar className="gba:h-4 gba:w-4 gba:text-blue-500" />
                            <span>Scheduled</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Assigned To */}
            <FormField
              control={form.control}
              name="assignedEmployeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="gba:flex gba:items-center gba:gap-2">
                    <User className="gba:h-4 gba:w-4" />
                    {getTranslationFromI18nKeyAndLabel('crm:salesTask.assignedTo', 'Assigned To')}
                  </FormLabel>
                  <FormControl>
                    <div 
                      className="gba:relative"
                      onClick={(e) => e.stopPropagation()} // Prevent outside click when clicking inside
                    >
                      <Input
                        value={employeeSearchTerm}
                        onChange={(e) => handleEmployeeSearchChange(e.target.value)}
                        onFocus={handleEmployeeFocus}
                        placeholder={getTranslationFromI18nKeyAndLabel('crm:salesTask.assignedTo.placeholder', 'Search for employees...')}
                        data-testid={formatDataTestId(prefixDataTestId, 'AssignedToInput')}
                        className="gba:w-full"
                      />
                      {showEmployeeDropdown && (
                        <div className="gba:absolute gba:z-50 gba:w-full gba:bg-white gba:border gba:border-gray-200 gba:rounded-md gba:shadow-lg gba:mt-1 gba:max-h-64 gba:overflow-y-auto">
                          {employees.length > 0 ? (
                            employees.map((employee) => (
                              <div
                                key={employee.id}
                                className="gba:p-3 gba:cursor-pointer hover:gba:bg-gray-50 gba:border-b gba:border-gray-100 last:gba:border-b-0"
                                onMouseDown={(e) => {
                                  e.preventDefault(); // Prevent input blur
                                  handleEmployeeSelect(employee);
                                }}
                              >
                                <div className="gba:flex gba:flex-col">
                                  <div className="gba:font-medium gba:text-sm">{employee.label}</div>
                                  <div className="gba:text-xs gba:text-gray-500 gba:flex gba:items-center gba:gap-1 gba:mt-1">
                                    {employee.extraInfo?.jobPosition && (
                                      <span className="gba:capitalize gba:font-medium gba:text-blue-600">{employee.extraInfo.jobPosition}</span>
                                    )}
                                    {employee.extraInfo?.organizationalUnit && (
                                      <>
                                        {employee.extraInfo?.jobPosition && <span>•</span>}
                                        <span>{employee.extraInfo.organizationalUnit}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="gba:p-3 gba:text-sm gba:text-gray-500 gba:text-center">
                              {employeeSearchTerm.length >= 1 ? 'No results found. Try a different search term.' : 'Start typing to search for employees...'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Deadline */}
            <FormField
              control={form.control}
              name="deadline"
              rules={{ 
                required: getTranslationFromI18nKeyAndLabel('crm:salesTask.deadline.required', 'Deadline is required') 
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="gba:flex gba:items-center gba:gap-2">
                    <Clock className="gba:h-4 gba:w-4" />
                    {getTranslationFromI18nKeyAndLabel('crm:salesTask.deadline', 'Deadline')}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      value={field.value || ''}
                      type="datetime-local"
                      data-testid={formatDataTestId(prefixDataTestId, 'DeadlineInput')}
                      className="gba:w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Related Entity */}
            {showEntitySearch && (
              <FormField
                control={form.control}
                name="relatedEntityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{getTranslationFromI18nKeyAndLabel('crm:salesTask.entity', 'Related Entity')}</FormLabel>
                    <FormControl>
                      <div 
                        className="gba:relative"
                        onClick={(e) => e.stopPropagation()} // Prevent outside click when clicking inside
                      >
                        <Input
                          value={entitySearchTerm}
                          onChange={(e) => handleEntitySearchChange(e.target.value)}
                          onFocus={() => setShowEntityDropdown(true)}
                          placeholder={getTranslationFromI18nKeyAndLabel('crm:salesTask.entity.placeholder', 'Search for leads, contacts, accounts, or opportunities...')}
                          data-testid={formatDataTestId(prefixDataTestId, 'EntityInput')}
                          className="gba:w-full"
                        />
                        {showEntityDropdown && entitySearchTerm.length >= 2 && (
                          <div className="gba:absolute gba:z-50 gba:w-full gba:bg-white gba:border gba:border-gray-200 gba:rounded-md gba:shadow-lg gba:mt-1 gba:max-h-64 gba:overflow-y-auto">
                            {entities.length > 0 ? (
                              entities.map((entity) => (
                                <div
                                  key={entity.id}
                                  className="gba:p-3 gba:cursor-pointer hover:gba:bg-gray-50 gba:border-b gba:border-gray-100 last:gba:border-b-0"
                                  onMouseDown={(e) => {
                                    e.preventDefault(); // Prevent input blur
                                    handleEntitySelect(entity);
                                  }}
                                >
                                  <div className="gba:flex gba:flex-col">
                                    <div className="gba:font-medium gba:text-sm">{entity.name}</div>
                                    <div className="gba:text-xs gba:text-gray-500 gba:flex gba:items-center gba:gap-1 gba:mt-1">
                                      <span className="gba:capitalize gba:font-medium gba:text-blue-600">{entity.type}</span>
                                      {entity.subtitle && (
                                        <>
                                          <span>•</span>
                                          <span>{entity.subtitle}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="gba:p-3 gba:text-sm gba:text-gray-500 gba:text-center">
                                No results found. Try a different search term.
                              </div>
                            )}
                          </div>
                        )}
                        {showEntityDropdown && entitySearchTerm.length < 2 && entitySearchTerm.length > 0 && (
                          <div className="gba:absolute gba:z-50 gba:w-full gba:bg-white gba:border gba:border-gray-200 gba:rounded-md gba:shadow-lg gba:mt-1">
                            <div className="gba:p-3 gba:text-sm gba:text-gray-500 gba:text-center">
                              Type at least 2 characters to search...
                            </div>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTranslationFromI18nKeyAndLabel('crm:salesTask.description', 'Description')}</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder={getTranslationFromI18nKeyAndLabel('crm:salesTask.description.placeholder', 'Enter task description')}
                      rows={4}
                      data-testid={formatDataTestId(prefixDataTestId, 'DescriptionInput')}
                      className="gba:w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Document Upload */}
            <FormItem>
              <FormLabel className="gba:flex gba:items-center gba:gap-2">
                <UploadIcon className="gba:h-4 gba:w-4" />
                {getTranslationFromI18nKeyAndLabel('crm:salesTask.documents', 'Attach Documents')}
              </FormLabel>
              <FormControl>
                <Upload.Dragger
                  fileList={documentFileList}
                  onChange={({ fileList }) => setDocumentFileList(fileList)}
                  beforeUpload={() => false} // Prevent automatic upload
                  multiple={true}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt"
                  data-testid={formatDataTestId(prefixDataTestId, 'DocumentUpload')}
                  className="gba:w-full"
                  style={{ backgroundColor: '#fafafa' }}
                >
                  <div className="gba:p-4 gba:text-center">
                    <UploadIcon className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2 gba:text-gray-400" />
                    <p className="gba:text-sm gba:font-medium gba:text-gray-700">
                      {getTranslationFromI18nKeyAndLabel('crm:salesTask.documents.dragDrop', 'Click or drag files to this area to upload')}
                    </p>
                    <p className="gba:text-xs gba:text-gray-500 gba:mt-1">
                      {getTranslationFromI18nKeyAndLabel('crm:salesTask.documents.supportedFormats', 'Support for PDF, Office documents, images, and text files')}
                    </p>
                  </div>
                </Upload.Dragger>
              </FormControl>
            </FormItem>

            {/* Error Display */}
            {error && (
              <div className="gba:bg-red-50 gba:border gba:border-red-200 gba:rounded-md gba:p-4">
                <div className="gba:text-red-800 gba:text-sm">
                  {error}
                </div>
              </div>
            )}

            {/* Submit and Cancel Buttons */}
            <div className="gba:flex gba:justify-end gba:gap-3 gba:pt-6 gba:border-t gba:border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
                data-testid={formatDataTestId(prefixDataTestId, 'CancelButton')}
              >
                {getTranslationFromI18nKeyAndLabel('crm:common.cancel', 'Cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                data-testid={formatDataTestId(prefixDataTestId, 'SubmitButton')}
              >
                {isLoading && <Spinner className="gba:mr-2" />}
                {getTranslationFromI18nKeyAndLabel(
                  isUpdateMode ? 'crm:common.update' : 'crm:common.submit', 
                  isUpdateMode ? 'Update' : 'Submit'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default SalesTaskFormComponent; 