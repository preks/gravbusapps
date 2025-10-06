import React, { useState, useCallback, useEffect } from 'react';
import { Button, Alert, Spinner, Form, WizardForm, useWizard, type WizardStep } from '@newwork/nw-design-system';
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
  // Support for custom form layouts (like wizards)
  customFormLayout?: boolean;
  customActions?: React.ReactNode;
  // Support for disabling form submission when using WizardForm or other custom handlers
  disableFormSubmission?: boolean;
  // Form type selection
  formType?: 'form' | 'wizard';
  // Wizard-specific props
  wizardSteps?: WizardStep<any>[];
  showStepIndicator?: boolean;
  allowStepJumping?: boolean;
  // Pre-submission handler (e.g., for file uploads)
  handlePreSubmit?: (formData: any) => Promise<any>;
  isSubmitDisabled?: boolean;
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

// Form Navigation component that handles all 4 buttons: Cancel, Back, Next, Submit
interface FormNavigationProps {
  // Button states
  showCancelButton?: boolean;
  showBackButton?: boolean;
  showNextButton?: boolean;
  showSubmitButton?: boolean;
  
  // Button actions
  onCancel?: () => void;
  onBack?: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
  
  // Button text customization
  cancelButtonText?: string;
  backButtonText?: string;
  nextButtonText?: string;
  submitButtonText?: string;
  
  // Button states
  isLoading?: boolean;
  isNextDisabled?: boolean;
  isSubmitDisabled?: boolean;
  
  // Styling
  submitButtonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  
  // Test IDs
  dataTestId: string;
}

