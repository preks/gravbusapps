import React, { useState, useEffect } from 'react';
import { Button, Form, Input, DatePicker, message } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import dayjs from 'dayjs';

export interface NotesFormProps extends BusinessAppContextProps {}

const { TextArea } = Input;

const initialValues = {
  noteTitle: '',
  noteText: '',
  reminderDate: null,
};

export const NotesForm: React.FC<NotesFormProps> = (props) => {
  const { accessToken, additionalData } = props;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleProcessComplete = () => {
      setLoading(false);
      message.success('Note saved successfully!');
    };

    const handleProcessError = () => {
      setLoading(false);
      message.error('Failed to save note. Please try again.');
    };

    // Listen for process completion events
    window.addEventListener('kogito-process-task-completed', handleProcessComplete);
    window.addEventListener('kogito-process-error', handleProcessError);

    return () => {
      window.removeEventListener('kogito-process-task-completed', handleProcessComplete);
      window.removeEventListener('kogito-process-error', handleProcessError);
    };
  }, []);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    
    try {
      const payload = {
        employeeId: additionalData?.employeeId,
        managerId: additionalData?.managerId,
        structureId: additionalData?.structureId,
        locationId: additionalData?.locationId,
        organizationalUnitId: additionalData?.organizationalUnitId,
        ...(additionalData?.contactId && { contactId: additionalData.contactId }),
        changeMode: 'INSERT',
        crmNote: {
          noteTitle: values.noteTitle,
          noteText: values.noteText,
          reminderDate: values.reminderDate ? dayjs(values.reminderDate).toISOString() : null,
          lastEditDate: new Date().toISOString(),
          authorEmployee: additionalData?.employeeId,
          ...(additionalData?.leadId && { lead: additionalData.leadId }),
          ...(additionalData?.opportunityId && { opportunity: additionalData.opportunityId }),
          ...(additionalData?.contactId && { contact: additionalData.contactId }),
          ...(additionalData?.accountId && { account: additionalData.accountId }),
        },
      };
      
      console.log('NotesForm final payload:', payload);
      
      dispatchProcessContinueEvent('pse_submit', payload);
      // Note: loading state will be cleared by event listeners
    } catch (error) {
      setLoading(false);
      message.error('Failed to save note. Please try again.');
      console.error('Error submitting note:', error);
    }
  };

  const handleCancel = () => {
    dispatchProcessContinueEvent('pse_pause', {});
  };

  return (
    <div className="gba:p-6 gba:bg-white gba:rounded-lg gba:shadow-md" data-testid="notes-form-container">
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={handleSubmit}
        data-testid="notes-form"
      >
        <h2 className="gba:text-xl gba:!font-bold gba:mb-4 gba:text-center gba:!text-[20px]" data-testid="form-title">
          {getTranslationFromI18nKeyAndLabel('crm:notes.newNote', 'New Note')}
        </h2>
        
        <Form.Item
          label={getTranslationFromI18nKeyAndLabel('crm:notes.title', 'Note Title')}
          name="noteTitle"
          rules={[{ required: true, message: getTranslationFromI18nKeyAndLabel('crm:notes.titleRequired', 'Note title is required') }]}
        >
          <Input
            placeholder={getTranslationFromI18nKeyAndLabel('crm:notes.titlePlaceholder', 'Enter note title...')}
            data-testid="title-input"
            className="gba:w-full"
            maxLength={100}
          />
        </Form.Item>

        <Form.Item
          label={getTranslationFromI18nKeyAndLabel('crm:notes.text', 'Note Content')}
          name="noteText"
          rules={[{ required: true, message: getTranslationFromI18nKeyAndLabel('crm:notes.textRequired', 'Note content is required') }]}
        >
          <TextArea
            rows={4}
            placeholder={getTranslationFromI18nKeyAndLabel('crm:notes.textPlaceholder', 'Write your note here...')}
            data-testid="text-textarea"
            className="gba:w-full"
            maxLength={1000}
          />
        </Form.Item>

        <Form.Item
          label={getTranslationFromI18nKeyAndLabel('crm:notes.reminderDate', 'Reminder Date (Optional)')}
          name="reminderDate"
        >
          <DatePicker
            showTime
            format="YYYY-MM-DD HH:mm:ss"
            placeholder={getTranslationFromI18nKeyAndLabel('crm:notes.reminderDatePlaceholder', 'Select reminder date...')}
            data-testid="reminder-date-picker"
            className="gba:w-full"
          />
        </Form.Item>

        <div className="gba:flex gba:justify-end gba:gap-3 gba:mt-6">
          <Button
            onClick={handleCancel}
            data-testid="cancel-button"
            disabled={loading}
          >
            {getTranslationFromI18nKeyAndLabel('common:cancel', 'Cancel')}
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            data-testid="submit-button"
          >
            {getTranslationFromI18nKeyAndLabel('crm:notes.saveNote', 'Save Note')}
          </Button>
        </div>
      </Form>
    </div>
  );
}; 