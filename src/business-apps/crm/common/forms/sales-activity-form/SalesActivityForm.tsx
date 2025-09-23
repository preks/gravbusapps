import React, { useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import ActivitySegment, { createActivitySegmentResolver } from '@/common/components/common-relations/form-segments/activity-segment/ActivitySegment';
import { AppActionForm } from '@/components/app-action-form';
import { useForm } from 'react-hook-form';

export interface SalesActivityFormProps extends BusinessAppContextProps {}

// Removed unused TextArea destructure to satisfy linter

type SalesActivityFormValues = {
  title: string;
  activityTypeRef: string;
  occurredAt: string;
  description: string;
};

const initialValues: SalesActivityFormValues = {
  title: '',
  activityTypeRef: '',
  occurredAt: '',
  description: '',
};

const SALES_ACTIVITY_TYPE_CATALOG = 'SalesActivityType';
const SALES_ACTIVITY_TYPE_VERSION = 'v1';

export const SalesActivityForm: React.FC<SalesActivityFormProps> = (props) => {
  const { accessToken, additionalData } = props;

  const resolver = useMemo(() => createActivitySegmentResolver() as any, []);
  const form = useForm<any>({
    defaultValues: initialValues,
    resolver,
    mode: 'onChange',
  });

  const handleSubmit = async (values: SalesActivityFormValues) => {
    const payload = {
      employeeId: additionalData?.employeeId,
      managerId: additionalData?.managerId,
      structureId: additionalData?.structureId,
      locationId: additionalData?.locationId,
      organizationalUnitId: additionalData?.organizationalUnitId,
      ...(additionalData?.contactId && { contactId: additionalData.contactId }),
      changeMode: 'INSERT',
      salesActivity: {
        version: 0,
        activityTypeRef: values.activityTypeRef,
        title: values.title,
        occurredAt: values.occurredAt ? new Date(values.occurredAt).toISOString() : null,
        ...(additionalData?.leadId && { lead: additionalData.leadId }),
        ...(additionalData?.opportunityId && { opportunity: additionalData.opportunityId }),
        ...(additionalData?.contactId && { contact: additionalData.contactId }),
        ...(additionalData?.accountId && { account: additionalData.accountId }),
        description: values.description || '',
        ownerEmployee: additionalData?.employeeId,
      },
    };
    return payload;
  };

  const accountId = additionalData?.accountId;
  const contactId = additionalData?.contactId;
  const opportunityId = additionalData?.opportunityId;
  const leadId = additionalData?.leadId;

  return (
    <AppActionForm
      processType="create"
      onSubmit={handleSubmit}
      form={form as any}
      formData={form.getValues()}
      submitButtonText={getTranslationFromI18nKeyAndLabel('crm:common.submit', 'Submit')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('crm:common.cancel', 'Cancel')}
      data-testid="sales-activity-process-dialog"
    >
      <div className="gba:w-full" data-testid="sales-activity-form-container">
        <h2 className="gba:text-xl gba:!font-bold gba:mb-4 gba:text-center gba:!text-[20px]" data-testid="form-title">
          {getTranslationFromI18nKeyAndLabel('crm:salesActivity.newActivity', 'New Activity')}
        </h2>

        <ActivitySegment
          accessToken={accessToken}
          typeCatalog={{ identifier: SALES_ACTIVITY_TYPE_CATALOG, version: SALES_ACTIVITY_TYPE_VERSION }}
          showEntitySelection={false}
          initialEntityFromContext={{ accountId, contactId, opportunityId, leadId }}
          titleLabel={getTranslationFromI18nKeyAndLabel('crm:salesActivity.title', 'Name')}
          typeLabel={getTranslationFromI18nKeyAndLabel('crm:salesActivity.type', 'Type')}
          dateLabel={getTranslationFromI18nKeyAndLabel('crm:salesActivity.date', 'Date')}
          descriptionLabel={getTranslationFromI18nKeyAndLabel('crm:salesActivity.description', 'Description')}
          data-testid="sales-activity-segment"
        />
      </div>
    </AppActionForm>
  );
};

export default SalesActivityForm; 