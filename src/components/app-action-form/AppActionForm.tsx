import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Button, Alert, Form, WizardForm, useWizard, type WizardStep, useTranslation } from '@newwork/nw-design-system'
import { useForm, type Resolver, type UseFormReturn } from 'react-hook-form'
import { type z } from 'zod'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import translations from './_i18n'

export interface ProcessMessage {
  type: 'success' | 'error' | 'info'
  message: string
}

export interface AppActionFormProps {
  children: React.ReactNode
  processType: 'create' | 'update' | 'delete' | 'custom'
  submitEventType?: string
  cancelEventType?: string
  onSubmit: (formData: any) => Promise<any> | any
  onCancel?: () => void
  onSuccess?: (result: any) => void
  formData: any
  validateForm?: (formData: any) => string[] | null
  submitButtonText?: string
  cancelButtonText?: string
  showCancelButton?: boolean
  submitButtonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  form?: UseFormReturn<any>
  resolver?: Resolver<any>
  schema?: z.ZodType<any>
  'data-testid'?: string
  // Optional overrides for test ids on action buttons
  submitButtonTestId?: string
  cancelButtonTestId?: string
  // Support for custom form layouts (like wizards)
  customFormLayout?: boolean
  customActions?: React.ReactNode
  // Support for disabling form submission when using WizardForm or other custom handlers
  disableFormSubmission?: boolean
  // Form type selection
  formType?: 'form' | 'wizard'
  // Wizard-specific props
  wizardSteps?: WizardStep<any>[]
  allowStepJumping?: boolean
  // Pre-submission handler (e.g., for file uploads)
  handlePreSubmit?: (formData: any) => Promise<any>
  isSubmitDisabled?: boolean
  // Optional completion callback and success navigation
  onProcessCompletion?: (detail: { resolution?: 'success' | 'failure' } | null) => void
  /**
   * Optional payload for the cancel event. When provided, form validation is run before cancel;
   * cancel is only dispatched if validation passes. Use for flows where comments are required for both approve and reject.
   */
  getCancelPayload?: () => Record<string, unknown>
  /**
   * Optional callback run before cancel validation (e.g. to set form values so validation can require comments only on reject).
   */
  onBeforeCancel?: () => void | Promise<void>
  /**
   * @deprecated This prop is obsolete and will be removed in a future version. It is not used by AppActionForm.
   */
  businessAppContext?: BusinessAppContextProps
}

const getSuccessMessage = (processType: string, t: (key: string, args?: Record<string, any>) => string): string => {
  switch (processType) {
    case 'create':
      return t('process-success-created')
    case 'update':
      return t('process-success-updated')
    case 'delete':
      return t('process-success-deleted')
    default:
      return t('process-success-completed')
  }
}

// Form Navigation component that handles all 4 buttons: Cancel, Back, Next, Submit
interface FormNavigationProps {
  // Button states
  showCancelButton?: boolean
  showBackButton?: boolean
  showNextButton?: boolean
  showSubmitButton?: boolean

  // Button actions
  onCancel?: () => void
  onBack?: () => void
  onNext?: () => void
  onSubmit?: () => void

  // Button text customization
  cancelButtonText?: string
  backButtonText?: string
  nextButtonText?: string
  submitButtonText?: string

  // Button states
  isLoading?: boolean
  isNextDisabled?: boolean
  isSubmitDisabled?: boolean

  // Styling
  submitButtonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'

  // Test IDs
  dataTestId: string
  submitButtonDataTestId?: string
  cancelButtonDataTestId?: string
}

