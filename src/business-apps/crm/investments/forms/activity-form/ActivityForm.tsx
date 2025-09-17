
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import ActivitySegment, { Activity, createActivitySegmentResolver } from '@/common/components/common-relations/form-segments/activity-segment/ActivitySegment';
import { validateActivityData } from '@/common/components/common-relations/form-segments/activity-segment/utils';
import { buildActivityPayload } from '@/common/data/investment/payloads';
import { useGetInvestmentActivityById, useInvestmentEntities } from '@/common/data/investment/hooks';
import { useEmployeeSearch } from '@/common/data/employee/useEmployeeSearch';
import { AppActionForm } from '@/components/app-action-form';
import { useForm } from 'react-hook-form';

const initialFormData: Activity = {
  title: '',
  activityTypeRef: '',
  occurredAt: '',
  description: '',
  files: [],
};

const INVESTMENT_ACTIVITY_TYPE_CATALOG = 'InvestmentActivityType';
const INVESTMENT_ACTIVITY_TYPE_VERSION = 'v1';

export interface ActivityFormProps extends BusinessAppContextProps {
  initialData?: Partial<Activity>;
  onSuccess?: (activity: Activity) => void;
  onCancel?: () => void;
}

const ActivityForm: React.FC<ActivityFormProps> = ({ 
  accessToken, 
  userInfo,
  additionalData,
  onSuccess, 
  onCancel 
}) => {
  const [formData, setFormData] = useState<Activity>({
    ...initialFormData,
    ownerEmployee: userInfo?.employeeDetails?.employeeId ? { id: userInfo.employeeDetails.employeeId } : undefined
  });

  // Check if we're in update mode
  const activityId = additionalData?.activityId;
  const isUpdateMode = !!activityId;

  // Get entity IDs from business app context (support externalContextData from AppAction)
  const { accountId, leadId, contactId, opportunityId } = additionalData || {};
  // const hasEntityFromContext = accountId || leadId || contactId || opportunityId; // not used after forcing hide
  
  // For investment activities, we hide entity selection since investment + account context is sufficient
  // In the investment record context, this specialized form must never ask for a related entity
  // Always hide the related entity selector
  const shouldShowEntitySelection = false;

  // Investment activity hooks
  const { fetchInvestmentActivityById } = useGetInvestmentActivityById({ accessToken, additionalData });

  // Entity search hook (controlled search/path)
  const { entities, loading: entitiesLoading, searchEntities, hasMore: entitiesHasMore, loadMore: loadMoreEntities, hydrateEntityById } = useInvestmentEntities({ accessToken, additionalData });

  // Employee search hook for assignee selection
  const { employees, search: searchEmployees, loading: employeesLoading, hasMore: employeesHasMore, loadMore: loadMoreEmployees, hydrateById } = useEmployeeSearch(accessToken);
  const [assigneePrefill, setAssigneePrefill] = useState<Array<{ id: string; displayName: string; userId?: string; pictureThumbnail?: string; organizationalUnitName?: string; jobPositionName?: string }>>([]);

  // Prefill current user as default assignee in create mode
  useEffect(() => {
    if (isUpdateMode) return; // Only for create mode
    const employeeId = userInfo?.employeeDetails?.employeeId;
    if (!employeeId) return;
    
    const displayName = `${userInfo?.employeeDetails?.firstName || ''} ${userInfo?.employeeDetails?.lastName || ''}`.trim() || 
                       userInfo?.userName || 'Current User';
    
    setAssigneePrefill([{ id: employeeId, displayName }]);
    // Hydrate employee details for better display
    hydrateById(employeeId);
  }, [isUpdateMode, userInfo, hydrateById]);

  // Merge prefilled assignee with live search results
  const mergedAssignees = useMemo(() => {
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

  // Load existing activity if in update mode
  useEffect(() => {
    if (isUpdateMode && activityId) {
      fetchInvestmentActivityById(activityId).then((result: any) => {
        if (result.activity) {
          const activity = result.activity;
          
          // Set form data
          setFormData({
            title: activity.title || '',
            activityTypeRef: activity.activityType?.id || '',
            occurredAt: activity.occurredAt || '',
            description: activity.description || '',
            files: [],
            account: activity.account,
            contact: activity.contact,
            opportunity: activity.opportunity,
            lead: activity.lead,
            ownerEmployee: activity.ownerEmployee,
            version: activity.version,
            // keep relatedEntityId for validation convenience
            ...(activity.account?.id ? { relatedEntityId: activity.account.id } : {}),
            ...(activity.contact?.id ? { relatedEntityId: activity.contact.id } : {}),
            ...(activity.opportunity?.id ? { relatedEntityId: activity.opportunity.id } : {}),
            ...(activity.lead?.id ? { relatedEntityId: activity.lead.id } : {}),
          } as any);

          // Hydrate and pin related entity if present so combobox trigger keeps rich label
          const relId = activity.account?.id || activity.contact?.id || activity.opportunity?.id || activity.lead?.id;
          if (relId) {
            if (activity.account?.id) hydrateEntityById('account', activity.account.id);
            else if (activity.contact?.id) hydrateEntityById('contact', activity.contact.id);
            else if (activity.opportunity?.id) hydrateEntityById('opportunity', activity.opportunity.id);
            else if (activity.lead?.id) hydrateEntityById('lead', activity.lead.id);
          }
        }
      });
    }
  }, [isUpdateMode, activityId, fetchInvestmentActivityById]);

  const handleEntitySearch = useCallback((searchTerm: string) => {
    // Allow empty string to fetch first page
    searchEntities((searchTerm || ''));
  }, [searchEntities]);

  // Prefetch entities on mount if selection is visible
  useEffect(() => {
    if (shouldShowEntitySelection) {
      searchEntities('');
    }
  }, [shouldShowEntitySelection, searchEntities]);

  // Compose validation using the shared util, with domain toggle on entity requirement
  const validateForm = useCallback((data: any): string[] | null => {
    // For investment context, we don't require entity selection since investment context is sufficient
    return validateActivityData(data, { requireEntity: shouldShowEntitySelection });
  }, [shouldShowEntitySelection]);

  // Form submission handler - business logic only
  const handleSubmit = useCallback(async (formData: Activity) => {
    console.log('🚀 Form submission data:', formData);
    console.log('🎯 Specific ownerEmployeeId:', (formData as any)?.ownerEmployeeId);
    
    const payload = buildActivityPayload(formData, { accessToken, userInfo, additionalData } as any, {
      isUpdate: isUpdateMode,
    });
    return payload;
  }, [accessToken, userInfo, additionalData, isUpdateMode]);

  // Success handler
  const handleSuccess = useCallback(() => {
    if (onSuccess) {
      onSuccess(formData);
    }
  }, [formData, onSuccess]);

  // RHF + Zod resolver provided to AppActionForm
  const form = useForm<any>({
    resolver: createActivitySegmentResolver(),
    defaultValues: {
      ...formData,
      ownerEmployeeId: userInfo?.employeeDetails?.employeeId || ''
    },
    mode: 'onChange',
  });

  // Only reset form data when formData changes, not when user ID changes
  // This preserves user selections in the form
  useEffect(() => {
    form.reset({
      ...formData,
      // Only set ownerEmployeeId if it's not already set (preserve user selections)
      ...(formData.ownerEmployee?.id ? { ownerEmployeeId: formData.ownerEmployee.id } : 
          !form.getValues('ownerEmployeeId') ? { ownerEmployeeId: userInfo?.employeeDetails?.employeeId || '' } : {})
    } as any);
  }, [formData]);

  return (
    <AppActionForm
      processType={isUpdateMode ? 'update' : 'create'}
      onSubmit={handleSubmit}
      onSuccess={handleSuccess}
      onCancel={onCancel}
      formData={formData}
      form={form}
      validateForm={validateForm}
      submitButtonText={getTranslationFromI18nKeyAndLabel('crm:common.submit', 'Submit')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('crm:common.cancel', 'Cancel')}
      data-testid="investment-activity-process-dialog"
    >
      {/* Investment context header intentionally removed as requested */}
      
      <ActivitySegment
        // Let segment load type options from catalog
        accessToken={accessToken}
        typeCatalog={{ identifier: INVESTMENT_ACTIVITY_TYPE_CATALOG, version: INVESTMENT_ACTIVITY_TYPE_VERSION }}
        // Use controlled entity search from hook
        entities={entities}
        entitiesLoading={entitiesLoading}
        entitiesHasMore={entitiesHasMore}
        onEntityLoadMore={loadMoreEntities}
        onEntitySearch={handleEntitySearch}
        showEntitySelection={shouldShowEntitySelection}
        showOwnerSelection={true}
        assignees={mergedAssignees}
        assigneesLoading={employeesLoading}
        onAssigneeSearch={searchEmployees}
        assigneesHasMore={employeesHasMore}
        onAssigneeLoadMore={loadMoreEmployees}
        initialEntityFromContext={{ accountId, contactId, opportunityId, leadId }}
        titleLabel={getTranslationFromI18nKeyAndLabel('crm:salesActivity.title', 'Title')}
        typeLabel={getTranslationFromI18nKeyAndLabel('crm:salesActivity.type', 'Type')}
        dateLabel={getTranslationFromI18nKeyAndLabel('crm:salesActivity.date', 'Date & Time')}
        descriptionLabel={getTranslationFromI18nKeyAndLabel('crm:salesActivity.description', 'Description')}
        uploadFileLabel={getTranslationFromI18nKeyAndLabel('crm:salesActivity.uploadFile', 'Upload File')}
        entityLabel={getTranslationFromI18nKeyAndLabel('crm:salesActivity.relatedEntity', 'Related Entity')}
        data-testid="activity-segment"
      />
    </AppActionForm>
  );
};

export default ActivityForm;

