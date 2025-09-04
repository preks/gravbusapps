import React, { useCallback, useEffect, useState } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { AppActionForm } from '@/components/app-action-form';
import { NoteSegmentSchema } from '@/common/components/common-relations/form-segments';
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
  const [formData] = useState<NoteSegmentSchema>(initialFormData);

  const { accountId, contactId, opportunityId, leadId } = additionalData || {};

  // No entity picker in investment note form (align with CRM note form)

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
      <div className="gba:w-full" data-testid="investment-note-form-container">
        <h2 className="gba:text-xl gba:!font-bold gba:mb-4 gba:text-center gba:!text-[20px]" data-testid="form-title">
          {getTranslationFromI18nKeyAndLabel('crm:notes.newNote', 'New Note')}
        </h2>

        <FormField
          control={form.control as any}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{getTranslationFromI18nKeyAndLabel('crm:notes.title', 'Note Title')}</FormLabel>
              <FormControl>
                <Input placeholder={getTranslationFromI18nKeyAndLabel('crm:notes.titlePlaceholder', 'Enter note title...')} maxLength={100} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control as any}
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{getTranslationFromI18nKeyAndLabel('crm:notes.text', 'Note Content')}</FormLabel>
              <FormControl>
                <Textarea placeholder={getTranslationFromI18nKeyAndLabel('crm:notes.textPlaceholder', 'Write your note here...')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control as any}
          name="reminderDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{getTranslationFromI18nKeyAndLabel('crm:notes.reminderDate', 'Reminder Date (Optional)')}</FormLabel>
              <FormControl>
                <Input type="datetime-local" placeholder={getTranslationFromI18nKeyAndLabel('crm:notes.reminderDatePlaceholder', 'Select reminder date...')} value={field.value || ''} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </AppActionForm>
  );
};

export default NoteForm;



