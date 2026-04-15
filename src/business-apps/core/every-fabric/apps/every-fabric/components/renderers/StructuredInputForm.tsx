import { useState, useCallback, type FC } from 'react'
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
import { CheckCircleIcon, MagicWandIcon, SparkleIcon, WarningIcon } from '@phosphor-icons/react'
import type { InputFieldSchema } from '../../types/enterpriseAgent'
import { EmployeeSearchField } from '../forms/EmployeeSearchField'

interface StructuredInputFormProps {
  formId: string
  title: string
  description: string
  fields: InputFieldSchema[]
  allowPartialSubmit: boolean
  onSubmit: (values: Record<string, any>, aiDelegated: string[]) => void
  onCancel?: () => void
  accessToken?: string
}

interface FieldState {
  value: any
  touched: boolean
  aiDelegated: boolean
  error?: string
}

interface MultiselectOptionProps {
  opt: string
  fieldId: string
  stateValue: unknown
  isSubmitting: boolean
  updateField: (fieldId: string, value: any) => void
}

const MultiselectOptionRow: FC<MultiselectOptionProps> = ({ opt, fieldId, stateValue, isSubmitting, updateField }) => {
  const selected = Array.isArray(stateValue) && stateValue.includes(opt)
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const current = Array.isArray(stateValue) ? stateValue : []
    const updated = e.target.checked ? [...current, opt] : current.filter(v => v !== opt)
    updateField(fieldId, updated)
  }
  return (
    <label className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer gba:px-3 gba:py-2 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:hover:bg-muted/50 gba:transition-colors">
      <input
        type="checkbox"
        checked={selected}
        onChange={onChange}
        disabled={isSubmitting}
        className="gba:h-4 gba:w-4"
      />
      <span className="gba:text-sm gba:text-foreground">{opt}</span>
    </label>
  )
}

export const StructuredInputForm = ({
  formId,
  title,
  description,
  fields,
  allowPartialSubmit,
  onSubmit,
  onCancel,
  accessToken
}: StructuredInputFormProps) => {
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
    const errors: Record<string, string> = {}
    let isValid = true

    for (const field of fields) {
      const state = fieldStates[field.field_id]

      // Skip validation if AI will fill it
      if (state.aiDelegated && allowPartialSubmit) {
        continue
      }

      // Required field check
      if (field.required && !state.value) {
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
        errors[field.field_id] = 'Invalid format'
        isValid = false
      }
    }

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
    if (!validate()) {
      return
    }

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
                  <CheckCircleIcon className="gba:h-3.5 gba:w-3.5" weight="fill" />
                  <span className="gba:text-xs">AI will generate</span>
                </>
              ) : (
                <>
                  <SparkleIcon className="gba:h-3.5 gba:w-3.5" />
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
                onChange={e => updateField(field.field_id, Number.parseFloat(e.target.value))}
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
                {field.options?.map(opt => (
                  <MultiselectOptionRow
                    key={opt}
                    opt={opt}
                    fieldId={field.field_id}
                    stateValue={state.value}
                    isSubmitting={isSubmitting}
                    updateField={updateField}
                  />
                ))}
              </div>
            )}

            {field.field_type === 'employee_search' && (
              <EmployeeSearchField
                value={state.value || ''}
                onChange={userId => {
                  updateField(field.field_id, userId)
                }}
                placeholder={field.placeholder}
                required={field.required}
                accessToken={accessToken}
              />
            )}

            {state.error && (
              <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-destructive gba:mt-1">
                <WarningIcon className="gba:h-3.5 gba:w-3.5" weight="fill" />
                <span>{state.error}</span>
              </div>
            )}
          </>
        )}

        {state.aiDelegated && (
          <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2.5 gba:rounded-lg gba:bg-primary/10 gba:border gba:border-primary/20">
            <MagicWandIcon className="gba:h-4 gba:w-4 gba:text-primary" weight="fill" />
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
      <div className="gba:px-5 gba:pt-3 gba:pb-3 gba:border-b gba:border-border/60">
        <h3 className="gba:text-base gba:font-bold gba:text-foreground gba:mb-1">{title}</h3>
        <p className="gba:text-sm gba:text-muted-foreground gba:leading-relaxed">{description}</p>
      </div>

      {/* Form fields */}
      <div className="gba:px-5 gba:py-4 gba:space-y-5 gba:max-h-[70vh] gba:overflow-y-auto">
        {fields.map(renderField)}
      </div>

      {/* Footer with actions */}
      <div className="gba:px-5 gba:py-3 gba:border-t gba:border-border/60 gba:flex gba:items-center gba:justify-between gba:gap-3">
        <div className="gba:flex-1">
          {hasAiDelegatedFields && allowPartialSubmit && (
            <p className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1.5">
              <SparkleIcon className="gba:h-3.5 gba:w-3.5 gba:text-primary" weight="fill" />
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
                <MagicWandIcon className="gba:h-4 gba:w-4" weight="fill" />
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
