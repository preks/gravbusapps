import { useState, useCallback, useEffect, type FC } from 'react'
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
import {
  CaretDownIcon,
  CaretRightIcon,
  CheckCircleIcon,
  CheckIcon,
  MagicWandIcon,
  SparkleIcon,
  WarningIcon
} from '@phosphor-icons/react'
import type { InputFieldSchema, PreviewBlock } from '../../types/enterpriseAgent'
import { EmployeeSearchField } from '../forms/EmployeeSearchField'
import { PreviewBlockRenderer } from './PreviewBlockRenderer'

interface StructuredInputFormProps {
  formId: string
  title: string
  description: string
  fields: InputFieldSchema[]
  allowPartialSubmit: boolean
  onSubmit: (values: Record<string, any>, aiDelegated: string[]) => void
  onCancel?: () => void
  accessToken?: string
  toolRef?: string
  requestStatus?: 'pending' | 'approved' | 'rejected' | 'edited' | 'expired' | 'cancelled' | 'resumed'
  /**
   * True when the transcript already contains events that happened after
   * this form was surfaced — i.e. the user submitted it in a prior turn
   * and we are re-rendering a completed session. The form should render
   * as a compact collapsed summary, with the ability to expand for review.
   */
  alreadySubmitted?: boolean
  /**
   * Optional structured preamble (plan / timeline / checklist / summary /
   * markdown) rendered ABOVE the form fields. Generic across use cases —
   * driven by the backend `ask_human_structured(preview=...)` argument.
   */
  preview?: PreviewBlock
}

interface FieldState {
  value: any
  touched: boolean
  aiDelegated: boolean
  error?: string
}

/**
 * Coerce the polymorphic options shape coming from the backend
 * (string | {label, value}) into a stable {label, value} pair so the
 * dropdown renders consistently. Plain strings are duplicated into both
 * fields. Falsy items are dropped.
 */
const pickOptionField = (obj: { label?: unknown; value?: unknown }, preferred: 'label' | 'value'): string => {
  const primary = obj[preferred]
  if (typeof primary === 'string' && primary) return primary
  const fallback = preferred === 'label' ? obj.value : obj.label
  if (typeof fallback === 'string') return fallback
  return ''
}

const toOption = (raw: unknown): { label: string; value: string } | null => {
  if (typeof raw === 'string') {
    return raw ? { label: raw, value: raw } : null
  }
  if (!raw || typeof raw !== 'object') return null
  const o = raw as { label?: unknown; value?: unknown }
  const label = pickOptionField(o, 'label')
  const value = pickOptionField(o, 'value')
  if (!label || !value) return null
  return { label, value }
}

interface MultiselectOptionProps {
  opt: { label: string; value: string }
  fieldId: string
  stateValue: unknown
  isSubmitting: boolean
  updateField: (fieldId: string, value: any) => void
}

