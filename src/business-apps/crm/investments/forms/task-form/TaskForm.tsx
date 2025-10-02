import React, { useCallback, useState } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import TaskSegment, { TaskSegmentSchema } from '@/common/components/common-relations/form-segments/task-segment/TaskSegment';
import { AppActionForm } from '@/components/app-action-form';
import { buildInvestmentTaskPayload } from '@/common/data/investment/payloads';
import type { InvestmentTaskFormData } from '@/common/data/investment/payloads/investmentRelationPayloads';
import { useInvestmentEntities, useInvestmentTasks } from '@/common/data/investment/hooks';
import { useEmployeeSearch } from '@/common/data/employee/useEmployeeSearch';
import { useForm } from 'react-hook-form';
import { createTaskSegmentResolver } from '@/common/components/common-relations/form-segments/task-segment/TaskSegment';

type TaskFormData = TaskSegmentSchema & { id?: string; version?: number; code?: string };

const initialFormData: TaskFormData = {
  title: '',
  code: '',
  description: '',
  taskTypeRef: '',
  taskPriorityRef: '',
  taskStatusRef: 'InvestmentTaskStatus:v1:PENDING',
  dueDate: '',
  timingType: 'DEADLINE',
  assignedEmployeeId: '',
  relatedEntityId: '',
};

const TASK_TYPE_CATALOG = 'InvestmentTaskType';
const TASK_PRIORITY_CATALOG = 'InvestmentTaskPriority';
const TASK_STATUS_CATALOG = 'InvestmentTaskStatus';

export interface InvestmentTaskFormProps extends BusinessAppContextProps {
  onSuccess?: (task: TaskFormData) => void;
  onCancel?: () => void;
}

