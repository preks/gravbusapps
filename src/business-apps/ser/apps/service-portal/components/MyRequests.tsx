import React, { useState, useEffect, useMemo } from 'react'
import {
  PageLayout,
  Card,
  Button,
  Badge,
  Alert,
  Spinner,
  SectionKpiCards,
  Avatar,
  AvatarImage,
  AvatarFallback,
  type KpiCardData
} from '@newwork/nw-design-system'
import { SubmittedRequest, WorkflowEngine, StepStatus } from '../../../types'
import { formatRequestId, formatStatusText } from '../../../utils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  ClockCounterClockwiseIcon,
  CheckCircleIcon,
  XCircleIcon,
  FileTextIcon,
  XIcon,
  ArrowLeftIcon,
  ArrowClockwiseIcon,
  WifiHighIcon
} from '@phosphor-icons/react'
import { UserDisplayName } from '../../../components/UserDisplayName'
import { RequestComments } from './RequestComments'
import { useFlowComments } from '../hooks/useFlowComments'
import { MyRequestsTable, FilterGroup, RequestAction } from '../../../components/shared/MyRequestsTable'
import { ColumnConfig } from '@/components/dataController'
import { formatDate, formatDateTime, getUserDateFormat, getUserLocale } from '../../../config/dateTimeConfig'
import { Step0DataRenderer } from '../../../components/shared/Step0DataRenderer'
import { navigateTo } from '@/common/utils/navigationUtils'
import { useEmployeeNamesBatch } from '../../../hooks/useEmployeeNamesBatch'
import { FlowSummary } from './FlowSummary'
import { useFlowSummary } from '../hooks/useFlowSummary'
import { FlowSummaryErrorBoundary } from './FlowSummaryErrorBoundary'

export interface MyRequestsProps extends BusinessAppContextProps {
  workflowEngine: WorkflowEngine
  onBack: () => void
}

interface RequestTimelineProps {
  request: SubmittedRequest
  contextProps: BusinessAppContextProps & { workflowEngine: WorkflowEngine }
}

// Enhanced Employee Display Component with Avatar (similar to TicketTable.tsx)
const EnhancedEmployeeDisplay: React.FC<{
  userId: string
  displayName: string
  employeeData?: any // Full employee data from batch fetch (for future profile picture support)
  testId?: string
  showTooltip?: boolean
}> = ({ userId, displayName, employeeData, testId, showTooltip = true }) => {
  // Helper function to get employee initials
  const getInitials = (name: string) => {
    if (!name || name === '-') return 'U'
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) // Max 2 characters
  }

  // Handle click to navigate to employee record
  const handleEmployeeClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (userId && userId !== 'unknown' && employeeData?.id) {
      const employeeId = employeeData.id
      navigateTo(`/platform/employee-record?employeeId=${employeeId}`)
    }
  }

  const avatarDisplay = (
    <div
      className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer hover:gba:bg-transparent focus:gba:bg-transparent gba:group gba:p-1 gba:rounded gba:transition-colors hover:gba:bg-gray-100"
      data-testid={testId}
      onClick={handleEmployeeClick}
      title={showTooltip && userId && userId !== 'unknown' ? 'Click to view employee profile' : undefined}
    >
      <Avatar
        size="sm"
        className="gba:outline gba:outline-2 gba:outline-offset-2 gba:outline-transparent gba:group-hover:[outline-color:var(--nw-color-primary-500)] gba:rounded-full"
      >
        {/* Profile picture support - check multiple possible property names */}
        {(employeeData?.pictureThumbnail ||
          employeeData?.picture ||
          employeeData?.avatar ||
          employeeData?.profilePicture) && (
          <AvatarImage
            src={`data:image/png;base64,${employeeData.pictureThumbnail || employeeData.picture || employeeData.avatar || employeeData.profilePicture}`}
            alt={displayName}
            onError={e => {
              // Try different image formats if PNG fails
              const target = e.target as HTMLImageElement
              const imageData =
                employeeData.pictureThumbnail ||
                employeeData.picture ||
                employeeData.avatar ||
                employeeData.profilePicture
              if (target.src.includes('png')) {
                target.src = `data:image/jpeg;base64,${imageData}`
              } else if (target.src.includes('jpeg')) {
                target.src = `data:image/gif;base64,${imageData}`
              }
            }}
          />
        )}
        <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
      </Avatar>
      <span className="gba:text-sm gba:group-hover:gba:text-blue-600 gba:transition-colors">{displayName}</span>
    </div>
  )

  return avatarDisplay
}

