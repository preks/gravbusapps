import React, { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { NoteSegment, NoteSegmentSchema, createNoteSegmentResolver } from '@/common/components/common-relations/form-segments';
import { buildInvestmentNotePayload } from '@/common/data/investment/payloads';
import { useInvestmentEntities } from '@/common/data/investment/hooks';
import { AppActionForm } from '@/components/app-action-form';
import { useForm } from 'react-hook-form';

const initialFormData: NoteSegmentSchema = {
  title: '',
  text: '',
  reminderDate: undefined,
};

export interface NoteFormProps extends BusinessAppContextProps {
  initialData?: Partial<NoteSegmentSchema>;
  onSuccess?: (note: NoteSegmentSchema) => void;
  onCancel?: () => void;
}

const NoteForm: React.FC<NoteFormProps> = ({ 
  accessToken, 
  userInfo,
  additionalData,
  onSuccess, 
  onCancel 
}) => {
  const [formData, setFormData] = useState<NoteSegmentSchema>(initialFormData);
  
  // TODO: Add note loading functionality for update mode (similar to activity form)
  // This will use setFormData when implemented

  // Check if we're in update mode (similar to activity form)
  const noteId = additionalData?.noteId;
  const isUpdateMode = !!noteId;

  // Get entity IDs from business app context
  const { accountId, leadId, contactId, opportunityId, investmentId } = additionalData || {};
  const hasEntityFromContext = accountId || leadId || contactId || opportunityId;
  
  // For investment notes, we hide entity selection since investment + account context is sufficient
  const isInvestmentContext = Boolean(investmentId);
  const shouldShowEntitySelection = !isInvestmentContext && !hasEntityFromContext;

  // Entity search hook (controlled search/path) - same as activity form
  const { entities, loading: entitiesLoading, searchEntities, hasMore: entitiesHasMore, loadMore: loadMoreEntities } = useInvestmentEntities({ accessToken, additionalData });

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
    // Basic validation for note fields
    const errors: string[] = [];
    
    if (!data.title || data.title.trim() === '') {
      errors.push('Title is required');
    }
    
    if (!data.text || data.text.trim() === '') {
      errors.push('Note text is required');
    }
    
    // Only require entity selection if not in investment context
    if (shouldShowEntitySelection && !data.account && !data.contact && !data.opportunity && !data.lead) {
      errors.push('Please select a related entity');
    }
    
    return errors.length > 0 ? errors : null;
  }, [shouldShowEntitySelection]);

  // Form submission handler - business logic only
  const handleSubmit = useCallback(async (formData: NoteSegmentSchema) => {
    const payload = buildInvestmentNotePayload(formData, { accessToken, userInfo, additionalData } as any, {
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
    resolver: createNoteSegmentResolver(),
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
      data-testid="investment-note-process-dialog"
    >
      <NoteSegment
        // Use controlled entity search from hook
        entities={entities}
        entitiesLoading={entitiesLoading}
        entitiesHasMore={entitiesHasMore}
        onEntityLoadMore={loadMoreEntities}
        onEntitySearch={handleEntitySearch}
        showEntitySelection={shouldShowEntitySelection}
        initialEntityFromContext={{ accountId, contactId, opportunityId, leadId }}
        titleLabel={getTranslationFromI18nKeyAndLabel('crm:notes.title', 'Note Title')}
        textLabel={getTranslationFromI18nKeyAndLabel('crm:notes.text', 'Note Content')}
        reminderLabel={getTranslationFromI18nKeyAndLabel('crm:notes.reminderDate', 'Reminder Date (Optional)')}
        entityLabel={getTranslationFromI18nKeyAndLabel('crm:notes.relatedEntity', 'Related Entity')}
        titlePlaceholder={getTranslationFromI18nKeyAndLabel('crm:notes.titlePlaceholder', 'Enter note title...')}
        textPlaceholder={getTranslationFromI18nKeyAndLabel('crm:notes.textPlaceholder', 'Write your note here...')}
        reminderPlaceholder={getTranslationFromI18nKeyAndLabel('crm:notes.reminderDatePlaceholder', 'Select reminder date...')}
        data-testid="note-segment"
      />
    </AppActionForm>
  );
};

export default NoteForm;



