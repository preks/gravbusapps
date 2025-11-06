import React, { useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Input,
  Textarea,
  Switch,
  Label,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system'
import { ChevronDown, ChevronUp, Calendar, FileText, CheckCircle2, Clock, Send, AlertCircle } from 'lucide-react'
import { message } from 'antd'
import { UnifiedTask } from '../../types'
import { useKogitoProcess } from '../../hooks/useKogitoProcess'
import dayjs from 'dayjs'

interface UniversalKogitoTaskDetailsProps {
  task: UnifiedTask
  taskDetails: any
  accessToken: string
  userInfo: any
  onClose: () => void
  onTaskCompleted: (taskId: string) => void
  onTaskUpdated: () => void
}

interface FieldConfig {
  label: string
  value: any
  type?: 'text' | 'date' | 'boolean' | 'number' | 'object' | 'array'
  formatter?: (value: any) => string
}

export const UniversalKogitoTaskDetails: React.FC<UniversalKogitoTaskDetailsProps> = ({
  task,
  taskDetails,
  accessToken,
  onClose,
  onTaskCompleted,
  onTaskUpdated
}) => {
  const [showParameters, setShowParameters] = useState(true)
  const [showResults, setShowResults] = useState(true)
  const [showRawData, setShowRawData] = useState(false)
  const [showEditableForm, setShowEditableForm] = useState(false)
  const [formValues, setFormValues] = useState<Record<string, any>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isCompleted = task.status === 'COMPLETED'
  const creatorName = task.sourceMetadata?.creatorName || 'Unknown'

  // Use Kogito process hook for task completion
  const { continueProcess } = useKogitoProcess({
    task,
    accessToken,
    onSuccess: () => {
      message.success('Task completed successfully!')
      if (task.id) {
        onTaskCompleted(task.id)
      }
      onTaskUpdated()
      onClose()
    },
    onError: error => {
      message.error(`Failed to complete task: ${error.message || 'Unknown error'}`)
    }
  })

  // Auto-detect field types and format values
  const detectAndFormatValue = (value: any): FieldConfig['type'] => {
    if (value === null || value === undefined) return 'text'
    if (typeof value === 'boolean') return 'boolean'
    if (typeof value === 'number') return 'number'
    if (Array.isArray(value)) return 'array'
    if (typeof value === 'object') return 'object'

    // Check if it's a date string
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      const parsed = dayjs(value)
      if (parsed.isValid()) return 'date'
    }

    return 'text'
  }

  const formatValue = (value: any, type?: FieldConfig['type']): string => {
    if (value === null || value === undefined) return 'N/A'

    const detectedType = type || detectAndFormatValue(value)

    switch (detectedType) {
      case 'boolean':
        return value ? '✓ Yes' : '✗ No'
      case 'date':
        return dayjs(value).format('MMM D, YYYY')
      case 'number':
        return value.toLocaleString()
      case 'array':
        return `Array (${value.length} items)`
      case 'object':
        return 'Object'
      case 'text':
      default:
        return String(value)
    }
  }

  // Convert camelCase/snake_case to Title Case
  const formatFieldName = (fieldName: string): string => {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase())
      .trim()
  }

  // Extract and organize parameters
  const parametersFields = useMemo(() => {
    if (!taskDetails?.parameters) return []

    return Object.entries(taskDetails.parameters)
      .filter(([key]) => !key.startsWith('_'))
      .map(([key, value]) => ({
        key,
        label: formatFieldName(key),
        value,
        type: detectAndFormatValue(value)
      }))
  }, [taskDetails?.parameters])

  // Extract and organize results
  const resultsFields = useMemo(() => {
    if (!taskDetails?.results) return []

    return Object.entries(taskDetails.results)
      .filter(([key]) => !key.startsWith('_'))
      .map(([key, value]) => ({
        key,
        label: formatFieldName(key),
        value,
        type: detectAndFormatValue(value)
      }))
  }, [taskDetails?.results])

  const renderField = (field: { key: string; label: string; value: any; type: FieldConfig['type'] }) => {
    const formattedValue = formatValue(field.value, field.type)

    // Special rendering for complex types
    if (field.type === 'object' && field.value) {
      return (
        <div key={field.key} className="gba:border gba:rounded gba:p-3 gba:bg-muted/20">
          <div className="gba:text-sm gba:font-medium gba:mb-2 gba:text-muted-foreground">{field.label}</div>
          <pre className="gba:text-xs gba:whitespace-pre-wrap gba:font-mono gba:max-h-40 gba:overflow-y-auto">
            {JSON.stringify(field.value, null, 2)}
          </pre>
        </div>
      )
    }

    if (field.type === 'array' && field.value) {
      return (
        <div key={field.key} className="gba:border gba:rounded gba:p-3 gba:bg-muted/20">
          <div className="gba:text-sm gba:font-medium gba:mb-2 gba:text-muted-foreground">{field.label}</div>
          <pre className="gba:text-xs gba:whitespace-pre-wrap gba:font-mono gba:max-h-40 gba:overflow-y-auto">
            {JSON.stringify(field.value, null, 2)}
          </pre>
        </div>
      )
    }

    // Standard field rendering
    return (
      <div key={field.key} className="gba:flex gba:flex-col gba:gap-1">
        <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">{field.label}</div>
        <div className="gba:text-base" data-testid={`field-${field.key}`}>
          {formattedValue}
        </div>
      </div>
    )
  }

  // Render editable form input based on field type
  const renderFormInput = (field: { key: string; label: string; value: any; type: FieldConfig['type'] }) => {
    const currentValue = formValues[field.key] !== undefined ? formValues[field.key] : field.value

    // Skip rendering complex types in editable form
    if (field.type === 'object' || field.type === 'array') {
      return null
    }

    const handleChange = (value: any) => {
      setFormValues(prev => ({ ...prev, [field.key]: value }))
    }

    return (
      <div key={field.key} className="gba:space-y-2">
        <Label htmlFor={`field-${field.key}`}>{field.label}</Label>

        {field.type === 'boolean' ? (
          <div className="gba:flex gba:items-center gba:gap-2">
            <Switch
              id={`field-${field.key}`}
              checked={currentValue === true}
              onCheckedChange={handleChange}
              data-testid={`form-field-${field.key}`}
            />
            <span className="gba:text-sm gba:text-muted-foreground">{currentValue ? 'Yes' : 'No'}</span>
          </div>
        ) : field.type === 'date' ? (
          <Input
            id={`field-${field.key}`}
            type="date"
            value={currentValue ? dayjs(currentValue).format('YYYY-MM-DD') : ''}
            onChange={e => handleChange(e.target.value)}
            data-testid={`form-field-${field.key}`}
          />
        ) : field.type === 'number' ? (
          <Input
            id={`field-${field.key}`}
            type="number"
            value={currentValue || ''}
            onChange={e => handleChange(parseFloat(e.target.value))}
            data-testid={`form-field-${field.key}`}
          />
        ) : // Text type - use textarea for longer content
        String(currentValue || '').length > 50 ? (
          <Textarea
            id={`field-${field.key}`}
            value={currentValue || ''}
            onChange={e => handleChange(e.target.value)}
            rows={3}
            data-testid={`form-field-${field.key}`}
          />
        ) : (
          <Input
            id={`field-${field.key}`}
            type="text"
            value={currentValue || ''}
            onChange={e => handleChange(e.target.value)}
            data-testid={`form-field-${field.key}`}
          />
        )}
      </div>
    )
  }

  // Extract editable parameters (simple types only)
  const editableFields = useMemo(() => {
    return parametersFields.filter(field => field.type !== 'object' && field.type !== 'array')
  }, [parametersFields])

  // Handle task completion
  const handleCompleteTask = async () => {
    if (!task.name) {
      message.error('Cannot complete task: task name is missing')
      return
    }

    setIsSubmitting(true)
    try {
      // Extract domain and processName from task metadata
      const domain = task.sourceMetadata?.endpoint?.split('/')[1] || 'unknown'
      const processName = task.type || task.name

      // Prepare submission payload - merge original parameters with form values
      const submissionData = {
        ...taskDetails?.parameters,
        ...formValues
      }

      await continueProcess({
        domain,
        processName,
        payload: submissionData
      })
    } catch (error) {
      console.error('Error completing task:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="gba:space-y-6" data-testid="universal-task-details">
      {/* Task Header */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-start gba:justify-between">
            <div>
              <CardTitle className="gba:flex gba:items-center gba:gap-2">
                <FileText className="gba:h-5 gba:w-5" />
                {task.referenceTaskName || task.name}
              </CardTitle>
              <div className="gba:text-sm gba:text-muted-foreground gba:mt-1">Created by {creatorName}</div>
            </div>
            <Badge variant={isCompleted ? 'success' : 'info'}>
              {isCompleted ? (
                <>
                  <CheckCircle2 className="gba:h-3 gba:w-3 gba:mr-1" /> Completed
                </>
              ) : (
                <>
                  <Clock className="gba:h-3 gba:w-3 gba:mr-1" /> In Progress
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
              <Calendar className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
              <span className="gba:text-muted-foreground">Created:</span>
              <span>{dayjs(task.createdAt).format('MMM D, YYYY HH:mm')}</span>
            </div>
            {isCompleted && task.completedAt && (
              <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
                <CheckCircle2 className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                <span className="gba:text-muted-foreground">Completed:</span>
                <span>{dayjs(task.completedAt).format('MMM D, YYYY HH:mm')}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Parameters Section (Input Data) */}
      {parametersFields.length > 0 && (
        <Card>
          <CardHeader>
            <button
              onClick={() => setShowParameters(!showParameters)}
              className="gba:w-full gba:flex gba:items-center gba:justify-between gba:cursor-pointer"
              data-testid="parameters-toggle"
            >
              <div className="gba:flex gba:items-center gba:gap-2">
                <CardTitle className="gba:text-lg">Input Parameters</CardTitle>
                <Badge variant="secondary">{parametersFields.length} fields</Badge>
              </div>
              {showParameters ? <ChevronUp className="gba:h-5 gba:w-5" /> : <ChevronDown className="gba:h-5 gba:w-5" />}
            </button>
          </CardHeader>
          {showParameters && (
            <CardContent>
              <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
                {parametersFields.map(renderField)}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Editable Form Section (only for active tasks with editable fields) */}
      {!isCompleted && editableFields.length > 0 && (
        <Card>
          <CardHeader>
            <button
              onClick={() => setShowEditableForm(!showEditableForm)}
              className="gba:w-full gba:flex gba:items-center gba:justify-between gba:cursor-pointer"
              data-testid="editable-form-toggle"
            >
              <div className="gba:flex gba:items-center gba:gap-2">
                <CardTitle className="gba:text-lg">Edit Task Data</CardTitle>
                <Badge variant="info">{editableFields.length} fields</Badge>
              </div>
              {showEditableForm ? (
                <ChevronUp className="gba:h-5 gba:w-5" />
              ) : (
                <ChevronDown className="gba:h-5 gba:w-5" />
              )}
            </button>
          </CardHeader>
          {showEditableForm && (
            <CardContent>
              <Alert className="gba:mb-4">
                <AlertCircle className="gba:h-4 gba:w-4" />
                <AlertDescription>
                  You can modify the task data below before completing the task. Complex objects and arrays are
                  read-only.
                </AlertDescription>
              </Alert>
              <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
                {editableFields.map(renderFormInput)}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Results Section (Output Data - only for completed tasks) */}
      {isCompleted && resultsFields.length > 0 && (
        <Card>
          <CardHeader>
            <button
              onClick={() => setShowResults(!showResults)}
              className="gba:w-full gba:flex gba:items-center gba:justify-between gba:cursor-pointer"
              data-testid="results-toggle"
            >
              <div className="gba:flex gba:items-center gba:gap-2">
                <CardTitle className="gba:text-lg">Results</CardTitle>
                <Badge variant="success">{resultsFields.length} fields</Badge>
              </div>
              {showResults ? <ChevronUp className="gba:h-5 gba:w-5" /> : <ChevronDown className="gba:h-5 gba:w-5" />}
            </button>
          </CardHeader>
          {showResults && (
            <CardContent>
              <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
                {resultsFields.map(renderField)}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Raw Data Section (for debugging) */}
      <Card>
        <CardHeader>
          <button
            onClick={() => setShowRawData(!showRawData)}
            className="gba:w-full gba:flex gba:items-center gba:justify-between gba:cursor-pointer"
            data-testid="raw-data-toggle"
          >
            <CardTitle className="gba:text-lg gba:text-muted-foreground">Raw Task Data</CardTitle>
            {showRawData ? <ChevronUp className="gba:h-5 gba:w-5" /> : <ChevronDown className="gba:h-5 gba:w-5" />}
          </button>
        </CardHeader>
        {showRawData && (
          <CardContent>
            <pre className="gba:text-xs gba:whitespace-pre-wrap gba:font-mono gba:max-h-96 gba:overflow-y-auto gba:bg-muted/20 gba:p-4 gba:rounded">
              {JSON.stringify({ task, taskDetails }, null, 2)}
            </pre>
          </CardContent>
        )}
      </Card>

      {/* Action Buttons */}
      <div className="gba:flex gba:justify-end gba:gap-2">
        <Button variant="outline" onClick={onClose} data-testid="close-button">
          Close
        </Button>

        {/* Complete Task button - only for active tasks */}
        {!isCompleted && editableFields.length > 0 && (
          <Button
            onClick={handleCompleteTask}
            disabled={isSubmitting}
            data-testid="complete-task-button"
            className="gba:flex gba:items-center gba:gap-2"
          >
            {isSubmitting ? (
              <>
                <Clock className="gba:h-4 gba:w-4 gba:animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="gba:h-4 gba:w-4" />
                Complete Task
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
