'use client'

import React, { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import { Employee, EmployeeFeedback } from '../../hooks/useEmployeeData'
import { Card, Avatar } from '@newwork/gravity-ui-catalog'
import { Empty, Spin, Input, Select, Rate } from 'antd'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { employeeFeedbackQuery } from '../../queries/feedbackQueries'
import { AppActionMenu } from '@/components/app-action-menu'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { UserInfoProps } from '../../../../../../../common/BusinessAppContext'
import { CalendarOutlined, SearchOutlined, DownloadOutlined, DownOutlined, UpOutlined } from '@ant-design/icons'
import Pill from '@/components/pill/Pill'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { useFlowExecutionTasks } from '@/business-apps/fin/expenses/apps/manager-expenses/hooks/useFlowExecutionTasks'
import { PiPencilSimple } from 'react-icons/pi'

// Normalize avatar source into a valid image URL
const toAvatarSrc = (thumb?: string | null): string | undefined => {
  if (!thumb) return undefined
  const t = thumb.trim()
  if (!t) return undefined
  if (t.startsWith('http://') || t.startsWith('https://')) return t
  if (t.startsWith('data:image')) return t // already a data URL
  // Detect common base64 signatures
  const sig = t.slice(0, 12)
  let mime = 'image/jpeg'
  if (sig.startsWith('/9j/'))
    mime = 'image/jpeg' // JPEG
  else if (sig.startsWith('iVBORw0KGgo'))
    mime = 'image/png' // PNG
  else if (sig.startsWith('R0lGOD'))
    mime = 'image/gif' // GIF
  else if (sig.startsWith('Qk')) mime = 'image/bmp' // BMP
  return `data:${mime};base64,${t}`
}

interface FeedbackTabProps {
  employee: Employee
  accessToken: string
  employeeId?: string // Optional employeeId override for permissions check
  userInfo?: UserInfoProps // Current user info for self-view check
  employeeFeedback?: EmployeeFeedback[]
  isSelfView: boolean // Whether user is viewing their own profile
}

// Extended feedback interface with additional fields
interface ExtendedEmployeeFeedback extends EmployeeFeedback {
  id: string
  rating?: number
  private?: boolean
  type?: string
}

// Interface for feedback requests
interface FeedbackRequest {
  id: string
  requestedOn?: string
  dueDate?: string
  recordState?: string | null
  message?: string | null
  reviewerNames?: string[] | null
  taskName?: string | null
  taskTitle?: string | null
  feedbackText?: string | null
  creatorName?: string | null
  creatorEmployeeId?: string | null
  employeeFeedbackRequestReviewer?: Array<{
    id: string
    reviewerEmployeeId?: string
    reviewerEmployee?: {
      id: string
      firstName?: string | null
      lastName?: string | null
      employeePosition?: {
        employee?: { pictureThumbnail?: string | null } | null
      } | null
    } | null
  }>
}

// Formatted feedback for display
interface FormattedFeedback {
  id?: string
  sender: string
  date: string
  content: string
  avatar?: string | null
  senderId?: string
  firstName: string
  lastName: string
  rating?: number

  private?: boolean
  feedbackPublic?: boolean | null
  type?: string
}

/**
 * Feedback Tab Component
 * Displays feedback for the employee
 */
const FeedbackTab: React.FC<FeedbackTabProps> = ({
  employee,
  accessToken,
  userInfo,
  employeeFeedback = [],
  isSelfView = false // Default to false if not provided
}) => {
  // State variables for feedback and requests
  const [localFeedback, setLocalFeedback] = useState<ExtendedEmployeeFeedback[]>([])
  const [feedbackRequests, setFeedbackRequests] = useState<FeedbackRequest[]>([])
  const [showAllReceivedRequests, setShowAllReceivedRequests] = useState<boolean>(false)
  // No local state needed for approval tasks in this column
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('all')

  // Filters for requests (currently not displayed)

  // Initialize GraphQL client
  const graphQLClient = useGraphqlClient(accessToken)

  // Fetch feedback data
  const fetchFeedbackData = async () => {
    if (!employee?.id) return

    try {
      setLoading(true)
      setError(null)

      const response = await graphQLClient.request(employeeFeedbackQuery, { employeeId: employee.id })

      if (response) {
        const feedbackData = response.EmployeeFeedback || []
        console.log(feedbackData, 'feedbackData')
        setLocalFeedback(feedbackData)
      }
    } catch (err) {
      console.error('Error fetching feedback data:', err)
      setError('Failed to load feedback data')
    } finally {
      setLoading(false)
    }
  }

  // Load approval tasks (feedback you received to complete)
  const { tasks: feedbackTasks } = useFlowExecutionTasks({ accessToken, userInfo } as any, {
    currentPage: 1,
    pageSize: 20,
    searchTerm: '',
    filterTaskName: 'enterRequestedFeedback'
  })

  // GraphQL: Feedback you requested (second column)
  const [requestedFeedback, setRequestedFeedback] = useState<FeedbackRequest[]>([])
  const [requestsLoadingApproval, setRequestsLoadingApproval] = useState<boolean>(false)
  const [requestsErrorApproval, setRequestsErrorApproval] = useState<string | null>(null)

  const EMPLOYEE_FEEDBACK_REQUESTS_QUERY = `
    query MyQuery($idEmployee: uuid!) {
      EmployeeFeedbackRequest(where: {employeeId: {_eq: $idEmployee}}, orderBy: {createdAt: DESC}) {
        createdBy
        createdAt
        additionalProperties
        message
        recordState
        updatedBy
        updatedAt
        requesterEmployeeId
        employeeId
        requesterEmployee { displayName }
      }
    }
  `

  const fetchRequestedFeedback = async () => {
    if (!employee?.id) return
    try {
      setRequestsLoadingApproval(true)
      setRequestsErrorApproval(null)
      const res = await graphQLClient.request<any>(EMPLOYEE_FEEDBACK_REQUESTS_QUERY, {
        idEmployee: employee.id
      })
      const rows: any[] = res?.EmployeeFeedbackRequest || []
      const mapped: FeedbackRequest[] = rows.map((r: any, idx: number) => ({
        id: `${r.requesterEmployeeId || 'req'}-${r.createdAt || idx}`,
        requestedOn: r.createdAt,
        recordState: r.recordState,
        message: r.message,
        taskTitle: 'Approve Feedback',
        feedbackText: r.message,
        creatorName: r?.requesterEmployee?.displayName || null,
        creatorEmployeeId: r?.requesterEmployeeId || null
      }))
      setRequestedFeedback(mapped)
    } catch (e: any) {
      setRequestsErrorApproval(e?.message || 'Failed to load requested feedback')
    } finally {
      setRequestsLoadingApproval(false)
    }
  }

  // Format feedback data and apply statistics calculation when data changes

  useEffect(() => {
    // Initialize with props if available, otherwise fetch from API
    if (employeeFeedback?.length) {
      console.log(employeeFeedback, 'employeeFeedback')
      setLocalFeedback(employeeFeedback as ExtendedEmployeeFeedback[])
    } else {
      fetchFeedbackData()
    }
  }, [employee?.id, accessToken])

  // Map flow tasks to FeedbackRequest whenever they change
  useEffect(() => {
    const mapped: FeedbackRequest[] = (feedbackTasks || []).map((t: any) => ({
      id: String(t.id),
      requestedOn: t.started || t.createdAt,
      dueDate: t.dueDate,
      recordState: t.state || t.status || null,
      message: t.description || t.referenceName || t.name || null,
      reviewerNames: Array.isArray(t.assigneeNames) ? t.assigneeNames : null,
      taskName: t.name || null,
      taskTitle: t.referenceName || null,
      feedbackText: t?.inputs?.feedback?.feedback || null,
      creatorName: t?.creatorName || null
    }))
    setFeedbackRequests(mapped)
  }, [feedbackTasks])

  useEffect(() => {
    fetchRequestedFeedback()
  }, [employee?.id])

  // Expand/collapse state for approval requests
  const [showAllApprovalRequests, setShowAllApprovalRequests] = useState<boolean>(false)

  // Format feedback for display
  const formatFeedback = (): FormattedFeedback[] => {
    if (!localFeedback?.length) return []
    console.log(localFeedback, 'localFeedback')

    return localFeedback.map(feedback => {
      const sender = `${feedback.senderEmployee?.firstName || ''} ${feedback.senderEmployee?.lastName || ''}`.trim()
      const date = feedback.feedbackDate ? dayjs(feedback.feedbackDate).format('MMMM D, YYYY') : 'Unknown date'
      const content = feedback.feedback || 'No feedback content'

      // Access pictureThumbnail through the correct path based on the GraphQL query structure
      const avatar = feedback.senderEmployee?.employeePosition?.employee?.pictureThumbnail || null
      const firstName = feedback.senderEmployee?.firstName || ''
      const lastName = feedback.senderEmployee?.lastName || ''

      return {
        id: feedback.id,
        sender,
        date,
        content,
        avatar,
        senderId: feedback.senderEmployeeId,
        firstName,
        lastName,
        rating: feedback.rating,
        private: (feedback as any).feedbackPublic === false,
        feedbackPublic: (feedback as any).feedbackPublic,
        type: ((feedback as any)?.type?.value as string) || (feedback as any).typeRef
      }
    })
  }

  // Process feedback data for display
  const allFormattedFeedback = formatFeedback()

  // Initial loading/error handling for the entire tab
  if (loading && !allFormattedFeedback.length) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-40" data-testid="feedback-loading">
        <Spin size="large" />
      </div>
    )
  }

  // Note: Do not early-return error when there is no feedback; prefer empty state

  // Filter feedback based on search and filter criteria
  const formattedFilteredFeedback = allFormattedFeedback.filter(feedback => {
    const matchesSearch =
      searchTerm === '' ||
      feedback.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.lastName.toLowerCase().includes(searchTerm.toLowerCase())

    // Use feedbackPublic: explicitly treat false as Private; any other value as Public
    const isPrivate = feedback.feedbackPublic === false
    if (!isSelfView && isPrivate) {
      return false
    }
    const matchesFilter =
      filterType === 'all' || (filterType === 'private' && isPrivate) || (filterType === 'public' && !isPrivate)

    return matchesSearch && matchesFilter
  })

  return (
    <div className="gba:space-y-8 gba:pb-6" data-testid="feedback-tab">
      {/* Header Section */}
      <div className="gba:bg-muted gba:p-6 gba:rounded-lg gba:shadow-sm" data-testid="feedback-header">
        <div className="gba:flex gba:flex-col gba:sm:flex-row gba:justify-between gba:items-start gba:gap-4">
          <div className="gba:max-w-2xl">
            <h2 className="gba:text-2xl gba:font-semibold gba:text-foreground" data-testid="feedback-title">
              {getTranslationFromI18nKeyAndLabel('lowcoder:hr_performance.feedback_tab_title', 'Feedback')}
            </h2>
            <p className="gba:text-muted-foreground gba:mt-2" data-testid="feedback-description">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:hr_performance.feedback_tab_description',
                'Give and receive feedback from colleagues and managers to improve performance.'
              )}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="gba:flex gba:gap-2 gba:self-start">
            {/* Request Feedback Button - Only shown when viewing own profile */}
            {isSelfView && (
              <div>
                <AppActionMenu
                  data-testid="employee-feedback-request-button"
                  contextsArray={[FlowContextName.employeeRequestFeedback]}
                  externalContextData={{
                    employeeId: employee?.id,
                    isRequestingFeedback: true
                  }}
                  prefixDataTestId="request-feedback"
                  accessToken={accessToken}
                  autoExecuteSingleAction={true}
                >
                  <div className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer">
                    <PiPencilSimple />
                    {getTranslationFromI18nKeyAndLabel('lowcoder:hr_performance.request_feedback', 'Request Feedback')}
                  </div>
                </AppActionMenu>
              </div>
            )}

            {/* Give Feedback Button */}
            <div>
              <AppActionMenu
                data-testid="employee-feedback-give-button"
                contextsArray={[FlowContextName.employeeGiveFeedback]}
                externalContextData={{
                  employeeId: employee?.id
                }}
                prefixDataTestId="add-feedback"
                accessToken={accessToken}
                autoExecuteSingleAction={true}
              >
                <div className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer">
                  <PiPencilSimple />
                  {getTranslationFromI18nKeyAndLabel('lowcoder:hr_performance.give_feedback', 'Give Feedback')}
                </div>
              </AppActionMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Requests Section */}
      <div className="gba:space-y-6 " data-testid="feedback-requests-section">
        <div className="gba:flex gba:items-center">
          <h3 className="gba:text-xl gba:font-semibold">Feedback Requests</h3>
        </div>

        {/* Two-column layout: received (left) and approvals (right) */}
        <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6 gba:px-4 gba:py-2">
          <div>
            <div className="gba:flex gba:items-center gba:justify-start gba:gap-2 gba:mb-2">
              <h4 className="gba:text-base gba:font-medium">Feedback requests you received</h4>
              {feedbackRequests.length > 3 && (
                <button
                  type="button"
                  className="gba:text-blue-600 hover:gba:text-blue-800"
                  onClick={() => setShowAllReceivedRequests(v => !v)}
                  data-testid="received-requests-toggle"
                  aria-label={showAllReceivedRequests ? 'Collapse' : 'Expand'}
                >
                  {showAllReceivedRequests ? <UpOutlined /> : <DownOutlined />}
                </button>
              )}
            </div>
            {loading ? (
              <div className="gba:flex gba:justify-center gba:items-center gba:h-40">
                <Spin size="default" />
              </div>
            ) : error ? (
              <div className="gba:text-red-500">{error}</div>
            ) : feedbackRequests.length === 0 ? (
              <Empty description="No feedback requests" />
            ) : (
              <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:items-stretch">
                {(showAllReceivedRequests ? feedbackRequests : feedbackRequests.slice(0, 3)).map(
                  (request: FeedbackRequest, index: number) => (
                    <Card
                      key={request.id}
                      className="gba:shadow-sm gba:hover:shadow-md gba:transition-shadow gba:h-full"
                      bodyStyle={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                      data-testid={`received-request-card-${index}`}
                    >
                      <div className="gba:flex gba:flex-col gba:gap-4 gba:h-full">
                        {/* Request Header */}
                        <div className="gba:flex gba:justify-between gba:items-start gba:w-full">
                          <div className="gba:flex gba:flex-col gba:gap-1">
                            {/* Title/Name swap */}
                            <div className="gba:font-medium" data-testid={`request-message-${index}`}>
                              {request.taskTitle || 'Enter Requested Employee Feedback'}
                            </div>
                            {request.feedbackText && (
                              <div className="gba:text-sm gba:text-gray-600" data-testid={`request-subtitle-${index}`}>
                                {request.feedbackText}
                              </div>
                            )}

                            {/* Request date */}
                            {request.requestedOn && (
                              <div className="gba:flex gba:items-center gba:gap-1 gba:text-gray-500 gba:text-sm">
                                <span data-testid={`received-request-date-${index}`}>
                                  {`Requested on ${dayjs(request.requestedOn).format('DD/MM/YYYY')}`}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Reviewers and Action */}
                        <div className="gba:flex gba:justify-between gba:items-center gba:w-full gba:mt-auto">
                          {/* Creator name preferred; fallback to reviewers */}
                          <div className="gba:flex gba:flex-col gba:gap-1">
                            {request.creatorName ? (
                              <button
                                className="gba:text-sm gba:text-gray-700 hover:gba:underline"
                                data-testid={`received-creator-name-${index}`}
                                onClick={() =>
                                  navigateTo(
                                    buildPlatformUrl('/platform/employee-record', {
                                      appName: 'employee-profile',
                                      employeeId: request.creatorEmployeeId || ''
                                    })
                                  )
                                }
                              >
                                {request.creatorName}
                              </button>
                            ) : Array.isArray(request.employeeFeedbackRequestReviewer) &&
                              request.employeeFeedbackRequestReviewer.length > 0 ? (
                              <div className="gba:flex gba:gap-2">
                                {request.employeeFeedbackRequestReviewer.map((rev: any, ridx: number) => {
                                  const r = rev.reviewerEmployee
                                  const first = r?.firstName || ''
                                  const last = r?.lastName || ''
                                  const pic = r?.employeePosition?.employee?.pictureThumbnail || null
                                  return (
                                    <div
                                      key={rev.id || ridx}
                                      className="gba:w-8 gba:h-8"
                                      data-testid={`received-reviewer-avatar-${index}-${ridx}`}
                                    >
                                      <Avatar
                                        src={toAvatarSrc(pic || undefined)}
                                        initials={`${first?.[0] || ''}${last?.[0] || ''}`}
                                        alt={`${first} ${last}`}
                                        // @ts-expect-error gravity-ui-catalog Avatar allows non-typed contentType
                                        contentType={pic ? 'image' : 'initials'}
                                        // @ts-expect-error gravity-ui-catalog Avatar supports numeric/string size tokens
                                        size="md"
                                        // @ts-expect-error gravity-ui-catalog Avatar supports circle shape
                                        shape="circle"
                                        // @ts-expect-error gravity-ui-catalog Avatar supports appearance prop
                                        appearance="gradient"
                                      />
                                    </div>
                                  )
                                })}
                              </div>
                            ) : Array.isArray(request.reviewerNames) && request.reviewerNames.length > 0 ? (
                              <div className="gba:flex gba:flex-wrap gba:gap-2">
                                {request.reviewerNames.map((name: string, nIdx: number) => (
                                  <span
                                    key={`${index}-name-${nIdx}`}
                                    className="gba:text-sm gba:text-gray-700"
                                    data-testid={`received-reviewer-name-${index}-${nIdx}`}
                                  >
                                    {name}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>

                          {/* Respond Action */}
                          <div className="gba:self-end">
                            <AppActionMenu
                              data-testid={`respond-received-request-button-${index}`}
                              contextsArray={[FlowContextName.employeeGiveFeedback]}
                              externalContextData={{
                                employeeId: employee?.id,
                                requestId: request.id
                              }}
                              prefixDataTestId={`respond-received-request-${index}`}
                              accessToken={accessToken}
                              autoExecuteSingleAction={true}
                            >
                              <div className="gba:cursor-pointer">Respond</div>
                            </AppActionMenu>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                )}
              </div>
            )}
          </div>

          <div>
            <div className="gba:flex gba:items-center gba:justify-start gba:gap-2 gba:mb-2">
              <h4 className="gba:text-base gba:font-medium">Feedback you requested</h4>
              {requestedFeedback.length > 3 && (
                <button
                  type="button"
                  className="gba:text-blue-600 hover:gba:text-blue-800"
                  onClick={() => setShowAllApprovalRequests(v => !v)}
                  data-testid="approval-requests-toggle"
                  aria-label={showAllApprovalRequests ? 'Collapse' : 'Expand'}
                >
                  {showAllApprovalRequests ? <UpOutlined /> : <DownOutlined />}
                </button>
              )}
            </div>
            {requestsLoadingApproval ? (
              <div className="gba:flex gba:justify-center gba:items-center gba:h-40">
                <Spin size="default" />
              </div>
            ) : requestsErrorApproval ? (
              <div className="gba:text-red-500">{requestsErrorApproval}</div>
            ) : requestedFeedback.length === 0 ? (
              <Empty description="No approval requests" />
            ) : (
              <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:items-stretch">
                {(showAllApprovalRequests ? requestedFeedback : requestedFeedback.slice(0, 3)).map((request, index) => (
                  <Card
                    key={request.id}
                    className="gba:shadow-sm gba:hover:shadow-md gba:transition-shadow gba:h-full"
                    bodyStyle={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                    data-testid={`approval-request-card-${index}`}
                  >
                    <div className="gba:flex gba:flex-col gba:gap-4 gba:h-full">
                      {/* Request Header */}
                      <div className="gba:flex gba:justify-between gba:items-start gba:w-full">
                        <div className="gba:flex gba:flex-col gba:gap-1">
                          {/* Status Badge */}
                          {/* Status pill removed as requested */}

                          {/* Fixed title for requested feedback cards */}
                          <div className="gba:font-medium" data-testid={`request-message-${index}`}>
                            Requested Feedback
                          </div>
                          {request.feedbackText && (
                            <div className="gba:text-sm gba:text-gray-600" data-testid={`request-subtitle-${index}`}>
                              {request.feedbackText}
                            </div>
                          )}

                          {/* Due Date */}
                          <div className="gba:flex gba:items-center gba:gap-1 gba:text-gray-500 gba:text-sm">
                            <span data-testid={`approval-request-due-${index}`}>
                              {request.dueDate
                                ? `Due by ${dayjs(request.dueDate).format('DD/MM/YYYY')}`
                                : request.requestedOn
                                  ? `Requested on ${dayjs(request.requestedOn).format('DD/MM/YYYY')}`
                                  : ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Reviewers and Action */}
                      <div className="gba:flex gba:justify-between gba:items-center gba:w-full gba:mt-auto">
                        {/* Creator name preferred; fallback to reviewers */}
                        <div className="gba:flex gba:flex-col gba:gap-1">
                          {request.creatorName ? (
                            <button
                              className="gba:text-sm gba:text-gray-700 hover:gba:underline"
                              data-testid={`approval-creator-name-${index}`}
                              onClick={() =>
                                navigateTo(
                                  buildPlatformUrl('/platform/employee-record', {
                                    appName: 'employee-profile',
                                    employeeId: request.creatorEmployeeId || ''
                                  })
                                )
                              }
                            >
                              {request.creatorName}
                            </button>
                          ) : Array.isArray(request.employeeFeedbackRequestReviewer) &&
                            request.employeeFeedbackRequestReviewer.length > 0 ? (
                            <div className="gba:flex gba:gap-2">
                              {request.employeeFeedbackRequestReviewer.map((rev, ridx) => {
                                const r = rev.reviewerEmployee
                                const first = r?.firstName || ''
                                const last = r?.lastName || ''
                                const pic = r?.employeePosition?.employee?.pictureThumbnail || null
                                return (
                                  <div
                                    key={rev.id || ridx}
                                    className="gba:w-8 gba:h-8"
                                    data-testid={`reviewer-avatar-${index}-${ridx}`}
                                  >
                                    <Avatar
                                      src={toAvatarSrc(pic || undefined)}
                                      initials={`${first?.[0] || ''}${last?.[0] || ''}`}
                                      alt={`${first} ${last}`}
                                      // @ts-expect-error gravity-ui-catalog Avatar allows non-typed contentType
                                      contentType={pic ? 'image' : 'initials'}
                                      // @ts-expect-error gravity-ui-catalog Avatar supports numeric/string size tokens
                                      size="md"
                                      // @ts-expect-error gravity-ui-catalog Avatar supports circle shape
                                      shape="circle"
                                      // @ts-expect-error gravity-ui-catalog Avatar supports appearance prop
                                      appearance="gradient"
                                    />
                                  </div>
                                )
                              })}
                            </div>
                          ) : null}
                        </div>

                        {/* Status pill (recordState) instead of Respond button */}
                        <div className="gba:self-end">
                          {(() => {
                            const state = (request.recordState || '').toString().toLowerCase()
                            const statusText = state ? state.charAt(0).toUpperCase() + state.slice(1) : 'Unknown'
                            // Force pending look for all statuses
                            const pillType = 'waiting'
                            return (
                              <Pill
                                label={statusText}
                                type={pillType}
                                data-testid={`approval-request-status-${index}`}
                              />
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feedback History Section */}
      <div className="gba:space-y-6" data-testid="feedback-history-section">
        <div className="gba:flex gba:justify-between gba:items-center">
          <h3 className="gba:text-xl gba:font-semibold">Feedback History</h3>

          <div className="gba:flex gba:items-center gba:gap-4">
            {/* Export Button */}
            <button
              className="gba:flex gba:items-center gba:gap-2 gba:text-info gba:hover:text-blue-800 gba:transition-colors gba:px-3 gba:py-1.5 gba:rounded-md gba:border gba:border-border gba:hover:border-blue-300"
              data-testid="export-feedback-button"
              onClick={() => console.log('Export feedback')}
            >
              <DownloadOutlined /> Export
            </button>

            {/* Search Input */}
            <Input
              placeholder="Search feedback"
              prefix={<SearchOutlined className="gba:text-muted-foreground" />}
              className="gba:w-64 gba:rounded-md"
              data-testid="feedback-search-input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />

            {/* Filter Dropdown */}
            <Select
              defaultValue="all"
              className="gba:w-40"
              data-testid="feedback-filter-select"
              value={filterType}
              onChange={value => setFilterType(value)}
              options={[
                { value: 'all', label: 'All Feedback' },
                { value: 'private', label: 'Private' },
                { value: 'public', label: 'Public' }
              ]}
              suffixIcon={<DownloadOutlined className="gba:text-muted-foreground gba:rotate-180" />}
              popupClassName="gba:rounded-md gba:shadow-lg"
            />
          </div>
        </div>

        {/* Feedback Cards */}
        {loading ? (
          <div className="gba:flex gba:justify-center gba:items-center gba:h-40" data-testid="feedback-loading">
            <Spin size="large" />
          </div>
        ) : formattedFilteredFeedback.length > 0 ? (
          <div className="gba:space-y-4 gba:px-4" data-testid="feedback-list">
            {formattedFilteredFeedback.map((feedback, index) => (
              <Card
                key={feedback.id || index}
                className="gba:shadow-sm gba:hover:shadow-md gba:transition-shadow gba:h-full"
                bodyStyle={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                data-testid={`feedback-card-${index}`}
              >
                <div className="gba:flex gba:items-start gba:gap-4">
                  {/* Avatar */}
                  <div className="gba:shrink-0 gba:mr-2" data-testid="feedback-avatar-container">
                    <Avatar
                      src={toAvatarSrc(feedback.avatar)}
                      initials={`${feedback.firstName?.[0] || ''}${feedback.lastName?.[0] || ''}`}
                      alt={`${feedback.firstName} ${feedback.lastName}`}
                      // @ts-expect-error gravity-ui-catalog Avatar allows non-typed contentType
                      contentType={feedback.avatar ? 'image' : 'initials'}
                      // @ts-expect-error gravity-ui-catalog Avatar supports numeric/string size tokens
                      size="lg"
                      // @ts-expect-error gravity-ui-catalog Avatar supports circle shape
                      shape="circle"
                      // @ts-expect-error gravity-ui-catalog Avatar supports appearance prop
                      appearance="gradient"
                    />
                  </div>

                  {/* Feedback Content */}
                  <div className="gba:flex-grow">
                    <div className="gba:flex gba:items-center gba:flex-wrap gba:gap-2">
                      <span className="gba:font-semibold gba:text-foreground" data-testid={`feedback-sender-${index}`}>
                        {feedback.sender}
                      </span>

                      {/* Type Badge */}
                      {feedback.type && (
                        <span
                          className={
                            'gba:text-xs gba:px-2 gba:py-1 gba:rounded-full gba:font-medium gba:bg-muted gba:text-foreground'
                          }
                          data-testid={`feedback-type-${index}`}
                        >
                          {feedback.type}
                        </span>
                      )}

                      {/* Private Badge */}
                      {feedback.private && (
                        <span
                          className="gba:text-xs gba:px-2 gba:py-1 gba:rounded-full gba:font-medium gba:bg-destructive-secondary gba:text-destructive"
                          data-testid={`feedback-privacy-${index}`}
                        >
                          Private
                        </span>
                      )}
                    </div>

                    <div
                      className="gba:flex gba:items-center gba:gap-1 gba:text-muted-foreground gba:text-sm gba:mt-1"
                      data-testid={`feedback-date-${index}`}
                    >
                      <CalendarOutlined /> {feedback.date}
                    </div>

                    {/* Rating */}
                    {feedback.rating !== undefined && (
                      <div className="gba:my-2">
                        <Rate disabled value={feedback.rating} className="gba:text-warning" />
                      </div>
                    )}

                    <div
                      className="gba:mt-3 gba:text-muted-foreground gba:border-t gba:border-border gba:pt-3"
                      data-testid={`feedback-content-${index}`}
                    >
                      {feedback.content}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <Empty
              description={getTranslationFromI18nKeyAndLabel(
                'lowcoder:hr_performance.no_feedback',
                'No feedback available'
              )}
              data-testid="feedback-empty"
            />
            {error && (
              <div className="gba:text-center gba:text-muted-foreground gba:py-4" data-testid="feedback-error-inline">
                <p>{error}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default FeedbackTab