const InvestmentTaskForm: React.FC<InvestmentTaskFormProps> = ({ accessToken, userInfo, additionalData, onSuccess, onCancel }) => {
  const [formData, _setFormData] = useState<TaskFormData>({
    ...initialFormData,
    assignedEmployeeId: userInfo?.employeeDetails?.employeeId || '',
  });
  const { entities, loading: entitiesLoading, error: entitiesError, searchEntities, hasMore: entitiesHasMore, loadMore: loadMoreEntities, hydrateEntityById } = useInvestmentEntities({ accessToken, additionalData });
  const { employees, search: searchEmployees, loading: employeesLoading, hasMore: employeesHasMore, loadMore: loadMoreEmployees, hydrateById } = useEmployeeSearch(accessToken);
  const [assigneePrefill, setAssigneePrefill] = useState<Array<{ id: string; displayName: string; userId?: string; pictureThumbnail?: string; organizationalUnitName?: string; jobPositionName?: string }>>([]);
  const { fetchInvestmentTaskById } = useInvestmentTasks({ accessToken, userInfo, additionalData });

  // Resolve IDs from additionalData (platform may pass ids inside psi_taskPayload.psi_initialParameters)
  const platformParams = React.useMemo(() => {
    const nested = (additionalData as any)?.psi_taskPayload?.psi_initialParameters || (additionalData as any)?.psi_initialParameters || {};
    return {
      taskId: (additionalData as any)?.taskId || nested?.taskId,
      employeeId: (additionalData as any)?.employeeId || nested?.employeeId,
      investmentId: (additionalData as any)?.investmentId || nested?.investmentId,
      accountId: (additionalData as any)?.accountId || nested?.accountId,
      contactId: (additionalData as any)?.contactId || nested?.contactId,
      opportunityId: (additionalData as any)?.opportunityId || nested?.opportunityId,
      leadId: (additionalData as any)?.leadId || nested?.leadId,
    } as {
      taskId?: string; employeeId?: string; investmentId?: string; accountId?: string; contactId?: string; opportunityId?: string; leadId?: string;
    };
  }, [additionalData]);

  const investmentId = platformParams.investmentId;
  const accountId = platformParams.accountId;
  const contactId = platformParams.contactId;
  const opportunityId = platformParams.opportunityId;
  const leadId = platformParams.leadId;

  // Determine if entity selection should be shown
  const hasEntityFromContext = investmentId || accountId || contactId || opportunityId || leadId;
  const shouldShowEntitySelection = !hasEntityFromContext;
  // Load existing task when taskId is provided via additionalData
  React.useEffect(() => {
    const taskId = platformParams.taskId as string | undefined;
    
    if (!taskId) {
      return;
    }
    
    (async () => {
      try {
        const task = await fetchInvestmentTaskById(taskId);
        
        if (!task) {
          return;
        }
        
        console.log('✅ Fetched investment task data:', task);
        // Map fetched task to form fields
        const newFormData = {
          id: task.id,
          version: (task as any).version,
          title: task.name || '',
          code: task.code || '',
          description: task.description || '',
          taskTypeRef: task.taskType?.id || '',
          taskPriorityRef: task.taskPriority?.id || '',
          taskStatusRef: task.taskStatus?.id || 'InvestmentTaskStatus:v1:PENDING',
          dueDate: task.dueDate || '',
          timingType: (task.taskTiming as any) || 'DEADLINE',
          assignedEmployeeId: task.assignedEmployee?.id || '',
          relatedEntityId: task.investment?.id || task.account?.id || task.contact?.id || task.opportunity?.id || task.lead?.id || '',
        };
        
        console.log('📝 Setting form data from fetched task:', newFormData);
        _setFormData((prev) => ({ ...prev, ...newFormData }));
        
        // CRITICAL: Also update the React Hook Form values
        form.reset(newFormData);
        console.log('🔄 Reset form with new data:', newFormData);
        // Ensure the related entity is hydrated and pinned so the combobox trigger keeps rich label
        const relId = task.investment?.id || task.account?.id || task.contact?.id || task.opportunity?.id || task.lead?.id;
        if (relId) {
          if (task.investment?.id) hydrateEntityById('investment', task.investment.id);
          else if (task.account?.id) hydrateEntityById('account', task.account.id);
          else if (task.contact?.id) hydrateEntityById('contact', task.contact.id);
          else if (task.opportunity?.id) hydrateEntityById('opportunity', task.opportunity.id);
          else if (task.lead?.id) hydrateEntityById('lead', task.lead.id);
        }
        // Prefill assignee option so Combobox can display the name before search results
        if (task.assignedEmployee?.id) {
          const displayName = task.assignedEmployee.displayName || `${task.assignedEmployee.firstName || ''} ${task.assignedEmployee.lastName || ''}`.trim() || 'Unknown';
          setAssigneePrefill([{ id: task.assignedEmployee.id, displayName }]);
          // Hydrate details for the selected employee so avatar/job/unit appear immediately
          hydrateById(task.assignedEmployee.id);
        }
        // Also hydrate RHF defaults
        form.reset({
          title: task.name || '',
          description: task.description || '',
          taskTypeRef: task.taskType?.id || '',
          taskPriorityRef: task.taskPriority?.id || '',
          taskStatusRef: task.taskStatus?.id || '',
          dueDate: task.dueDate || '',
          timingType: (task.taskTiming as any) || 'DEADLINE',
          assignedEmployeeId: task.assignedEmployee?.id || '',
          assignedUserId: (task as any).assignedUserId || undefined,
          creatorEmployeeId: task.creatorEmployee?.id || undefined,
          creatorUserId: (task as any).creatorUserId || undefined,
          relatedEntityId: task.investment?.id || task.account?.id || task.contact?.id || task.opportunity?.id || task.lead?.id || '',
          investment: task.investment ? { id: task.investment.id } : undefined,
          account: task.account ? { id: task.account.id } : undefined,
          contact: task.contact ? { id: task.contact.id } : undefined,
          opportunity: task.opportunity ? { id: task.opportunity.id } : undefined,
          lead: task.lead ? { id: task.lead.id } : undefined,
        });
      } catch (e) {
        console.error('❌ Error in form data mapping:', e);
        console.error('❌ Task ID that failed to map:', taskId);
        // Don't fail silently - let's see what's wrong
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformParams.taskId]);

  // Prefill current user as default assignee in create mode so Combobox shows a label
  React.useEffect(() => {
    if (platformParams.taskId) return; // update mode handled above
    const id = platformParams.employeeId || userInfo?.employeeDetails?.employeeId;
    if (!id) return;
    const displayName = `${userInfo?.employeeDetails?.firstName || ''} ${userInfo?.employeeDetails?.lastName || ''}`.trim() || (userInfo?.userName || 'Current User');
    setAssigneePrefill([{ id, displayName }]);
    // Hydrate minimal details for initial selection
    hydrateById(id);
  }, [platformParams.taskId, platformParams.employeeId, userInfo, hydrateById]);

  // Merge prefilled assignee option with live search results, de-duplicated by id
  const mergedAssignees = React.useMemo(() => {
    const map = new Map<string, { id: string; displayName: string; userId?: string; pictureThumbnail?: string; organizationalUnitName?: string; jobPositionName?: string }>();
    assigneePrefill.forEach((o) => map.set(o.id, o));
    employees.forEach((e) => map.set(e.id, {
      id: e.id,
      displayName: e.displayName,
      userId: e.userId,
      pictureThumbnail: (e as any).pictureThumbnail,
      organizationalUnitName: (e as any).organizationalUnitName,
      jobPositionName: (e as any).jobPositionName,
    }));
    return Array.from(map.values());
  }, [assigneePrefill, employees]);

  // Local state update helper (kept if external code sets form data later)
  // (reserved for future external state updates)

  // RHF + Zod resolver provided to AppActionForm
  const form = useForm<any>({
    resolver: createTaskSegmentResolver({ requireAssignee: false, requireEntity: false, requireType: !((additionalData as any)?.typeRef === 'InvestmentTaskType:v1:APPROVAL') }),
    defaultValues: formData as any,
    mode: 'onChange',
  });

  const handleSubmit = useCallback(async (data: TaskSegmentSchema) => {
    console.log('🔍 Investment Task Form handleSubmit called:', {
      data,
      formData,
      isUpdate: Boolean(formData.id),
      taskId: formData.id
    });
    
    try {
      // Pull full form values to include non-registered fields (account/contact/opportunity/lead)
      const allValues = (form as any).getValues?.() || {};

    // assignedUserId is maintained by TaskSegment effect; prefer the form value if present
    const assignedUserId = allValues.assignedUserId;

    // Build entity ref from whichever field is set
    const entityRef = (() => {
      if (allValues.account?.id) return { account: { id: allValues.account.id } };
      if (allValues.contact?.id) return { contact: { id: allValues.contact.id } };
      if (allValues.opportunity?.id) return { opportunity: { id: allValues.opportunity.id } };
      if (allValues.lead?.id) return { lead: { id: allValues.lead.id } };
      return {} as any;
    })();

    const base: InvestmentTaskFormData = {
      title: data.title,
      code: formData.code,
      description: data.description || '',
      taskTypeRef: data.taskTypeRef,
      taskPriorityRef: data.taskPriorityRef,
      taskStatusRef: data.taskStatusRef,
      taskTiming: (allValues.timingType || data.timingType) as any,
      dueDate: data.dueDate || null,
      templateStartDate: allValues.templateStartDate || null,
      startDate: allValues.startDate || null,
      endDate: allValues.endDate || null,
      assignedEmployeeId: data.assignedEmployeeId,
      assignedUserId: assignedUserId,
      creatorEmployeeId: allValues.creatorEmployeeId,
      creatorUserId: allValues.creatorUserId,
      ...(entityRef as any),
    };

    // Only pass id/version when updating
    const mapped: InvestmentTaskFormData = formData.id ? { ...base, id: formData.id, version: formData.version } : base;

    const payload = buildInvestmentTaskPayload(mapped, { accessToken, userInfo, additionalData }, { isUpdate: Boolean(formData.id) });
    
    return payload;
    } catch (error) {
      console.error('❌ Error in handleSubmit:', error);
      throw error;
    }
  }, [accessToken, userInfo, additionalData, formData, employees, form]);

  const handleSuccess = useCallback(() => {
    onSuccess?.(formData);
  }, [formData, onSuccess]);

  const handleFormSubmit = useCallback(async (data: any) => {
    try {
      const result = await handleSubmit(data);
      return result;
    } catch (error) {
      console.error('handleSubmit failed:', error);
      throw error;
    }
  }, [handleSubmit, formData]);

  const handleEntitySearch = useCallback((q: string) => {
    searchEntities(q);
  }, [searchEntities]);

  // Trigger initial search to load some default entities
  React.useEffect(() => {
    if (accessToken && !platformParams.taskId) {
      // Only trigger initial search in create mode
      searchEntities('');
    }
  }, [accessToken, platformParams.taskId, searchEntities]);

  // Handle investment-specific entity context (extends common TaskSegment behavior)
  React.useEffect(() => {
    if (!investmentId) return;
    const hasEntity = Boolean(
      form.getValues("investment") ||
        form.getValues("account") ||
        form.getValues("contact") ||
        form.getValues("opportunity") ||
        form.getValues("lead")
    );
    if (hasEntity) return;
    
    // Set investment entity in form
    form.setValue("investment", { id: investmentId });
    form.setValue("relatedEntityId", investmentId);
    
    // Hydrate investment details for display
    hydrateEntityById('investment', investmentId);
  }, [investmentId, form, hydrateEntityById]);

  // Detect approval mode from additionalData.typeRef
  const isApprovalMode = React.useMemo(() => {
    const t = (additionalData as any)?.typeRef || (additionalData as any)?.psi_taskPayload?.psi_initialParameters?.typeRef;
    return t === 'InvestmentTaskType:v1:APPROVAL' || (typeof t === 'string' && t.toLowerCase() === 'approval');
  }, [additionalData]);

  return (
    <AppActionForm
      processType={formData.id ? 'update' : 'create'}
      onSubmit={handleFormSubmit}
      onSuccess={handleSuccess}
      onCancel={onCancel}
      formData={formData}
      form={form}
      submitButtonText={getTranslationFromI18nKeyAndLabel('crm:common.submit', 'Submit')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('crm:common.cancel', 'Cancel')}
      data-testid="investment-task-process-dialog"
    >
      <TaskSegment
        // labels
        titleLabel={isApprovalMode 
          ? getTranslationFromI18nKeyAndLabel('crm:salesTask.title', 'Approval Name')
          : getTranslationFromI18nKeyAndLabel('crm:salesTask.title', 'Task Name')}
        descriptionLabel={getTranslationFromI18nKeyAndLabel('crm:salesTask.description', 'Description')}
        deadlineLabel={getTranslationFromI18nKeyAndLabel('crm:salesTask.deadline', 'Deadline')}
        typeLabel={getTranslationFromI18nKeyAndLabel('crm:salesTask.type', 'Type')}
        priorityLabel={getTranslationFromI18nKeyAndLabel('crm:salesTask.priority', 'Priority')}
        statusLabel={getTranslationFromI18nKeyAndLabel('crm:salesTask.status', 'Status')}
        assigneeLabel={getTranslationFromI18nKeyAndLabel('crm:salesTask.assignedTo', 'Assigned To')}
        entityLabel={getTranslationFromI18nKeyAndLabel('crm:salesTask.relatedEntity', 'Related Entity')}
        //TODO ADD FILE UPLOAD TO BACKEND AND THEN READD IT IN FRONTEND
        //uploadFileLabel={getTranslationFromI18nKeyAndLabel('crm:salesTask.uploadFile', 'Attach Documents')}
        //onFilesChange={() => {/* File upload handling */}}
        timingTypeLabel={getTranslationFromI18nKeyAndLabel('crm:salesTask.timingType', 'Timing Type')}
        // catalogs
        accessToken={accessToken}
        typeCatalog={{ identifier: TASK_TYPE_CATALOG, version: 'v1' }}
        priorityCatalog={{ identifier: TASK_PRIORITY_CATALOG, version: 'v1' }}
        statusCatalog={{ identifier: TASK_STATUS_CATALOG, version: 'v1' }}
        // entity search
        // Hide entity selection if entity is provided from context
        showEntitySelection={shouldShowEntitySelection}
        showAssigneeSelection={true}
        entities={entities}
        entitiesLoading={entitiesLoading}
        entitiesError={Boolean(entitiesError)}
        entitiesHasMore={entitiesHasMore}
        onEntitySearch={handleEntitySearch}
        onEntityLoadMore={loadMoreEntities}
        initialEntityFromContext={{ accountId, contactId, opportunityId, leadId }}
        // assignee combobox
        assignees={mergedAssignees}
        assigneesLoading={employeesLoading}
        onAssigneeSearch={searchEmployees}
        assigneesHasMore={employeesHasMore}
        onAssigneeLoadMore={loadMoreEmployees}
        data-testid="investment-task-segment"
        // show/hide
        showType={!isApprovalMode}
        staticDefaults={{ taskTypeRef: isApprovalMode ? 'InvestmentTaskType:v1:APPROVAL' : undefined }}
      />
    </AppActionForm>
  );
};

export default InvestmentTaskForm;


