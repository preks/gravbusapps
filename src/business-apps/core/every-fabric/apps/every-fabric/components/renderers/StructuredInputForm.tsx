import { useState, useCallback } from 'react'
import {
  Button,
  Input,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@newwork/nw-design-system'
import { CheckCircle, MagicWand, Sparkle, Warning } from '@phosphor-icons/react'
import type { InputFieldSchema } from '../../types/enterpriseAgent'

interface StructuredInputFormProps {
  formId: string
  title: string
  description: string
  fields: InputFieldSchema[]
  allowPartialSubmit: boolean
  onSubmit: (values: Record<string, any>, aiDelegated: string[]) => void
  onCancel?: () => void
}

interface FieldState {
  value: any
  touched: boolean
  aiDelegated: boolean
  error?: string
}

export const StructuredInputForm = ({
  formId,
  title,
  description,
  fields,
  allowPartialSubmit,
  onSubmit,
  onCancel
}: StructuredInputFormProps) => {
  // Debug logging
  console.log('[StructuredInputForm] Rendering form:', { formId, title, fieldCount: fields.length })

  // Initialize field state
  const [fieldStates, setFieldStates] = useState<Record<string, FieldState>>(() => {
    const initial: Record<string, FieldState> = {}
    for (const field of fields) {
      const defaultVal = field.default_value ?? (field.field_type === 'multiselect' ? [] : '')
      initial[field.field_id] = {
        value: defaultVal,
        touched: false,
        aiDelegated: false
      }
    }
    return initial
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateField = useCallback((fieldId: string, value: any) => {
    setFieldStates(prev => ({
      ...prev,
      [fieldId]: {
        ...prev[fieldId],
        value,
        touched: true,
        aiDelegated: false,
        error: undefined
      }
    }))
  }, [])

  const toggleAiDelegation = useCallback((fieldId: string) => {
    setFieldStates(prev => ({
      ...prev,
      [fieldId]: {
        ...prev[fieldId],
        aiDelegated: !prev[fieldId].aiDelegated
      }
    }))
  }, [])

  const validate = useCallback(() => {
    console.log('[validate] Starting validation, allowPartialSubmit:', allowPartialSubmit)
    const errors: Record<string, string> = {}
    let isValid = true

    for (const field of fields) {
      const state = fieldStates[field.field_id]
      console.log(`[validate] Checking field ${field.field_id}:`, {
        required: field.required,
        hasValue: !!state.value,
        aiDelegated: state.aiDelegated,
        willSkip: state.aiDelegated && allowPartialSubmit
      })

      // Skip validation if AI will fill it
      if (state.aiDelegated && allowPartialSubmit) {
        console.log(`[validate] Skipping ${field.field_id} - AI will generate`)
        continue
      }

      // Required field check
      if (field.required && !state.value) {
        console.log(`[validate] FAILED: ${field.field_id} is required but empty`)
        errors[field.field_id] = 'This field is required'
        isValid = false
        continue
      }

      // Pattern validation for text fields
      if (
        field.validation_pattern &&
        field.field_type === 'text' &&
        state.value &&
        !new RegExp(field.validation_pattern).test(state.value)
      ) {
        console.log(`[validate] FAILED: ${field.field_id} pattern validation`)
        errors[field.field_id] = 'Invalid format'
        isValid = false
      }
    }

    console.log('[validate] Result:', { isValid, errors })

    // Update error states
    setFieldStates(prev => {
      const updated = { ...prev }
      for (const [fieldId, error] of Object.entries(errors)) {
        updated[fieldId] = { ...updated[fieldId], error }
      }
      return updated
    })

    return isValid
  }, [fields, fieldStates, allowPartialSubmit])

  const handleSubmit = useCallback(() => {
    console.log('[StructuredInputForm] handleSubmit called')
    if (!validate()) {
      console.log('[StructuredInputForm] Validation failed')
      return
    }

    console.log('[StructuredInputForm] Validation passed, building submission')
    setIsSubmitting(true)

    const values: Record<string, any> = {}
    const aiDelegated: string[] = []

    for (const field of fields) {
      const state = fieldStates[field.field_id]
      if (state.aiDelegated && allowPartialSubmit) {
        aiDelegated.push(field.field_id)
      } else {
        values[field.field_id] = state.value
      }
    }

    console.log('[StructuredInputForm] Calling onSubmit with:', { values, aiDelegated })
    onSubmit(values, aiDelegated)
  }, [fields, fieldStates, allowPartialSubmit, validate, onSubmit])

  const renderField = (field: InputFieldSchema) => {
    const state = fieldStates[field.field_id]

    // Defensive check - if field state doesn't exist, skip rendering
    if (!state) {
      console.warn(`Missing field state for ${field.field_id}`)
      return null
    }

    return (
      <div key={field.field_id} className="gba:space-y-2">
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
          <div className="gba:flex-1">
            <label className="gba:block gba:text-sm gba:font-semibold gba:text-foreground gba:mb-1">
              {field.label}
              {field.required && <span className="gba:text-destructive gba:ml-1">*</span>}
            </label>
            {field.description && <p className="gba:text-xs gba:text-muted-foreground gba:mb-2">{field.description}</p>}
          </div>
          {field.ai_generated && (
            <Button
              variant={state.aiDelegated ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleAiDelegation(field.field_id)}
              className="gba:h-8 gba:px-3 gba:gap-1.5"
              disabled={isSubmitting}
            >
              {state.aiDelegated ? (
                <>
                  <CheckCircle className="gba:h-3.5 gba:w-3.5" weight="fill" />
                  <span className="gba:text-xs">AI will generate</span>
                </>
              ) : (
                <>
                  <Sparkle className="gba:h-3.5 gba:w-3.5" />
                  <span className="gba:text-xs">Let AI generate</span>
                </>
              )}
            </Button>
          )}
        </div>

        {!state.aiDelegated && (
          <>
            {field.field_type === 'text' && (
              <Input
                value={state.value || ''}
                onChange={e => updateField(field.field_id, e.target.value)}
                placeholder={field.placeholder}
                disabled={isSubmitting}
                className={state.error ? 'gba:border-destructive' : ''}
              />
            )}

            {field.field_type === 'textarea' && (
              <Textarea
                value={state.value || ''}
                onChange={e => updateField(field.field_id, e.target.value)}
                placeholder={field.placeholder}
                rows={4}
                disabled={isSubmitting}
                className={`gba:resize-none ${state.error ? 'gba:border-destructive' : ''}`}
              />
            )}

            {field.field_type === 'number' && (
              <Input
                type="number"
                value={state.value || ''}
                onChange={e => updateField(field.field_id, parseFloat(e.target.value))}
                placeholder={field.placeholder}
                disabled={isSubmitting}
                className={state.error ? 'gba:border-destructive' : ''}
              />
            )}

            {field.field_type === 'select' && (
              <Select
                value={state.value || ''}
                onValueChange={v => updateField(field.field_id, v)}
                disabled={isSubmitting}
              >
                <SelectTrigger className={state.error ? 'gba:border-destructive' : ''}>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map(opt => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {field.field_type === 'multiselect' && (
              <div className="gba:space-y-2">
                {field.options?.map(opt => {
                  const selected = Array.isArray(state.value) && state.value.includes(opt)
                  return (
                    <label
                      key={opt}
                      className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer gba:px-3 gba:py-2 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:hover:bg-muted/50 gba:transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={e => {
                          const current = Array.isArray(state.value) ? state.value : []
                          const updated = e.target.checked ? [...current, opt] : current.filter(v => v !== opt)
                          updateField(field.field_id, updated)
                        }}
                        disabled={isSubmitting}
                        className="gba:h-4 gba:w-4"
                      />
                      <span className="gba:text-sm gba:text-foreground">{opt}</span>
                    </label>
                  )
                })}
              </div>
            )}

            {state.error && (
              <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-destructive gba:mt-1">
                <Warning className="gba:h-3.5 gba:w-3.5" weight="fill" />
                <span>{state.error}</span>
              </div>
            )}
          </>
        )}

        {state.aiDelegated && (
          <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2.5 gba:rounded-lg gba:bg-primary/10 gba:border gba:border-primary/20">
            <MagicWand className="gba:h-4 gba:w-4 gba:text-primary" weight="fill" />
            <span className="gba:text-xs gba:text-foreground/90">AI will generate this field</span>
          </div>
        )}
      </div>
    )
  }

  const hasAiDelegatedFields = Object.values(fieldStates).some(s => s.aiDelegated)

  return (
    <div
      className="gba:rounded-2xl gba:border gba:border-border/80 gba:bg-card/98 gba:backdrop-blur-xl gba:shadow-lg gba:max-w-3xl"
      data-testid={`structured-input-form-${formId}`}
    >
      {/* Header */}
      <div className="gba:px-5 gba:pt-5 gba:pb-4 gba:border-b gba:border-border/60">
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
          <Sparkle className="gba:h-5 gba:w-5 gba:text-primary" weight="fill" />
          <h3 className="gba:text-base gba:font-bold gba:text-foreground">{title}</h3>
        </div>
        <p className="gba:text-sm gba:text-muted-foreground gba:leading-relaxed">{description}</p>
      </div>

      {/* Form fields */}
      <div className="gba:px-5 gba:py-4 gba:space-y-5 gba:max-h-[60vh] gba:overflow-y-auto">
        {fields.map(renderField)}
      </div>

      {/* Footer with actions */}
      <div className="gba:px-5 gba:py-4 gba:border-t gba:border-border/60 gba:flex gba:items-center gba:justify-between gba:gap-3">
        <div className="gba:flex-1">
          {hasAiDelegatedFields && allowPartialSubmit && (
            <p className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1.5">
              <Sparkle className="gba:h-3.5 gba:w-3.5 gba:text-primary" weight="fill" />
              <span>AI will generate {Object.values(fieldStates).filter(s => s.aiDelegated).length} field(s)</span>
            </p>
          )}
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={isSubmitting} className="gba:gap-2">
            {hasAiDelegatedFields && allowPartialSubmit ? (
              <>
                <MagicWand className="gba:h-4 gba:w-4" weight="fill" />
                <span>Continue with AI</span>
              </>
            ) : (
              <span>Submit</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
