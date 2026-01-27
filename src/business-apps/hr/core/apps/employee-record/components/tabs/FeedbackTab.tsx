'use client'

import React, { useState, useEffect } from 'react'
import { Employee, EmployeeFeedback } from '../../hooks/useEmployeeData'
import { Card, Avatar } from '@newwork/gravity-ui-catalog'
import { Button } from '@newwork/nw-design-system'
import { Empty, Spin, Input, Select, Rate, Pagination } from 'antd'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { EMPLOYEE_FEEDBACK_REQUESTS_QUERY_PAGED_WITH_COUNT } from './queries/EmployeeFeedbackRequestQueries'
import { employeeFeedbackQuery } from '../../queries/feedbackQueries'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { startProcess } from '@/common/utils/start-process'
import { UserInfoProps } from '../../../../../../../common/BusinessAppContext'
import { CalendarOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons'
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
  endpoint?: string | null
  processInstanceId?: string | null
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
  // Numeric timestamp for sorting by most recent first
  timestamp?: number
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
  const [receivedCurrentPage, setReceivedCurrentPage] = useState<number>(1)
  const [receivedPageSize, setReceivedPageSize] = useState<number>(3)

  const {
    tasks: feedbackTasks,
    totalCount: receivedTotalCount,
    isLoading: receivedLoading,
    error: receivedError
  } = useFlowExecutionTasks({ accessToken, userInfo } as any, {
    currentPage: receivedCurrentPage,
    pageSize: receivedPageSize,
    searchTerm: '',
    filterTaskName: 'enterRequestedFeedback'
  })

  // GraphQL: Feedback you requested (second column)
  const [requestedFeedback, setRequestedFeedback] = useState<FeedbackRequest[]>([])
  const [requestedTotalCount, setRequestedTotalCount] = useState<number>(0)
  const [requestsLoadingApproval, setRequestsLoadingApproval] = useState<boolean>(false)
  const [requestsErrorApproval, setRequestsErrorApproval] = useState<string | null>(null)
  const [requestedCurrentPage, setRequestedCurrentPage] = useState<number>(1)
  const [requestedPageSize, setRequestedPageSize] = useState<number>(3)

  // Query moved to queries/EmployeeFeedbackRequestQueries.ts

  const fetchRequestedFeedback = async () => {
    if (!employee?.id) return
    try {
      setRequestsLoadingApproval(true)
      setRequestsErrorApproval(null)

      // Fetch enough items to account for COMPLETED items being filtered out
      // Request 3x the page size to ensure we have enough after filtering
      const fetchLimit = requestedPageSize * 3
      const baseOffset = (requestedCurrentPage - 1) * requestedPageSize
      let allFilteredRows: any[] = []
      let currentOffset = baseOffset
      let totalCount: number | undefined
      const maxIterations = 10 // Safety limit to prevent infinite loops

      // Keep fetching until we have enough non-COMPLETED items
      for (let i = 0; i < maxIterations && allFilteredRows.length < requestedPageSize; i++) {
        const res = await graphQLClient.request<any>(EMPLOYEE_FEEDBACK_REQUESTS_QUERY_PAGED_WITH_COUNT, {
          idEmployee: employee.id,
          limit: fetchLimit,
          offset: currentOffset
        })
        const rows: any[] = res?.EmployeeFeedbackRequest || []

        // Get total count from first response (includes COMPLETED items)
        if (i === 0) {
          totalCount = res?.EmployeeFeedbackRequestAggregate?.aggregate?.count
        }

        // Filter out COMPLETED items
        const filteredRows = rows.filter(
          (r: any) => !r.statusRef || r.statusRef !== 'EmployeeFeedbackRequestStatus:v1:COMPLETED'
        )

        allFilteredRows = [...allFilteredRows, ...filteredRows]
        currentOffset += rows.length
      }

      // Set total count (includes COMPLETED, so pagination may show more pages than non-COMPLETED items)
      setRequestedTotalCount(typeof totalCount === 'number' ? totalCount : allFilteredRows.length)

      // Take only the items needed for the current page
      const pageItems = allFilteredRows.slice(0, requestedPageSize)

      const mapped: FeedbackRequest[] = pageItems.map((r: any, idx: number) => ({
        id: `${r.requesterEmployeeId || 'req'}-${r.createdAt || idx}`,
        requestedOn: r.createdAt,
        recordState: r.recordState,
        message: r.message,
        taskTitle: 'Approve Feedback',
        feedbackText: r.message,
        creatorName: r?.requesterEmployee?.displayName || null,
        creatorEmployeeId: r?.requesterEmployee.id || null
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
      setLocalFeedback(employeeFeedback as ExtendedEmployeeFeedback[])
    } else {
      fetchFeedbackData()
    }
  }, [employee?.id, accessToken])

  // Map flow tasks to FeedbackRequest (memoized to avoid re-computation/loops)
  const feedbackRequests: FeedbackRequest[] = React.useMemo(() => {
    return (feedbackTasks || []).map((t: any) => ({
      id: String(t.id),
      requestedOn: t.started || t.createdAt,
      dueDate: t.dueDate,
      recordState: t.state || t.status || null,
      message: t.description || t.referenceName || t.name || null,
      reviewerNames: Array.isArray(t.assigneeNames) ? t.assigneeNames : null,
      taskName: t.name || null,
      taskTitle: t.referenceName || null,
      feedbackText: t?.inputs?.feedback?.feedback || null,
      creatorName: t?.creatorName || null,
      creatorEmployeeId: t?.creatorUserId || t?.inputs?.creatorUserId || t?.inputs?.receiverId || null,
      endpoint: t?.endpoint || null,
      processInstanceId: t?.processInstanceId || null
    }))
  }, [feedbackTasks])

  useEffect(() => {
    fetchRequestedFeedback()
  }, [employee?.id, requestedCurrentPage, requestedPageSize])

  // Respond action handler extracted for readability
  const handleRespondClick = React.useCallback(
    (request: FeedbackRequest) => {
      const endpoint = request.endpoint || ''

      // Extract by splitting the endpoint path: /processes/<domain>/<processName>/<processInstanceId>/...
      let domain = 'employee'
      let processName = 'giveFeedback'
      let processInstanceId: string | undefined = request.processInstanceId || undefined

      const extractFromParts = (parts: string[]) => {
        const idx = parts.indexOf('processes')
        if (idx >= 0 && parts.length > idx + 3) {
          domain = parts[idx + 1]
          processName = parts[idx + 2]
          processInstanceId = parts[idx + 3]
        }
      }

      try {
        // Prefer URL parsing if absolute URL
        const url = new URL(endpoint)
        extractFromParts(url.pathname.split('/').filter(Boolean))
      } catch {
        // Fallback for relative endpoints
        extractFromParts(endpoint.split('/').filter(Boolean))
      }

      startProcess({
        domain,
        processName,
        payload: {
          requestId: request.id,
          employeeId: employee?.id,
          receiverId: request.creatorEmployeeId // The userId of the person who requested the feedback (will receive the response)
        },
        processInstanceId,
        builderType: 'NATIVE_SCREEN'
      })
    },
    [employee?.id]
  )

  // Format feedback for display
  const formatFeedback = (): FormattedFeedback[] => {
    if (!localFeedback?.length) return []

    return localFeedback.map(feedback => {
      const timestamp = feedback.feedbackDate ? Date.parse((feedback as any).feedbackDate) : 0
      const sender = `${feedback.senderEmployee?.firstName || ''} ${feedback.senderEmployee?.lastName || ''}`.trim()
      const date = feedback.feedbackDate
        ? (formatDate(feedback.feedbackDate, 'date.short') ??
          getTranslationFromI18nKeyAndLabel('lowcoder:feedback_tab.requested_on_date', 'Unknown date'))
        : 'Unknown date'
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
        type: ((feedback as any)?.type?.value as string) || (feedback as any).typeRef,
        timestamp
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
  const formattedFilteredFeedback = allFormattedFeedback
    .filter(feedback => {
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
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))

  return (
    <div className="gba:space-y-8 gba:pb-6" data-testid="feedback-tab">
      {/* Header Section - align with standard page headers */}
      <div className="gba:pb-4" data-testid="feedback-header">
        <div className="gba:flex gba:flex-col gba:sm:flex-row gba:justify-between gba:items-center gba:gap-4">
          <div className="gba:max-w-2xl">
            <h2 className="gba:font-bold gba:text-2xl" data-testid="feedback-title">
              {getTranslationFromI18nKeyAndLabel('lowcoder:feedback_tab.feedback_tab_title', 'Feedback')}
            </h2>
            <p className="gba:text-gray-500 gba:text-lg" data-testid="feedback-description">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:feedback_tab.feedback_tab_description',
                'Give and receive feedback from colleagues and managers to improve performance.'
              )}
            </p>
          </div>

          {/* Header Actions - right aligned, inline with title */}
          <div className="gba:flex gba:gap-4 gba:items-center gba:self-center">
            {/* Request Feedback Button - Only shown when viewing own profile */}
            <div>
              <AppAction
                variant="update-primary"
                data-testid="employee-feedback-request-button"
                contexts={[
                  {
                    context: FlowContextName.employeeRequestFeedback,
                    contextData: { employeeId: employee?.id, isRequestingFeedback: true }
                  }
                ]}
                prefixDataTestId="request-feedback"
                accessToken={accessToken}
                autoExecute={true}
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:feedback_tab.request_feedback', 'Request Feedback')}
              </AppAction>
            </div>

            {/* Give Feedback Button */}
            <div>
              <AppAction
                variant="update-primary"
                data-testid="employee-feedback-give-button"
                contexts={[
                  { context: FlowContextName.employeeGiveFeedback, contextData: { employeeId: employee?.id } }
                ]}
                prefixDataTestId="add-feedback"
                accessToken={accessToken}
                autoExecute={true}
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:feedback_tab.give_feedback', 'Give Feedback')}
              </AppAction>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Requests Section - visible only in self view */}
      {isSelfView && (
        <div className="gba:space-y-6 " data-testid="feedback-requests-section">
          <div className="gba:flex gba:items-center">
            <h3 className="gba:text-xl gba:font-semibold">
              {getTranslationFromI18nKeyAndLabel('lowcoder:feedback_tab.section_requests', 'Feedback Requests')}
            </h3>
          </div>

          {/* Two-column layout: received (left) and approvals (right) */}
          <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6 gba:px-4 gba:py-2">
            <div>
              <div className="gba:flex gba:items-center gba:justify-start gba:gap-2 gba:mb-2">
                <h4 className="gba:text-base gba:font-medium">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:feedback_tab.col_received',
                    'Feedback requests you received'
                  )}
                </h4>
              </div>
              {(() => {
                if (receivedLoading) {
                  return (
                    <div className="gba:flex gba:justify-center gba:items-center gba:h-40">
                      <Spin size="default" />
                    </div>
                  )
                }
                if (receivedError) {
                  return <div className="gba:text-red-500">{receivedError}</div>
                }
                if (feedbackRequests.length === 0) {
                  return (
                    <Empty
                      description={getTranslationFromI18nKeyAndLabel(
                        'lowcoder:feedback_tab.no_feedback_requests',
                        'No feedback requests'
                      )}
                    />
                  )
                }
                return (
                  <>
                    <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:items-stretch">
                      {feedbackRequests.map((request: FeedbackRequest) => {
                        const dateLabel = request.requestedOn
                          ? (formatDate(request.requestedOn, 'date.short') ?? '')
                          : ''
                        return (
                          <Card
                            key={request.id}
                            className="gba:shadow-sm gba:hover:shadow-md gba:transition-shadow gba:p-1 gba:cursor-pointer"
                            size="small"
                            data-testid={`received-request-item-${request.id}`}
                            onClick={() => handleRespondClick(request)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={e => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                handleRespondClick(request)
                              }
                            }}
                          >
                            <div className="gba:flex gba:items-center gba:justify-between gba:min-h-10">
                              <div className="gba:flex gba:flex-col">
                                <div className="gba:font-medium" data-testid={`received-request-line-${request.id}`}>
                                  {getTranslationFromI18nKeyAndLabel(
                                    'lowcoder:feedback_tab.from_on_text',
                                    `From ${request.creatorName || ''} on ${dateLabel}`,
                                    {
                                      employee: request.creatorName || '',
                                      date: dateLabel,
                                      interpolation: {
                                        escapeValue: false
                                      }
                                    }
                                  )}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={e => {
                                  e.stopPropagation()
                                  handleRespondClick(request)
                                }}
                                data-testid={`received-request-respond-button-${request.id}`}
                                className="gba:flex gba:items-center gba:gap-2"
                              >
                                <PiPencilSimple />
                                {getTranslationFromI18nKeyAndLabel('lowcoder:feedback_tab.respond', 'Respond')}
                              </Button>
                            </div>
                          </Card>
                        )
                      })}
                    </div>
                    <div className="gba:mt-4 gba:flex gba:justify-end">
                      <Pagination
                        current={receivedCurrentPage}
                        pageSize={receivedPageSize}
                        total={receivedTotalCount || 0}
                        onChange={(page, pageSize) => {
                          setReceivedCurrentPage(page)
                          setReceivedPageSize(pageSize)
                        }}
                        data-testid="received-requests-pagination"
                        showSizeChanger
                        pageSizeOptions={['3', '10', '20', '50']}
                      />
                    </div>
                  </>
                )
              })()}
            </div>

            <div>
              <div className="gba:flex gba:items-center gba:justify-start gba:gap-2 gba:mb-2">
                <h4 className="gba:text-base gba:font-medium">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:feedback_tab.col_requested', 'Feedback you requested')}
                </h4>
              </div>
              {requestsLoadingApproval ? (
                <div className="gba:flex gba:justify-center gba:items-center gba:h-40">
                  <Spin size="default" />
                </div>
              ) : requestsErrorApproval ? (
                <div className="gba:text-red-500">{requestsErrorApproval}</div>
              ) : requestedFeedback.length === 0 ? (
                <Empty
                  description={getTranslationFromI18nKeyAndLabel(
                    'lowcoder:feedback_tab.no_approval_requests',
                    'No approval requests'
                  )}
                />
              ) : (
                <>
                  <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:items-stretch">
                    {requestedFeedback.map(request => {
                      const dateLabel = request.requestedOn ? (formatDate(request.requestedOn, 'date.short') ?? '') : ''
                      const fromName = request.creatorName || '-'
                      return (
                        <Card
                          key={request.id}
                          className="gba:shadow-sm gba:hover:shadow-md gba:transition-shadow gba:p-1"
                          size="small"
                          data-testid={`requested-request-item-${request.id}`}
                        >
                          <div className="gba:flex gba:items-center gba:justify-between gba:min-h-10">
                            <div className="gba:flex gba:flex-col">
                              <div className="gba:font-medium" data-testid={`requested-request-line-${request.id}`}>
                                {getTranslationFromI18nKeyAndLabel(
                                  'lowcoder:feedback_tab.from_since_text',
                                  `From ${fromName} since ${dateLabel}`,
                                  {
                                    employee: fromName,
                                    date: dateLabel,
                                    interpolation: {
                                      escapeValue: false
                                    }
                                  }
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                  <div className="gba:mt-4 gba:flex gba:justify-end">
                    <Pagination
                      current={requestedCurrentPage}
                      pageSize={requestedPageSize}
                      total={requestedTotalCount ?? 0}
                      onChange={(page, pageSize) => {
                        setRequestedCurrentPage(page)
                        setRequestedPageSize(pageSize)
                      }}
                      data-testid="requested-requests-pagination"
                      showSizeChanger
                      pageSizeOptions={['3', '10', '20', '50']}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feedback History Section */}
      <div className="gba:space-y-6" data-testid="feedback-history-section">
        <div className="gba:flex gba:justify-between gba:items-center">
          <h3 className="gba:text-xl gba:font-semibold">
            {getTranslationFromI18nKeyAndLabel('lowcoder:feedback_tab.section_history', 'Feedback History')}
          </h3>

          <div className="gba:flex gba:items-center gba:gap-4">
            {/* Export Button */}
            <button
              className="gba:flex gba:items-center gba:gap-2 gba:text-info gba:hover:text-blue-800 gba:transition-colors gba:px-3 gba:py-1.5 gba:rounded-md gba:border gba:border-border gba:hover:border-blue-300"
              data-testid="export-feedback-button"
              onClick={() => console.log('Export feedback')}
            >
              <DownloadOutlined /> {getTranslationFromI18nKeyAndLabel('lowcoder:feedback_tab.export', 'Export')}
            </button>

            {/* Search Input */}
            <Input
              placeholder={getTranslationFromI18nKeyAndLabel(
                'lowcoder:feedback_tab.search_placeholder',
                'Search feedback'
              )}
              prefix={<SearchOutlined className="gba:text-gray-400" />}
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
                {
                  value: 'all',
                  label: getTranslationFromI18nKeyAndLabel('lowcoder:feedback_tab.filter_all', 'All Feedback')
                },
                {
                  value: 'private',
                  label: getTranslationFromI18nKeyAndLabel('lowcoder:feedback_tab.filter_private', 'Private')
                },
                {
                  value: 'public',
                  label: getTranslationFromI18nKeyAndLabel('lowcoder:feedback_tab.filter_public', 'Public')
                }
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
                          {getTranslationFromI18nKeyAndLabel('lowcoder:feedback_tab.private_badge', 'Private')}
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
                'lowcoder:feedback_tab.no_feedback',
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