const MultiselectOptionRow: FC<MultiselectOptionProps> = ({ opt, fieldId, stateValue, isSubmitting, updateField }) => {
  const selected = Array.isArray(stateValue) && stateValue.includes(opt.value)
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const current = Array.isArray(stateValue) ? stateValue : []
    const updated = e.target.checked ? [...current, opt.value] : current.filter(v => v !== opt.value)
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
      <span className="gba:text-sm gba:text-foreground">{opt.label}</span>
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
  accessToken,
  toolRef,
  requestStatus,
  alreadySubmitted = false,
  preview
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
  const [hasSubmittedLocally, setHasSubmittedLocally] = useState(false)
  /** Form is locked (read-only, compact) once submitted locally or when the transcript shows a later event. */
  const isLocked = hasSubmittedLocally || alreadySubmitted
  const [compactCollapsed, setCompactCollapsed] = useState(() => alreadySubmitted)

  useEffect(() => {
    if (hasSubmittedLocally) setCompactCollapsed(true)
  }, [hasSubmittedLocally])

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
    setHasSubmittedLocally(true)

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

  const readOnly = isSubmitting || isLocked

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
              disabled={readOnly}
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
                disabled={readOnly}
                className={state.error ? 'gba:border-destructive' : ''}
              />
            )}

            {field.field_type === 'textarea' && (
              <Textarea
                value={state.value || ''}
                onChange={e => updateField(field.field_id, e.target.value)}
                placeholder={field.placeholder}
                rows={4}
                disabled={readOnly}
                className={`gba:resize-none ${state.error ? 'gba:border-destructive' : ''}`}
              />
            )}

            {field.field_type === 'number' && (
              <Input
                type="number"
                value={state.value || ''}
                onChange={e => updateField(field.field_id, Number.parseFloat(e.target.value))}
                placeholder={field.placeholder}
                disabled={readOnly}
                className={state.error ? 'gba:border-destructive' : ''}
              />
            )}

            {field.field_type === 'select' && (
              <Select value={state.value || ''} onValueChange={v => updateField(field.field_id, v)} disabled={readOnly}>
                <SelectTrigger className={state.error ? 'gba:border-destructive' : ''}>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {field.options
                    ?.map(toOption)
                    .filter((o): o is { label: string; value: string } => o !== null)
                    .map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}

            {field.field_type === 'multiselect' && (
              <div className="gba:space-y-2">
                {field.options
                  ?.map(toOption)
                  .filter((o): o is { label: string; value: string } => o !== null)
                  .map(opt => (
                    <MultiselectOptionRow
                      key={opt.value}
                      opt={opt}
                      fieldId={field.field_id}
                      stateValue={state.value}
                      isSubmitting={readOnly}
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
                readOnly={readOnly}
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

  const showCompactBar = isLocked && compactCollapsed
  const showDetailBody = !isLocked || !compactCollapsed

  const summaryLine = buildSummaryLine(fields, fieldStates)

  const shellClass = isLocked
    ? 'gba:rounded-2xl gba:border gba:border-border/50 gba:bg-muted/25 gba:max-w-3xl gba:shadow-none'
    : 'gba:rounded-2xl gba:border gba:border-border/80 gba:bg-card/98 gba:backdrop-blur-xl gba:shadow-lg gba:max-w-3xl'

  if (showCompactBar) {
    return (
      <div className={shellClass} data-testid={`structured-input-form-${formId}`}>
        <button
          type="button"
          onClick={() => setCompactCollapsed(false)}
          className="gba:w-full gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-2.5 gba:text-left gba:hover:bg-muted/35 gba:transition-colors gba:rounded-2xl"
          data-testid={`structured-input-form-${formId}-compact`}
          aria-expanded={false}
        >
          <CheckCircleIcon className="gba:h-4 gba:w-4 gba:shrink-0 gba:text-muted-foreground" weight="fill" />
          <div className="gba:flex-1 gba:min-w-0">
            <div className="gba:text-[13px] gba:font-semibold gba:text-muted-foreground gba:truncate">{title}</div>
            {summaryLine && <div className="gba:text-[11px] gba:text-muted-foreground gba:truncate">{summaryLine}</div>}
          </div>
          {requestStatus && requestStatus !== 'pending' && (
            <span className="gba:text-[11px] gba:font-medium gba:px-2 gba:py-0.5 gba:rounded-full gba:bg-muted gba:text-muted-foreground">
              {requestStatus}
            </span>
          )}
          <CheckIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:shrink-0" weight="bold" />
          <CaretRightIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:shrink-0" />
        </button>
      </div>
    )
  }

  return (
    <div className={shellClass} data-testid={`structured-input-form-${formId}`}>
      {/* Header */}
      <div className="gba:px-5 gba:pt-3 gba:pb-3 gba:border-b gba:border-border/60 gba:flex gba:items-start gba:gap-3">
        <div className="gba:flex-1 gba:min-w-0">
          <h3
            className={`gba:text-base gba:font-bold gba:mb-1 ${
              isLocked ? 'gba:text-muted-foreground' : 'gba:text-foreground'
            }`}
          >
            {title}
          </h3>
          <p className="gba:text-sm gba:text-muted-foreground gba:leading-relaxed">{description}</p>
          <div className="gba:mt-2 gba:flex gba:flex-wrap gba:gap-2">
            {toolRef && (
              <span className="gba:inline-flex gba:items-center gba:rounded-full gba:border gba:border-border gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium gba:text-muted-foreground">
                {toolRef}
              </span>
            )}
            {requestStatus && requestStatus !== 'pending' && (
              <span className="gba:inline-flex gba:items-center gba:rounded-full gba:bg-muted gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium gba:text-muted-foreground">
                {requestStatus}
              </span>
            )}
          </div>
        </div>
        {isLocked && (
          <button
            type="button"
            onClick={() => setCompactCollapsed(true)}
            className="gba:shrink-0 gba:inline-flex gba:items-center gba:justify-center gba:h-7 gba:w-7 gba:rounded-full gba:text-muted-foreground gba:hover:bg-muted/40 gba:transition-colors"
            aria-label="Collapse submitted form"
            data-testid={`structured-input-form-${formId}-collapse`}
          >
            <CaretDownIcon className="gba:h-4 gba:w-4" />
          </button>
        )}
      </div>

      {showDetailBody && (
        <>
          {/* Optional structured preamble (plan / timeline / summary). */}
          {preview && (
            <div className="gba:px-5 gba:pt-4">
              <PreviewBlockRenderer preview={preview} />
            </div>
          )}

          {/* Form fields */}
          <div className="gba:px-5 gba:py-4 gba:space-y-5 gba:max-h-[70vh] gba:overflow-y-auto">
            {fields.map(renderField)}
          </div>

          {/* Footer with actions (hidden once locked; locked forms are read-only review) */}
          {!isLocked && (
            <div className="gba:px-5 gba:py-3 gba:border-t gba:border-border/60 gba:flex gba:items-center gba:justify-between gba:gap-3">
              <div className="gba:flex-1">
                {hasAiDelegatedFields && allowPartialSubmit && (
                  <p className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1.5">
                    <SparkleIcon className="gba:h-3.5 gba:w-3.5 gba:text-primary" weight="fill" />
                    <span>
                      AI will generate {Object.values(fieldStates).filter(s => s.aiDelegated).length} field(s)
                    </span>
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
          )}
        </>
      )}
    </div>
  )
}

/**
 * Builds a short one-line summary of the submitted form for the collapsed
 * header — picks the first non-empty field value. Employee IDs are opaque
 * so we just show the field label as a fallback breadcrumb.
 */
function buildSummaryLine(fields: InputFieldSchema[], fieldStates: Record<string, FieldState>): string | null {
  for (const field of fields) {
    const state = fieldStates[field.field_id]
    if (!state) continue
    if (state.aiDelegated) {
      return `${field.label}: AI-generated`
    }
    const value = state.value
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      if (value.length === 0) continue
      return `${field.label}: ${value.slice(0, 2).join(', ')}${value.length > 2 ? ` +${value.length - 2}` : ''}`
    }
    const str = String(value).trim()
    if (!str) continue
    // Employee IDs / opaque ids: show the label only, actual name is still
    // rendered inside the (expandable) detail view.
    if (field.field_type === 'employee_search') {
      return field.label
    }
    const truncated = str.length > 64 ? `${str.slice(0, 61)}…` : str
    return `${field.label}: ${truncated}`
  }
  return null
}
