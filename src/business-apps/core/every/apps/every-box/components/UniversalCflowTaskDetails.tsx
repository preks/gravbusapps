import React, { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Label,
  Switch,
  Textarea,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system'
import { Clock, MessageSquare, Info, ExternalLink, Link as LinkIcon, FileText, Download } from 'lucide-react'
import { message } from 'antd'
import { UnifiedTask } from '../types'
import { env } from '@/common/env/EnvUtils'
import { TaskDetailHeader } from './TaskDetailHeader'
import { TaskDetailFooter } from './TaskDetailFooter'
import { useEmployeeAvatar } from '../hooks/useEmployeeAvatar'
import { InputRenderer } from '@/business-apps/flow/apps/creator/components/shared/InputRenderer'
import { navigateTo } from '@/common/utils/navigationUtils'

/**
 * Converts a picture thumbnail to a data URL format
 */
const formatAvatarUrl = (pictureThumbnail: string | undefined): string | undefined => {
  if (!pictureThumbnail) return undefined
  if (pictureThumbnail.startsWith('data:')) return pictureThumbnail
  return `data:image/jpeg;base64,${pictureThumbnail}`
}

/**
 * Gets the display value for a form field during loading or with data
 */
const getFieldDisplayValue = (isLoadingData: boolean, fieldValue: any, inputValue: any, defaultValue: any): any => {
  if (isLoadingData) return ''
  if (fieldValue !== undefined) return fieldValue
  if (inputValue !== undefined) return inputValue
  return defaultValue || ''
}

interface UniversalCflowTaskDetailsProps {
  task: UnifiedTask
  accessToken: string
  userId?: string
  onClose: () => void
  onTaskCompleted?: (taskId: string) => void
  onTaskUpdated: () => void
  flowStepData?: any // Additional data from flow-engine API /flows/{flowId}/steps/{stepNo}/data
  isLoadingFlowData?: boolean
}

export const UniversalCflowTaskDetails: React.FC<UniversalCflowTaskDetailsProps> = ({
  task,
  accessToken,
  userId,
  onClose,
  onTaskCompleted,
  onTaskUpdated,
  flowStepData,
  isLoadingFlowData = false
}) => {
  const [formValues, setFormValues] = useState<Record<string, any>>({})
  const [isCompleting, setIsCompleting] = useState(false)
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')
  const [formInitialized, setFormInitialized] = useState(false)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)

  // Derive isCompleted FIRST before using it
  const isCompleted = task.status === 'COMPLETED'

  // Reset state when task changes - clear everything immediately to prevent stale data
  React.useEffect(() => {
    if (task.id !== currentTaskId) {
      // Reset all form-related state when switching to a new task
      setFormValues({})
      setFormInitialized(false)
      setShowComment(false)
      setComment('')
      setCurrentTaskId(task.id)
    }
  }, [task.id, currentTaskId])

  // Check if form fields have values directly (cFlow sends values in form definition)
  const formHasDirectValues = React.useMemo(() => {
    if (!task.form || !Array.isArray(task.form)) return false
    return task.form.some((field: any) => field.value !== undefined)
  }, [task.form])

  // Initialize formValues from task.inputs, field.value, or flowStepData (for completed tasks)
  React.useEffect(() => {
    // Only initialize if we have the correct task and haven't initialized yet
    if (task.id !== currentTaskId) {
      return // Wait for the reset effect to run first
    }

    // For completed tasks that need flowStepData (no direct values in form):
    // Wait until flowStepData is actually loaded (not null and not loading)
    // This prevents initializing with empty/stale data
    if (isCompleted && !formHasDirectValues) {
      if (isLoadingFlowData || flowStepData === null) {
        return // Wait for flowStepData to load
      }
    }

    if (!formInitialized && task.form && Array.isArray(task.form)) {
      const initialValues: Record<string, any> = {}

      task.form.forEach((field: any) => {
        const fieldName = field.name || field.id

        // Priority 1: Use flowStepData if available (for completed tasks)
        // Only use flowStepData for completed tasks to avoid mixing data
        if (isCompleted && flowStepData?.[fieldName] !== undefined) {
          initialValues[fieldName] = flowStepData[fieldName]
        }
        // Priority 2: Use task.inputs if available
        else if (task.inputs?.[fieldName] !== undefined) {
          initialValues[fieldName] = task.inputs[fieldName]
        }
        // Priority 3: Use field.value if available (for read-only fields or pre-filled values from cFlow)
        else if (field.value !== undefined) {
          initialValues[fieldName] = field.value
        }
        // Priority 4: Use field default value
        else if (field.defaultValue !== undefined) {
          initialValues[fieldName] = field.defaultValue
        }
      })

      setFormValues(initialValues)
      setFormInitialized(true)
    }
  }, [
    task.id,
    task.form,
    task.inputs,
    flowStepData,
    isCompleted,
    currentTaskId,
    formInitialized,
    isLoadingFlowData,
    formHasDirectValues
  ])

  const isBlinkTask = task.source === 'cflow' && task.tags?.app === 'quick-task'
  const taskTitle = task.title || task.name || task.referenceTaskName || 'Untitled Task'

  // Fetch employee data for creator if userId is available
  const creatorUserId = task.sourceMetadata?.creatorUserId
  const { employeeData: creatorEmployeeData, isLoading: isLoadingCreator } = useEmployeeAvatar(
    accessToken,
    creatorUserId
  )

  // Use employee data for creator name if available, otherwise fallback to sourceMetadata
  const creatorName = React.useMemo(() => {
    if (creatorEmployeeData?.displayName) return creatorEmployeeData.displayName
    if (creatorEmployeeData?.firstName && creatorEmployeeData?.lastName) {
      return `${creatorEmployeeData.firstName} ${creatorEmployeeData.lastName}`
    }
    return task.sourceMetadata?.creatorName || task.sourceMetadata?.flowInitiatedByName || 'Unknown'
  }, [creatorEmployeeData, task.sourceMetadata])

  // Unified handler for all task actions
  const handleTaskAction = async (action: string, data?: any) => {
    if (!task.id || !userId) {
      message.error('Cannot perform action: missing task ID or user ID')
      return
    }

    const flowEngineApi = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine'

    setIsCompleting(true)
    try {
      switch (action) {
        case 'claim':
          // Claim task
          message.info('Claim functionality coming soon')
          break

        case 'complete': {
          // Process form values: convert NUMBER types to numbers, handle empty strings
          const processedFormData: Record<string, any> = {}
          if (task.form && Array.isArray(task.form)) {
            task.form.forEach((field: any) => {
              const fieldName = field.name || field.id
              const value = formValues[fieldName]

              // Include all non-empty values (including empty strings for required fields that might be intentionally empty)
              // Only skip undefined and null
              if (value !== undefined && value !== null) {
                // Convert NUMBER type fields to numbers
                if (field.type === 'NUMBER' || field.type === 'number') {
                  // Handle empty string for number fields
                  if (value === '' || value === null) {
                    // Skip empty number fields unless required
                    if (field.required) {
                      processedFormData[fieldName] = null
                    }
                  } else {
                    const numValue = typeof value === 'string' ? Number.parseFloat(value) : Number(value)
                    if (!Number.isNaN(numValue)) {
                      processedFormData[fieldName] = numValue
                    } else if (field.required) {
                      // If required and invalid, include as null
                      processedFormData[fieldName] = null
                    }
                  }
                } else if (field.type === 'FILE' || field.type === 'file') {
                  // FILE fields might be File objects or strings (base64/data URLs)
                  // Include as-is - backend will handle processing
                  processedFormData[fieldName] = value
                } else {
                  // For other types (TEXT, TEXTAREA, etc.), include the value
                  processedFormData[fieldName] = value
                }
              } else if (field.required && field.defaultValue !== undefined) {
                // Include default value for required fields if no value provided
                processedFormData[fieldName] = field.defaultValue
              }
            })
          } else {
            // Fallback: use formValues as-is
            Object.assign(processedFormData, formValues)
          }

          const completeRequestBody = {
            userId: userId,
            formData: processedFormData,
            ...(showComment && comment?.trim() ? { comment: comment.trim() } : {})
          }

          const completeResponse = await fetch(`${flowEngineApi}/api/tasks/${task.id}/complete`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify(completeRequestBody)
          })

          if (!completeResponse.ok) {
            const errorData = await completeResponse.json().catch(() => ({ error: 'Unknown error' }))
            throw new Error(errorData.error || 'Failed to complete task')
          }

          message.success({
            content: '✓ Task completed successfully!',
            duration: 3
          })

          if (onTaskCompleted && task.id) {
            onTaskCompleted(task.id)
          }

          onTaskUpdated()
          onClose()
          break
        }

        case 'reject': {
          // Reject task (approval tasks only)
          const rejectRequestBody = {
            userId: userId,
            rejectionComment: comment || data?.comment || '',
            comment: comment || data?.comment || ''
          }

          const rejectResponse = await fetch(`${flowEngineApi}/api/tasks/${task.id}/reject`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify(rejectRequestBody)
          })

          if (!rejectResponse.ok) {
            const errorData = await rejectResponse.json().catch(() => ({ error: 'Unknown error' }))
            throw new Error(errorData.error || 'Failed to reject task')
          }

          message.success({
            content: '✓ Task rejected successfully!',
            duration: 3
          })

          if (onTaskCompleted && task.id) {
            onTaskCompleted(task.id)
          }

          onTaskUpdated()
          onClose()
          break
        }

        case 'reassign':
          // Reassign task
          message.info('Reassign functionality coming soon')
          break

        case 'unclaim':
          // Unclaim task
          message.info('Unclaim functionality coming soon')
          break

        default:
          message.warning(`Unknown action: ${action}`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${action} task`
      message.error({
        content: errorMessage,
        duration: 5
      })
    } finally {
      setIsCompleting(false)
    }
  }

  // Extract links from task (direct property for all tasks)
  const allLinks = (task.links as Array<{ name: string; url: string; type?: string; metadata?: any }>) || []

  // Separate entity reference link from document links
  const entityLink = allLinks.find(link => link.type?.startsWith('entity:'))
  const documentLinks = allLinks.filter(link => link.type?.startsWith('document:'))

  // Extract entity reference data from the entity link
  const entityType = entityLink?.metadata?.entityType || entityLink?.type?.split(':')[1]
  const entityId = entityLink?.metadata?.entityId
  const entityName = entityLink?.name
  const entityDisplayUrl = entityLink?.url

  // For Blink tasks, use the simple view from every-box
  if (isBlinkTask) {
    return (
      <div className="gba:flex gba:flex-col gba:h-full gba:px-6" data-testid="universal-cflow-task-details">
        {/* Task Header */}
        <TaskDetailHeader
          title={taskTitle}
          creatorName={creatorName}
          showEmployeeInfo={!!creatorUserId}
          employeeData={
            creatorEmployeeData
              ? {
                  displayName: creatorEmployeeData.displayName,
                  firstName: creatorEmployeeData.firstName,
                  lastName: creatorEmployeeData.lastName,
                  avatarUrl: formatAvatarUrl(creatorEmployeeData.pictureThumbnail),
                  position: creatorEmployeeData.position
                }
              : undefined
          }
          isLoadingEmployee={isLoadingCreator}
          onClose={onClose}
        />

        {/* Scrollable Content - Simple Blink Task View */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-6 gba:min-h-0">
          {/* Entity Reference (if linked to an entity) */}
          {entityType && entityId && entityName && (
            <div className="gba:border gba:rounded-lg gba:p-4 gba:bg-muted/30">
              <div className="gba:text-xs gba:text-muted-foreground gba:mb-2 gba:font-medium">Related To</div>
              <a
                href={entityDisplayUrl || '#'}
                onClick={e => {
                  e.preventDefault()
                  if (entityDisplayUrl) {
                    navigateTo(entityDisplayUrl)
                  }
                }}
                className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer gba:p-2 gba:-mx-2 gba:rounded-md hover:gba:bg-accent gba:transition-colors gba:no-underline"
                data-testid="task-entity-reference-link"
              >
                <LinkIcon className="gba:h-4 gba:w-4 gba:text-primary" />
                <Badge variant="outline" className="gba:text-xs">
                  {entityType}
                </Badge>
                <span className="gba:font-medium gba:text-sm gba:text-primary hover:gba:underline">{entityName}</span>
                <ExternalLink className="gba:h-3 gba:w-3 gba:text-muted-foreground gba:ml-auto" />
              </a>
            </div>
          )}

          {/* Document Attachments (if any) */}
          {documentLinks.length > 0 && (
            <div className="gba:border gba:rounded-lg gba:p-4 gba:bg-muted/30">
              <div className="gba:text-xs gba:text-muted-foreground gba:mb-3 gba:font-medium">
                Attachments ({documentLinks.length})
              </div>
              <div className="gba:space-y-2">
                {documentLinks.map(link => (
                  <a
                    key={link.url || link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gba:flex gba:items-center gba:gap-3 gba:p-2 gba:-mx-2 gba:rounded-md hover:gba:bg-accent gba:transition-colors gba:no-underline gba:group"
                    data-testid={`task-document-link-${link.name}`}
                  >
                    <FileText className="gba:h-4 gba:w-4 gba:text-blue-500 gba:shrink-0" />
                    <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate gba:flex-1 group-hover:gba:underline">
                      {link.name}
                    </span>
                    <Download className="gba:h-3 gba:w-3 gba:text-muted-foreground gba:shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Brief description if available */}
          {(task.message || task.description) && (
            <p className="gba:text-base gba:leading-relaxed gba:text-muted-foreground">
              {task.message || task.description}
            </p>
          )}

          {/* Info Alert for Blink tasks - only show when not completed */}
          {!isCompleted && (
            <Alert>
              <Info className="gba:h-4 gba:w-4" />
              <AlertDescription className="gba:text-sm">
                This is a quick Blink task. You can complete it directly from here.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Footer with Complete button for active Blink tasks */}
        <TaskDetailFooter task={task} onTaskAction={handleTaskAction} isLoading={isCompleting} />
      </div>
    )
  }

  // For non-Blink cFlow tasks, use the full form view
  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:px-6" data-testid="universal-cflow-task-details">
      {/* Task Header - Using shared TaskDetailHeader component */}
      <TaskDetailHeader
        title={taskTitle}
        creatorName={creatorName}
        showEmployeeInfo={!!creatorUserId}
        employeeData={
          creatorEmployeeData
            ? {
                displayName: creatorEmployeeData.displayName,
                firstName: creatorEmployeeData.firstName,
                lastName: creatorEmployeeData.lastName,
                avatarUrl: formatAvatarUrl(creatorEmployeeData.pictureThumbnail),
                position: creatorEmployeeData.position
              }
            : undefined
        }
        isLoadingEmployee={isLoadingCreator}
        onClose={onClose}
      />

      <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-6 gba:min-h-0">
        {/* Entity Reference (if linked to an entity) - Same for all cFlow tasks */}
        {entityType && entityId && entityName && (
          <div className="gba:border gba:rounded-lg gba:p-4 gba:bg-muted/30">
            <div className="gba:text-xs gba:text-muted-foreground gba:mb-2 gba:font-medium">Related To</div>
            <a
              href={entityDisplayUrl || '#'}
              onClick={e => {
                e.preventDefault()
                if (entityDisplayUrl) {
                  navigateTo(entityDisplayUrl)
                }
              }}
              className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer gba:p-2 gba:-mx-2 gba:rounded-md hover:gba:bg-accent gba:transition-colors gba:no-underline"
              data-testid="task-entity-reference-link"
            >
              <LinkIcon className="gba:h-4 gba:w-4 gba:text-primary" />
              <Badge variant="outline" className="gba:text-xs">
                {entityType}
              </Badge>
              <span className="gba:font-medium gba:text-sm gba:text-primary hover:gba:underline">{entityName}</span>
              <ExternalLink className="gba:h-3 gba:w-3 gba:text-muted-foreground gba:ml-auto" />
            </a>
          </div>
        )}

        {/* Document Attachments (if any) - Same for all cFlow tasks */}
        {documentLinks.length > 0 && (
          <div className="gba:border gba:rounded-lg gba:p-4 gba:bg-muted/30">
            <div className="gba:text-xs gba:text-muted-foreground gba:mb-3 gba:font-medium">
              Attachments ({documentLinks.length})
            </div>
            <div className="gba:space-y-2">
              {documentLinks.map(link => (
                <a
                  key={link.url || link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gba:flex gba:items-center gba:gap-3 gba:p-2 gba:-mx-2 gba:rounded-md hover:gba:bg-accent gba:transition-colors gba:no-underline gba:group"
                  data-testid={`task-document-link-${link.name}`}
                >
                  <FileText className="gba:h-4 gba:w-4 gba:text-blue-500 gba:shrink-0" />
                  <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate gba:flex-1 group-hover:gba:underline">
                    {link.name}
                  </span>
                  <Download className="gba:h-3 gba:w-3 gba:text-muted-foreground gba:shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Description - Simple paragraph for all cFlow tasks */}
        {(task.message || task.description) && (
          <p className="gba:text-base gba:leading-relaxed gba:text-muted-foreground">
            {task.message || task.description}
          </p>
        )}

        {/* Form Section - Editable for active tasks, read-only for completed */}
        {task.form && Array.isArray(task.form) && task.form.length > 0 && (
          <Card>
            <CardHeader>
              <div className="gba:flex gba:items-center gba:gap-2">
                <CardTitle className="gba:text-lg">Form</CardTitle>
                {isCompleted && <Badge variant="secondary">Read-only</Badge>}
                {!formInitialized && (
                  <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
                    <Clock className="gba:h-4 gba:w-4 gba:animate-spin" />
                    <span>Loading...</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Always show form fields - with empty values while loading for better UX */}
              <div className="gba:space-y-4">
                {task.form.map((input: any, index: number) => {
                  const fieldName = input.name || input.id || `field_${index}`
                  const fieldValue = formValues[fieldName]

                  // Check if we're still loading data for this form
                  // For completed tasks without direct values, we need flowStepData to be loaded
                  const isLoadingData = !formInitialized

                  // While loading, show empty values; once loaded, show the actual values
                  const displayValue = getFieldDisplayValue(isLoadingData, fieldValue, input.value, input.defaultValue)

                  // Determine if this field should be read-only (loading, completed tasks, OR field marked as readOnly)
                  const isFieldReadOnly = isLoadingData || isCompleted || input.readOnly === true

                  return (
                    <InputRenderer
                      key={fieldName}
                      input={input}
                      index={index}
                      readOnly={isFieldReadOnly}
                      value={displayValue}
                      onChange={value => {
                        if (!isFieldReadOnly) {
                          setFormValues({
                            ...formValues,
                            [fieldName]: value
                          })
                        }
                      }}
                    />
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comment Section - Only for active tasks with complete/reject actions */}
        {!isCompleted && (task.availableActions?.canComplete || task.availableActions?.canReject) && (
          <div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
              <Switch
                id="show-comment"
                checked={showComment}
                onCheckedChange={setShowComment}
                data-testid="comment-toggle"
              />
              <Label
                htmlFor="show-comment"
                className="gba:text-sm gba:font-medium gba:cursor-pointer gba:flex gba:items-center gba:gap-2"
              >
                <MessageSquare className="gba:h-4 gba:w-4" />
                Add Comment {!showComment && '(Optional)'}
              </Label>
            </div>

            {showComment && (
              <Textarea
                id="comment"
                placeholder="Enter your comment..."
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={4}
                className="gba:w-full"
                data-testid="task-comment-input"
              />
            )}
          </div>
        )}
      </div>

      {/* Sticky Footer with Actions - Auto-generated from task.availableActions */}
      <TaskDetailFooter task={task} onTaskAction={handleTaskAction} isLoading={isCompleting} />
    </div>
  )
}
