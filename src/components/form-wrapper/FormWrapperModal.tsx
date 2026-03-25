import React, { useState, useEffect, SetStateAction, Dispatch, useRef, useCallback, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  Button,
  Form,
  DialogTitle,
  Alert,
  toast,
  useTranslation
} from '@newwork/nw-design-system'
import { useForm, type Resolver, type UseFormReturn, type FieldValues } from 'react-hook-form'
import type { ZodType } from 'zod'
import { cn } from '@/common/utils/cn'
import translations from './_i18n'

export interface FormMessage {
  type: 'success' | 'error' | 'info'
  message: string
}

interface FormWrapperModalProps {
  childAddButton?: React.ReactNode
  children: React.ReactNode
  title?: string
  description?: string
  onSubmit?: (_data: FieldValues) => void | Promise<void>
  onCancel?: () => void
  onError?: (_error: string) => void
  defaultValues?: FieldValues
  isEditing?: boolean
  loading?: boolean
  dataTestId?: string
  isDrawerActive?: boolean
  open?: boolean
  setOpen?: Dispatch<SetStateAction<boolean>>
  isValid?: boolean
  setCodeError?: Dispatch<SetStateAction<string>>

  // Form handling
  form?: UseFormReturn<FieldValues>
  resolver?: Resolver<FieldValues>
  schema?: ZodType<any>
  validateForm?: (_formData: FieldValues) => string[] | null
  isSubmitDisabled?: boolean
  preventDuplicateSubmission?: boolean
  updateValues?: FieldValues
  resetFields?: string[]

  // Error handling
  showErrorMessage?: boolean
  errorMessage?: string

  // Layout customization
  formClassName?: string
  contentClassName?: string

  // Button customization
  submitButtonText?: string
  cancelButtonText?: string
  submitButtonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  showCancelButton?: boolean

  // Test IDs
  submitButtonTestId?: string
  cancelButtonTestId?: string

  // Validation behavior
  /** When false, submit button ignores form validity and validation happens only on submit. Default: true */
  validateBeforeSubmit?: boolean
}

