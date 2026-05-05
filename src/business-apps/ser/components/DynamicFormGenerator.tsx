import React, { useState, useCallback, useMemo } from 'react'
import { Card, Button, Input, Textarea, Badge, Spinner } from '@newwork/nw-design-system'
import { DynamicFormField, DynamicFormValues } from '../types/flowTemplate'
import { CheckCircleIcon, WarningIcon, CalendarIcon, EnvelopeIcon, LinkIcon } from '@phosphor-icons/react'
import { DateTimeField } from './DateTimeField'
import { FileUploadField } from './FileUploadField'
import { NumberField } from './NumberField'
import { DataSourceSelect } from './DataSourceSelect'
import { DataSourceMultiSelect } from './DataSourceMultiSelect'
import type { UploadFile } from './FileUploadField'
import { serializeUploadResults } from '../utils/fileUploadUtils'

export interface DynamicFormGeneratorProps {
  schema: DynamicFormField[]
  initialValues?: DynamicFormValues
  onValuesChange?: (values: DynamicFormValues) => void
  onSubmit: (values: DynamicFormValues) => Promise<void>
  isSubmitting?: boolean
  submitButtonText?: string
  title?: string
  description?: string
  showSubmitButton?: boolean
  showCard?: boolean
  // File upload support
  accessToken?: string
  requestId?: string
  onFileUploadComplete?: (fieldName: string, uploadResults: any[]) => void
}

interface FieldError {
  field: string
  message: string
}

/**
 * Shared Dynamic Form Generator Component
 * Used by both Service Portal and Service Desk for rendering dynamic forms
 * based on workflow template field definitions
 */