const FormNavigation: React.FC<FormNavigationProps> = ({
  showCancelButton = true,
  showBackButton = false,
  showNextButton = false,
  showSubmitButton = true,
  onCancel,
  onBack,
  onNext,
  cancelButtonText,
  backButtonText,
  nextButtonText,
  submitButtonText,
  isLoading = false,
  isNextDisabled = false,
  isSubmitDisabled = false,
  submitButtonVariant = 'default',
  dataTestId,
  submitButtonDataTestId,
  cancelButtonDataTestId
}) => {
  const { t } = useTranslation(translations)

  return (
    <div
      className="gba:flex gba:justify-end gba:gap-2 gba:items-center gba:mt-auto gba:pt-4"
      data-testid={`${dataTestId}-form-navigation`}
    >
      {/* Left side: Cancel and Back buttons */}
      <div className="gba:flex gba:gap-2">
        {showCancelButton && (
          <Button
            variant="outline"
            data-testid={cancelButtonDataTestId || `${dataTestId}-cancel-button`}
            type="button"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelButtonText || t('process-button-cancel')}
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
            {backButtonText || t('process-button-previous')}
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
            {nextButtonText || t('process-button-next')}
          </Button>
        )}

        {showSubmitButton && (
          <Button
            data-testid={submitButtonDataTestId || `${dataTestId}-submit-button`}
            type="submit"
            variant={submitButtonVariant}
            disabled={isLoading || isSubmitDisabled}
          >
            {submitButtonText || t('process-button-submit')}
          </Button>
        )}
      </div>
    </div>
  )
}

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
  showCancelButton, // deprecated - will be auto-calculated from onCancel
  submitButtonVariant = 'default',
  form: externalForm,
  resolver,
  schema,
  'data-testid': dataTestId = 'process-dialog',
  submitButtonTestId,
  cancelButtonTestId,
  customFormLayout = false,
  customActions,
  disableFormSubmission = false,
  formType = 'form',
  wizardSteps,
  allowStepJumping = true,
  handlePreSubmit,
  isSubmitDisabled = false,
  onProcessCompletion,
  getCancelPayload,
  onBeforeCancel
}) => {
  const { t } = useTranslation(translations)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<ProcessMessage | null>(null)
  const isSubmittingRef = useRef(false)

  useEffect(() => {
    setMessage(null)
  }, [processType])

  const handleSubmit = useCallback(
    async (values?: any) => {
      // Prevent duplicate submissions using ref for synchronous check
      if (isSubmittingRef.current) {
        return
      }

      // Set loading state immediately to disable button
      isSubmittingRef.current = true
      setLoading(true)

      try {
        setMessage(null)
        const dataForValidation = values ?? formData

        if (validateForm) {
          const errors = validateForm(dataForValidation)
          if (errors && errors.length > 0) {
            setMessage({ type: 'error', message: errors.join(', ') })
            setLoading(false)
            isSubmittingRef.current = false
            return
          }
        }

        // Pre-submission processing (e.g., file upload)
        let enhancedData = dataForValidation
        if (handlePreSubmit) {
          enhancedData = await handlePreSubmit(dataForValidation)
        }

        const result = await onSubmit(enhancedData)

        // Development-only payload logging (output data)
        if (process.env.NODE_ENV !== 'production') {
          console.log('[AppActionForm] Payload:', result)
        }

        // Create a promise that resolves when process completes OR after timeout
        const waitForProcessCompletion = new Promise<void>(resolve => {
          const TIMEOUT = 10000
          const timeoutId = setTimeout(() => {
            cleanup()
            resolve()
          }, TIMEOUT)

          const handleProcessCompletion = (event: Event) => {
            const customEvent = event as CustomEvent<{ resolution: 'success' | 'failure' }>
            const detail = customEvent?.detail ?? null
            // Notify consumer
            if (onProcessCompletion) {
              try {
                onProcessCompletion(detail)
              } catch {
                // Ignore errors from consumer callback
              }
            }
            if (detail?.resolution === 'success' || detail?.resolution === 'failure') {
              cleanup()
              resolve()
            }
          }

          const cleanup = () => {
            clearTimeout(timeoutId)
            window.removeEventListener('com.newwork.process.processCompletion', handleProcessCompletion)
            window.removeEventListener('com.newwork.process.taskCompletion', handleProcessCompletion)
          }

          // Listen for process completion events
          window.addEventListener('com.newwork.process.processCompletion', handleProcessCompletion)
          window.addEventListener('com.newwork.process.taskCompletion', handleProcessCompletion)
        })

        // Dispatch the process event
        dispatchProcessContinueEvent(submitEventType, result)

        // Wait for the process to complete
        await waitForProcessCompletion

        if (onSuccess) {
          onSuccess(result)
        }
      } catch (error) {
        console.error('Submission error:', error)
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
        setMessage({ type: 'error', message: errorMessage })
      } finally {
        setLoading(false)
        isSubmittingRef.current = false
      }
    },
    [processType, submitEventType, onSubmit, validateForm, onSuccess, formData, handlePreSubmit]
  )

  const handleCancel = useCallback(async () => {
    let payload: Record<string, unknown> = {}
    if (getCancelPayload && externalForm) {
      await onBeforeCancel?.()
      const valid = await externalForm.trigger()
      if (!valid) {
        return
      }
      payload = getCancelPayload() ?? {}
    }
    dispatchProcessContinueEvent(cancelEventType, payload)
    setMessage(null)
    if (onCancel) {
      onCancel()
    }
  }, [cancelEventType, onCancel, getCancelPayload, onBeforeCancel, externalForm])

  // IMPORTANT: Hooks must not be called conditionally. Always create an internal form instance
  // and choose layout behavior via props. This prevents crashes when disableFormSubmission flips
  // after async prefill/reset operations.
  const internalForm = useForm<any>({ defaultValues: formData, resolver })
  const form = externalForm || internalForm

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
      submitButtonText={submitButtonText || getSuccessMessage(processType, t).replace('Successfully ', '')}
      isLoading={loading || form?.formState?.isSubmitting}
      submitButtonVariant={submitButtonVariant}
      dataTestId={dataTestId}
      isSubmitDisabled={isSubmitDisabled}
      submitButtonDataTestId={submitButtonTestId}
      cancelButtonDataTestId={cancelButtonTestId}
    />
  )

  // Wizard Navigation Component using useWizard hook
  const WizardNavigation: React.FC = () => {
    const { isFirstStep, isLastStep, nextStep, previousStep } = useWizard()

    return (
      <FormNavigation
        showCancelButton={showCancelButton}
        showBackButton={!isFirstStep}
        showNextButton={!isLastStep}
        showSubmitButton={isLastStep}
        onCancel={handleCancel}
        onBack={previousStep}
        onNext={() => {
          nextStep()
        }}
        onSubmit={undefined} // Will be handled by WizardForm onSubmit
        cancelButtonText={cancelButtonText}
        submitButtonText={submitButtonText || getSuccessMessage(processType, t).replace('Successfully ', '')}
        isLoading={loading || form?.formState?.isSubmitting}
        submitButtonVariant={submitButtonVariant}
        dataTestId={dataTestId}
        submitButtonDataTestId={submitButtonTestId}
        cancelButtonDataTestId={cancelButtonTestId}
      />
    )
  }

  // Helper function to render form content based on conditions
  const renderFormContent = (): React.ReactNode => {
    // Validation error handler for form submission
    const handleValidationErrors = (errors: any) => {
      // Development-only validation error logging
      if (process.env.NODE_ENV !== 'production') {
        console.error('[AppActionForm] Validation failed:', errors)
        // Note: form.formState.errors might not be updated yet, use errors parameter instead
        console.error('[AppActionForm] Validation errors (from callback):', errors)
        console.error('[AppActionForm] Form errors (from formState):', form.formState.errors)
        console.error('[AppActionForm] Form values:', form.getValues())
      }
    }

    // Wizard form
    if (formType === 'wizard' && wizardSteps && form) {
      return (
        <WizardForm
          form={form}
          steps={wizardSteps}
          onSubmit={handleSubmit}
          showStepIndicator={true}
          allowStepJumping={allowStepJumping}
          className="gba:w-full"
          {...(schema ? { schema: schema as any } : {})}
        >
          <WizardNavigation />
        </WizardForm>
      )
    }

    // Disabled form submission (custom handling)
    if (disableFormSubmission) {
      return (
        <div className="gba:flex gba:flex-col gba:w-full gba:h-full" data-testid={`${dataTestId}-content`}>
          {children}
          {customActions}
        </div>
      )
    }

    // Custom layout with form
    if (customFormLayout && form) {
      return (
        <Form {...(form as any)} schema={schema}>
          <form
            onSubmit={form.handleSubmit(vals => handleSubmit(vals), handleValidationErrors)}
            className="gba:flex gba:flex-col gba:w-full gba:h-full"
            data-testid={`${dataTestId}-form`}
          >
            {children}
            {customActions}
          </form>
        </Form>
      )
    }

    // Standard layout with form
    if (form) {
      return (
        <Form {...(form as any)} schema={schema}>
          <form
            onSubmit={form.handleSubmit(vals => handleSubmit(vals), handleValidationErrors)}
            className="gba:flex gba:flex-col gba:w-full gba:max-w-full gba:h-full"
            data-testid={`${dataTestId}-form`}
          >
            <div className="gba:flex-1 gba:space-y-4" data-testid={`${dataTestId}-form-content`}>
              {children}
            </div>
            {formNavigation}
          </form>
        </Form>
      )
    }

    // Fallback: no form wrapper (shouldn't happen in normal scenarios)
    return (
      <div className="gba:flex gba:flex-col gba:w-full gba:h-full" data-testid={`${dataTestId}-content`}>
        {children}
        {customActions}
      </div>
    )
  }

  return (
    <div className="gba:p-6 gba:h-full gba:flex gba:flex-col" data-testid={dataTestId}>
      {message?.type === 'error' && (
        <Alert variant="destructive" className="gba:mb-4" data-testid={`${dataTestId}-message`}>
          {message.message}
        </Alert>
      )}

      {renderFormContent()}
    </div>
  )
}

export default AppActionForm
