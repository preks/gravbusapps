import React, { useCallback, useMemo, useState } from 'react'
import { Alert, Button, Card, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { DynamicFormField, FlowTemplate, WorkflowEngine } from '../../../types'

export interface WarrantyServiceRequestFormProps extends BusinessAppContextProps {
  flowTemplate: FlowTemplate
  workflowEngine: WorkflowEngine
  templateId: string
  onSuccess: (flowId: string) => void
}

type FormValues = Record<string, string>

const isEmpty = (value: unknown): boolean => value === undefined || value === null || String(value).trim() === ''

const getInitialValues = (fields: DynamicFormField[] | undefined): FormValues => {
  const initial: FormValues = {}
  ;(fields || []).forEach(field => {
    if (typeof field.name === 'string' && field.name.length > 0) {
      initial[field.name] = ''
    }
  })
  return initial
}

export const WarrantyServiceRequestForm: React.FC<WarrantyServiceRequestFormProps> = ({
  flowTemplate,
  workflowEngine,
  templateId,
  onSuccess,
  ...contextProps
}) => {
  const fields = flowTemplate.formSchema || []

  const [values, setValues] = useState<FormValues>(() => getInitialValues(fields))
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const requiredFieldNames = useMemo(() => {
    return fields.filter(f => f.required).map(f => f.name).filter(Boolean)
  }, [fields])

  const completion = useMemo(() => {
    if (requiredFieldNames.length === 0) return { isComplete: true, missing: [] as string[] }
    const missing = requiredFieldNames.filter(name => isEmpty(values[name]))
    return { isComplete: missing.length === 0, missing }
  }, [requiredFieldNames, values])

  const handleChange = useCallback((fieldName: string, nextValue: string) => {
    setValues(prev => ({ ...prev, [fieldName]: nextValue }))
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)

      if (!contextProps.accessToken) {
        setError('Access token missing. Please sign in again.')
        return
      }
      if (!contextProps.userInfo?.id) {
        setError('User information missing. Please sign in again.')
        return
      }
      if (!completion.isComplete) {
        setError('Please fill out all required fields before submitting.')
        return
      }

      const engineWithExecute = workflowEngine as WorkflowEngine & {
        executeTemplate?: (id: string, data: any) => Promise<string>
      }

      if (typeof engineWithExecute.executeTemplate !== 'function') {
        setError('Workflow engine does not support template execution.')
        return
      }

      try {
        setIsSubmitting(true)

        // Include runtime assignment for step_0 (ASSIGN mode with targets null in this template).
        // This ensures the engine can start the workflow and complete the first user task.
        const payload = {
          ...values,
          stepAssignments: { step_0: contextProps.userInfo.id },
          step_0_assignmentMode: 'ASSIGN',
          step_0_allowReassignment: true
        }

        const flowId = await engineWithExecute.executeTemplate(templateId, payload)
        onSuccess(flowId)
      } catch (err) {
        console.error('[WarrantyServiceRequestForm] Submit failed', err)
        setError('Failed to submit warranty request.')
      } finally {
        setIsSubmitting(false)
      }
    },
    [completion.isComplete, contextProps.accessToken, contextProps.userInfo?.id, onSuccess, templateId, values, workflowEngine]
  )

  return (
    <Card className="gba:p-6" data-testid="warranty-service-form-card">
      <form onSubmit={handleSubmit} className="gba:space-y-6" data-testid="warranty-service-form">
        {error && (
          <Alert variant="destructive" className="gba:mb-2" data-testid="warranty-service-form-error">
            {error}
          </Alert>
        )}

        <div className="gba:space-y-4">
          {fields.map(field => {
            const fieldType = (field.type || 'TEXT').toUpperCase()
            const fieldName = field.name
            const fieldLabel = field.label || fieldName

            if (!fieldName) return null

            return (
              <div key={fieldName} className="gba:space-y-2">
                <label htmlFor={fieldName} className="gba:block gba:text-sm gba:font-medium">
                  {fieldLabel}
                  {field.required && <span className="gba:text-destructive gba:ml-1">*</span>}
                </label>

                {fieldType === 'SELECT' ? (
                  <Select value={values[fieldName] || ''} onValueChange={val => handleChange(fieldName, val)}>
                    <SelectTrigger data-testid={`warranty-service-field-${fieldName}`}>
                      <SelectValue placeholder={`Select ${fieldLabel}...`} />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options || []).map(opt => (
                        <SelectItem key={String(opt.value)} value={String(opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={fieldName}
                    value={values[fieldName] || ''}
                    onChange={e => handleChange(fieldName, e.target.value)}
                    required={field.required}
                    data-testid={`warranty-service-field-${fieldName}`}
                  />
                )}
              </div>
            )
          })}
        </div>

        <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
          <div className="gba:text-xs gba:text-muted-foreground" data-testid="warranty-service-form-progress">
            {requiredFieldNames.length > 0
              ? `${requiredFieldNames.length - completion.missing.length} of ${requiredFieldNames.length} required fields completed`
              : 'No required fields'}
          </div>
          <Button
            type="submit"
            disabled={isSubmitting || !completion.isComplete}
            data-testid="warranty-service-submit"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

