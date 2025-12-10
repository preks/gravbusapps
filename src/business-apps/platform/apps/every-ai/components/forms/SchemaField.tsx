import React, { useMemo, useEffect } from 'react'
import { Input, Label, Textarea } from '@newwork/nw-design-system'
import {
  sanitizeControlId,
  deepEquals,
  toDisplayString,
  toOptionId,
  formatFieldName,
  formatDateForInput,
  parseDateTimeInput
} from './utils/formFieldUtils'
import {
  evaluateDisplayCondition,
  isSearchableUuidField,
  shouldSkipField,
  extractFieldType
} from './utils/formSchemaUtils'
import { SearchableUuidField } from './SearchableUuidField'

interface SchemaFieldProps {
  name: string
  path: string
  schema: any
  required: boolean
  disabled?: boolean
  value: any
  onChange: (value: any) => void
  formData: Record<string, any>
  onFieldValueChange?: (path: string, value: any) => void
  accessToken: string
}

export const SchemaField: React.FC<SchemaFieldProps> = ({
  name,
  path,
  schema,
  required,
  disabled,
  value,
  onChange,
  formData,
  onFieldValueChange,
  accessToken
}) => {
  const fieldPath = path ? `${path}.${name}` : name
  const controlId = sanitizeControlId(fieldPath)
  const label = formatFieldName(name)

  // Conditional display logic
  const displayCondition = schema?.['x-display']
  const shouldShowField = useMemo(() => {
    if (!displayCondition) return true
    return evaluateDisplayCondition(displayCondition, formData, fieldPath)
  }, [displayCondition, formData, fieldPath])

  // Clear field value when it becomes hidden
  useEffect(() => {
    if (!shouldShowField && fieldPath && onFieldValueChange) {
      const currentValue = value
      if (currentValue !== undefined && currentValue !== null && currentValue !== '') {
        onFieldValueChange(fieldPath, '')
      }
    }
  }, [shouldShowField, fieldPath, value, onFieldValueChange])

  // Don't render if condition is not met
  if (!shouldShowField) {
    return null
  }

  // Check if field is searchable UUID
  const isSearchableUuid = isSearchableUuidField(name, schema)

  // Skip technical fields
  if (shouldSkipField(name, schema, isSearchableUuid)) {
    return null
  }

  const fieldType = extractFieldType(schema)

  const renderField = () => {
    switch (fieldType) {
      case 'string': {
        const rawEnumOptions = schema.enum ?? null
        const rawOneOfOptions = schema.oneOf ?? null

        if (rawEnumOptions || rawOneOfOptions) {
          type SelectOption = { id: string; label: string; rawValue: unknown }
          const options: SelectOption[] = (rawEnumOptions || rawOneOfOptions || []).map(
            (option: unknown, index: number) => {
              const rawValue = rawEnumOptions ? option : ((option as any)?.const ?? (option as any)?.value ?? option)
              const id = String(toOptionId(rawValue ?? index))
              const labelText = String(
                rawEnumOptions ? toDisplayString(option) : ((option as any)?.title ?? toDisplayString(rawValue))
              )
              return {
                id,
                label: labelText,
                rawValue
              }
            }
          )

          const selectedOptionId = String(
            options.find((opt: SelectOption) => deepEquals(opt.rawValue, value))?.id ??
              (value === undefined || value === null ? '' : toOptionId(value))
          )

          return (
            <select
              id={controlId}
              className="gba:w-full gba:rounded-md gba:border gba:border-border gba:bg-card gba:px-3 gba:py-2 gba:text-sm gba:text-foreground focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-primary disabled:gba:cursor-not-allowed disabled:gba:opacity-50"
              value={selectedOptionId}
              onChange={e => {
                const selected = options.find((opt: SelectOption) => opt.id === e.target.value)
                onChange(selected ? selected.rawValue : e.target.value)
              }}
              disabled={disabled}
            >
              <option value="" disabled>
                Select {String(label)}
              </option>
              {options.map((option: SelectOption, idx: number) => (
                <option key={`${controlId}-opt-${idx}`} value={String(option.id)}>
                  {String(option.label)}
                </option>
              ))}
            </select>
          )
        }

        if (schema.format === 'date-time') {
          return (
            <Input
              id={controlId}
              type="datetime-local"
              value={formatDateForInput(typeof value === 'string' ? value : undefined)}
              onChange={e => {
                const parsed = parseDateTimeInput(e.target.value)
                onChange(parsed ?? '')
              }}
              disabled={disabled}
            />
          )
        }

        // Markdown content type - use plain Textarea for markdown input
        if (schema.contentMediaType === 'text/markdown') {
          return (
            <Textarea
              id={controlId}
              placeholder={label}
              value={String(typeof value === 'string' ? value : (value ?? ''))}
              onChange={e => onChange(e.target.value)}
              disabled={disabled}
              className="gba:min-h-[150px]"
            />
          )
        }

        // Searchable UUID for employees, accounts, contacts, leads, opportunities
        if (isSearchableUuid || schema.format === 'uuid') {
          return (
            <SearchableUuidField
              controlId={controlId}
              label={label}
              fieldName={name}
              accessToken={accessToken}
              disabled={disabled}
              value={typeof value === 'string' ? value : (value ?? '')}
              onChange={val => onChange(val)}
            />
          )
        }

        return (
          <Input
            id={controlId}
            type="text"
            placeholder={label}
            value={String(typeof value === 'string' ? value : (value ?? ''))}
            onChange={e => onChange(e.target.value)}
            disabled={disabled}
          />
        )
      }
      case 'number':
        return (
          <Input
            id={controlId}
            type="number"
            value={typeof value === 'number' ? String(value) : String(value ?? '')}
            onChange={e => {
              const inputValue = e.target.value
              onChange(inputValue === '' ? null : Number(inputValue))
            }}
            disabled={disabled}
          />
        )
      case 'boolean':
        return (
          <div className="gba:flex gba:items-center">
            <input
              type="checkbox"
              id={controlId}
              checked={!!value}
              onChange={e => onChange(e.target.checked)}
              disabled={disabled}
              className="gba:h-4 gba:w-4 gba:rounded gba:border-border"
            />
            <Label htmlFor={controlId} className="gba:ml-2">
              {String(label)}
            </Label>
          </div>
        )
      case 'object': {
        if (!schema.properties) {
          return <div className="gba:text-sm gba:text-muted-foreground">No fields available</div>
        }

        return (
          <div className="gba:border gba:border-border gba:rounded-md gba:p-4 gba:space-y-4">
            <p className="gba:text-sm gba:font-medium">{String(label)}</p>
            {Object.entries(schema.properties).map(([propName, propSchema]: [string, any]) => (
              <SchemaField
                key={`${fieldPath}.${propName}`}
                name={propName}
                path={fieldPath}
                schema={propSchema}
                required={schema.required?.includes(propName) || false}
                disabled={disabled}
                value={value?.[propName]}
                onChange={newValue => onChange({ ...value, [propName]: newValue })}
                formData={formData}
                onFieldValueChange={onFieldValueChange}
                accessToken={accessToken}
              />
            ))}
          </div>
        )
      }
      default:
        return (
          <div className="gba:text-sm gba:text-muted-foreground">
            Unsupported field type: {toDisplayString(fieldType)}
          </div>
        )
    }
  }

  if (schema.type === 'boolean') {
    return renderField()
  }

  return (
    <div className="gba:mb-4">
      <Label htmlFor={controlId} className="gba:mb-1 gba:block">
        {String(label)} {required && <span className="gba:text-destructive">*</span>}
      </Label>
      {renderField()}
    </div>
  )
}
