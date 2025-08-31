import React, { useState, useCallback, useEffect } from 'react';
import { Button, Alert, Spinner, Form } from '@newwork/nw-design-system';
import { useForm, type Resolver, type UseFormReturn } from 'react-hook-form';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

export interface ProcessMessage {
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface AppActionFormProps {
  children: React.ReactNode;
  processType: 'create' | 'update' | 'delete' | 'custom';
  submitEventType?: string;
  cancelEventType?: string;
  onSubmit: (formData: any) => Promise<any> | any;
  onCancel?: () => void;
  onSuccess?: (result: any) => void;
  formData: any;
  validateForm?: (formData: any) => string[] | null;
  submitButtonText?: string;
  cancelButtonText?: string;
  showCancelButton?: boolean;
  submitButtonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  businessAppContext?: BusinessAppContextProps;
  form?: UseFormReturn<any>;
  resolver?: Resolver<any>;
  'data-testid'?: string;
}

const getSuccessMessage = (processType: string): string => {
  switch (processType) {
    case 'create':
      return getTranslationFromI18nKeyAndLabel('process:success.created', 'Successfully created');
    case 'update':
      return getTranslationFromI18nKeyAndLabel('process:success.updated', 'Successfully updated');
    case 'delete':
      return getTranslationFromI18nKeyAndLabel('process:success.deleted', 'Successfully deleted');
    default:
      return getTranslationFromI18nKeyAndLabel('process:success.completed', 'Successfully completed');
  }
};

export const AppActionForm: React.FC<AppActionFormProps> = ({
  children,
  processType,
  submitEventType = 'pse_submit',
  cancelEventType = 'pse_pause',
  onSubmit,
  onCancel,
  onSuccess,
  formData,
  validateForm,
  submitButtonText,
  cancelButtonText,
  showCancelButton = true,
  submitButtonVariant = 'default',
  businessAppContext: _businessAppContext,
  form: externalForm,
  resolver,
  'data-testid': dataTestId = 'process-dialog',
}) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<ProcessMessage | null>(null);

  useEffect(() => {
    setMessage(null);
  }, [processType]);

  const handleSubmit = useCallback(async (values?: any) => {
    try {
      setLoading(true);
      setMessage(null);
      const dataForValidation = values ?? formData;
      if (validateForm) {
        const errors = validateForm(dataForValidation);
        if (errors && errors.length > 0) {
          setMessage({ type: 'error', message: errors.join(', ') });
          return;
        }
      }
      const result = await onSubmit(dataForValidation);
      const successMessage = getSuccessMessage(processType);
      setMessage({ type: 'success', message: successMessage });
      dispatchProcessContinueEvent(submitEventType, result);
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setMessage({ type: 'error', message: errorMessage });
    } finally {
      setLoading(false);
    }
  }, [processType, submitEventType, onSubmit, validateForm, onSuccess, formData]);

  const handleCancel = useCallback(() => {
    dispatchProcessContinueEvent(cancelEventType, {});
    setMessage(null);
    if (onCancel) {
      onCancel();
    }
  }, [cancelEventType, onCancel]);

  const internalForm = useForm<any>({ defaultValues: formData, resolver });
  const form = externalForm || internalForm;

  return (
    <div className="gba:p-6 gba:h-full gba:flex gba:flex-col" data-testid={dataTestId}>
      {message && (
        <Alert
          variant={message.type === 'success' ? 'default' : 'destructive'}
          className="gba:mb-4"
          data-testid={`${dataTestId}-message`}
        >
          {message.message}
        </Alert>
      )}
      <Form {...(form as any)}>
        <form onSubmit={form.handleSubmit((vals) => handleSubmit(vals))} className="gba:flex gba:flex-col gba:w-full gba:max-w-md gba:h-full" data-testid={`${dataTestId}-form`}>
          <div className="gba:flex-1 gba:space-y-4" data-testid={`${dataTestId}-form-content`}>
            {children}
          </div>
          <div className="gba:flex gba:justify-end gba:gap-2 gba:mt-auto" data-testid={`${dataTestId}-form-actions`}>
            {showCancelButton && (
              <Button 
                variant="outline" 
                data-testid={`${dataTestId}-cancel-button`} 
                type="button"
                onClick={handleCancel}
                disabled={loading}
              >
                {cancelButtonText || getTranslationFromI18nKeyAndLabel('process:button.cancel', 'Cancel')}
              </Button>
            )}
            <Button 
              data-testid={`${dataTestId}-submit-button`} 
              type="submit" 
              variant={submitButtonVariant}
              disabled={loading}
            >
              {loading ? <Spinner size="sm" className="gba:mr-2" /> : null}
              {submitButtonText || getSuccessMessage(processType).replace('Successfully ', '')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default AppActionForm;