const RequestTimeline: React.FC<RequestTimelineProps> = ({ request: initialRequest, contextProps }) => {
  const [request, setRequest] = useState<SubmittedRequest>(initialRequest)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())
  const [stepData, setStepData] = useState<any>(null)
  const [isLoadingStepData, setIsLoadingStepData] = useState(false)

  // Batch fetch employee data for the requester
  const requesterUserIds = useMemo(() => {
    const userIds: string[] = []
    if (request.requesterId && request.requesterId !== 'unknown') {
      userIds.push(request.requesterId)
    }
    return userIds
  }, [request.requesterId])

  const { displayNames: batchedDisplayNames, employees: batchedEmployees } = useEmployeeNamesBatch({
    userIds: requesterUserIds,
    accessToken: contextProps.accessToken,
    enabled: requesterUserIds.length > 0
  })

  // Fetch flow summary for completed requests
  // Check for completed status case-insensitively to handle API variations
  const isCompleted = request.status?.toLowerCase() === 'completed'

  // Enhanced logging for debugging status checks
  console.log(`[RequestTimeline] Status check for request ${request.id}:`, {
    rawStatus: request.status,
    normalizedStatus: request.status?.toLowerCase(),
    isCompleted,
    willFetchSummary: isCompleted
  })

  const {
    summaryData,
    isLoading: isSummaryLoading,
    error: summaryError,
    refetch: refetchSummary
  } = useFlowSummary({
    flowId: request.id,
    userId: contextProps.userInfo?.id || 'unknown',
    workflowEngine: contextProps.workflowEngine,
    enabled: isCompleted
  })

  // Initialize flow comments hook using the request ID as flow ID
  const {
    comments: flowComments,
    isLoading: isLoadingComments,
    postComment: postFlowComment,
    refreshComments: refreshFlowComments
  } = useFlowComments(request.id, contextProps, contextProps.workflowEngine)

  // Create comment context for the request
  const commentContext = {
    requestId: request.id,
    userId: contextProps.userInfo?.id || 'anonymous',
    userRole:
      request.requesterId === (contextProps.userInfo?.id || 'anonymous') ? ('requester' as const) : ('staff' as const),
    isRequester: request.requesterId === (contextProps.userInfo?.id || 'anonymous'),
    isAssignedToAnyStep: false, // We don't have assignment info from flow API
    canPostComments: true,
    defaultVisibility: 'EXTERNAL' as const
  }

  // Wrapper function to handle comment posting
  const handlePostComment = async (commentRequest: { comment: string; visibility: any }) => {
    await postFlowComment(commentRequest.comment, commentRequest.visibility)
  }

  // Function to fetch step data from the API
  const fetchStepData = async () => {
    try {
      setIsLoadingStepData(true)
      console.log(`[RequestTimeline] 🔄 Fetching step data for request: ${request.id}`)

      // Check if the workflow engine supports getFlowStepData
      if (!contextProps.workflowEngine.getFlowStepData) {
        console.log(`[RequestTimeline] ⚠️ Workflow engine does not support getFlowStepData, skipping step data fetch`)
        return
      }

      // Use the workflow engine to get step_0 data
      const stepResponse = await contextProps.workflowEngine.getFlowStepData(request.id, 'step_0')

      console.log(`[RequestTimeline] ✅ Step data fetched:`, {
        requestId: request.id,
        dataCount: stepResponse.data?.length || 0,
        stepData: stepResponse
      })

      setStepData(stepResponse)
    } catch (error) {
      console.error(`[RequestTimeline] ❌ Failed to fetch step data:`, error)
      // Don't set stepData to null on error, keep existing data
    } finally {
      setIsLoadingStepData(false)
    }
  }

  // Auto-refresh mechanism for live data
  const refreshRequestData = async () => {
    try {
      setIsRefreshing(true)
      console.log(`[RequestTimeline] 🔄 Refreshing live data for request: ${request.id}`)

      // Refresh both request data and step data
      const [updatedRequest] = await Promise.all([
        contextProps.workflowEngine.getRequest(request.id),
        fetchStepData() // This will update stepData state
      ])

      setRequest(updatedRequest)
      setLastRefreshed(new Date())

      console.log(`[RequestTimeline] ✅ Updated request data:`, {
        id: updatedRequest.id,
        status: updatedRequest.status,
        stepsCompleted: updatedRequest.steps.filter(s => s.status === 'DONE' || s.status === 'COMPLETED').length,
        totalSteps: updatedRequest.steps.length,
        timelineEvents: updatedRequest.timeline.length
      })
    } catch (error) {
      console.error(`[RequestTimeline] ❌ Failed to refresh request data:`, error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Auto-refresh every 30 seconds when drawer is open
  useEffect(() => {
    const interval = setInterval(() => {
      refreshRequestData()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [request.id])

  // Listen for manual refresh events
  useEffect(() => {
    const handleManualRefresh = () => {
      refreshRequestData()
    }

    window.addEventListener('refreshRequestTimeline', handleManualRefresh)
    return () => window.removeEventListener('refreshRequestTimeline', handleManualRefresh)
  }, [])

  // Update request when initialRequest changes (drawer opened with new request)
  useEffect(() => {
    setRequest(initialRequest)
    setLastRefreshed(new Date())
    // Fetch step data for the new request
    fetchStepData()
  }, [initialRequest.id])

  // Initial step data fetch when component mounts
  useEffect(() => {
    fetchStepData()
  }, [])

  const getStepIcon = (status: StepStatus) => {
    switch (status) {
      case 'DONE':
      case 'COMPLETED':
        return <CheckCircleIcon className="gba:text-green-600" size={20} />
      case 'IN_PROGRESS':
      case 'RUNNING':
        return (
          <ClockCounterClockwiseIcon
            className="gba:text-blue-600 gba:animate-spin gba:[animation-direction:reverse]"
            size={20}
          />
        )
      case 'REJECTED':
      case 'FAILED':
      case 'ERROR':
        return <XCircleIcon className="gba:text-red-600" size={20} />
      case 'READY':
      case 'QUEUED':
        return (
          <div className="gba:w-5 gba:h-5 gba:bg-yellow-400 gba:rounded-full gba:flex gba:items-center gba:justify-center">
            <div className="gba:w-2 gba:h-2 gba:bg-white gba:rounded-full"></div>
          </div>
        )
      default:
        return <div className="gba:w-5 gba:h-5 gba:bg-gray-300 gba:rounded-full"></div>
    }
  }

  const getStepStatusColor = (status: StepStatus) => {
    switch (status) {
      case 'DONE':
      case 'COMPLETED':
        return 'gba:border-green-200 gba:bg-green-50'
      case 'IN_PROGRESS':
      case 'RUNNING':
        return 'gba:border-blue-200 gba:bg-blue-50'
      case 'REJECTED':
      case 'FAILED':
      case 'ERROR':
        return 'gba:border-red-200 gba:bg-red-50'
      case 'READY':
      case 'QUEUED':
        return 'gba:border-yellow-200 gba:bg-yellow-50'
      default:
        return 'gba:border-gray-200 gba:bg-gray-50'
    }
  }

  const formatDuration = (startedAt?: string, finishedAt?: string) => {
    if (!startedAt) return ''
    const start = new Date(startedAt)
    const end = finishedAt ? new Date(finishedAt) : new Date()
    const durationMs = end.getTime() - start.getTime()
    const hours = Math.floor(durationMs / (1000 * 60 * 60))
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }

  return (
    <div className="gba:space-y-6">
      {/* Flow Summary (shown only for completed requests) */}
      {isCompleted && (
        <FlowSummaryErrorBoundary>
          <FlowSummary
            summaryData={summaryData}
            isLoading={isSummaryLoading}
            error={summaryError}
            onRetry={refetchSummary}
            userInfo={contextProps.userInfo}
          />
        </FlowSummaryErrorBoundary>
      )}

      {/* Request Overview Card */}
      <Card className="gba:p-6 gba:border-2 gba:border-blue-100 gba:bg-gradient-to-r gba:from-blue-50 gba:to-background">
        <div className="gba:flex gba:justify-between gba:items-start gba:mb-4">
          <div>
            <h4 className="gba:text-xl gba:font-bold gba:text-foreground gba:mb-2">{request.titleSnapshot}</h4>
            <div className="gba:flex gba:items-center gba:gap-4 gba:text-sm gba:text-muted-foreground">
              <span className="gba:flex gba:items-center gba:gap-1">
                <code className="gba:text-sm gba:font-mono gba:bg-muted gba:px-2 gba:py-1 gba:rounded">
                  {formatRequestId(request.id)}
                </code>
              </span>
              <span>
                Created:{' '}
                {formatDate(
                  request.createdAt,
                  getUserDateFormat(contextProps.userInfo),
                  getUserLocale(contextProps.userInfo)
                )}
              </span>
            </div>
          </div>
          <div className="gba:flex gba:flex-col gba:items-end gba:gap-2">
            <div className="gba:flex gba:items-center gba:gap-2">
              <Badge
                variant="default"
                className="gba:text-sm gba:px-3 gba:py-1"
                style={{
                  backgroundColor:
                    request.status.toLowerCase() === 'completed'
                      ? 'var(--nw-success-secondary)'
                      : request.status.toLowerCase() === 'open'
                        ? 'var(--nw-info-secondary)'
                        : request.status.toLowerCase() === 'in_progress'
                          ? 'var(--nw-warning-secondary)'
                          : request.status.toLowerCase() === 'rejected' || request.status.toLowerCase() === 'cancelled'
                            ? 'var(--nw-destructive-secondary)'
                            : 'var(--nw-muted)',
                  color:
                    request.status.toLowerCase() === 'completed'
                      ? 'var(--nw-success-secondary-foreground)'
                      : request.status.toLowerCase() === 'open'
                        ? 'var(--nw-info-secondary-foreground)'
                        : request.status.toLowerCase() === 'in_progress'
                          ? 'var(--nw-warning-secondary-foreground)'
                          : request.status.toLowerCase() === 'rejected' || request.status.toLowerCase() === 'cancelled'
                            ? 'var(--nw-destructive-secondary-foreground)'
                            : 'var(--nw-muted-foreground)'
                }}
              >
                {formatStatusText(request.status.toUpperCase())}
              </Badge>
              {isRefreshing && (
                <Badge
                  variant="outline"
                  className="gba:text-xs gba:px-2 gba:py-1 gba:bg-blue-100 gba:text-blue-700 gba:animate-pulse"
                >
                  🔄 Updating...
                </Badge>
              )}
            </div>
            <div className="gba:text-right">
              <span className="gba:text-xs" style={{ color: 'var(--nw-muted-foreground)' }}>
                {(() => {
                  // Use actual step completion logic matching the table
                  const completedSteps = request.steps.filter(
                    s => s.status === 'COMPLETED' || s.status === 'DONE'
                  ).length
                  const totalSteps = request.steps.length
                  return `${completedSteps} of ${totalSteps} steps completed`
                })()}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {(() => {
          // Calculate progress using the same logic as the table
          const completedSteps = request.steps.filter(s => s.status === 'COMPLETED' || s.status === 'DONE').length
          const totalSteps = request.steps.length
          const progressPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

          return (
            <>
              <div
                className="gba:w-full gba:h-2 gba:mb-2"
                style={{
                  backgroundColor: 'var(--nw-muted)',
                  borderRadius: 'var(--border-radius-sm, 0.25rem)'
                }}
              >
                <div
                  className="gba:h-2 gba:transition-all gba:duration-500"
                  style={{
                    width: `${progressPercentage}%`,
                    backgroundColor:
                      progressPercentage === 100
                        ? 'var(--nw-success)'
                        : progressPercentage >= 75
                          ? 'var(--nw-info)'
                          : progressPercentage >= 50
                            ? 'var(--nw-warning)'
                            : progressPercentage > 0
                              ? 'var(--nw-muted-foreground)'
                              : 'var(--nw-muted)',
                    borderRadius: 'var(--border-radius-sm, 0.25rem)'
                  }}
                />
              </div>
              <div
                className="gba:text-xs gba:flex gba:justify-between gba:items-center"
                style={{ color: 'var(--nw-muted-foreground)' }}
              >
                <span>Progress: {progressPercentage}% complete</span>
                <span className="gba:flex gba:items-center gba:gap-1">
                  <span
                    className="gba:w-2 gba:h-2 gba:rounded-full"
                    style={{
                      backgroundColor: isRefreshing ? 'var(--nw-info)' : 'var(--nw-success)',
                      animation: isRefreshing ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
                    }}
                  />
                  {isRefreshing ? 'Syncing...' : 'Live'}
                </span>
              </div>
            </>
          )
        })()}
      </Card>

      {/* Submitted Form Data */}
      {(() => {
        // Use step data from API if available, fallback to request.formData
        let submittedData: Record<string, any> = {}

        if (stepData && stepData.data && stepData.data.length > 0) {
          // Use the formData from the first step data entry
          submittedData = stepData.data[0].formData || {}
          console.log(`[RequestTimeline] 📋 Using step data from API for request ${request.id}:`, {
            stepDataAvailable: true,
            formDataKeys: Object.keys(submittedData),
            stepDataEntry: stepData.data[0]
          })
        } else {
          // Fallback to request.formData
          submittedData = request.formData || {}
          console.log(`[RequestTimeline] 📋 Using fallback request.formData for request ${request.id}:`, {
            stepDataAvailable: false,
            fallbackDataKeys: Object.keys(submittedData)
          })
        }

        console.log(`[RequestTimeline] 📋 Using submitted form data for request ${request.id}:`, {
          originalDataKeys: Object.keys(submittedData),
          dataSource: stepData ? 'step_0_api' : 'request.formData'
        })

        // Show loading state while fetching step data
        if (isLoadingStepData && !stepData) {
          return (
            <Card className="gba:p-6">
              <h5 className="gba:text-lg gba:font-semibold gba:mb-4 gba:flex gba:items-center gba:gap-2">
                <FileTextIcon size={20} />
                Submitted Information
              </h5>
              <div className="gba:text-center gba:py-8 gba:text-gray-500">
                <div className="gba:w-6 gba:h-6 gba:border-2 gba:border-blue-500 gba:border-t-transparent gba:rounded-full gba:animate-spin gba:mx-auto gba:mb-2"></div>
                <p>Loading submitted data...</p>
                <p className="gba:text-xs gba:mt-2 gba:text-muted-foreground">Fetching form data from step_0</p>
              </div>
            </Card>
          )
        }

        // Check if we have any data to display
        const hasData =
          (stepData?.data?.[0]?.formData && Object.keys(stepData.data[0].formData).length > 0) ||
          (submittedData && Object.keys(submittedData).length > 0)

        if (!hasData) {
          return (
            <Card className="gba:p-6">
              <h5 className="gba:text-lg gba:font-semibold gba:mb-4 gba:flex gba:items-center gba:gap-2">
                <FileTextIcon size={20} />
                Submitted Information
              </h5>
              <div className="gba:text-center gba:py-8 gba:text-gray-500">
                <FileTextIcon className="gba:mx-auto gba:mb-2" size={24} />
                <p>No form data submitted with this request</p>
                <p className="gba:text-xs gba:mt-2 gba:text-muted-foreground">
                  {stepData
                    ? 'Step data was fetched but contains no form fields'
                    : 'This request may have been created without additional form fields'}
                </p>
              </div>
            </Card>
          )
        }

        return (
          <Card className="gba:p-6" data-testid="step0-data-card">
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
              <h5 className="gba:text-lg gba:font-semibold gba:flex gba:items-center gba:gap-2">
                <FileTextIcon size={20} />
                Submitted Information
              </h5>
              <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
                <Badge variant="outline" className="gba:text-xs">
                  {(() => {
                    const dataToUse = stepData?.data?.[0]?.formData || submittedData
                    const filteredCount = Object.entries(dataToUse || {}).filter(([key, value]) => {
                      // Same filtering logic as in Step0DataRenderer
                      if (
                        key.includes('stepAssignment') ||
                        key.includes('_assignmentMode') ||
                        key.includes('_allowReassignment') ||
                        key.startsWith('__') ||
                        key.includes('internal_') ||
                        key.includes('assignment') ||
                        key.includes('assignee') ||
                        key.includes('assign_')
                      ) {
                        return false
                      }
                      if (value === null || value === undefined || value === '') {
                        return false
                      }
                      if (Array.isArray(value) && value.length === 0) {
                        return false
                      }
                      if (typeof value === 'object' && Object.keys(value).length === 0) {
                        return false
                      }
                      return true
                    }).length
                    return filteredCount
                  })()}{' '}
                  fields
                </Badge>
                {stepData && stepData.data && stepData.data[0] && (
                  <Badge variant="outline" className="gba:text-xs gba:bg-purple-100 gba:text-purple-700">
                    {stepData.data[0].stepTitle}
                  </Badge>
                )}
              </div>
            </div>

            <Step0DataRenderer
              stepData={stepData?.data?.[0] || { formData: submittedData }}
              testIdPrefix="my-requests-step0"
            />

            {/* Enhanced Submission Metadata */}
            <div className="gba:mt-6 gba:pt-4 gba:border-t gba:border-gray-200">
              <div
                className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4 gba:text-xs"
                style={{ color: 'var(--nw-muted-foreground)' }}
              >
                <div className="gba:flex gba:flex-col">
                  <span className="gba:font-medium" style={{ color: 'var(--nw-foreground)' }}>
                    Submitted By
                  </span>
                  {(() => {
                    const requesterUserId = request.requesterId
                    const requesterName = requesterUserId ? batchedDisplayNames.get(requesterUserId) : null
                    const employeeData = requesterUserId ? batchedEmployees.get(requesterUserId) : null

                    // Show loading state if we're still fetching employee data
                    if (
                      requesterUserId &&
                      requesterUserId !== 'unknown' &&
                      !requesterName &&
                      requesterUserIds.length > 0
                    ) {
                      return (
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <div className="gba:w-6 gba:h-6 gba:bg-gray-200 gba:rounded-full gba:animate-pulse"></div>
                          <span className="gba:text-gray-400">Loading...</span>
                        </div>
                      )
                    }

                    const displayName = requesterName || 'Unknown User'

                    if (!requesterUserId || requesterUserId === 'unknown') {
                      return <span className="gba:text-gray-400">{displayName}</span>
                    }

                    return (
                      <EnhancedEmployeeDisplay
                        userId={requesterUserId}
                        displayName={displayName}
                        employeeData={employeeData}
                        testId={`submitted-by-${request.id}`}
                        showTooltip={true}
                      />
                    )
                  })()}
                </div>
                <div className="gba:flex gba:flex-col">
                  <span className="gba:font-medium" style={{ color: 'var(--nw-foreground)' }}>
                    Template
                  </span>
                  <div>
                    <div className="gba:font-mono" style={{ color: 'var(--nw-foreground)' }}>
                      {request.templateId}
                    </div>
                  </div>
                </div>
              </div>

              {/* Priority information if available */}
              {(request.formData?.urgency ||
                request.formData?.priority ||
                submittedData?.urgency ||
                submittedData?.priority) && (
                <div className="gba:mt-4 gba:pt-3 gba:border-t" style={{ borderColor: 'var(--nw-border)' }}>
                  <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4 gba:text-xs">
                    <div className="gba:flex gba:flex-col">
                      <span className="gba:font-medium" style={{ color: 'var(--nw-foreground)' }}>
                        Priority/Urgency
                      </span>
                      <Badge
                        variant="outline"
                        className="gba:w-fit"
                        style={{
                          backgroundColor:
                            submittedData?.urgency === 'urgent' || submittedData?.priority === 'high'
                              ? 'var(--nw-destructive-secondary)'
                              : submittedData?.urgency === 'medium' || submittedData?.priority === 'medium'
                                ? 'var(--nw-warning-secondary)'
                                : 'var(--nw-success-secondary)',
                          color:
                            submittedData?.urgency === 'urgent' || submittedData?.priority === 'high'
                              ? 'var(--nw-destructive-secondary-foreground)'
                              : submittedData?.urgency === 'medium' || submittedData?.priority === 'medium'
                                ? 'var(--nw-warning-secondary-foreground)'
                                : 'var(--nw-success-secondary-foreground)',
                          borderColor:
                            submittedData?.urgency === 'urgent' || submittedData?.priority === 'high'
                              ? 'var(--nw-destructive-secondary)'
                              : submittedData?.urgency === 'medium' || submittedData?.priority === 'medium'
                                ? 'var(--nw-warning-secondary)'
                                : 'var(--nw-success-secondary)'
                        }}
                      >
                        {(submittedData?.urgency || submittedData?.priority || 'Normal').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )
      })()}

      {/* Workflow Steps */}
      <Card className="gba:p-6">
        <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
          <h5 className="gba:text-lg gba:font-semibold gba:flex gba:items-center gba:gap-2">
            <ClockCounterClockwiseIcon size={20} />
            Workflow Progress
          </h5>
          <div className="gba:flex gba:items-center gba:gap-2">
            {isRefreshing && (
              <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-blue-600">
                <div className="gba:w-3 gba:h-3 gba:border-2 gba:border-blue-500 gba:border-t-transparent gba:rounded-full gba:animate-spin"></div>
                Refreshing...
              </div>
            )}
            <span className="gba:text-xs gba:text-gray-500">Last refreshed: {lastRefreshed.toLocaleTimeString()}</span>
          </div>
        </div>

        <div className="gba:space-y-4">
          {request.steps.map((step, index) => (
            <div key={step.id} className="gba:relative">
              {/* Connecting Line */}
              {index < request.steps.length - 1 && (
                <div className="gba:absolute gba:left-[10px] gba:top-[28px] gba:w-[2px] gba:h-[40px] gba:bg-gray-300"></div>
              )}

              <div
                className={`gba:flex gba:gap-4 gba:p-4 gba:border gba:rounded-lg gba:transition-all gba:duration-300 ${getStepStatusColor(step.status)}`}
              >
                {/* Step Icon */}
                <div className="gba:flex-shrink-0 gba:mt-1">{getStepIcon(step.status)}</div>

                {/* Step Content */}
                <div className="gba:flex-1">
                  <div className="gba:flex gba:justify-between gba:items-start gba:mb-2">
                    <div>
                      <h6 className="gba:font-semibold gba:text-foreground gba:mb-1">{step.name}</h6>
                      <div className="gba:flex gba:items-center gba:gap-4 gba:text-sm gba:text-muted-foreground">
                        {step.assignedToUserId && (
                          <span className="gba:flex gba:items-center gba:gap-1">
                            Assigned to:
                            <UserDisplayName
                              userId={step.assignedToUserId}
                              accessToken={contextProps.accessToken}
                              userInfo={contextProps.userInfo}
                              showIcon={false}
                              color="default"
                              size="small"
                              fallback="Unknown User"
                              testId={`step-assignee-${step.id}`}
                            />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Step Status Badge */}
                    <Badge
                      variant="default"
                      className={
                        step.status === 'DONE' || step.status === 'COMPLETED'
                          ? 'gba:bg-green-100 gba:text-green-800'
                          : step.status === 'IN_PROGRESS' || step.status === 'RUNNING'
                            ? 'gba:bg-blue-100 gba:text-blue-800'
                            : step.status === 'REJECTED' || step.status === 'FAILED' || step.status === 'ERROR'
                              ? 'gba:bg-red-100 gba:text-red-800'
                              : step.status === 'READY' || step.status === 'QUEUED'
                                ? 'gba:bg-yellow-100 gba:text-yellow-800'
                                : 'gba:bg-gray-100 gba:text-gray-800'
                      }
                    >
                      {formatStatusText(step.status)}
                    </Badge>
                  </div>

                  {/* Enhanced Timestamps and Due Dates */}
                  <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-4 gba:gap-3 gba:text-xs gba:text-muted-foreground gba:mt-3">
                    {step.startedAt && (
                      <div className="gba:flex gba:flex-col">
                        <span className="gba:font-medium gba:text-gray-700">Started</span>
                        <span>{formatDateTime(step.startedAt)}</span>
                      </div>
                    )}
                    {step.finishedAt && (
                      <div className="gba:flex gba:flex-col">
                        <span className="gba:font-medium gba:text-gray-700">Completed</span>
                        <span>{formatDateTime(step.finishedAt)}</span>
                      </div>
                    )}
                    {step.dueDate && (
                      <div className="gba:flex gba:flex-col">
                        <span className="gba:font-medium gba:text-gray-700">Due Date</span>
                        <span
                          className={
                            new Date(step.dueDate) < new Date()
                              ? 'gba:text-red-600 gba:font-semibold'
                              : 'gba:text-gray-700'
                          }
                        >
                          {formatDateTime(step.dueDate)}
                          {new Date(step.dueDate) < new Date() && (
                            <span className="gba:ml-1 gba:text-red-500 gba:font-bold">⚠️ OVERDUE</span>
                          )}
                        </span>
                      </div>
                    )}
                    {(step.startedAt || step.finishedAt) && (
                      <div className="gba:flex gba:flex-col">
                        <span className="gba:font-medium gba:text-gray-700">Duration</span>
                        <span>{formatDuration(step.startedAt, step.finishedAt) || 'In Progress'}</span>
                      </div>
                    )}
                  </div>

                  {/* Comments */}
                  {step.comments.length > 0 && (
                    <div className="gba:mt-3 gba:pt-3 gba:border-t gba:border-gray-200">
                      <span className="gba:text-xs gba:font-medium gba:text-gray-700 gba:block gba:mb-2">
                        Comments ({step.comments.length})
                      </span>
                      <div className="gba:space-y-2">
                        {step.comments.slice(-2).map(comment => (
                          <div key={comment.id} className="gba:bg-background gba:p-2 gba:rounded gba:text-xs">
                            <div className="gba:flex gba:items-center gba:gap-1 gba:font-medium gba:mb-1">
                              <UserDisplayName
                                userId={comment.authorId}
                                accessToken={contextProps.accessToken}
                                userInfo={contextProps.userInfo}
                                showIcon={false}
                                color="default"
                                size="small"
                                fallback="Unknown User"
                                testId={`comment-author-${comment.id}`}
                              />
                            </div>
                            <div className="gba:text-muted-foreground gba:mb-1">{comment.body}</div>
                            <div className="gba:text-xs gba:text-muted-foreground">
                              {formatDateTime(comment.createdAt)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Request Comments Section */}
      <RequestComments
        requestId={request.id}
        comments={flowComments}
        commentContext={commentContext}
        onPostComment={handlePostComment}
        onRefreshComments={refreshFlowComments}
        isLoading={isLoadingComments}
        {...contextProps}
      />
    </div>
  )
}

export const MyRequests: React.FC<MyRequestsProps> = ({ workflowEngine, onBack, ...contextProps }) => {
  const [requests, setRequests] = useState<SubmittedRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState<SubmittedRequest | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Handle opening drawer with selected request
  const handleViewRequest = (request: SubmittedRequest) => {
    setSelectedRequest(request)
    setIsDrawerOpen(true)

    // Update URL query parameter without triggering navigation
    try {
      const searchParams = new URLSearchParams(window.location.search)
      searchParams.set('requestId', request.id)
      const newUrl = `${window.location.pathname}?${searchParams.toString()}${window.location.hash}`
      window.history.replaceState({ ...window.history.state, requestId: request.id }, '', newUrl)
    } catch (error) {
      console.warn('[MyRequests] Failed to update URL with requestId:', error)
    }
  }

  // Handle closing drawer
  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    // Delay clearing selected request for smooth animation
    setTimeout(() => setSelectedRequest(null), 300)

    // Remove requestId from URL query parameter without triggering navigation
    try {
      const searchParams = new URLSearchParams(window.location.search)
      searchParams.delete('requestId')
      const newUrl = searchParams.toString()
        ? `${window.location.pathname}?${searchParams.toString()}${window.location.hash}`
        : `${window.location.pathname}${window.location.hash}`
      window.history.replaceState({ ...window.history.state, requestId: undefined }, '', newUrl)
    } catch (error) {
      console.warn('[MyRequests] Failed to remove requestId from URL:', error)
    }
  }

  // Handle keyboard events (Escape to close drawer)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isDrawerOpen) {
        handleCloseDrawer()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isDrawerOpen])

  // Load user's requests
  useEffect(() => {
    const loadRequests = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const userRequests = await workflowEngine.getMyRequests()
        setRequests(userRequests)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load requests')
      } finally {
        setIsLoading(false)
      }
    }

    loadRequests()
  }, [workflowEngine])

  // Handle URL query parameter on mount and when requests are loaded
  useEffect(() => {
    // Only process URL parameter after requests are loaded
    if (isLoading || requests.length === 0) return

    const url = new URL(window.location.href)
    const requestIdFromUrl = url.searchParams.get('requestId')

    if (requestIdFromUrl) {
      // Find the request by ID
      const requestToOpen = requests.find(r => r.id === requestIdFromUrl)

      if (requestToOpen) {
        // Open the drawer with this request
        setSelectedRequest(requestToOpen)
        setIsDrawerOpen(true)
      } else {
        // Request ID in URL not found - remove invalid parameter
        url.searchParams.delete('requestId')
        window.history.replaceState({}, '', url.toString())
      }
    }
  }, [requests, isLoading])

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const url = new URL(window.location.href)
      const requestIdFromUrl = url.searchParams.get('requestId')

      if (requestIdFromUrl) {
        // Open drawer if requestId is in URL
        const requestToOpen = requests.find(r => r.id === requestIdFromUrl)
        if (requestToOpen) {
          setSelectedRequest(requestToOpen)
          setIsDrawerOpen(true)
        }
      } else {
        // Close drawer if no requestId in URL
        setIsDrawerOpen(false)
        setTimeout(() => setSelectedRequest(null), 300)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [requests])

  // Calculate KPI statistics with enhanced modern features
  const kpiCards: KpiCardData[] = useMemo(() => {
    const totalRequests = requests.length

    // Debug: Log actual status values to understand the data
    console.log(
      '[MyRequests] Debug - Request statuses:',
      requests.map(r => ({ id: r.id, status: r.status }))
    )

    // Check for request status values (case-insensitive to handle API variations)
    const activeRequests = requests.filter(
      r => r.status?.toLowerCase() === 'open' || r.status?.toLowerCase() === 'in_progress'
    ).length

    const completedRequests = requests.filter(r => r.status?.toLowerCase() === 'completed').length

    const rejectedRequests = requests.filter(r => r.status?.toLowerCase() === 'canceled').length

    // Calculate average progress percentage for active requests
    const activeRequestsWithProgress = requests.filter(
      r => r.status?.toLowerCase() === 'open' || r.status?.toLowerCase() === 'in_progress'
    )

    console.log(
      '[MyRequests] Debug - Active requests with progress:',
      activeRequestsWithProgress.map(r => ({
        id: r.id,
        status: r.status,
        steps: r.steps.map(s => ({ name: s.name, status: s.status })),
        completedSteps: r.steps.filter(s => s.status === 'DONE' || s.status === 'COMPLETED').length,
        totalSteps: r.steps.length
      }))
    )

    const avgProgress =
      activeRequestsWithProgress.length > 0
        ? Math.round(
            activeRequestsWithProgress.reduce((sum, req) => {
              // Check for completed step status (based on actual data)
              const completed = req.steps.filter(s => s.status === 'COMPLETED' || s.status === 'DONE').length
              const total = req.steps.length
              const progress = total > 0 ? (completed / total) * 100 : 0
              console.log(
                `[MyRequests] Request ${req.id}: ${completed}/${total} steps = ${progress}% (step statuses: ${req.steps.map(s => s.status).join(', ')})`
              )
              return sum + progress
            }, 0) / activeRequestsWithProgress.length
          )
        : 0

    // Count long-running requests (active requests older than 7 days)
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const longRunningRequests = requests.filter(r => {
      const isActive = r.status?.toLowerCase() === 'open' || r.status?.toLowerCase() === 'in_progress'

      if (!isActive) return false

      const createdDate = new Date(r.createdAt)
      const isLongRunning = createdDate < sevenDaysAgo

      return isLongRunning
    }).length

    console.log(
      `[MyRequests] Long-running analysis: ${longRunningRequests} requests older than 7 days out of ${requests.length} total`
    )

    // Calculate trend data for enhanced KPI cards
    const previousPeriodRequests = requests.filter(r => {
      const createdDate = new Date(r.createdAt)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
      return createdDate >= sixtyDaysAgo && createdDate < thirtyDaysAgo
    }).length

    const currentPeriodRequests = requests.filter(r => {
      const createdDate = new Date(r.createdAt)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return createdDate >= thirtyDaysAgo
    }).length

    const requestsTrend =
      previousPeriodRequests > 0 ? ((currentPeriodRequests - previousPeriodRequests) / previousPeriodRequests) * 100 : 0

    return [
      {
        id: 'total-requests',
        title: 'Total Requests',
        value: totalRequests,
        icon: <FileTextIcon className="gba:w-4 gba:h-4" />,
        footer: 'All submitted requests',
        trend:
          totalRequests > 0
            ? {
                value: `${requestsTrend > 0 ? '+' : ''}${requestsTrend.toFixed(1)}%`,
                positive: requestsTrend >= 0,
                description: 'vs last 30 days'
              }
            : undefined
      },
      {
        id: 'active-requests',
        title: 'Active Requests',
        value: activeRequests,
        icon: <ClockCounterClockwiseIcon className="gba:w-4 gba:h-4" />,
        footer: 'Currently being processed',
        trend:
          activeRequests > 0
            ? {
                value: `${activeRequests}/${totalRequests}`,
                positive: activeRequests < totalRequests * 0.8, // Good if less than 80% are active
                description: 'of total requests',
                badgeVariant:
                  activeRequests === 0
                    ? 'success'
                    : activeRequests < totalRequests * 0.5
                      ? 'info'
                      : activeRequests < totalRequests * 0.8
                        ? 'warning'
                        : 'destructive'
              }
            : undefined
      },
      {
        id: 'avg-progress',
        title: 'Average Progress',
        value: avgProgress,
        suffix: '%',
        icon: <CheckCircleIcon className="gba:w-4 gba:h-4" />,
        footer: 'Completion of active requests',
        progress:
          activeRequests > 0
            ? {
                value: avgProgress,
                target: 100,
                label: `${avgProgress}% average completion`
              }
            : undefined,
        trend:
          avgProgress > 0
            ? {
                value: `${avgProgress}%`,
                positive: avgProgress >= 50,
                description:
                  avgProgress >= 75
                    ? 'Excellent progress'
                    : avgProgress >= 50
                      ? 'Good progress'
                      : avgProgress >= 25
                        ? 'Moderate progress'
                        : 'Early stage',
                badgeVariant:
                  avgProgress >= 75 ? 'success' : avgProgress >= 50 ? 'info' : avgProgress >= 25 ? 'warning' : 'default'
              }
            : undefined
      },
      {
        id: 'completion-rate',
        title: 'Completion Rate',
        value: totalRequests > 0 ? Math.round((completedRequests / totalRequests) * 100) : 0,
        suffix: '%',
        icon: <CheckCircleIcon className="gba:w-4 gba:h-4" />,
        footer: `${completedRequests} of ${totalRequests} completed`,
        trend:
          completedRequests > 0
            ? {
                value: `${completedRequests}`,
                positive: completedRequests > rejectedRequests,
                description: rejectedRequests > 0 ? `${rejectedRequests} rejected` : 'All successful',
                badgeVariant:
                  rejectedRequests === 0 ? 'success' : completedRequests > rejectedRequests * 3 ? 'info' : 'warning'
              }
            : undefined,
        progress:
          totalRequests > 0
            ? {
                value: Math.round((completedRequests / totalRequests) * 100),
                target: 100,
                label: `${completedRequests}/${totalRequests} requests completed`
              }
            : undefined
      }
    ]
  }, [requests])

  // Column configuration for MyRequestsTable
  const myRequestsColumns: ColumnConfig[] = useMemo(
    () => [
      {
        id: 'requestId',
        label: 'Request ID',
        visible: true
        // Will be marked as disabled (non-togglable) in MyRequestsTable
      },
      {
        id: 'name',
        label: 'Service',
        visible: true
        // Will be marked as disabled (non-togglable) in MyRequestsTable
      },
      {
        id: 'comments',
        label: 'Comments',
        visible: true
        // Togglable - can be hidden/shown by user
      },
      {
        id: 'progress',
        label: 'Progress',
        visible: true
        // Togglable - can be hidden/shown by user
      },
      {
        id: 'category',
        label: 'Category',
        visible: true
        // Togglable - can be hidden/shown by user
      },
      {
        id: 'status',
        label: 'Status',
        visible: true
        // Will be marked as disabled (non-togglable) in MyRequestsTable
      },
      {
        id: 'createdAt',
        label: 'Created',
        visible: true
        // Togglable - can be hidden/shown by user
      }
    ],
    []
  )

  // Filter groups for My Requests
  const myRequestsFilterGroups: FilterGroup[] = useMemo(() => {
    // Get unique statuses from requests
    const uniqueStatuses = [...new Set(requests.map(r => r.status))]
    const statusFilters = uniqueStatuses.map(status => ({
      id: `status:${status}`,
      label: formatStatusText(status.toUpperCase()),
      value: status,
      selected: false
    }))

    // Get unique categories from requests
    const uniqueCategories = [...new Set(requests.map(r => r.categoryIdSnapshot || 'general'))]
    const categoryFilters = uniqueCategories.map(category => ({
      id: `category:${category}`,
      label: category.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: category,
      selected: false
    }))

    // Progress-based filters
    const progressFilters = [
      { id: 'progress:not-started', label: 'Not Started (0%)', value: 'not-started', selected: false },
      { id: 'progress:in-progress', label: 'In Progress (1-99%)', value: 'in-progress', selected: false },
      { id: 'progress:completed', label: 'Completed (100%)', value: 'completed', selected: false }
    ]

    return [
      {
        id: 'status',
        title: 'Status',
        filters: statusFilters
      },
      {
        id: 'category',
        title: 'Category',
        filters: categoryFilters
      },
      {
        id: 'progress',
        title: 'Progress',
        filters: progressFilters
      }
    ]
  }, [requests])

  // Actions for My Requests
  const myRequestsActions: RequestAction[] = useMemo(
    () => [
      {
        type: 'view',
        label: 'View Details',
        icon: <FileTextIcon className="gba:w-4 gba:h-4" />,
        onClick: (request: SubmittedRequest) => handleViewRequest(request),
        show: () => true,
        disabled: () => false
      }
    ],
    []
  )

  if (isLoading) {
    return (
      <PageLayout
        headerPhosphorIcon={{
          icon: ClockCounterClockwiseIcon,
          variant: 'strategy',
          size: 'lg',
          label: 'My Requests'
        }}
        headerTitle="My Requests"
        headerDescription="Loading your service requests..."
      >
        <div className="gba:flex gba:justify-center gba:items-center gba:h-32">
          <Spinner size="lg" />
        </div>
      </PageLayout>
    )
  }

  if (error) {
    return (
      <div data-testid="my-requests-error-container" className="gba:bg-background gba:p-4">
        {/* Back navigation */}
        <div className="gba:back-navigation gba:mb-4">
          <button
            onClick={onBack}
            className="gba:flex gba:items-center gba:text-blue-500 gba:hover:text-blue-600"
            data-testid="back-button"
          >
            <ArrowLeftIcon className="gba:mr-2" />
            <span>Back to Portal</span>
          </button>
        </div>

        <PageLayout
          headerPhosphorIcon={{
            icon: XCircleIcon,
            variant: 'strategy',
            size: 'lg',
            label: 'Error'
          }}
          headerTitle="Error Loading Requests"
          headerDescription="Failed to load your service requests"
        >
          <Alert variant="destructive">
            <h4 className="gba:font-semibold">Failed to Load Requests</h4>
            <p>{error}</p>
            <div className="gba:mt-4">
              <Button variant="outline" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </Alert>
        </PageLayout>
      </div>
    )
  }

  return (
    <div data-testid="my-requests-container" className="gba:bg-background gba:p-4 gba:transition-all gba:duration-300">
      {/* Back navigation */}
      <div className="gba:back-navigation gba:mb-4">
        <button
          onClick={onBack}
          className="gba:flex gba:items-center gba:text-blue-500 gba:hover:text-blue-600"
          data-testid="back-button"
        >
          <ArrowLeftIcon className="gba:mr-2" />
          <span>Back to Portal</span>
        </button>
      </div>

      <PageLayout
        headerPhosphorIcon={{
          icon: ClockCounterClockwiseIcon,
          variant: 'strategy',
          size: 'lg',
          label: 'My Requests'
        }}
        headerTitle="My Requests"
        headerDescription="Track the status of your submitted service requests"
        sectionTitle="Request Statistics"
        sectionDescription="Overview of your service requests"
        kpiCardsContent={<SectionKpiCards cards={kpiCards} className="gba:mb-6" />}
      >
        <div>
          {/* Request List */}
          <div className="gba:space-y-6">
            {requests.length > 0 ? (
              <div className="gba:space-y-4">
                <h3 className="gba:text-lg gba:font-semibold">All Requests</h3>
                <MyRequestsTable
                  requests={requests}
                  isLoading={isLoading}
                  tableId="myRequests"
                  customColumns={myRequestsColumns}
                  filterGroups={myRequestsFilterGroups}
                  actions={myRequestsActions}
                  onRequestSelect={handleViewRequest}
                  showDebug={false}
                  emptyMessage="No service requests found"
                  emptySearchMessage="No requests match your search criteria"
                  accessToken={contextProps.accessToken}
                  userInfo={contextProps.userInfo}
                  workflowEngine={workflowEngine}
                />
              </div>
            ) : (
              <div className="gba:text-center gba:py-12">
                <ClockCounterClockwiseIcon className="gba:mx-auto gba:h-16 gba:w-16 gba:text-muted-foreground gba:mb-4" />
                <h3 className="gba:text-lg gba:font-semibold gba:mb-2">No Requests Yet</h3>
                <p className="gba:text-muted-foreground gba:mb-6">
                  You haven't submitted any service requests yet. Get started by browsing our service catalog.
                </p>
                <Button
                  onClick={() => {
                    handleCloseDrawer()
                    onBack()
                  }}
                >
                  Browse Service Catalog
                </Button>
              </div>
            )}
          </div>
        </div>
      </PageLayout>

      {/* Request Details Drawer */}
      <>
        {/* Overlay */}
        <div
          className="gba:fixed gba:inset-0 gba:bg-black/30 gba:backdrop-blur-sm"
          style={{
            top: '48px',
            zIndex: isDrawerOpen ? 999 : -1,
            opacity: isDrawerOpen ? 1 : 0,
            transition: 'opacity 300ms ease-in-out',
            pointerEvents: isDrawerOpen ? 'auto' : 'none'
          }}
          onClick={handleCloseDrawer}
        />

        {/* Drawer */}
        <div
          className="gba:fixed gba:right-0 gba:flex gba:flex-col gba:bg-background gba:shadow-2xl gba:border-l gba:border-border"
          style={{
            top: '48px',
            height: 'calc(100vh - 48px)',
            width: '800px',
            maxWidth: '95vw',
            zIndex: 1000,
            transform: isDrawerOpen ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 300ms ease-in-out'
          }}
        >
          {/* Drawer Header */}
          <div className="gba:flex gba:items-center gba:justify-between gba:p-6 gba:border-b gba:border-border gba:bg-muted">
            <div>
              <h3 className="gba:text-xl gba:font-bold gba:m-0 gba:text-foreground">Request Details</h3>
              {selectedRequest && (
                <div className="gba:flex gba:items-center gba:gap-1 gba:mt-1 gba:text-xs gba:text-muted-foreground">
                  <WifiHighIcon size={12} />
                  <span>Live data • Auto-refresh: 30s</span>
                </div>
              )}
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={e => {
                  e.stopPropagation()
                  // Manual refresh trigger - will be handled by the timeline component
                  const refreshEvent = new CustomEvent('refreshRequestTimeline')
                  window.dispatchEvent(refreshEvent)
                }}
                className="gba:flex gba:items-center gba:gap-2"
                data-testid="refresh-request-data-button"
              >
                <ArrowClockwiseIcon size={16} />
                Refresh Data
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseDrawer}
                className="gba:p-2 gba:rounded-md gba:cursor-pointer"
                data-testid="close-drawer-button"
              >
                <XIcon size={20} />
              </Button>
            </div>
          </div>

          {/* Drawer Content */}
          <div className="gba:flex-1 gba:overflow-y-auto gba:p-6 gba:bg-background">
            {selectedRequest && isDrawerOpen && (
              <RequestTimeline request={selectedRequest} contextProps={{ ...contextProps, workflowEngine }} />
            )}
          </div>
        </div>
      </>
    </div>
  )
}
