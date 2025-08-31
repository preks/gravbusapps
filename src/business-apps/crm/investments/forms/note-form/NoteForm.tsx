import React, { useCallback, useEffect, useState } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { AppActionForm } from '@/components/app-action-form';
import { NoteSegment, createNoteSegmentResolver, NoteSegmentSchema } from '@/common/components/common-relations/form-segments';
import { useForm } from 'react-hook-form';
import { useInvestmentEntities } from '@/common/data/investment/hooks';
import { buildInvestmentNotePayload } from '@/common/data/investment/payloads';

export interface NoteFormProps extends BusinessAppContextProps {
  onSuccess?: (note: NoteSegmentSchema) => void;
  onCancel?: () => void;
}

const initialFormData: NoteSegmentSchema = {
  title: '',
  text: '',
  reminderDate: undefined,
};

const NoteForm: React.FC<NoteFormProps> = ({ accessToken, userInfo, additionalData, onSuccess, onCancel }) => {
  const [formData] = useState<NoteSegmentSchema>(initialFormData);
  const { entities, loading: entitiesLoading, searchEntities, hasMore: entitiesHasMore, loadMore: loadMoreEntities } = useInvestmentEntities({ accessToken, additionalData });

  const { accountId, contactId, opportunityId, leadId } = additionalData || {};
  const hasEntityFromContext = accountId || contactId || opportunityId || leadId;

  const handleEntitySearch = useCallback((q: string) => {
    if (q.trim().length >= 2) searchEntities(q);
  }, [searchEntities]);

  const handleSubmit = useCallback(async (data: NoteSegmentSchema) => {
    return buildInvestmentNotePayload(
      data,
      { accessToken, userInfo, additionalData } as any,
      { accountId, contactId, opportunityId, leadId },
      {}
    );
  }, [accessToken, userInfo, additionalData, accountId, contactId, opportunityId, leadId]);

  const handleSuccess = useCallback(() => {
    onSuccess?.(formData);
  }, [formData, onSuccess]);

  const form = useForm<any>({
    resolver: createNoteSegmentResolver(),
    defaultValues: formData,
    mode: 'onChange',
  });

  useEffect(() => {
    form.reset(formData as any);
  }, [formData]);

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
      data-testid="investment-note-process-dialog"
    >
      <NoteSegment
        // labels
        titleLabel={getTranslationFromI18nKeyAndLabel('crm:notes.title', 'Note Title')}
        textLabel={getTranslationFromI18nKeyAndLabel('crm:notes.text', 'Note Content')}
        reminderLabel={getTranslationFromI18nKeyAndLabel('crm:notes.reminderDate', 'Reminder Date (Optional)')}
        entityLabel={getTranslationFromI18nKeyAndLabel('crm:notes.relatedEntity', 'Related Entity')}
        // entity
        showEntitySelection={!hasEntityFromContext}
        entities={entities}
        entitiesLoading={entitiesLoading}
        entitiesHasMore={entitiesHasMore}
        onEntityLoadMore={loadMoreEntities}
        onEntitySearch={handleEntitySearch}
        initialEntityFromContext={{ accountId, contactId, opportunityId, leadId }}
        data-testid="investment-note-segment"
      />
    </AppActionForm>
  );
};

export default NoteForm;