export const DynamicFormGenerator: React.FC<DynamicFormGeneratorProps> = ({
  schema,
  initialValues = {},
  onValuesChange,
  onSubmit,
  isSubmitting = false,
  submitButtonText = 'Submit',
  title = 'Form Details',
  description,
  showSubmitButton = true,
  showCard = true,
  accessToken,
  requestId,
  onFileUploadComplete
}) => {
  // Extract default values from schema fields
  const schemaDefaultValues = useMemo(() => {
    const defaults: DynamicFormValues = {}
    schema.forEach(field => {
      if (field.value !== undefined && field.value !== null) {
        defaults[field.name] = field.value
      }
    })
    return defaults
  }, [schema])

  // Merge schema default values with provided initialValues (initialValues take precedence)
  const mergedInitialValues = useMemo(() => {
    return { ...schemaDefaultValues, ...initialValues }
  }, [schemaDefaultValues, initialValues])

  const [values, setValues] = useState<DynamicFormValues>(mergedInitialValues)
  const [errors, setErrors] = useState<FieldError[]>([])
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set())

  // Update form values when schema or initialValues change
  React.useEffect(() => {
    setValues(mergedInitialValues)
  }, [mergedInitialValues])

  // Validation functions
  const validateField = useCallback((field: DynamicFormField, value: any): string | null => {
    // Basic required validation
    if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return `${field.label} is required`
    }

    if (!field.validation) return null

    for (const rule of field.validation) {
      switch (rule.type) {
        case 'required':
          if (!value || (typeof value === 'string' && !value.trim())) {
            return rule.message || `${field.label} is required`
          }
          break

        case 'minLength':
          if (typeof value === 'string' && value.length < (rule.value as number)) {
            return rule.message || `${field.label} must be at least ${rule.value} characters`
          }
          break

        case 'maxLength':
          if (typeof value === 'string' && value.length > (rule.value as number)) {
            return rule.message || `${field.label} must not exceed ${rule.value} characters`
          }
          break

        case 'email':
          if (value && typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return rule.message || `${field.label} must be a valid email address`
          }
          break

        case 'url':
          if (value && typeof value === 'string' && !/^https?:\/\/.+/.test(value)) {
            return rule.message || `${field.label} must be a valid URL`
          }
          break

        case 'pattern':
          if (value && typeof value === 'string' && rule.value) {
            const regex = new RegExp(rule.value as string)
            if (!regex.test(value)) {
              return rule.message || `${field.label} format is invalid`
            }
          }
          break

        case 'min':
          if (typeof value === 'number' && value < (rule.value as number)) {
            return rule.message || `${field.label} must be at least ${rule.value}`
          }
          break

        case 'max':
          if (typeof value === 'number' && value > (rule.value as number)) {
            return rule.message || `${field.label} must not exceed ${rule.value}`
          }
          break

        case 'minDate':
          if (value) {
            const dateValue = value instanceof Date ? value : new Date(value)
            const minDateValue = rule.value instanceof Date ? rule.value : new Date(rule.value as string)
            if (dateValue < minDateValue) {
              return rule.message || `${field.label} must be after ${minDateValue.toLocaleDateString()}`
            }
          }
          break

        case 'maxDate':
          if (value) {
            const dateValue = value instanceof Date ? value : new Date(value)
            const maxDateValue = rule.value instanceof Date ? rule.value : new Date(rule.value as string)
            if (dateValue > maxDateValue) {
              return rule.message || `${field.label} must be before ${maxDateValue.toLocaleDateString()}`
            }
          }
          break

        case 'dateRange':
          if (value && Array.isArray(rule.value) && rule.value.length === 2) {
            const dateValue = value instanceof Date ? value : new Date(value)
            const [minDate, maxDate] = rule.value.map(d => (d instanceof Date ? d : new Date(d)))
            if (dateValue < minDate || dateValue > maxDate) {
              return (
                rule.message ||
                `${field.label} must be between ${minDate.toLocaleDateString()} and ${maxDate.toLocaleDateString()}`
              )
            }
          }
          break
      }
    }

    return null
  }, [])

  const validateForm = useCallback((): boolean => {
    const newErrors: FieldError[] = []

    schema.forEach(field => {
      const value = values[field.name]
      const error = validateField(field, value)
      if (error) {
        newErrors.push({ field: field.name, message: error })
      }
    })

    setErrors(newErrors)
    return newErrors.length === 0
  }, [schema, values, validateField])

  const handleFieldChange = useCallback(
    (fieldName: string, value: any) => {
      const newValues = { ...values, [fieldName]: value }
      setValues(newValues)
      onValuesChange?.(newValues)

      // Mark field as touched
      setTouchedFields(prev => new Set(prev).add(fieldName))

      // Clear field error if it exists
      setErrors(prev => prev.filter(error => error.field !== fieldName))
    },
    [values, onValuesChange]
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      // Mark all fields as touched
      setTouchedFields(new Set(schema.map(field => field.name)))

      if (validateForm()) {
        try {
          await onSubmit(values)
        } catch (error) {
          console.error('Form submission error:', error)
        }
      }
    },
    [schema, validateForm, onSubmit, values]
  )

  // Get field error
  const getFieldError = useCallback(
    (fieldName: string): string | null => {
      const error = errors.find(err => err.field === fieldName)
      return error ? error.message : null
    },
    [errors]
  )

  // Check if field should show validation
  const shouldShowValidation = useCallback(
    (fieldName: string): boolean => {
      return touchedFields.has(fieldName)
    },
    [touchedFields]
  )

  // Render different field types
  const renderField = useCallback(
    (field: DynamicFormField) => {
      const value = values[field.name] ?? ''
      const error = getFieldError(field.name)
      const showValidation = shouldShowValidation(field.name)
      const hasError = showValidation && error
      const isReadOnly = field.readonly || false

      const commonProps = {
        id: field.name,
        required: field.required && !isReadOnly, // Don't mark as required if readonly
        placeholder: field.placeholder,
        className: hasError ? 'gba:border-red-500' : '',
        'data-testid': `form-field-${field.name}`
      }

      switch (field.type) {
        case 'TEXT':
          return (
            <div className="gba:space-y-2" key={field.name} data-testid={`field-container-${field.name}`}>
              <label htmlFor={field.name} className="gba:block gba:text-sm gba:font-medium gba:text-foreground">
                {field.label}
                {field.required && !isReadOnly && <span className="gba:text-destructive gba:ml-1">*</span>}
              </label>
              {field.description && <p className="gba:text-xs gba:text-muted-foreground">{field.description}</p>}
              <Input
                {...commonProps}
                value={value}
                onChange={e => handleFieldChange(field.name, e.target.value)}
                onBlur={() => setTouchedFields(prev => new Set(prev).add(field.name))}
                disabled={isReadOnly}
                readOnly={isReadOnly}
              />
              {hasError && (
                <div className="gba:flex gba:items-center gba:gap-1 gba:text-destructive gba:text-xs">
                  <WarningIcon size={12} />
                  {error}
                </div>
              )}
            </div>
          )

        case 'EMAIL':
          return (
            <div className="gba:space-y-2" key={field.name} data-testid={`field-container-${field.name}`}>
              <label htmlFor={field.name} className="gba:block gba:text-sm gba:font-medium gba:text-foreground">
                <EnvelopeIcon className="gba:w-4 gba:h-4 gba:inline gba:mr-1" />
                {field.label}
                {field.required && !isReadOnly && <span className="gba:text-destructive gba:ml-1">*</span>}
              </label>
              {field.description && <p className="gba:text-xs gba:text-muted-foreground">{field.description}</p>}
              <Input
                {...commonProps}
                type="email"
                value={value}
                onChange={e => handleFieldChange(field.name, e.target.value)}
                onBlur={() => setTouchedFields(prev => new Set(prev).add(field.name))}
                disabled={isReadOnly}
                readOnly={isReadOnly}
              />
              {hasError && (
                <div className="gba:flex gba:items-center gba:gap-1 gba:text-destructive gba:text-xs">
                  <WarningIcon size={12} />
                  {error}
                </div>
              )}
            </div>
          )

        case 'URL':
          return (
            <div className="gba:space-y-2" key={field.name} data-testid={`field-container-${field.name}`}>
              <label htmlFor={field.name} className="gba:block gba:text-sm gba:font-medium gba:text-foreground">
                <LinkIcon className="gba:w-4 gba:h-4 gba:inline gba:mr-1" />
                {field.label}
                {field.required && !isReadOnly && <span className="gba:text-destructive gba:ml-1">*</span>}
              </label>
              {field.description && <p className="gba:text-xs gba:text-muted-foreground">{field.description}</p>}
              <Input
                {...commonProps}
                type="url"
                value={value}
                onChange={e => handleFieldChange(field.name, e.target.value)}
                onBlur={() => setTouchedFields(prev => new Set(prev).add(field.name))}
                disabled={isReadOnly}
                readOnly={isReadOnly}
              />
              {hasError && (
                <div className="gba:flex gba:items-center gba:gap-1 gba:text-destructive gba:text-xs">
                  <WarningIcon size={12} />
                  {error}
                </div>
              )}
            </div>
          )

        case 'NUMBER':
          return (
            <div className="gba:space-y-2" key={field.name} data-testid={`field-container-${field.name}`}>
              <label htmlFor={field.name} className="gba:block gba:text-sm gba:font-medium gba:text-foreground">
                {field.label}
                {field.required && <span className="gba:text-destructive gba:ml-1">*</span>}
              </label>
              {field.description && <p className="gba:text-xs gba:text-muted-foreground">{field.description}</p>}
              <NumberField
                name={field.name}
                label={field.label}
                showLabel={false}
                value={value}
                onChange={parsedValue => handleFieldChange(field.name, parsedValue)}
                onBlur={() => setTouchedFields(prev => new Set(prev).add(field.name))}
                required={field.required && !isReadOnly}
                placeholder={field.placeholder}
                description={field.description}
                hasError={!!hasError}
                errorMessage={error || undefined}
                disabled={isReadOnly}
                testId={`form-field-${field.name}`}
                id={field.name}
              />
            </div>
          )

        case 'TEXTAREA':
          return (
            <div className="gba:space-y-2" key={field.name} data-testid={`field-container-${field.name}`}>
              <label htmlFor={field.name} className="gba:block gba:text-sm gba:font-medium gba:text-foreground">
                {field.label}
                {field.required && !isReadOnly && <span className="gba:text-destructive gba:ml-1">*</span>}
              </label>
              {field.description && <p className="gba:text-xs gba:text-muted-foreground">{field.description}</p>}
              <Textarea
                {...commonProps}
                value={value}
                onChange={e => handleFieldChange(field.name, e.target.value)}
                onBlur={() => setTouchedFields(prev => new Set(prev).add(field.name))}
                rows={4}
                disabled={isReadOnly}
                readOnly={isReadOnly}
              />
              {hasError && (
                <div className="gba:flex gba:items-center gba:gap-1 gba:text-destructive gba:text-xs">
                  <WarningIcon size={12} />
                  {error}
                </div>
              )}
            </div>
          )

        case 'SELECT':
          return (
            <div className="gba:space-y-2" key={field.name} data-testid={`field-container-${field.name}`}>
              <label htmlFor={field.name} className="gba:block gba:text-sm gba:font-medium gba:text-foreground">
                {field.label}
                {field.required && !isReadOnly && <span className="gba:text-destructive gba:ml-1">*</span>}
              </label>
              {field.description && <p className="gba:text-xs gba:text-muted-foreground">{field.description}</p>}
              {/* Use DataSourceSelect for dynamic data sources or static options with consistent UI */}
              <DataSourceSelect
                id={field.name}
                value={value || ''}
                onChange={newValue => handleFieldChange(field.name, newValue)}
                dataSource={field.dataSource}
                accessToken={accessToken || ''}
                placeholder={field.placeholder || `Select ${field.label}`}
                required={field.required}
                disabled={isReadOnly}
                initialOptions={field.options}
                data-testid={`select-${field.name}`}
              />
              {hasError && (
                <div className="gba:flex gba:items-center gba:gap-1 gba:text-destructive gba:text-xs">
                  <WarningIcon size={12} />
                  {error}
                </div>
              )}
            </div>
          )

        case 'DATE':
          return (
            <div className="gba:space-y-2" key={field.name} data-testid={`field-container-${field.name}`}>
              <label htmlFor={field.name} className="gba:block gba:text-sm gba:font-medium gba:text-foreground">
                {field.label}
                {field.required && <span className="gba:text-destructive gba:ml-1">*</span>}
              </label>
              {field.description && <p className="gba:text-xs gba:text-muted-foreground">{field.description}</p>}
              <DateTimeField
                name={field.name}
                label={field.label}
                showLabel={false}
                value={value}
                onChange={date => handleFieldChange(field.name, date)}
                onBlur={() => setTouchedFields(prev => new Set(prev).add(field.name))}
                required={field.required && !isReadOnly}
                placeholder={field.placeholder}
                hasError={!!hasError}
                errorMessage={error || undefined}
                disabled={isReadOnly}
                type="date"
                testId={`form-field-${field.name}`}
              />
              {hasError && (
                <div className="gba:flex gba:items-center gba:gap-1 gba:text-destructive gba:text-xs">
                  <WarningIcon size={12} />
                  {error}
                </div>
              )}
            </div>
          )

        case 'DATETIME':
          try {
            return (
              <div className="gba:space-y-2" key={field.name} data-testid={`field-container-${field.name}`}>
                <label htmlFor={field.name} className="gba:block gba:text-sm gba:font-medium gba:text-foreground">
                  {field.label}
                  {field.required && <span className="gba:text-destructive gba:ml-1">*</span>}
                </label>
                {field.description && <p className="gba:text-xs gba:text-muted-foreground">{field.description}</p>}
                <DateTimeField
                  name={field.name}
                  label={field.label}
                  showLabel={false}
                  value={value}
                  onChange={date => handleFieldChange(field.name, date)}
                  onBlur={() => setTouchedFields(prev => new Set(prev).add(field.name))}
                  required={field.required && !isReadOnly}
                  placeholder={field.placeholder}
                  hasError={!!hasError}
                  errorMessage={error || undefined}
                  disabled={isReadOnly}
                  type="datetime"
                  testId={`form-field-${field.name}`}
                />
                {hasError && (
                  <div className="gba:flex gba:items-center gba:gap-1 gba:text-destructive gba:text-xs">
                    <WarningIcon size={12} />
                    {error}
                  </div>
                )}
              </div>
            )
          } catch (error) {
            // Fallback to basic datetime input
            return (
              <div className="gba:space-y-2" key={field.name} data-testid={`field-container-${field.name}`}>
                <label htmlFor={field.name} className="gba:block gba:text-sm gba:font-medium gba:text-foreground">
                  <CalendarIcon className="gba:w-4 gba:h-4 gba:inline gba:mr-1" />
                  {field.label}
                  {field.required && !isReadOnly && <span className="gba:text-destructive gba:ml-1">*</span>}
                </label>
                {field.description && <p className="gba:text-xs gba:text-muted-foreground">{field.description}</p>}
                <Input
                  {...commonProps}
                  type="datetime-local"
                  value={value}
                  onChange={e => handleFieldChange(field.name, e.target.value)}
                  onBlur={() => setTouchedFields(prev => new Set(prev).add(field.name))}
                  disabled={isReadOnly}
                  readOnly={isReadOnly}
                />
                {hasError && (
                  <div className="gba:flex gba:items-center gba:gap-1 gba:text-destructive gba:text-xs">
                    <WarningIcon size={12} />
                    {String(error)}
                  </div>
                )}
                <div className="gba:text-xs gba:text-amber-600 gba:bg-amber-50 gba:p-2 gba:rounded">
                  ⚠️ Using fallback datetime input. DateTimeField component error:{' '}
                  {error instanceof Error ? error.message : String(error)}
                </div>
              </div>
            )
          }

        case 'CHECKBOX':
          return (
            <div className="gba:space-y-2" key={field.name} data-testid={`field-container-${field.name}`}>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-foreground">
                {field.label}
                {field.required && !isReadOnly && <span className="gba:text-destructive gba:ml-1">*</span>}
              </label>
              {field.description && <p className="gba:text-xs gba:text-muted-foreground">{field.description}</p>}
              <div className="gba:space-y-2">
                {field.options?.map(option => (
                  <label key={option.value} className="gba:flex gba:items-center gba:space-x-2">
                    <input
                      type="checkbox"
                      value={option.value}
                      checked={Array.isArray(value) ? value.includes(option.value) : false}
                      onChange={e => {
                        const currentValue = Array.isArray(value) ? value : []
                        let newValue
                        if (e.target.checked) {
                          newValue = [...currentValue, option.value]
                        } else {
                          newValue = currentValue.filter(v => v !== option.value)
                        }
                        handleFieldChange(field.name, newValue)
                      }}
                      className="gba:rounded gba:border-input"
                      data-testid={`checkbox-${field.name}-${option.value}`}
                      disabled={isReadOnly}
                    />
                    <span className="gba:text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
              {hasError && (
                <div className="gba:flex gba:items-center gba:gap-1 gba:text-destructive gba:text-xs">
                  <WarningIcon size={12} />
                  {error}
                </div>
              )}
            </div>
          )

        case 'MULTISELECT':
          return (
            <div className="gba:space-y-2" key={field.name} data-testid={`field-container-${field.name}`}>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-foreground">
                {field.label}
                {field.required && !isReadOnly && <span className="gba:text-destructive gba:ml-1">*</span>}
              </label>
              {field.description && <p className="gba:text-xs gba:text-muted-foreground">{field.description}</p>}
              {/* Use DataSourceMultiSelect for dynamic data sources or static options with consistent UI */}
              <DataSourceMultiSelect
                id={field.name}
                value={Array.isArray(value) ? value : []}
                onChange={newValues => handleFieldChange(field.name, newValues)}
                dataSource={field.dataSource}
                accessToken={accessToken || ''}
                placeholder={field.placeholder || `Select ${field.label}`}
                required={field.required}
                disabled={isReadOnly}
                initialOptions={field.options}
                data-testid={`multiselect-${field.name}`}
              />
              {hasError && (
                <div className="gba:flex gba:items-center gba:gap-1 gba:text-destructive gba:text-xs">
                  <WarningIcon size={12} />
                  {error}
                </div>
              )}
            </div>
          )

        case 'FILE':
          if (!accessToken) {
            return (
              <div key={field.name} className="gba:space-y-2" data-testid={`field-container-${field.name}`}>
                <label className="gba:block gba:text-sm gba:font-medium gba:text-foreground">
                  {field.label}
                  {field.required && <span className="gba:text-destructive gba:ml-1">*</span>}
                </label>
                <div className="gba:p-4 gba:bg-muted/20 gba:border gba:border-dashed gba:border-muted gba:rounded-lg gba:text-center">
                  <div className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:text-muted-foreground">
                    <WarningIcon className="gba:h-5 gba:w-5" />
                    <span className="gba:text-sm gba:font-medium">Authentication Required</span>
                  </div>
                  <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                    Access token is required for file uploads
                  </p>
                </div>
              </div>
            )
          }

          return (
            <FileUploadField
              key={field.name}
              name={field.name}
              showLabel={false}
              value={Array.isArray(value) ? value : []}
              onChange={(files: UploadFile[]) => handleFieldChange(field.name, files)}
              onUploadComplete={uploadResults => {
                const serializedResults = serializeUploadResults(uploadResults)

                // Replace the main field value with server-side file references
                // so downstream workflow steps can access files via downloadPath.
                handleFieldChange(field.name, serializedResults)

                // Also keep a separate key for backward compatibility
                handleFieldChange(`${field.name}_uploadResults`, serializedResults)

                if (onFileUploadComplete) {
                  onFileUploadComplete(field.name, uploadResults)
                }
              }}
              required={field.required}
              description={field.description}
              hasError={!!hasError}
              errorMessage={error || undefined}
              maxFiles={field.fileUpload?.maxFiles}
              allowedFileTypes={field.fileUpload?.allowedFileTypes}
              maxFileSize={field.fileUpload?.maxFileSize}
              accessToken={accessToken}
              requestId={requestId}
              disabled={isSubmitting || isReadOnly}
            />
          )

        default:
          return (
            <div key={field.name} className="gba:space-y-2" data-testid={`field-container-${field.name}`}>
              <label htmlFor={field.name} className="gba:block gba:text-sm gba:font-medium gba:text-foreground">
                {field.label}
                {field.required && <span className="gba:text-destructive gba:ml-1">*</span>}
              </label>
              {field.description && <p className="gba:text-xs gba:text-muted-foreground">{field.description}</p>}
              <div className="gba:p-4 gba:bg-muted/20 gba:border gba:border-dashed gba:border-muted gba:rounded-lg gba:text-center">
                <div className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:text-muted-foreground">
                  <WarningIcon className="gba:h-5 gba:w-5" />
                  <span className="gba:text-sm gba:font-medium">TBD</span>
                </div>
                <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                  Field type "{field.type}" - Component under development
                </p>
              </div>
            </div>
          )
      }
    },
    [values, errors, touchedFields, handleFieldChange, getFieldError, shouldShowValidation]
  )

  // Sort fields by order if specified
  const sortedFields = useMemo(() => {
    return [...schema].sort((a, b) => (a.order || 0) - (b.order || 0))
  }, [schema])

  if (!schema || schema.length === 0) {
    const emptyContent = (
      <div className="gba:text-center gba:text-muted-foreground gba:py-8" data-testid="no-fields-message">
        <p>No form fields defined</p>
      </div>
    )

    return showCard ? (
      <Card className="gba:p-6" data-testid="dynamic-form-generator">
        {emptyContent}
      </Card>
    ) : (
      emptyContent
    )
  }

  const formContent = (
    <div className="gba:space-y-6" data-testid="dynamic-form-generator">
      {/* Header */}
      {title && (
        <div className="gba:space-y-2">
          <div className="gba:flex gba:items-center gba:gap-2">
            <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">{title}</h3>
            <Badge variant="outline" className="gba:text-xs">
              Dynamic Form
            </Badge>
          </div>
          {description && <p className="gba:text-sm gba:text-muted-foreground">{description}</p>}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="gba:space-y-4" data-testid="dynamic-form">
        {sortedFields.map(renderField)}

        {/* Submit Button */}
        {showSubmitButton && (
          <div className="gba:pt-4 gba:border-t gba:flex gba:justify-end gba:gap-3">
            <Button
              type="submit"
              disabled={isSubmitting || errors.length > 0}
              className="gba:min-w-[140px]"
              data-testid="form-submit-button"
            >
              {isSubmitting ? (
                <>
                  <Spinner className="gba:w-4 gba:h-4 gba:mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="gba:w-4 gba:h-4 gba:mr-2" />
                  {submitButtonText}
                </>
              )}
            </Button>
          </div>
        )}
      </form>

      {/* Form Stats */}
      {schema.length > 0 && (
        <div className="gba:pt-4 gba:border-t gba:text-xs gba:text-muted-foreground gba:flex gba:justify-between">
          <span>Fields: {schema.length}</span>
          <span>Required: {schema.filter(f => f.required).length}</span>
        </div>
      )}
    </div>
  )

  return showCard ? <Card className="gba:p-6">{formContent}</Card> : formContent
}
