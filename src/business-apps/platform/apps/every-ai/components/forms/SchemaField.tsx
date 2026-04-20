import React, { useMemo, useEffect } from 'react'
import { Input, Label, Button, DateInput } from '@newwork/nw-design-system'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
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
import { FlowProposalFileField, type FlowProposalFileUploadHints } from './FlowProposalFileField'
import { useFlowProposalFileUpload } from '../../context/FlowProposalFileUploadContext'
import { useFlowProposalId } from '../../context/FlowProposalFormContext'

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
  /** Flow module name (e.g. customer-relations, investment-relations). Passed to SearchableUuidField for IRM vs CRM label resolution. */
  moduleName?: string
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
  accessToken,
  moduleName
}) => {
  const fieldPath = path ? `${path}.${name}` : name
  const controlId = sanitizeControlId(fieldPath)
  const label = String(schema?.title ?? formatFieldName(name))

  // Inject styles for react-quill text selection visibility
  useEffect(() => {
    if (schema.contentMediaType !== 'application/vnd.quill+html') return

    const styleId = 'react-quill-selection-styles'
    if (document.getElementById(styleId)) return

    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      .ql-editor::selection,
      .ql-editor *::selection {
        background-color: rgba(59, 130, 246, 0.3) !important;
        color: inherit !important;
      }
      .ql-editor::-moz-selection,
      .ql-editor *::-moz-selection {
        background-color: rgba(59, 130, 246, 0.3) !important;
        color: inherit !important;
      }
    `
    document.head.appendChild(style)

    return () => {
      const existingStyle = document.getElementById(styleId)
      if (existingStyle) {
        existingStyle.remove()
      }
    }
  }, [schema.contentMediaType])

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
  const fileSource = (schema as any)?.['x-fileSource']
  const fileUploadHints = (schema as any)?.['x-fileUpload'] as FlowProposalFileUploadHints | undefined
  const isFlowProposalFileField = fileSource === 'flow_proposal' && !!fileUploadHints
  const flowProposalId = useFlowProposalId()
  const uploadFlowProposalFiles = useFlowProposalFileUpload()

  const renderField = () => {
    if (isFlowProposalFileField) {
      if (!flowProposalId) {
        return (
          <div className="gba:text-xs gba:text-muted-foreground">
            File upload is not available (missing flow proposal id).
          </div>
        )
      }

      return (
        <FlowProposalFileField
          controlId={controlId}
          label={label}
          required={required}
          disabled={disabled}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
          onUpload={uploadFlowProposalFiles}
          flowProposalId={flowProposalId}
          fieldKey={name}
          hints={fileUploadHints}
        />
      )
    }

    switch (fieldType) {
      case 'string': {
        const rawEnumOptions = schema.enum ?? null
        let rawOneOfOptions = schema.oneOf ?? null

        // Optional dependent dropdown: for documentType, filter type options by selected documentGroup.
        // Backend should provide a mapping on the field schema:
        // schema['x-typeOptionsByGroup'] = { [groupValue]: [typeValue1, typeValue2, ...] }
        if (name === 'documentType' && rawOneOfOptions) {
          const selectedGroup = (formData as any)?.documentGroup ?? (formData as any)?.document_group ?? undefined
          const typeOptionsByGroup = (schema as any)['x-typeOptionsByGroup'] as Record<string, string[]> | undefined

          if (typeOptionsByGroup && selectedGroup && Array.isArray(rawOneOfOptions)) {
            const allowed = new Set(typeOptionsByGroup[selectedGroup] || [])
            if (allowed.size > 0) {
              rawOneOfOptions = (rawOneOfOptions as any[]).filter(option => {
                const rawValue = (option as any)?.const ?? (option as any)?.value ?? option
                return allowed.has(rawValue)
              })
            }
          }
        }

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

          // Check if field should be disabled (endAssetConditionRef)
          const isEndField = name === 'endAssetConditionRef'

          return (
            <select
              id={controlId}
              className="gba:w-full gba:rounded-md gba:border gba:border-border gba:bg-card gba:px-3 gba:py-2 gba:text-sm gba:text-foreground focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-primary disabled:gba:cursor-not-allowed disabled:gba:opacity-50"
              value={selectedOptionId}
              onChange={e => {
                const selected = options.find((opt: SelectOption) => opt.id === e.target.value)
                onChange(selected ? selected.rawValue : e.target.value)
              }}
              disabled={disabled || isEndField}
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

        if (schema.format === 'date') {
          // Check if field should be disabled (endDate, endAssetConditionRef)
          const isEndField = name === 'endDate' || name === 'endAssetConditionRef'
          // Strip time component if backend returns a full datetime string
          const dateValue = typeof value === 'string' ? value.split('T')[0] : ''

          return (
            <DateInput
              type="date"
              value={dateValue}
              onChange={(v: string | [string | null, string | null] | null) => {
                const dateValue = typeof v === 'string' ? v : ''
                onChange(dateValue)
              }}
              disabled={disabled || isEndField}
              className="gba:w-full"
            />
          )
        }

        // Quill rich text editor - use ReactQuill for application/vnd.quill+html
        if (schema.contentMediaType === 'application/vnd.quill+html') {
          const quillModules = {
            toolbar: [
              [{ header: [1, 2, 3, false] }],
              ['bold', 'italic', 'underline', 'strike'],
              [{ list: 'ordered' }, { list: 'bullet' }],
              [{ align: [] }],
              ['link', 'image', 'video'],
              ['clean']
            ]
          }

          const quillFormats = [
            'header',
            'bold',
            'italic',
            'underline',
            'strike',
            'list',
            'align',
            'link',
            'image',
            'video'
          ]

          return (
            <div className="gba:rounded-md gba:border gba:border-border gba:overflow-hidden [&_.ql-toolbar]:gba:border-b [&_.ql-toolbar]:gba:border-border [&_.ql-toolbar]:gba:bg-muted/30 [&_.ql-container]:gba:border-0 [&_.ql-editor]:gba:min-h-[150px] [&_.ql-editor]:gba:text-foreground [&_.ql-editor.ql-blank::before]:gba:text-muted-foreground">
              <ReactQuill
                id={controlId}
                theme="snow"
                value={String(typeof value === 'string' ? value : (value ?? ''))}
                onChange={(content: string) => onChange(content)}
                readOnly={disabled}
                modules={quillModules}
                formats={quillFormats}
                placeholder={label}
              />
            </div>
          )
        }

        // Searchable UUID for employees, accounts, contacts, leads, opportunities
        if (isSearchableUuid || schema.format === 'uuid') {
          return (
            <SearchableUuidField
              controlId={controlId}
              label={label}
              fieldName={name}
              fieldSchema={schema}
              accessToken={accessToken}
              disabled={disabled}
              value={typeof value === 'string' ? value : (value ?? '')}
              onChange={val => onChange(val)}
              moduleName={moduleName}
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
      case 'array': {
        const arrayValue = Array.isArray(value) ? value : []
        const itemsSchema = schema.items || { type: 'string' }
        const itemType = extractFieldType(itemsSchema)

        // Handle arrays of strings (most common case like addressLine)
        if (itemType === 'string') {
          return (
            <div className="gba:space-y-2">
              {arrayValue.map((item: any, index: number) => (
                <div key={index} className="gba:flex gba:gap-2">
                  <Input
                    id={`${controlId}-${index}`}
                    type="text"
                    placeholder={`${label} ${index + 1}`}
                    value={String(item ?? '')}
                    onChange={e => {
                      const newArray = [...arrayValue]
                      newArray[index] = e.target.value
                      onChange(newArray)
                    }}
                    disabled={disabled}
                    className="gba:flex-1"
                  />
                  {!disabled && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        const newArray = arrayValue.filter((_: any, i: number) => i !== index)
                        onChange(newArray)
                      }}
                      aria-label={`Remove ${label} ${index + 1}`}
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
              {!disabled && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onChange([...arrayValue, ''])
                  }}
                >
                  + Add {label}
                </Button>
              )}
            </div>
          )
        }

        // Handle arrays of objects (nested structures)
        if (itemType === 'object' && itemsSchema.properties) {
          return (
            <div className="gba:space-y-4">
              {arrayValue.map((item: any, index: number) => (
                <div key={index} className="gba:border gba:border-border gba:rounded-md gba:p-4 gba:space-y-4">
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <p className="gba:text-sm gba:font-medium">
                      {String(label)} {index + 1}
                    </p>
                    {!disabled && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          const newArray = arrayValue.filter((_: any, i: number) => i !== index)
                          onChange(newArray)
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  {Object.entries(itemsSchema.properties).map(([propName, propSchema]: [string, any]) => (
                    <SchemaField
                      key={`${fieldPath}.${index}.${propName}`}
                      name={propName}
                      path={`${fieldPath}.${index}`}
                      schema={propSchema}
                      required={itemsSchema.required?.includes(propName) || false}
                      disabled={disabled}
                      value={item?.[propName]}
                      onChange={newValue => {
                        const newArray = [...arrayValue]
                        newArray[index] = { ...item, [propName]: newValue }
                        onChange(newArray)
                      }}
                      formData={formData}
                      onFieldValueChange={onFieldValueChange}
                      accessToken={accessToken}
                      moduleName={moduleName}
                    />
                  ))}
                </div>
              ))}
              {!disabled && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newItem: any = {}
                    Object.keys(itemsSchema.properties || {}).forEach(key => {
                      newItem[key] = undefined
                    })
                    onChange([...arrayValue, newItem])
                  }}
                >
                  + Add {label}
                </Button>
              )}
            </div>
          )
        }

        // Fallback for other array types
        return (
          <div className="gba:text-sm gba:text-muted-foreground">
            Array type not fully supported: {toDisplayString(itemType)}
          </div>
        )
      }
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
                moduleName={moduleName}
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

  if (isFlowProposalFileField) {
    return <div className="gba:mb-4">{renderField()}</div>
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
