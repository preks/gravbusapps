import React, { useMemo, useEffect, useState, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
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

const SchemaField: React.FC<SchemaFieldProps> = ({ name, path, schema, required, disabled, value, onChange }) => {
  const fieldPath = path ? `${path}.${name}` : name

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

  const renderField = () => {
    switch (schema.type) {
      case 'string':
        if (schema.enum || schema.oneOf) {
          const options = schema.enum
            ? schema.enum.map((option: string) => ({ value: option, label: option }))
            : schema.oneOf?.map((option: any) => ({ value: option.const, label: option.title || option.const })) || []

          return (
            <Select value={value || ''} onValueChange={onChange} disabled={disabled}>
              <SelectTrigger className="gba:w-full">
                <SelectValue placeholder={`Select ${label}`} />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt: any) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        } else if (schema.format === 'date-time') {
          const formatDateForInput = (dateValue: string | undefined) => {
            if (!dateValue) return ''
            try {
              const date = new Date(dateValue)
              if (isNaN(date.getTime())) return ''
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
              type="datetime-local"
              value={formatDateForInput(value)}
              onChange={e => {
                const inputValue = e.target.value
                if (inputValue) {
                  const date = new Date(inputValue)
                  if (!isNaN(date.getTime())) {
                    onChange(date.toISOString())
                  }
                } else {
                  onChange('')
                }
              }}
              disabled={disabled}
            />
          )
        } else {
          return (
            <Input
              type="text"
              placeholder={label}
              value={value || ''}
              onChange={e => onChange(e.target.value)}
              disabled={disabled}
            />
          )
        }
      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={e => onChange(e.target.valueAsNumber)}
            disabled={disabled}
          />
        )
      case 'boolean':
        return (
          <div className="gba:flex gba:items-center">
            <input
              type="checkbox"
              id={fieldPath}
              checked={!!value}
              onChange={e => onChange(e.target.checked)}
              disabled={disabled}
              className="gba:h-4 gba:w-4 gba:rounded gba:border-border"
            />
            <Label htmlFor={fieldPath} className="gba:ml-2">
              {label}
            </Label>
          </div>
        )
      case 'object':
        return (
          <div className="gba:border gba:border-border gba:rounded-md gba:p-4 gba:space-y-4">
            <p className="gba:text-sm gba:font-medium">{label}</p>
            {schema.properties &&
              Object.entries(schema.properties).map(([propName, propSchema]: [string, any]) => (
                <SchemaField
                  key={`${fieldPath}.${propName}`}
                  name={propName}
                  path={fieldPath}
                  schema={propSchema}
                  required={schema.required?.includes(propName)}
                  disabled={disabled}
                  value={value?.[propName]}
                  onChange={newValue => onChange({ ...value, [propName]: newValue })}
                />
              ))}
          </div>
        )
      default:
        return <div>Unsupported field type: {schema.type}</div>
    }
  }

  if (schema.type === 'boolean') {
    return renderField()
  }

  return (
    <div className="gba:mb-4">
      <Label htmlFor={fieldPath} className="gba:mb-1 gba:block">
        {label} {required && <span className="gba:text-destructive">*</span>}
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
  }, [currentFormState])

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
            {fields.map(([fieldName, fieldSchema]) => (
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
            ))}
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
