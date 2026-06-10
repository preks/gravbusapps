import React from 'react'
import { DateInput, Label, Textarea, Input } from '@newwork/nw-design-system'
import type { UiHintField } from './utils/uiHintsUtils'
import { SchemaField } from './SchemaField'
import { SearchableUuidField } from './SearchableUuidField'
import { sanitizeControlId, formatDateForInput, parseDateTimeInput } from './utils/formFieldUtils'
import { formatFieldName } from './utils/formSchemaUtils'

interface HintAwareSchemaFieldProps {
  field: UiHintField
  disabled?: boolean
  value: any
  onChange: (value: any) => void
  formData: Record<string, any>
  onFieldValueChange?: (path: string, value: any) => void
  accessToken: string
  moduleName?: string
}

/**
 * Renders a single field using the `widget` declared in x-ui-overrides.
 *
 * Supported widgets:
 *   - `date`            → Same wire format as SchemaField for the field JSON Schema `format`:
 *                          `date-time` uses `datetime-local` + ISO via `parseDateTimeInput`;
 *                          `date` (or missing `format`) uses `DateInput` and persists `YYYY-MM-DD`.
 *   - `textarea`        → multi-line <Textarea>.
 *   - `employeeSearch`  → <SearchableUuidField> with `fieldSchema` so `x-dataSource.entity` matches
 *                          SchemaField behavior; entity type still falls back to field-name heuristics.
 *
 * Unknown / missing `widget` falls back to the regular <SchemaField> with `skipBlacklist`, so the
 * allowlist alone is enough to opt a field in (no widget required).
 */
export const HintAwareSchemaField: React.FC<HintAwareSchemaFieldProps> = ({
  field,
  disabled = false,
  value,
  onChange,
  formData,
  onFieldValueChange,
  accessToken,
  moduleName
}) => {
  const { fieldName, fullPath, schema, required, override } = field
  const widget = override?.widget
  const placeholder = override?.placeholder
  const label = override?.title ?? String(schema?.title ?? formatFieldName(fieldName))
  const controlId = sanitizeControlId(fullPath.replace(/\./g, '-'))

  // No widget → use the regular SchemaField but bypass the legacy technical-field blacklist,
  // because the allowlist already decided this field should be visible.
  if (!widget) {
    return (
      <SchemaField
        name={fieldName}
        path=""
        schema={schema}
        required={required}
        disabled={disabled}
        value={value}
        onChange={onChange}
        formData={formData}
        onFieldValueChange={onFieldValueChange}
        accessToken={accessToken}
        moduleName={moduleName}
        skipBlacklist
      />
    )
  }

  if (widget === 'date') {
    if (schema?.format === 'date-time') {
      return (
        <div className="gba:mb-4">
          <Label htmlFor={controlId} className="gba:mb-1 gba:block">
            {label} {required && <span className="gba:text-destructive">*</span>}
          </Label>
          <Input
            id={controlId}
            type="datetime-local"
            value={formatDateForInput(typeof value === 'string' ? value : undefined)}
            onChange={e => {
              if (disabled) return
              const parsed = parseDateTimeInput(e.target.value)
              onChange(parsed ?? '')
            }}
            disabled={disabled}
          />
        </div>
      )
    }

    // `format: date` or no format: match SchemaField `format === 'date'` (calendar day, YYYY-MM-DD).
    const dateInputValue = typeof value === 'string' ? value.split('T')[0] : ''
    const isEndField = fieldName === 'endDate' || fieldName === 'endAssetConditionRef'

    return (
      <div className="gba:mb-4">
        <Label htmlFor={controlId} className="gba:mb-1 gba:block">
          {label} {required && <span className="gba:text-destructive">*</span>}
        </Label>
        <DateInput
          type="date"
          value={dateInputValue}
          onChange={(v: string | [string | null, string | null] | null) => {
            if (disabled) return
            const next = typeof v === 'string' ? v : ''
            onChange(next)
          }}
          disabled={disabled || isEndField}
          className="gba:w-full"
        />
      </div>
    )
  }

  if (widget === 'textarea') {
    return (
      <div className="gba:mb-4">
        <Label htmlFor={controlId} className="gba:mb-1 gba:block">
          {label} {required && <span className="gba:text-destructive">*</span>}
        </Label>
        <Textarea
          id={controlId}
          rows={3}
          placeholder={placeholder ?? label}
          value={typeof value === 'string' ? value : (value ?? '')}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
          disabled={disabled}
          className="gba:w-full"
        />
      </div>
    )
  }

  if (widget === 'employeeSearch') {
    return (
      <div className="gba:mb-4">
        <Label htmlFor={controlId} className="gba:mb-1 gba:block">
          {label} {required && <span className="gba:text-destructive">*</span>}
        </Label>
        <SearchableUuidField
          controlId={controlId}
          label={label}
          fieldName={fieldName}
          fieldSchema={schema}
          accessToken={accessToken}
          disabled={disabled}
          value={typeof value === 'string' ? value : (value ?? '')}
          onChange={onChange}
          moduleName={moduleName}
        />
      </div>
    )
  }

  // Unknown widget → fall back to the legacy renderer (with the blacklist disabled).
  return (
    <SchemaField
      name={fieldName}
      path=""
      schema={schema}
      required={required}
      disabled={disabled}
      value={value}
      onChange={onChange}
      formData={formData}
      onFieldValueChange={onFieldValueChange}
      accessToken={accessToken}
      moduleName={moduleName}
      skipBlacklist
    />
  )
}
