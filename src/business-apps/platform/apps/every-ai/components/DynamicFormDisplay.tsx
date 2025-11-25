import React, { useMemo, useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label } from '@newwork/nw-design-system'
import type { FlowProposalOutput } from '../types/models'
import { useFormSubmission } from './FormSubmissionContext'

interface DynamicFormDisplayProps {
  data: FlowProposalOutput
  onCancel?: () => void
  sendMessage?: (message: string, files: File[]) => void
}

interface SchemaFieldProps {
  name: string
  path: string
  schema: any
  required: boolean
  disabled?: boolean
  value: any
  onChange: (value: any) => void
}

const sanitizeControlId = (value: string): string => value.replace(/[^a-zA-Z0-9-_:.]/g, '-').toLowerCase()

const deepEquals = (a: unknown, b: unknown): boolean => {
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch (error) {
    console.error('[EveryAI][DynamicFormDisplay] Failed deep comparison', error)
    return a === b
  }
}

const toDisplayString = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value == null) return ''
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const toOptionId = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return toDisplayString(value)
}

const SchemaField: React.FC<SchemaFieldProps> = ({ name, path, schema, required, disabled, value, onChange }) => {
  const fieldPath = path ? `${path}.${name}` : name
  const controlId = sanitizeControlId(fieldPath)

  // Format field label
  const formatFieldName = (name: string): string => {
    if (!name) return ''
    let processedName = name
    if (processedName.endsWith('Ref')) {
      processedName = processedName.slice(0, -3)
    }
    return processedName
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
  }

  const label = formatFieldName(name)

  // Skip technical fields
  if (
    [
      'id',
      'code',
      'version',
      'businessKey',
      'additionalProperties',
      'changeMode',
      'activeTo',
      'recordState',
      'approverId',
      'substituteEmployee',
      'employeeDocument',
      'workingHours',
      'workingDays',
      'calendarDays',
      'effectiveDays',
      'balance'
    ].includes(name) ||
    schema.format === 'uuid' ||
    schema.type === 'array' ||
    name.toLowerCase().includes('id') ||
    name.toLowerCase().includes('absencetype')
  ) {
    return null
  }

  const rawFieldType = schema?.type
  const fieldType = Array.isArray(rawFieldType)
    ? (rawFieldType.find(type => typeof type === 'string' && type !== 'null') ?? rawFieldType[0])
    : (rawFieldType ?? (schema?.oneOf || schema?.enum ? 'string' : schema?.properties ? 'object' : undefined))

  const renderField = () => {
    switch (fieldType) {
      case 'string': {
        const rawEnumOptions = schema.enum ?? null
        const rawOneOfOptions = schema.oneOf ?? null

        if (rawEnumOptions || rawOneOfOptions) {
          const options = (rawEnumOptions || rawOneOfOptions || []).map((option: any, index: number) => {
            const rawValue = rawEnumOptions ? option : (option?.const ?? option?.value ?? option)
            const id = String(toOptionId(rawValue ?? index))
            const labelText = String(
              rawEnumOptions ? toDisplayString(option) : (option?.title ?? toDisplayString(rawValue))
            )
            return {
              id,
              label: labelText,
              rawValue
            }
          })

          const selectedOptionId = String(
            options.find(opt => deepEquals(opt.rawValue, value))?.id ??
              (value === undefined || value === null ? '' : toOptionId(value))
          )

          return (
            <select
              id={controlId}
              className="gba:w-full gba:rounded-md gba:border gba:border-border gba:bg-card gba:px-3 gba:py-2 gba:text-sm gba:text-foreground focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-primary disabled:gba:cursor-not-allowed disabled:gba:opacity-50"
              value={selectedOptionId}
              onChange={e => {
                const selected = options.find(opt => opt.id === e.target.value)
                onChange(selected ? selected.rawValue : e.target.value)
              }}
              disabled={disabled}
            >
              <option value="" disabled>
                Select {String(label)}
              </option>
              {options.map((option, idx) => (
                <option key={`${controlId}-opt-${idx}`} value={String(option.id)}>
                  {String(option.label)}
                </option>
              ))}
            </select>
          )
        }

        if (schema.format === 'date-time') {
          const formatDateForInput = (dateValue: string | undefined) => {
            if (!dateValue) return ''
            try {
              const date = new Date(dateValue)
              if (Number.isNaN(date.getTime())) return ''
              const year = date.getFullYear()
              const month = String(date.getMonth() + 1).padStart(2, '0')
              const day = String(date.getDate()).padStart(2, '0')
              const hours = String(date.getHours()).padStart(2, '0')
              const minutes = String(date.getMinutes()).padStart(2, '0')
              return `${year}-${month}-${day}T${hours}:${minutes}`
            } catch {
              return ''
            }
          }

          return (
            <Input
              id={controlId}
              type="datetime-local"
              value={formatDateForInput(typeof value === 'string' ? value : undefined)}
              onChange={e => {
                const inputValue = e.target.value
                if (inputValue) {
                  const date = new Date(inputValue)
                  if (!Number.isNaN(date.getTime())) {
                    onChange(date.toISOString())
                  }
                } else {
                  onChange('')
                }
              }}
              disabled={disabled}
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

export const DynamicFormDisplay: React.FC<DynamicFormDisplayProps> = ({ data, onCancel, sendMessage }) => {
  const { getFormState, setFormState, clearFormState } = useFormSubmission()

  const formKey = useMemo(() => `form-${data.uuid || data.flow_name || 'default'}`, [data.uuid, data.flow_name])

  const currentFormState = getFormState(formKey)
  const [uiState, setUiState] = useState(currentFormState)
  const [formData, setFormData] = useState<Record<string, any>>({})

  useEffect(() => {
    setUiState(currentFormState)
  }, [JSON.stringify(currentFormState)])

  // Extract initial form values
  const { initialValues, objectKey, sourceType } = useMemo(() => {
    const flowData = data.arguments?.flow || {}
    const taskData = data.arguments?.task || {}

    const taskObjectKey = Object.keys(taskData).find(
      key =>
        typeof taskData[key] === 'object' &&
        !Array.isArray(taskData[key]) &&
        !['changeMode', 'id', 'version', 'businessKey'].includes(key)
    )

    if (taskObjectKey && taskData[taskObjectKey]) {
      return {
        initialValues: { ...taskData[taskObjectKey] },
        objectKey: taskObjectKey,
        sourceType: 'task'
      }
    }

    const flowObjectKey = Object.keys(flowData).find(
      key =>
        typeof flowData[key] === 'object' &&
        !Array.isArray(flowData[key]) &&
        !['changeMode', 'id', 'version', 'businessKey'].includes(key)
    )

    if (flowObjectKey && flowData[flowObjectKey]) {
      return {
        initialValues: { ...flowData[flowObjectKey] },
        objectKey: flowObjectKey,
        sourceType: 'flow'
      }
    }

    const restFlowData = { ...flowData }
    delete restFlowData.changeMode
    return {
      initialValues: restFlowData,
      objectKey: null,
      sourceType: 'flow'
    }
  }, [data.arguments?.flow, data.arguments?.task])

  useEffect(() => {
    if (Object.keys(initialValues).length > 0) {
      setFormData(initialValues)
    }
  }, [initialValues])

  const schema = useMemo(() => {
    if (!data.flow_schema || !data.flow_schema.properties) {
      return { type: 'object', properties: {} }
    }

    const schemaProps = data.flow_schema.properties

    if (objectKey && sourceType === 'task' && schemaProps.task?.properties?.[objectKey]?.properties) {
      return {
        type: 'object',
        properties: schemaProps.task.properties[objectKey].properties,
        required: schemaProps.task.properties[objectKey].required
      }
    }

    if (objectKey && sourceType === 'flow' && schemaProps[objectKey]?.properties) {
      return {
        type: 'object',
        properties: schemaProps[objectKey].properties,
        required: schemaProps[objectKey].required
      }
    }

    const restProps = { ...schemaProps }
    delete restProps.changeMode
    return {
      type: 'object',
      properties: restProps
    }
  }, [data.flow_schema, objectKey, sourceType])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      if (currentFormState.isSubmitted || currentFormState.isLoading) {
        return
      }

      setFormState(formKey, { isSubmitted: false, isCancelled: false, isLoading: true })
      setUiState({ isSubmitted: false, isCancelled: false, isLoading: true })

      try {
        const updatedArguments = { ...data.arguments }
        if (objectKey && sourceType === 'task' && updatedArguments.task?.[objectKey]) {
          updatedArguments.task = {
            ...updatedArguments.task,
            [objectKey]: formData
          }
        } else if (objectKey && sourceType === 'flow' && updatedArguments.flow?.[objectKey]) {
          updatedArguments.flow = {
            ...updatedArguments.flow,
            [objectKey]: formData
          }
        } else {
          updatedArguments.flow = {
            ...formData,
            ...(updatedArguments.flow?.changeMode ? { changeMode: updatedArguments.flow.changeMode } : {})
          }
        }

        if (sendMessage) {
          const formDataMessage = JSON.stringify(
            {
              action: 'form_submission',
              flow_name: data.flow_name || '',
              module_name: data.module_name || '',
              uuid: data.uuid || '',
              data: {
                flow: updatedArguments?.flow || {},
                ...(updatedArguments?.task ? { task: updatedArguments.task } : {})
              }
            },
            null,
            2
          )

          sendMessage(formDataMessage, [])

          setFormState(formKey, { isSubmitted: true, isCancelled: false, isLoading: false })
          setUiState({ isSubmitted: true, isCancelled: false, isLoading: false })
        }
      } catch {
        setFormState(formKey, { isSubmitted: false, isCancelled: false, isLoading: false })
        setUiState({ isSubmitted: false, isCancelled: false, isLoading: false })
      }
    },
    [formData, data, formKey, currentFormState, setFormState, sendMessage, objectKey, sourceType]
  )

  const handleCancel = useCallback(() => {
    if (currentFormState.isCancelled || currentFormState.isLoading) {
      return
    }

    setFormState(formKey, { isSubmitted: false, isCancelled: true, isLoading: false })
    setUiState({ isSubmitted: false, isCancelled: true, isLoading: false })

    if (sendMessage) {
      sendMessage('Cancel', [])
    }

    if (onCancel) onCancel()
  }, [currentFormState, formKey, setFormState, sendMessage, onCancel])

  useEffect(() => {
    return () => {
      if (currentFormState.isSubmitted || currentFormState.isCancelled) {
        setTimeout(() => {
          clearFormState(formKey)
        }, 5000)
      }
    }
  }, [formKey, currentFormState.isSubmitted, currentFormState.isCancelled, clearFormState])

  const formatFlowName = (name: string): string => {
    if (!name) return ''
    return name
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
  }

  const fields = useMemo(() => {
    if (!schema || !schema.properties) return []
    return Object.entries(schema.properties)
  }, [schema])

  useEffect(() => {
    console.debug('[EveryAI][DynamicFormDisplay] schema', schema)

    console.debug('[EveryAI][DynamicFormDisplay] fields', fields)

    console.debug('[EveryAI][DynamicFormDisplay] formData', formData)
  }, [schema, fields, formData])

  const isSubmitted = currentFormState.isSubmitted || uiState.isSubmitted
  const isCancelled = currentFormState.isCancelled || uiState.isCancelled
  const isLoading = currentFormState.isLoading || uiState.isLoading
  const isCompleted = isSubmitted || isCancelled

  return (
    <Card
      className="gba:w-full gba:max-w-md gba:border-2 gba:shadow-xl gba:overflow-hidden"
      data-testid="dynamic-form-display"
    >
      <CardHeader className="gba:bg-gradient-to-r gba:from-muted/50 gba:to-muted/30 gba:border-b-2">
        <div className="gba:flex gba:items-center gba:gap-2">
          <svg className="gba:h-5 gba:w-5 gba:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <CardTitle className="gba:bg-gradient-to-r gba:from-primary gba:to-info gba:bg-clip-text gba:text-transparent">
            {formatFlowName(data.flow_name || '')}
          </CardTitle>
        </div>
        <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{data.module_name || ''}</p>
      </CardHeader>
      <CardContent className="gba:p-6">
        <form onSubmit={handleSubmit} className={isCompleted ? 'gba:opacity-60 gba:pointer-events-none' : ''}>
          <div className="gba:space-y-4">
            {fields.map(([fieldName, fieldSchema]) => {
              if (fieldSchema == null || typeof fieldSchema !== 'object') {
                console.warn('[EveryAI][DynamicFormDisplay] skipping non-object schema field', fieldName, fieldSchema)
                return null
              }

              try {
                return (
                  <SchemaField
                    key={fieldName}
                    name={fieldName}
                    path=""
                    schema={fieldSchema}
                    required={schema.required?.includes(fieldName) || false}
                    disabled={isCompleted}
                    value={formData[fieldName]}
                    onChange={value => setFormData(prev => ({ ...prev, [fieldName]: value }))}
                  />
                )
              } catch (error) {
                console.error('[EveryAI][DynamicFormDisplay] failed to render field', fieldName, error)
                return (
                  <div key={`field-error-${fieldName}`} className="gba:text-sm gba:text-destructive">
                    Unable to render field "{fieldName}". Please contact support.
                  </div>
                )
              }
            })}
          </div>

          {isSubmitted && (
            <div className="gba:mt-4 gba:p-4 gba:bg-gradient-to-r gba:from-success-secondary gba:to-success-secondary/50 gba:border-2 gba:border-success/30 gba:rounded-xl gba:shadow-lg">
              <div className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:h-10 gba:w-10 gba:rounded-full gba:bg-success/20 gba:flex gba:items-center gba:justify-center">
                  <svg
                    className="gba:h-5 gba:w-5 gba:text-success"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="gba:text-success gba:font-semibold">Form submitted successfully!</p>
              </div>
            </div>
          )}

          {isCancelled && (
            <div className="gba:mt-4 gba:p-4 gba:bg-gradient-to-r gba:from-destructive-secondary gba:to-destructive-secondary/50 gba:border-2 gba:border-destructive/30 gba:rounded-xl gba:shadow-lg">
              <div className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:h-10 gba:w-10 gba:rounded-full gba:bg-destructive/20 gba:flex gba:items-center gba:justify-center">
                  <svg
                    className="gba:h-5 gba:w-5 gba:text-destructive"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="gba:text-destructive gba:font-semibold">Form cancelled</p>
              </div>
            </div>
          )}

          {!isCompleted && (
            <div className="gba:flex gba:justify-end gba:gap-3 gba:mt-6 gba:pt-4 gba:border-t-2 gba:border-border">
              <Button
                type="submit"
                className="gba:bg-gradient-to-r gba:from-success gba:to-success/80 hover:gba:shadow-lg gba:transition-all"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="gba:flex gba:items-center gba:gap-2">
                    <div className="gba:h-4 gba:w-4 gba:border-2 gba:border-success-foreground gba:border-t-transparent gba:rounded-full gba:animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  'Submit'
                )}
              </Button>
              {onCancel && (
                <Button
                  type="button"
                  variant="destructive"
                  className="hover:gba:shadow-lg gba:transition-all"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              )}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

export default DynamicFormDisplay
