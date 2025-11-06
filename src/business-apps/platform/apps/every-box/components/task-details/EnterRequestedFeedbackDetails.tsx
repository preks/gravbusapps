import React, { useState, useEffect, useCallback } from 'react'
import { message } from 'antd'
import {
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Label,
  Textarea,
  Switch,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Badge,
  Separator,
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from '@newwork/nw-design-system'
import { DownOutlined } from '@ant-design/icons'
import { PiCalendarDuotone, PiUser } from 'react-icons/pi'
import { UnifiedTask } from '../../types'
import { useKogitoProcess } from '../../hooks/useKogitoProcess'
import { useExpenseRelatedEntities } from '../../hooks/useExpenseRelatedEntities'
import { getModuleInfo } from '../../utils/moduleIcons'
import dayjs from 'dayjs'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getInitials } from '../../utils/avatarUtils'
import { env } from '@/common/env/EnvUtils'

interface EnterRequestedFeedbackDetailsProps {
  task: UnifiedTask
  taskDetails: any
  accessToken: string
  userInfo?: any
  onClose: () => void
  onTaskCompleted: (taskId: string) => void
  onTaskUpdated: () => void
}

export const EnterRequestedFeedbackDetails: React.FC<EnterRequestedFeedbackDetailsProps> = ({
  task,
  taskDetails,
  accessToken,
  userInfo,
  onClose,
  onTaskCompleted,
  onTaskUpdated
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackPublic, setFeedbackPublic] = useState(false)

  // Text transformation state
  const [isTransforming, setIsTransforming] = useState(false)

  // Data loading state
  const [fetchedFeedback, setFetchedFeedback] = useState<any>(null)

  const { continueProcess } = useKogitoProcess({
    task,
    accessToken,
    onSuccess: () => {},
    onError: () => {}
  })

  // Extract employeeId (receiver of feedback) from multiple possible sources
  const employeeId =
    taskDetails?.parameters?.receiverId ||
    taskDetails?.parameters?.employeeId ||
    task.sourceMetadata?.inputs?.receiverId ||
    task.sourceMetadata?.inputs?.employeeId

  // Extract process instance ID for querying feedback
  const processInstanceId =
    task.sourceMetadata?.endpoint?.match(/\/([a-f0-9-]+)\/enterRequestedFeedback/)?.[1] ||
    task.sourceMetadata?.processInstanceId ||
    task.workflowMeta?.rootWorkflowId

  const creatorName = task.sourceMetadata?.creatorName || 'Unknown'

  // For completed tasks, data is in results
  // The API response has a nested structure: { feedback: { feedback: "text", feedbackPublic: true, ... } }
  const feedbackFromTask = taskDetails?.results?.feedback

  console.log('🔍 Task Details:', taskDetails)
  console.log('📝 Feedback data from task:', feedbackFromTask)
  console.log('📝 Fetched feedback from DB:', fetchedFeedback)
  console.log('✅ Task status:', task.status)
  console.log('👤 Employee ID (receiver):', employeeId)
  console.log('🔍 Full task object:', JSON.stringify(task, null, 2))
  console.log('🔍 Task sourceMetadata:', task.sourceMetadata)
  console.log('🔍 Task sourceMetadata outputs:', task.sourceMetadata?.outputs)

  // Normalize feedback from task results (handle nested structure)
  const normalizedTaskFeedback = feedbackFromTask
    ? {
        feedbackText: feedbackFromTask.feedback || feedbackFromTask.feedbackText, // Handle both nested and flat
        feedbackPublic: feedbackFromTask.feedbackPublic,
        feedbackDate: feedbackFromTask.feedbackDate,
        employeeId: feedbackFromTask.employeeId,
        senderEmployeeId: feedbackFromTask.senderEmployeeId
      }
    : null

  // Log detailed feedback structure
  if (normalizedTaskFeedback) {
    console.log('📋 Normalized feedback structure:', {
      hasText: !!normalizedTaskFeedback.feedbackText,
      hasPublic: normalizedTaskFeedback.feedbackPublic !== undefined,
      feedbackText: normalizedTaskFeedback.feedbackText,
      feedbackPublic: normalizedTaskFeedback.feedbackPublic
    })
  }

  // Check if there's already data (view mode) - prefer fetched data, then task data
  const actualFeedback = fetchedFeedback || normalizedTaskFeedback
  const hasExistingData = !!actualFeedback && !!actualFeedback.feedbackText

  console.log('🎯 Final state:', {
    hasExistingData,
    actualFeedbackText: actualFeedback?.feedbackText,
    actualFeedbackPublic: actualFeedback?.feedbackPublic,
    source: fetchedFeedback ? 'database' : normalizedTaskFeedback ? 'task results' : 'none'
  })

  // GraphQL client
  const graphqlClient = useGraphQLClient(accessToken)

  // Fetch employee details for avatar and display name
  const { entities, isLoading: isLoadingEntities } = useExpenseRelatedEntities({
    employeeId: employeeId,
    costCenterId: undefined,
    projectId: undefined,
    accessToken
  })

  const moduleInfo = getModuleInfo(task.name, task.type)
  const ModuleIcon = moduleInfo.icon

  // Fetch feedback from database for completed tasks
  const fetchFeedbackFromDatabase = useCallback(async () => {
    if (task.status !== 'COMPLETED') {
      console.log('⏭️ Skipping database fetch - task not completed:', { status: task.status })
      return
    }

    try {
      // Try multiple query strategies to find the feedback
      const currentUserId = userInfo?.employeeId || userInfo?.id

      // Strategy 1: Query by processInstanceId (most reliable)
      if (processInstanceId) {
        const queryByProcess = `
          query GetEmployeeFeedbackByProcess($processInstanceId: String!) {
            EmployeeFeedback(
              where: {
                processInstanceId: { _eq: $processInstanceId }
              }
              orderBy: [{ createdAt: DESC }]
              limit: 1
            ) {
              id
              employeeId
              senderEmployeeId
              feedback
              feedbackDate
              feedbackPublic
              processInstanceId
              createdAt
            }
          }
        `

        console.log('📡 Strategy 1: Fetching feedback by processInstanceId:', processInstanceId)
        const resultByProcess = await graphqlClient.request(queryByProcess, { processInstanceId })
        console.log('📊 Result by processInstanceId:', resultByProcess?.EmployeeFeedback)

        if (resultByProcess?.EmployeeFeedback && resultByProcess.EmployeeFeedback.length > 0) {
          const dbFeedback = resultByProcess.EmployeeFeedback[0]
          console.log('✅ Found feedback by processInstanceId:', dbFeedback)
          setFetchedFeedback({
            feedbackText: dbFeedback.feedback,
            feedbackPublic: dbFeedback.feedbackPublic,
            feedbackDate: dbFeedback.feedbackDate,
            employeeId: dbFeedback.employeeId,
            senderEmployeeId: dbFeedback.senderEmployeeId
          })
          return
        } else {
          console.log('⚠️ No feedback found by processInstanceId, trying fallback methods...')
        }
      } else {
        console.log('⚠️ No processInstanceId available, skipping Strategy 1')
      }

      // Strategy 2: Query by employeeId + senderEmployeeId (fallback)
      if (employeeId && currentUserId) {
        const queryByEmployees = `
          query GetEmployeeFeedbackByEmployees($employeeId: uuid!, $senderEmployeeId: uuid!) {
            EmployeeFeedback(
              where: {
                employeeId: { _eq: $employeeId },
                senderEmployeeId: { _eq: $senderEmployeeId }
              }
              orderBy: [{ createdAt: DESC }]
              limit: 1
            ) {
              id
              employeeId
              senderEmployeeId
              feedback
              feedbackDate
              feedbackPublic
              processInstanceId
              createdAt
            }
          }
        `

        console.log('📡 Strategy 2: Fetching feedback by employees:', {
          employeeId,
          senderEmployeeId: currentUserId
        })
        const resultByEmployees = await graphqlClient.request(queryByEmployees, {
          employeeId,
          senderEmployeeId: currentUserId
        })
        console.log('📊 Result by employees:', resultByEmployees?.EmployeeFeedback)

        if (resultByEmployees?.EmployeeFeedback && resultByEmployees.EmployeeFeedback.length > 0) {
          const dbFeedback = resultByEmployees.EmployeeFeedback[0]
          console.log('✅ Found feedback by employees:', dbFeedback)
          setFetchedFeedback({
            feedbackText: dbFeedback.feedback,
            feedbackPublic: dbFeedback.feedbackPublic,
            feedbackDate: dbFeedback.feedbackDate,
            employeeId: dbFeedback.employeeId,
            senderEmployeeId: dbFeedback.senderEmployeeId
          })
          return
        } else {
          console.log('⚠️ No feedback found by employees')
        }
      } else {
        console.log('⚠️ Missing employeeId or currentUserId, skipping Strategy 2')
      }

      console.log('❌ No feedback found in database using any strategy')
    } catch (err) {
      console.error('❌ Error fetching feedback from database:', err)
    }
  }, [graphqlClient, employeeId, processInstanceId, task.status, userInfo])

  // Load data on mount - fetch from database for completed tasks
  useEffect(() => {
    // For completed tasks, always try to fetch from database since taskDetails is null for completed tasks
    if (task.status === 'COMPLETED') {
      if (normalizedTaskFeedback) {
        console.log('✅ Feedback already available in task results, skipping database fetch')
      } else {
        console.log('🔄 Task is completed, fetching feedback from database...')
        fetchFeedbackFromDatabase()
      }
    }
  }, [task.status, fetchFeedbackFromDatabase])

  // Separate effect to log when normalizedTaskFeedback changes
  useEffect(() => {
    if (normalizedTaskFeedback) {
      console.log('📦 Task feedback detected:', normalizedTaskFeedback)
    }
  }, [normalizedTaskFeedback])

  // Initialize form with existing data if available
  useEffect(() => {
    console.log('🔄 Initializing form data:', { hasExistingData, actualFeedback })

    if (hasExistingData && actualFeedback) {
      if (actualFeedback.feedbackText) {
        console.log('✍️ Setting feedback text:', actualFeedback.feedbackText.substring(0, 50) + '...')
        setFeedbackText(actualFeedback.feedbackText)
      }
      if (actualFeedback.feedbackPublic !== undefined) {
        console.log('👁️ Setting feedback public:', actualFeedback.feedbackPublic)
        setFeedbackPublic(actualFeedback.feedbackPublic)
      } else {
        // Default to false if not specified
        console.log('⚠️ feedbackPublic is undefined, defaulting to false')
        setFeedbackPublic(false)
      }
    }
  }, [hasExistingData, actualFeedback])

  // Text transformation function
  const handleTransform = async (type: 'formalize' | 'translate' | 'shorten') => {
    if (!feedbackText.trim()) {
      return
    }

    const TEXT_OPERATION_QUERY_IDS: Record<string, string> = {
      formalize: '6799beda3544ce9d4dfaa322',
      translate: '6799c32a3544ce9d4dfaa323',
      shorten: '6799c5dd3544ce9d4dfaa328'
    }

    setIsTransforming(true)
    try {
      const executeUrl = `${env('NEXT_PUBLIC_BASE_URL')}/prompt-manager/api/v1/prompts/${TEXT_OPERATION_QUERY_IDS[type]}/execute`

      // Create payload with proper structure
      const userParams = JSON.stringify({ userInput: feedbackText })

      // Set system parameters based on operation type
      let systemParams = ''
      if (type === 'translate') {
        systemParams = JSON.stringify({ language: 'english' })
      } else if (type === 'shorten') {
        systemParams = JSON.stringify({ numberOfSentences: 2 })
      }

      // Use URLSearchParams for proper encoding
      const requestBody = new URLSearchParams()
      requestBody.append('system_params', systemParams)
      requestBody.append('user_params', userParams)

      const response = await fetch(executeUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: requestBody
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      // Extract the processed text from the response
      const processedText = data?.data?.content || data?.content

      if (processedText) {
        setFeedbackText(processedText)
        message.success('Text transformed successfully')
      } else {
        throw new Error('No text received from the transformation service')
      }
    } catch (err) {
      console.error('Text transformation error:', err)
      message.error('Failed to transform text')
    } finally {
      setIsTransforming(false)
    }
  }

  const handleSubmit = async () => {
    // Validation
    if (!feedbackText.trim()) {
      message.error('Please enter feedback')
      return
    }

    setIsSubmitting(true)
    try {
      const payload: any = {
        event: 'pse_submit',
        feedback: {
          employeeId: employeeId, // The receiver of the feedback
          senderEmployeeId: userInfo?.employeeId || userInfo?.id, // The giver of the feedback
          feedback: feedbackText.trim(), // Database uses 'feedback' not 'feedbackText'
          feedbackDate: dayjs().format('YYYY-MM-DD'),
          feedbackPublic: feedbackPublic
        }
      }

      await continueProcess({
        domain: 'employee',
        processName: 'giveFeedback',
        payload
      })

      message.success({
        content: 'Feedback submitted successfully',
        duration: 3
      })

      setTimeout(() => {
        if (onTaskCompleted && task.id) {
          onTaskCompleted(task.id)
        }
        onTaskUpdated()
        onClose()
      }, 500)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit'
      message.error({
        content: `Failed to submit: ${errorMessage}`,
        duration: 5
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isCompleted = task.status === 'COMPLETED'
  const employeeName = entities.employee?.displayName || creatorName

  return (
    <div className="gba:space-y-6" data-testid="enter-requested-feedback-details">
      {/* Module Badge */}
      <div className="gba:flex gba:items-center gba:gap-2">
        <ModuleIcon className={`gba:h-5 gba:w-5 ${moduleInfo.color}`} />
        <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">{moduleInfo.name}</span>
      </div>

      {/* Header Section */}
      <div className="gba:flex gba:justify-between gba:items-start">
        <div className="gba:flex-1">
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
            <PiCalendarDuotone className="gba:h-5 gba:w-5 gba:text-primary" />
            <h2 className="gba:text-xl gba:font-semibold gba:text-foreground" data-testid="enter-feedback-title">
              {task.referenceTaskName || 'Enter Requested Employee Feedback'}
            </h2>
          </div>
          <p className="gba:text-sm gba:text-muted-foreground gba:ml-7" data-testid="task-code">
            Code: {task.sourceMetadata?.inputs?.TaskName || task.name}
          </p>
        </div>
        <Badge variant={isCompleted ? 'success' : 'warning'} data-testid="task-status-badge">
          {isCompleted ? 'Completed' : task.assignment?.currentStatus || 'Open'}
        </Badge>
      </div>

      <Separator />

      {/* Employee Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <PiUser className="gba:h-5 gba:w-5" />
            Feedback Receiver
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-3">
          {isLoadingEntities ? (
            <div className="gba:flex gba:items-start gba:gap-3">
              <div className="gba:h-10 gba:w-10 gba:rounded-full gba:bg-muted gba:animate-pulse" />
              <div className="gba:flex-1">
                <div className="gba:h-5 gba:w-32 gba:bg-muted gba:rounded gba:animate-pulse gba:mb-2" />
                <div className="gba:h-4 gba:w-24 gba:bg-muted gba:rounded gba:animate-pulse" />
              </div>
            </div>
          ) : (
            <div className="gba:flex gba:items-start gba:gap-3">
              <Avatar className="gba:h-10 gba:w-10">
                {entities.employee?.avatarUrl ? (
                  <AvatarImage src={entities.employee.avatarUrl} alt={employeeName} />
                ) : null}
                <AvatarFallback className="gba:bg-gradient-to-br gba:from-blue-500 gba:to-purple-600 gba:text-white">
                  {(() => {
                    const parts = employeeName.split(' ')
                    return getInitials(parts[0], parts[1])
                  })()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="gba:font-medium">{employeeName}</p>
                <p className="gba:text-sm gba:text-muted-foreground">Employee</p>
              </div>
            </div>
          )}

          {employeeId && (
            <>
              <Separator />
              <div>
                <p className="gba:text-xs gba:text-muted-foreground gba:mb-1">Employee ID</p>
                <p className="gba:text-sm gba:font-mono gba:text-foreground">{employeeId}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Feedback Form */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:text-base">
            {isCompleted ? 'Feedback Details (Completed)' : 'Enter Feedback'}
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          {/* Completed View - Read-only Display */}
          {isCompleted ? (
            <>
              {/* Public/Private Badge */}
              <div className="gba:flex gba:items-center gba:gap-2">
                <Label className="gba:text-sm gba:font-medium">Visibility:</Label>
                <Badge variant={feedbackPublic ? 'default' : 'secondary'} data-testid="feedback-visibility-badge">
                  {feedbackPublic ? 'Public Feedback' : 'Private Feedback'}
                </Badge>
              </div>

              <Separator />

              {/* Feedback Content Display */}
              <div className="gba:space-y-2">
                <Label className="gba:text-sm gba:font-medium">Feedback</Label>
                <div
                  className="gba:p-4 gba:bg-muted gba:rounded-md gba:border gba:min-h-[200px] gba:whitespace-pre-wrap gba:text-sm gba:text-foreground"
                  data-testid="feedback-display"
                >
                  {feedbackText || 'No feedback provided'}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Edit Mode - Form Fields */}
              {/* Public Feedback Toggle */}
              <div className="gba:flex gba:items-center gba:justify-between">
                <Label htmlFor="feedback-public" className="gba:text-sm gba:text-muted-foreground">
                  Public Feedback
                </Label>
                <Switch
                  id="feedback-public"
                  checked={feedbackPublic}
                  onCheckedChange={setFeedbackPublic}
                  data-testid="public-feedback-switch"
                />
              </div>

              {/* Feedback Text */}
              <div className="gba:space-y-2">
                <Label htmlFor="feedback-text" className="gba:text-sm gba:font-medium">
                  Feedback *
                </Label>
                <Textarea
                  id="feedback-text"
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  placeholder="Enter your feedback here..."
                  rows={12}
                  className="gba:resize-none gba:min-h-[200px]"
                  data-testid="feedback-textarea"
                />
              </div>

              {/* Text Tool Dropdown */}
              <div className="gba:w-fit">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="default"
                      disabled={!feedbackText.trim() || isTransforming}
                      className="gba:w-full gba:justify-between gba:bg-destructive hover:gba:bg-destructive/90 gba:text-primary-foreground gba:border-destructive gba:min-w-[150px]"
                      data-testid="text-tool-dropdown"
                    >
                      <span>{isTransforming ? 'Transforming...' : 'Text Tool'}</span>
                      <DownOutlined className="gba:h-4 gba:w-4 gba:opacity-50 gba:ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="gba:w-[150px]">
                    <DropdownMenuItem onClick={() => handleTransform('formalize')} data-testid="formalize-option">
                      Formalize
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleTransform('translate')} data-testid="translate-option">
                      Translate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleTransform('shorten')} data-testid="shorten-option">
                      Shorten
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {!isCompleted && (
        <div
          className="gba:flex gba:gap-2 gba:flex-wrap gba:justify-end gba:pt-4 gba:border-t"
          style={{ borderColor: 'var(--color-border-default)' }}
        >
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} data-testid="cancel-button">
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleSubmit}
            disabled={isSubmitting || !feedbackText.trim()}
            data-testid="submit-button"
            className="gba:min-w-[140px]"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </div>
      )}
    </div>
  )
}
