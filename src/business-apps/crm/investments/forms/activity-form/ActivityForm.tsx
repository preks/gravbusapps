
import React, { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { ActivitySegment, Activity, validateActivityData, createActivitySegmentResolver } from '@/common/components/common-relations/form-segments';
import { buildActivityPayload } from '@/common/data/investment/payloads';
import { useGetInvestmentActivityById, useInvestmentEntities } from '@/common/data/investment/hooks';
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
  const [formData, setFormData] = useState<Activity>(initialFormData);

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

  // no-op placeholder removed; keep direct state updates where needed

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
    defaultValues: formData,
    mode: 'onChange',
  });

  useEffect(() => {
    form.reset(formData as any);
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
        showOwnerSelection={false}
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