const FormWrapperModal = ({
  childAddButton,
  children,
  title = 'Form',
  description,
  onSubmit,
  onCancel,
  onError,
  defaultValues = {},
  isEditing = false,
  loading = false,
  isDrawerActive = false,
  dataTestId = 'form-wrapper-modal',
  open,
  setOpen,
  isValid = true,
  setCodeError,

  // Form handling
  form: externalForm,
  resolver,
  schema,
  validateForm,
  isSubmitDisabled = false,
  preventDuplicateSubmission = true,
  updateValues,
  resetFields,

  // Error handling
  showErrorMessage = false,
  errorMessage,

  // Layout customization
  formClassName,
  contentClassName,

  // Button customization
  submitButtonText,
  cancelButtonText,
  submitButtonVariant = 'default',
  showCancelButton = true,

  // Test IDs
  submitButtonTestId,
  cancelButtonTestId,

  // Validation behavior
  validateBeforeSubmit = true
}: FormWrapperModalProps) => {
  const { t } = useTranslation(translations)
  const [isOpen, setIsOpen] = useState(open)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<FormMessage | null>(null)
  const isSubmittingRef = useRef(false)
  const isEditingForm = useMemo(
    () => (isEditing ? t('submit-button-update') : t('submit-button-create')),
    [isEditing, t]
  )

  // Create internal form if no external form provided
  const internalForm = useForm<FieldValues>({ defaultValues, resolver, mode: 'onChange' })
  const form = externalForm || internalForm
  const isFormValid = useMemo(() => {
    if (!form.formState.isValid) return false
    // Edits should be submittable without forcing a field change (e.g. code is not in the form when editing).
    if (isEditing) return true
    return form.formState.isDirty
  }, [isEditing, form.formState.isValid, form.formState.isDirty])

  useEffect(() => {
    // Skip reset if using external form - it's already initialized with its own defaultValues
    if (externalForm) return

    form.reset(defaultValues)
    form.clearErrors()
    setMessage(null)
  }, [form, defaultValues, externalForm])

  useEffect(() => {
    if (errorMessage) {
      setMessage({ type: 'error', message: errorMessage })
    }
  }, [errorMessage])

  // Update form values when updateValues prop changes
  useEffect(() => {
    if (updateValues && Object.keys(updateValues).length > 0) {
      // Generic approach: iterate through all fields in updateValues
      for (const [fieldName, value] of Object.entries(updateValues)) {
        form.setValue(fieldName, value, { shouldDirty: true, shouldValidate: true })
      }
    }
  }, [updateValues, form])

  // Reset specific fields when resetFields prop changes
  useEffect(() => {
    if (resetFields && resetFields.length > 0) {
      for (const fieldName of resetFields) {
        form.setValue(fieldName, '', { shouldDirty: true, shouldValidate: false })
      }
      // Clear errors for reset fields
      form.clearErrors(resetFields)
    }
  }, [resetFields, form])

  const handleSubmit = useCallback(
    async (values?: FieldValues) => {
      // Prevent duplicate submissions using ref for synchronous check
      if (preventDuplicateSubmission && isSubmittingRef.current) {
        return
      }

      if (!onSubmit) return

      try {
        if (preventDuplicateSubmission) {
          isSubmittingRef.current = true
        }
        setIsSubmitting(true)
        setMessage(null)

        const dataForValidation = values ?? form.getValues()

        if (validateForm) {
          const errors = validateForm(dataForValidation)
          if (errors && errors.length > 0) {
            setMessage({ type: 'error', message: errors.join(', ') })
            if (onError) {
              onError(errors.join(', '))
            }
            return
          }
        }

        await onSubmit(dataForValidation)

        setIsOpen(false)
        setOpen?.(false)
        form.reset()
        setMessage(null)
      } catch (error) {
        console.error('Form submission error:', error)

        const defaultErrorMessage = t('error-default')
        const errorMsg = error instanceof Error ? error.message : defaultErrorMessage

        setMessage({ type: 'error', message: errorMsg })
        if (onError) {
          onError(errorMsg)
        }
        toast.error(errorMsg)
      } finally {
        setIsSubmitting(false)
        if (preventDuplicateSubmission) {
          isSubmittingRef.current = false
        }
      }
    },
    [onSubmit, validateForm, onError, form, preventDuplicateSubmission, setOpen]
  )

  const handleCancel = useCallback(() => {
    setIsOpen(false)
    setOpen?.(false)
    setCodeError?.('')
    setMessage(null)
    form.reset()
    if (onCancel) {
      onCancel()
    }
  }, [setOpen, setCodeError, form, onCancel])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open)
      setOpen?.(open)
      setCodeError?.('')
      setMessage(null)
      if (!open) {
        form.reset()
        if (onCancel) {
          onCancel()
        }
      }
    },
    [setOpen, setCodeError, form, onCancel]
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {childAddButton && <DialogTrigger asChild>{childAddButton}</DialogTrigger>}
      <DialogContent
        data-testid={dataTestId}
        className={cn('gba:max-h-screen gba:w-[553px] gba:overflow-y-auto', { 'gba:z-1002!': isDrawerActive })}
      >
        <DialogTitle>{title}</DialogTitle>
        <div className={cn('gba:flex gba:flex-col gba:gap-4', contentClassName)}>
          <div className="gba:space-y-2">
            {description && <p className="gba:text-sm gba:text-muted-foreground">{description}</p>}
          </div>

          {/* Error message display */}
          {showErrorMessage && message && message.type === 'error' && (
            <Alert variant="destructive" className="gba:mb-4" data-testid={`${dataTestId}-message`}>
              {message.message}
            </Alert>
          )}

          <Form {...(form as UseFormReturn<FieldValues>)} schema={schema}>
            <form
              onSubmit={form.handleSubmit(vals => handleSubmit(vals))}
              className={cn('gba:flex gba:flex-col gba:w-full gba:h-full', formClassName)}
              data-testid={`${dataTestId}-form`}
            >
              <div className="gba:flex gba:flex-col gba:gap-4 gba:py-6" data-testid={`${dataTestId}-form-content`}>
                {children}
              </div>

              {/* Form actions */}
              <div className="gba:flex gba:justify-end gba:gap-2 gba:pt-4">
                {showCancelButton && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={loading || isSubmitting}
                    data-testid={cancelButtonTestId || `${dataTestId}-cancel-button`}
                  >
                    {cancelButtonText || t('cancel-button')}
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={
                    loading || isSubmitting || isSubmitDisabled || !isValid || (validateBeforeSubmit && !isFormValid)
                  }
                  variant={submitButtonVariant}
                  data-testid={submitButtonTestId || `${dataTestId}-submit-button`}
                >
                  {isSubmitting ? t('submit-button-saving') : submitButtonText || isEditingForm}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default FormWrapperModal
