import React, { useCallback, useMemo, useState } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { AppActionForm } from '@/components/app-action-form';
import { useForm } from 'react-hook-form';
import { ContactSegment, createContactSegmentResolver, type ContactSegmentSchema } from '@/common/components/common-relations/form-segments/contact-segment';
import { useInvestmentEntities } from '@/common/data/investment/hooks';
import { useEmployeeSearch } from '@/common/data/employee/useEmployeeSearch';

export interface ContactExampleFormProps extends BusinessAppContextProps {
  onSuccess?: (data: ContactSegmentSchema) => void;
  onCancel?: () => void;
}

type FormData = ContactSegmentSchema & { id?: string; version?: number };

const initialFormData: FormData = {
  ownerEmployeeId: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  academicTitleRef: '',
  languageRef: '',
  birthDate: '',
  description: '',
  notesSummary: '',
  jobPosition: '',
  department: '',
  code: '',
  relatedEntityId: '',
};

const ContactExampleForm: React.FC<ContactExampleFormProps> = ({ accessToken, userInfo, additionalData, onSuccess, onCancel }) => {
  const [formData] = useState<FormData>(initialFormData);

  // Shared central investment entity search (lead/contact/account/opportunity)
  const { entities, loading: entitiesLoading, hasMore: entitiesHasMore, searchEntities, loadMore: loadMoreEntities } = useInvestmentEntities({ accessToken, additionalData });

  // Owner employee search
  const { employees, search: searchEmployees, loading: employeesLoading, hasMore: employeesHasMore, loadMore: loadMoreEmployees } = useEmployeeSearch(accessToken);

  // Platform context entity hints
  const platformParams = useMemo(() => {
    const nested = (additionalData as any)?.psi_taskPayload?.psi_initialParameters || (additionalData as any)?.psi_initialParameters || {};
    return {
      accountId: (additionalData as any)?.accountId || nested?.accountId,
      contactId: (additionalData as any)?.contactId || nested?.contactId,
      opportunityId: (additionalData as any)?.opportunityId || nested?.opportunityId,
      leadId: (additionalData as any)?.leadId || nested?.leadId,
    } as { accountId?: string; contactId?: string; opportunityId?: string; leadId?: string };
  }, [additionalData]);

  const hasEntityFromContext = Boolean(platformParams.accountId || platformParams.contactId || platformParams.opportunityId || platformParams.leadId);

  const form = useForm<any>({
    resolver: createContactSegmentResolver(),
    defaultValues: formData as any,
    mode: 'onChange',
  });

  const handleEntitySearch = useCallback((q: string) => {
    if ((q || '').trim().length === 0 || (q || '').trim().length >= 2) {
      searchEntities(q);
    }
  }, [searchEntities]);

  const handleSubmit = useCallback(async (_: ContactSegmentSchema) => {
    const allValues = (form as any).getValues?.() || {};
    const entityRef = (() => {
      if (allValues.account?.id) return { account: { id: allValues.account.id } };
      if (allValues.contact?.id) return { contact: { id: allValues.contact.id } };
      if (allValues.opportunity?.id) return { opportunity: { id: allValues.opportunity.id } };
      if (allValues.lead?.id) return { lead: { id: allValues.lead.id } };
      return {} as any;
    })();
    return {
      type: 'InvestmentContactExample',
      ownerEmployeeId: allValues.ownerEmployeeId,
      firstName: allValues.firstName,
      lastName: allValues.lastName,
      email: allValues.email,
      phone: allValues.phone,
      academicTitleRef: allValues.academicTitleRef,
      languageRef: allValues.languageRef,
      birthDate: allValues.birthDate,
      description: allValues.description,
      jobPosition: allValues.jobPosition,
      department: allValues.department,
      code: allValues.code,
      ...entityRef,
    };
  }, [form]);

  const handleSuccess = useCallback(() => {
    onSuccess?.(formData);
  }, [formData, onSuccess]);

  return (
    <AppActionForm
      processType={'create'}
      onSubmit={handleSubmit}
      onSuccess={handleSuccess}
      onCancel={onCancel}
      formData={formData}
      form={form}
      submitButtonText={getTranslationFromI18nKeyAndLabel('crm:common.submit', 'Submit')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('crm:common.cancel', 'Cancel')}
      data-testid="platform-contact-example-form"
    >
      <ContactSegment
        // Labels
        ownerLabel={getTranslationFromI18nKeyAndLabel('crm:contact.owner', 'Owner')}
        typeLabel={getTranslationFromI18nKeyAndLabel('crm:contact.type', 'Type')}
        firstNameLabel={getTranslationFromI18nKeyAndLabel('crm:contact.firstName', 'First Name')}
        lastNameLabel={getTranslationFromI18nKeyAndLabel('crm:contact.lastName', 'Last Name')}
        emailLabel={getTranslationFromI18nKeyAndLabel('crm:contact.email', 'Email')}
        phoneLabel={getTranslationFromI18nKeyAndLabel('crm:contact.phone', 'Phone')}
        salutationLabel={getTranslationFromI18nKeyAndLabel('crm:contact.salutation', 'Salutation')}
        academicTitleLabel={getTranslationFromI18nKeyAndLabel('crm:contact.academicTitle', 'Academic Title')}
        languageLabel={getTranslationFromI18nKeyAndLabel('crm:contact.language', 'Language')}
        birthDateLabel={getTranslationFromI18nKeyAndLabel('crm:contact.birthDate', 'Birth Date')}
        descriptionLabel={getTranslationFromI18nKeyAndLabel('crm:contact.description', 'Description')}
        jobPositionLabel={getTranslationFromI18nKeyAndLabel('crm:contact.jobPosition', 'Job Position')}
        departmentLabel={getTranslationFromI18nKeyAndLabel('crm:contact.department', 'Department')}
        codeLabel={getTranslationFromI18nKeyAndLabel('crm:contact.code', 'Business Code')}
        notesSummaryLabel={getTranslationFromI18nKeyAndLabel('crm:contact.notesSummary', 'Notes Summary')}
        communicationChannelsLabel={getTranslationFromI18nKeyAndLabel('crm:contact.channels', 'Communication Channels')}
        addressesLabel={getTranslationFromI18nKeyAndLabel('crm:contact.addresses', 'Addresses')}
        pictureUploadLabel={getTranslationFromI18nKeyAndLabel('crm:contact.picture', 'Picture')}
        entityLabel={getTranslationFromI18nKeyAndLabel('crm:common.relatedEntity', 'Related Entity')}
        // Catalogs
        accessToken={accessToken}
        contactTypeCatalog={{ identifier: 'InvestmentContactType', version: 'v1' }}
        salutationCatalog={{ identifier: 'Salutation', version: 'v1' }}
        academicTitleCatalog={{ identifier: 'AcademicTitle', version: 'v1' }}
        languageCatalog={{ identifier: 'Language', version: 'v1' }}
        communicationChannelCatalog={{ identifier: 'CommunicationChannel', version: 'v1' }}
        addressTypeCatalog={{ identifier: 'AddressType', version: 'v1' }}
        countryCatalog={{ identifier: 'Country', version: 'v1' }}
        // Owner
        assignees={employees as any}
        assigneesLoading={employeesLoading}
        onAssigneeSearch={searchEmployees}
        assigneesHasMore={employeesHasMore}
        onAssigneeLoadMore={loadMoreEmployees}
        // Entities
        showEntitySelection={!hasEntityFromContext}
        entities={entities as any}
        entitiesLoading={entitiesLoading}
        entitiesHasMore={entitiesHasMore}
        onEntitySearch={handleEntitySearch}
        onEntityLoadMore={loadMoreEntities}
        initialEntityFromContext={platformParams}
        data-testid="platform-contact-example-segment"
      />
    </AppActionForm>
  );
};

export default ContactExampleForm;


