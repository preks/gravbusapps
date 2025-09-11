import React, { useCallback, useEffect, useState } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { AppActionForm } from '@/components/app-action-form';
import { useForm } from 'react-hook-form';
import { buildInvestmentNotePayload } from '@/common/data/investment/payloads';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Input, Textarea } from '@newwork/nw-design-system';

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
  const [formData, setFormData] = useState<NoteSegmentSchema>(initialFormData);

  // Check if we're in update mode
  const noteId = additionalData?.noteId;
  const isUpdateMode = !!noteId;

  // Get entity IDs from business app context
  const { accountId, leadId, contactId, opportunityId, investmentId } = additionalData || {};
  const hasEntityFromContext = accountId || leadId || contactId || opportunityId;
  
  // For investment notes, we hide entity selection since investment + account context is sufficient
  const isInvestmentContext = Boolean(investmentId);
  const shouldShowEntitySelection = !isInvestmentContext && !hasEntityFromContext;

  // Investment note hooks
  const { fetchInvestmentNoteById } = useGetInvestmentNoteById({ accessToken, additionalData });

  // Entity search hook (controlled search/path)
  const { entities, loading: entitiesLoading, searchEntities, hasMore: entitiesHasMore, loadMore: loadMoreEntities, hydrateEntityById } = useInvestmentEntities({ accessToken, additionalData });

  // Load existing note if in update mode
  useEffect(() => {
    if (isUpdateMode && noteId) {
      fetchInvestmentNoteById(noteId).then((result: any) => {
        if (result.note) {
          const note = result.note;
          
          // Set form data
          setFormData({
            title: note.title || '',
            text: note.text || '',
            reminderDate: note.reminderDate || undefined,
            account: note.account,
            contact: note.contact,
            opportunity: note.opportunity,
            lead: note.lead,
            // keep relatedEntityId for validation convenience
            ...(note.account?.id ? { relatedEntityId: note.account.id } : {}),
            ...(note.contact?.id ? { relatedEntityId: note.contact.id } : {}),
            ...(note.opportunity?.id ? { relatedEntityId: note.opportunity.id } : {}),
            ...(note.lead?.id ? { relatedEntityId: note.lead.id } : {}),
          } as any);

          // Hydrate and pin related entity if present so combobox trigger keeps rich label
          const relId = note.account?.id || note.contact?.id || note.opportunity?.id || note.lead?.id;
          if (relId) {
            if (note.account?.id) hydrateEntityById('account', note.account.id);
            else if (note.contact?.id) hydrateEntityById('contact', note.contact.id);
            else if (note.opportunity?.id) hydrateEntityById('opportunity', note.opportunity.id);
            else if (note.lead?.id) hydrateEntityById('lead', note.lead.id);
          }
        }
      });
    }
  }, [isUpdateMode, noteId, fetchInvestmentNoteById]);

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
    return validateNoteData(data, { requireEntity: shouldShowEntitySelection });
  }, [shouldShowEntitySelection]);

  // Form submission handler - business logic only
  const handleSubmit = useCallback(async (formData: NoteSegmentSchema) => {
    const payload = buildInvestmentNotePayload(
      formData, 
      { accessToken, userInfo, additionalData } as any, 
      { accountId, contactId, opportunityId, leadId, investmentId },
      { isUpdate: isUpdateMode }
    );
    return payload;
  }, [accessToken, userInfo, additionalData, accountId, contactId, opportunityId, leadId, investmentId, isUpdateMode]);

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
      {isInvestmentContext && (
        <div className="gba:mb-4 gba:p-4 gba:bg-blue-50 gba:border gba:border-blue-200 gba:rounded-md" data-testid="investment-context-header">
          <h3 className="gba:text-sm gba:font-medium gba:text-blue-900 gba:mb-1">
            {getTranslationFromI18nKeyAndLabel('crm:investmentNote.title', 'Investment Note')}
          </h3>
          <p className="gba:text-xs gba:text-blue-700">
            {getTranslationFromI18nKeyAndLabel(
              'crm:investmentNote.description', 
              'This note will be associated with the current investment and its related account.'
            )}
          </p>
        </div>
      )}
      
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