const FormNavigation: React.FC<FormNavigationProps> = ({
  showCancelButton = true,
  showBackButton = false,
  showNextButton = false,
  showSubmitButton = true,
  onCancel,
  onBack,
  onNext,
  onSubmit,
  cancelButtonText,
  backButtonText,
  nextButtonText,
  submitButtonText,
  isLoading = false,
  isNextDisabled = false,
  isSubmitDisabled = false,
  submitButtonVariant = 'default',
  dataTestId,
}) => {
  return (
    <div className="gba:flex gba:justify-between gba:items-center gba:mt-auto gba:pt-4" data-testid={`${dataTestId}-form-navigation`}>
      {/* Left side: Cancel and Back buttons */}
      <div className="gba:flex gba:gap-2">
        {showCancelButton && (
          <Button 
            variant="outline" 
            data-testid={`${dataTestId}-cancel-button`} 
            type="button"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelButtonText || getTranslationFromI18nKeyAndLabel('process:button.cancel', 'Cancel')}
          </Button>
        )}
        
        {showBackButton && (
          <Button 
            variant="outline" 
            data-testid={`${dataTestId}-back-button`} 
            type="button"
            onClick={onBack}
            disabled={isLoading}
          >
            {backButtonText || getTranslationFromI18nKeyAndLabel('process:button.previous', 'Previous')}
          </Button>
        )}
      </div>

      {/* Right side: Next and Submit buttons */}
      <div className="gba:flex gba:gap-2">
        {showNextButton && (
          <Button 
            data-testid={`${dataTestId}-next-button`} 
            type="button" 
            variant="default"
            disabled={isLoading || isNextDisabled}
            onClick={onNext}
          >
            {nextButtonText || getTranslationFromI18nKeyAndLabel('process:button.next', 'Next')}
          </Button>
        )}
        
        {showSubmitButton && (
          <Button 
            data-testid={`${dataTestId}-submit-button`} 
            type="submit" 
            variant={submitButtonVariant}
            disabled={isLoading || isSubmitDisabled}
            onClick={onSubmit}
          >
            {isLoading ? <Spinner size="sm" className="gba:mr-2" /> : null}
            {submitButtonText || getTranslationFromI18nKeyAndLabel('process:button.submit', 'Submit')}
          </Button>
        )}
      </div>
    </div>
  );
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
  customFormLayout = false,
  customActions,
  disableFormSubmission = false,
  formType = 'form',
  wizardSteps,
  showStepIndicator = true,
  allowStepJumping = false,
  handlePreSubmit,
  isSubmitDisabled = false,
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
          setLoading(false); // Stop loading on validation error
          return;
        }
      }

      // Pre-submission processing (e.g., file upload)
      let enhancedData = dataForValidation;
      if (handlePreSubmit) {
        enhancedData = await handlePreSubmit(dataForValidation);
      }

      // Development-only payload logging (input data)
      if (process.env.NODE_ENV !== 'production') {
        console.log('[AppActionForm] Form data (before transformation):', enhancedData);
      }

      const result = await onSubmit(enhancedData);
      
      // Development-only payload logging (final payload)
      if (process.env.NODE_ENV !== 'production') {
        console.log('[AppActionForm] Final payload (after transformation):', result);
      }
      
      // Success messages are no longer displayed in the form
      // They should be handled by the calling component or shown via other means
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
  }, [processType, submitEventType, onSubmit, validateForm, onSuccess, formData, handlePreSubmit]);

  const handleCancel = useCallback(() => {
    dispatchProcessContinueEvent(cancelEventType, {});
    setMessage(null);
    if (onCancel) {
      onCancel();
    }
  }, [cancelEventType, onCancel]);

  // IMPORTANT: Hooks must not be called conditionally. Always create an internal form instance
  // and choose layout behavior via props. This prevents crashes when disableFormSubmission flips
  // after async prefill/reset operations.
  const internalForm = useForm<any>({ defaultValues: formData, resolver });
  const form = externalForm || internalForm;



  // Navigation component for forms (standard forms only show Cancel and Submit)
  const formNavigation = (
    <FormNavigation
      showCancelButton={showCancelButton}
      showBackButton={false}
      showNextButton={false}
      showSubmitButton={true}
      onCancel={handleCancel}
      onSubmit={undefined} // Will be handled by form onSubmit
      cancelButtonText={cancelButtonText}
      submitButtonText={submitButtonText || getSuccessMessage(processType).replace('Successfully ', '')}
      isLoading={loading}
      isSubmitDisabled={isSubmitDisabled}
      submitButtonVariant={submitButtonVariant}
      dataTestId={dataTestId}
    />
  );

  // Wizard Navigation Component using useWizard hook
  const WizardNavigation: React.FC = () => {
    const { isFirstStep, isLastStep, nextStep, previousStep } = useWizard();
    
    return (
      <FormNavigation
        showCancelButton={showCancelButton}
        showBackButton={!isFirstStep}
        showNextButton={!isLastStep}
        showSubmitButton={isLastStep}
        onCancel={handleCancel}
        onBack={previousStep}
        onNext={() => {
          nextStep();
        }}
        onSubmit={undefined} // Will be handled by WizardForm onSubmit
        cancelButtonText={cancelButtonText}
        submitButtonText={submitButtonText || getSuccessMessage(processType).replace('Successfully ', '')}
        isLoading={loading}
        isSubmitDisabled={isSubmitDisabled}
        submitButtonVariant={submitButtonVariant}
        dataTestId={dataTestId}
      />
    );
  };

  return (
    <div className="gba:p-6 gba:h-full gba:flex gba:flex-col" data-testid={dataTestId}>
      {message && message.type === 'error' && (
        <Alert
          variant="destructive"
          className="gba:mb-4"
          data-testid={`${dataTestId}-message`}
        >
          {message.message}
        </Alert>
      )}
      
      {formType === 'wizard' && wizardSteps && form ? (
        // Use WizardForm with custom navigation as children
        <WizardForm
          form={form}
          steps={wizardSteps}
          onSubmit={(data) => handleSubmit(data)}
          showStepIndicator={showStepIndicator}
          allowStepJumping={allowStepJumping}
          className="gba:w-full"
        >
          <WizardNavigation />
        </WizardForm>
      ) : disableFormSubmission ? (
        // Custom form handling - don't wrap in Form/form elements
        <div className="gba:flex gba:flex-col gba:w-full gba:h-full" data-testid={`${dataTestId}-content`}>
          {children}
          {customActions}
        </div>
      ) : customFormLayout && form ? (
        // Custom layout: just provide form context and let children handle layout
        <Form {...(form as any)}>
          <form 
            onSubmit={form.handleSubmit((vals) => handleSubmit(vals))} 
            className="gba:flex gba:flex-col gba:w-full gba:h-full" 
            data-testid={`${dataTestId}-form`}
          >
            {children}
            {customActions}
          </form>
        </Form>
      ) : form ? (
        // Standard layout
        <Form {...(form as any)}>
          <form 
            onSubmit={form.handleSubmit((vals) => handleSubmit(vals))} 
            className="gba:flex gba:flex-col gba:w-full gba:max-w-md gba:h-full" 
            data-testid={`${dataTestId}-form`}
          >
            <div className="gba:flex-1 gba:space-y-4" data-testid={`${dataTestId}-form-content`}>
              {children}
            </div>
            {formNavigation}
          </form>
        </Form>
      ) : (
        // Fallback: no form wrapper (shouldn't happen in normal scenarios)
        <div className="gba:flex gba:flex-col gba:w-full gba:h-full" data-testid={`${dataTestId}-content`}>
          {children}
          {customActions}
        </div>
      )}
    </div>
  );
};

export default AppActionForm;
