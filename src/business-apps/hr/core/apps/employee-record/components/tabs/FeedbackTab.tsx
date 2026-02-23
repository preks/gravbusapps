'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Employee, EmployeeFeedback } from '../../hooks/useEmployeeData'
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  Spinner,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  useTranslation
} from '@newwork/nw-design-system'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import {
  EMPLOYEE_FEEDBACK_REQUESTS_QUERY_PAGED_WITH_COUNT,
  EMPLOYEE_FEEDBACK_REQUESTS_SENT_QUERY_PAGED_WITH_COUNT
} from './queries/EmployeeFeedbackRequestQueries'
import {
  employeeFeedbackListQuery,
  employeeFeedbackInsightsQuery,
  FEEDBACK_LIST_LIMIT
} from '../../queries/feedbackQueries'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { formatDate, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { getTranslatedValue } from '../../utils/formatters'
import { startProcess } from '@/common/utils/start-process'
import { UserInfoProps } from '../../../../../../../common/BusinessAppContext'
import { PiPencilSimple, PiChatCircle, PiPaperPlaneRight, PiList, PiChartBar } from 'react-icons/pi'
import translations from '../../_i18n'
import FeedbackCards from './feedback-hub/FeedbackCards'
import FeedbackToolbar from './feedback-hub/FeedbackToolbar'
import { ExtendedEmployeeFeedback, FeedbackRequestRow, FormattedFeedback } from './feedback-hub/types'

interface FeedbackTabProps {
  employee: Employee
  accessToken: string
  employeeId?: string // Optional employeeId override for permissions check
  userInfo?: UserInfoProps // Current user info for self-view check
  employeeFeedback?: EmployeeFeedback[]
  isSelfView: boolean // Whether user is viewing their own profile
}

type FeedbackHubTab = 'received' | 'given' | 'requests' | 'insights'

/**
 * Feedback Tab Component
 * Displays feedback for the employee
 */
const FeedbackTab: React.FC<FeedbackTabProps> = ({ employee, accessToken, userInfo, isSelfView = false }) => {
  const { t } = useTranslation(translations)
  const currentUserEmployeeId = userInfo?.employeeDetails?.employeeId ?? employee?.id ?? ''

  const [localFeedback, setLocalFeedback] = useState<ExtendedEmployeeFeedback[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [senderFilter, setSenderFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  /** Feedback Hub tab (only when isSelfView). */
  const [activeHubTab, setActiveHubTab] = useState<FeedbackHubTab>('received')
  /** Feedback given by current user (sender_employee_id = currentUser). */
  const [givenFeedback, setGivenFeedback] = useState<ExtendedEmployeeFeedback[]>([])
  const [givenLoading, setGivenLoading] = useState(false)
  const [receivedTotal, setReceivedTotal] = useState(0)
  const [givenTotal, setGivenTotal] = useState(0)
  const [receivedPage, setReceivedPage] = useState(1)
  const [givenPage, setGivenPage] = useState(1)
  const [insightsRows, setInsightsRows] = useState<ExtendedEmployeeFeedback[]>([])
  const [insightsDistinctSenderRows, setInsightsDistinctSenderRows] = useState<
    Array<{ senderEmployeeId?: string | null }>
  >([])
  const [insightsAggregateTotal, setInsightsAggregateTotal] = useState(0)
  const [insightsAggregatePublic, setInsightsAggregatePublic] = useState(0)
  const [insightsAggregatePrivate, setInsightsAggregatePrivate] = useState(0)
  const [insightsLoading, setInsightsLoading] = useState(false)
  /** Requests received (employee_id = currentUser) from GraphQL. */
  const [requestsReceivedList, setRequestsReceivedList] = useState<FeedbackRequestRow[]>([])
  const [requestsReceivedTotal, setRequestsReceivedTotal] = useState(0)
  const [requestsReceivedLoading, setRequestsReceivedLoading] = useState(false)
  const [receivedReqPage, setReceivedReqPage] = useState(1)
  const [receivedReqPageSize] = useState(10)
  /** Requests sent (requester_employee_id = currentUser). */
  const [sentRequestsList, setSentRequestsList] = useState<FeedbackRequestRow[]>([])
  const [sentRequestsTotal, setSentRequestsTotal] = useState(0)
  const [sentRequestsLoading, setSentRequestsLoading] = useState(false)
  const [sentReqPage, setSentReqPage] = useState(1)
  const [sentReqPageSize] = useState(10)

  const graphQLClient = useGraphqlClient(accessToken)

  const buildFeedbackWhere = useCallback(
    (mode: 'received' | 'given') => {
      const andClauses: any[] = [{ isDeleted: { _neq: true } }]

      if (mode === 'received') {
        andClauses.push({ employeeId: { _eq: employee?.id } })
      } else {
        andClauses.push({ senderEmployeeId: { _eq: currentUserEmployeeId } })
      }

      // Non-self profiles can only see public feedback.
      if (!isSelfView || filterType === 'public') {
        andClauses.push({ feedbackPublic: { _eq: true } })
      } else if (filterType === 'private') {
        andClauses.push({ feedbackPublic: { _eq: false } })
      }

      if (dateFrom) {
        andClauses.push({
          _or: [
            { feedbackDate: { _gte: dateFrom } },
            { _and: [{ feedbackDate: { _isNull: true } }, { createdAt: { _gte: `${dateFrom}T00:00:00` } }] }
          ]
        })
      }

      if (dateTo) {
        andClauses.push({
          _or: [
            { feedbackDate: { _lte: dateTo } },
            { _and: [{ feedbackDate: { _isNull: true } }, { createdAt: { _lte: `${dateTo}T23:59:59` } }] }
          ]
        })
      }

      if (searchTerm.trim()) {
        const pattern = `%${searchTerm.trim()}%`
        andClauses.push({
          _or: [
            { feedback: { _ilike: pattern } },
            { typeRef: { _ilike: pattern } },
            { senderEmployee: { firstName: { _ilike: pattern } } },
            { senderEmployee: { lastName: { _ilike: pattern } } },
            { senderEmployee: { displayName: { _ilike: pattern } } },
            { employee: { firstName: { _ilike: pattern } } },
            { employee: { lastName: { _ilike: pattern } } },
            { employee: { displayName: { _ilike: pattern } } },
            { type: { value: { _ilike: pattern } } },
            { type: { translations: { value: { _ilike: pattern } } } }
          ]
        })
      }

      if (senderFilter !== 'all') {
        const senderPattern = `%${senderFilter.trim()}%`
        andClauses.push({
          _or: [
            { senderEmployee: { firstName: { _ilike: senderPattern } } },
            { senderEmployee: { lastName: { _ilike: senderPattern } } },
            { senderEmployee: { displayName: { _ilike: senderPattern } } },
            { employee: { firstName: { _ilike: senderPattern } } },
            { employee: { lastName: { _ilike: senderPattern } } },
            { employee: { displayName: { _ilike: senderPattern } } }
          ]
        })
      }

      if (typeFilter !== 'all') {
        const isOtherTypeFilter = typeFilter === t('feedback-hub-type-other')
        if (isOtherTypeFilter) {
          // "Other" means there is no explicit type reference.
          andClauses.push({ typeRef: { _isNull: true } })
        } else {
          andClauses.push({
            _or: [
              { typeRef: { _eq: typeFilter } },
              { type: { value: { _eq: typeFilter } } },
              { type: { translations: { value: { _eq: typeFilter } } } }
            ]
          })
        }
      }

      return { _and: andClauses }
    },
    [
      employee?.id,
      currentUserEmployeeId,
      isSelfView,
      filterType,
      dateFrom,
      dateTo,
      searchTerm,
      senderFilter,
      typeFilter,
      t
    ]
  )

  const fetchFeedbackData = useCallback(async () => {
    if (!employee?.id) return

    try {
      setLoading(true)
      setError(null)

      const response = await graphQLClient.request<any>(employeeFeedbackListQuery, {
        where: buildFeedbackWhere('received'),
        limit: FEEDBACK_LIST_LIMIT,
        offset: (receivedPage - 1) * FEEDBACK_LIST_LIMIT,
        activeUserLocale: getCurrentActiveUserLocale()
      })

      setLocalFeedback((response?.EmployeeFeedback ?? []) as ExtendedEmployeeFeedback[])
      setReceivedTotal(response?.EmployeeFeedbackAggregate?.aggregate?.count ?? 0)
    } catch (err) {
      console.error('Error fetching feedback data:', err)
      setError('Failed to load feedback data')
    } finally {
      setLoading(false)
    }
  }, [employee?.id, graphQLClient, buildFeedbackWhere, receivedPage])

  const fetchGivenFeedback = useCallback(async () => {
    if (!currentUserEmployeeId) return
    try {
      setGivenLoading(true)
      const response = await graphQLClient.request<any>(employeeFeedbackListQuery, {
        where: buildFeedbackWhere('given'),
        limit: FEEDBACK_LIST_LIMIT,
        offset: (givenPage - 1) * FEEDBACK_LIST_LIMIT,
        activeUserLocale: getCurrentActiveUserLocale()
      })
      setGivenFeedback((response?.EmployeeFeedback ?? []) as ExtendedEmployeeFeedback[])
      setGivenTotal(response?.EmployeeFeedbackAggregate?.aggregate?.count ?? 0)
    } catch (err) {
      console.error('Error fetching given feedback:', err)
    } finally {
      setGivenLoading(false)
    }
  }, [currentUserEmployeeId, graphQLClient, buildFeedbackWhere, givenPage])

  const fetchInsightsData = useCallback(async () => {
    if (!employee?.id || !currentUserEmployeeId) return
    try {
      setInsightsLoading(true)
      const response = await graphQLClient.request<any>(employeeFeedbackInsightsQuery, {
        employeeId: employee.id,
        senderEmployeeId: currentUserEmployeeId,
        activeUserLocale: getCurrentActiveUserLocale()
      })
      setInsightsRows((response?.insightsRows ?? []) as ExtendedEmployeeFeedback[])
      setInsightsDistinctSenderRows(response?.receivedSenderRows ?? [])
      setInsightsAggregateTotal(response?.totalRows?.aggregate?.count ?? 0)
      setInsightsAggregatePublic(response?.publicRows?.aggregate?.count ?? 0)
      setInsightsAggregatePrivate(response?.privateRows?.aggregate?.count ?? 0)
    } catch (err) {
      console.error('Error fetching insights feedback data:', err)
    } finally {
      setInsightsLoading(false)
    }
  }, [employee?.id, currentUserEmployeeId, graphQLClient])

  const fetchRequestsReceived = useCallback(async () => {
    if (!currentUserEmployeeId) return
    try {
      setRequestsReceivedLoading(true)
      const res = await graphQLClient.request<any>(EMPLOYEE_FEEDBACK_REQUESTS_QUERY_PAGED_WITH_COUNT, {
        idEmployee: currentUserEmployeeId,
        limit: receivedReqPageSize,
        offset: (receivedReqPage - 1) * receivedReqPageSize
      })
      const rows: FeedbackRequestRow[] = res?.EmployeeFeedbackRequest ?? []
      const total = res?.EmployeeFeedbackRequestAggregate?.aggregate?.count ?? 0
      setRequestsReceivedList(rows)
      setRequestsReceivedTotal(total)
    } catch (err) {
      console.error('Error fetching requests received:', err)
    } finally {
      setRequestsReceivedLoading(false)
    }
  }, [currentUserEmployeeId, receivedReqPage, receivedReqPageSize, graphQLClient])

  const fetchSentRequests = useCallback(async () => {
    if (!currentUserEmployeeId) return
    try {
      setSentRequestsLoading(true)
      const res = await graphQLClient.request<any>(EMPLOYEE_FEEDBACK_REQUESTS_SENT_QUERY_PAGED_WITH_COUNT, {
        requesterEmployeeId: currentUserEmployeeId,
        limit: sentReqPageSize,
        offset: (sentReqPage - 1) * sentReqPageSize
      })
      const rows: FeedbackRequestRow[] = res?.EmployeeFeedbackRequest ?? []
      const total = res?.EmployeeFeedbackRequestAggregate?.aggregate?.count ?? 0
      setSentRequestsList(rows)
      setSentRequestsTotal(total)
    } catch (err) {
      console.error('Error fetching sent requests:', err)
    } finally {
      setSentRequestsLoading(false)
    }
  }, [currentUserEmployeeId, sentReqPage, sentReqPageSize, graphQLClient])

  useEffect(() => {
    if (!employee?.id) return
    if (!isSelfView || activeHubTab === 'received') fetchFeedbackData()
  }, [employee?.id, isSelfView, activeHubTab, fetchFeedbackData])

  useEffect(() => {
    if (isSelfView && activeHubTab === 'given') fetchGivenFeedback()
  }, [isSelfView, activeHubTab, fetchGivenFeedback])

  useEffect(() => {
    if (isSelfView && activeHubTab === 'insights') fetchInsightsData()
  }, [isSelfView, activeHubTab, fetchInsightsData])

  useEffect(() => {
    if (isSelfView && activeHubTab === 'requests') {
      fetchRequestsReceived()
      fetchSentRequests()
    }
  }, [isSelfView, activeHubTab, fetchRequestsReceived, fetchSentRequests])

  // Keep filters scoped per feedback subtab by resetting on switch.
  useEffect(() => {
    setSearchTerm('')
    setFilterType('all')
    setDateFrom('')
    setDateTo('')
    setSenderFilter('all')
    setTypeFilter('all')
    setReceivedPage(1)
    setGivenPage(1)
  }, [activeHubTab])

  const handleRespondToRequest = useCallback(
    (row: FeedbackRequestRow) => {
      startProcess({
        domain: 'employee',
        processName: 'giveFeedback',
        payload: {
          requestId: row.id,
          employeeId: row.employeeId ?? employee?.id
        },
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
      const se = feedback.senderEmployee as { firstName?: string; lastName?: string; displayName?: string } | undefined
      const firstName = se?.firstName ?? ''
      const lastName = se?.lastName ?? ''
      const sender =
        (se?.displayName ?? (firstName || lastName ? `${firstName} ${lastName}`.trim() : '')) ||
        t('feedback-hub-unknown-sender')
      const date = feedback.feedbackDate
        ? (formatDate(feedback.feedbackDate, 'date.short') ?? '')
        : (feedback as any).createdAt
          ? (formatDate((feedback as any).createdAt, 'date.short') ?? '')
          : ''
      const rawDate = feedback.feedbackDate ?? (feedback as any).createdAt ?? undefined
      const content = feedback.feedback ?? ''
      const avatar = feedback.senderEmployee?.employeePosition?.employee?.pictureThumbnail ?? null
      return {
        id: feedback.id,
        sender,
        date,
        rawDate,
        content,
        avatar,
        senderId: feedback.senderEmployeeId,
        firstName,
        lastName,
        rating: feedback.rating,
        private: (feedback as any).feedbackPublic === false,
        feedbackPublic: (feedback as any).feedbackPublic,
        type: getTranslatedValue((feedback as any)?.type) || (feedback as any).typeRef || t('feedback-hub-type-other'),
        timestamp
      }
    })
  }

  // Process feedback data for display
  const allFormattedFeedback = formatFeedback()

  const formatGivenFeedback = (): FormattedFeedback[] => {
    if (!givenFeedback?.length) return []
    return givenFeedback.map(fb => {
      const rec = (fb as any).employee
      const firstName = rec?.firstName ?? ''
      const lastName = rec?.lastName ?? ''
      const sender = (rec?.displayName ?? `${firstName} ${lastName}`.trim()) || t('feedback-hub-unknown-sender')
      const timestamp = fb.feedbackDate ? Date.parse(fb.feedbackDate) : 0
      const date = fb.feedbackDate
        ? (formatDate(fb.feedbackDate, 'date.short') ?? '')
        : (fb as any).createdAt
          ? (formatDate((fb as any).createdAt, 'date.short') ?? '')
          : ''
      const rawDate = fb.feedbackDate ?? (fb as any).createdAt ?? undefined
      return {
        id: fb.id,
        sender,
        date,
        rawDate,
        content: fb.feedback ?? '',
        avatar: rec?.employeePosition?.employee?.pictureThumbnail ?? null,
        firstName,
        lastName,
        rating: fb.rating,
        feedbackPublic: (fb as any).feedbackPublic,
        private: (fb as any).feedbackPublic === false,
        type: getTranslatedValue((fb as any)?.type) ?? (fb as any).typeRef ?? t('feedback-hub-type-other'),
        timestamp
      }
    })
  }

  const allFormattedGiven = formatGivenFeedback()
  const activeFeedbackList = useMemo(
    () => (activeHubTab === 'given' ? allFormattedGiven : allFormattedFeedback),
    [activeHubTab, allFormattedGiven, allFormattedFeedback]
  )
  const senderOptions = useMemo(
    () =>
      Array.from(new Set(activeFeedbackList.map(item => item.sender).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [activeFeedbackList]
  )
  const typeOptions = useMemo(
    () =>
      Array.from(new Set(activeFeedbackList.map(item => item.type || '').filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [activeFeedbackList]
  )

  const formattedFilteredFeedback = useMemo(
    () => [...activeFeedbackList].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)),
    [activeFeedbackList]
  )

  const insightsFromFeedback = useMemo(() => {
    const list = isSelfView ? insightsRows : [...(localFeedback ?? []), ...(givenFeedback ?? [])]
    const total = isSelfView ? insightsAggregateTotal : list.length
    const publicCount = isSelfView
      ? insightsAggregatePublic
      : list.filter((f: any) => f.feedbackPublic !== false).length
    const privateCount = isSelfView ? insightsAggregatePrivate : total - publicCount
    const senderIds = isSelfView
      ? new Set(insightsDistinctSenderRows.map(row => row?.senderEmployeeId).filter(Boolean))
      : new Set((localFeedback ?? []).map((f: any) => f.senderEmployeeId).filter(Boolean))
    const byType: Record<string, number> = {}
    const countOverTime: Record<string, number> = {}
    const byTagOrSkill: Record<string, number> = {}
    list.forEach((f: any) => {
      const rawTyp = getTranslatedValue(f?.type) || f?.typeRef || ''
      const typ = rawTyp && String(rawTyp).trim() ? rawTyp.trim() : t('feedback-hub-type-other')
      byType[typ] = (byType[typ] ?? 0) + 1
      const date = f?.feedbackDate ?? f?.createdAt
      if (date) {
        const monthKey = typeof date === 'string' ? date.slice(0, 7) : new Date(date).toISOString().slice(0, 7)
        countOverTime[monthKey] = (countOverTime[monthKey] ?? 0) + 1
      }
      const ap = f?.additionalProperties
      if (ap && typeof ap === 'object') {
        const addKey = (k: string) => {
          if (k) byTagOrSkill[k] = (byTagOrSkill[k] ?? 0) + 1
        }
        if (ap.tag != null) addKey(String(ap.tag).trim())
        if (ap.skillId != null) addKey(String(ap.skillId).trim())
        if (Array.isArray(ap.tags)) ap.tags.forEach((t: unknown) => addKey(String(t ?? '').trim()))
        if (Array.isArray(ap.skillIds)) ap.skillIds.forEach((s: unknown) => addKey(String(s ?? '').trim()))
      }
    })
    return { total, distinctSenders: senderIds.size, publicCount, privateCount, byType, countOverTime, byTagOrSkill }
  }, [
    isSelfView,
    insightsRows,
    insightsAggregateTotal,
    insightsAggregatePublic,
    insightsAggregatePrivate,
    insightsDistinctSenderRows,
    localFeedback,
    givenFeedback,
    t
  ])

  if (loading && !allFormattedFeedback.length && !isSelfView) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-40" data-testid="feedback-loading">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="gba:space-y-8 gba:pb-6" data-testid="feedback-tab">
      <div className="gba:pb-4" data-testid="feedback-header">
        <div className="gba:flex gba:flex-col gba:sm:flex-row gba:justify-between gba:items-center gba:gap-4">
          <div className="gba:max-w-2xl">
            <h2 className="gba:font-bold gba:text-2xl" data-testid="feedback-title">
              {t('feedback-hub-title')}
            </h2>
            <p className="gba:text-muted-foreground gba:text-lg" data-testid="feedback-description">
              {t('feedback-hub-description')}
            </p>
          </div>
          <div className="gba:flex gba:gap-4 gba:items-center gba:self-center">
            {isSelfView && (
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
                {t('feedback-hub-request-feedback')}
              </AppAction>
            )}
            <AppAction
              variant="update-primary"
              data-testid="employee-feedback-give-button"
              contexts={[{ context: FlowContextName.employeeGiveFeedback, contextData: { employeeId: employee?.id } }]}
              prefixDataTestId="add-feedback"
              accessToken={accessToken}
              autoExecute={true}
            >
              {t('feedback-hub-give-feedback')}
            </AppAction>
          </div>
        </div>
      </div>

      {!isSelfView ? (
        <div className="gba:space-y-6" data-testid="feedback-history-section">
          <div className="gba:space-y-3">
            <FeedbackToolbar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              filterType={filterType}
              onFilterChange={setFilterType}
              dateFrom={dateFrom}
              onDateFromChange={setDateFrom}
              dateTo={dateTo}
              onDateToChange={setDateTo}
              senderFilter={senderFilter}
              onSenderFilterChange={setSenderFilter}
              senderOptions={senderOptions}
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
              typeOptions={typeOptions}
              searchPlaceholder={t('feedback-hub-search-placeholder')}
              allLabel={t('feedback-hub-filter-all')}
              privateLabel={t('feedback-hub-filter-private')}
              publicLabel={t('feedback-hub-filter-public')}
              dateFromLabel={t('feedback-hub-filter-date-from')}
              dateToLabel={t('feedback-hub-filter-date-to')}
              senderLabel={t('feedback-hub-filter-sender')}
              typeLabel={t('feedback-hub-filter-type')}
            />
          </div>
          {loading ? (
            <div className="gba:flex gba:justify-center gba:items-center gba:h-40" data-testid="feedback-loading">
              <Spinner size="lg" />
            </div>
          ) : formattedFilteredFeedback.length > 0 ? (
            <FeedbackCards
              feedbackList={formattedFilteredFeedback}
              privateBadgeLabel={t('feedback-hub-badge-private')}
              publicBadgeLabel={t('feedback-hub-badge-public')}
            />
          ) : (
            <>
              <EmptyState title={t('feedback-hub-no-feedback')} data-testid="feedback-empty" />
              {error && (
                <div className="gba:text-center gba:text-muted-foreground gba:py-4" data-testid="feedback-error-inline">
                  <p>{error}</p>
                </div>
              )}
            </>
          )}
          {receivedTotal > FEEDBACK_LIST_LIMIT && (
            <div className="gba:mt-4 gba:flex gba:justify-end">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setReceivedPage(p => Math.max(1, p - 1))}
                      className={receivedPage === 1 ? 'gba:pointer-events-none gba:opacity-50' : 'gba:cursor-pointer'}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setReceivedPage(p => Math.min(Math.ceil(receivedTotal / FEEDBACK_LIST_LIMIT), p + 1))
                      }
                      className={
                        receivedPage >= Math.ceil(receivedTotal / FEEDBACK_LIST_LIMIT)
                          ? 'gba:pointer-events-none gba:opacity-50'
                          : 'gba:cursor-pointer'
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      ) : (
        <Tabs value={activeHubTab} onValueChange={v => setActiveHubTab(v as FeedbackHubTab)} className="gba:w-full">
          <TabsList className="gba:mb-4 gba:w-full" data-testid="feedback-hub-tabs">
            <TabsTrigger value="received" className="gba:flex-1" data-testid="feedback-hub-tab-received">
              <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
                <PiChatCircle className="gba:h-4 gba:w-4" />
                <span>{t('feedback-hub-tab-received')}</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="given" className="gba:flex-1" data-testid="feedback-hub-tab-given">
              <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
                <PiPaperPlaneRight className="gba:h-4 gba:w-4" />
                <span>{t('feedback-hub-tab-given')}</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="requests" className="gba:flex-1" data-testid="feedback-hub-tab-requests">
              <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
                <PiList className="gba:h-4 gba:w-4" />
                <span>{t('feedback-hub-tab-requests')}</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="insights" className="gba:flex-1" data-testid="feedback-hub-tab-insights">
              <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
                <PiChartBar className="gba:h-4 gba:w-4" />
                <span>{t('feedback-hub-tab-insights')}</span>
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="received" className="gba:mt-4">
            <div className="gba:space-y-3 gba:mb-4">
              <FeedbackToolbar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                filterType={filterType}
                onFilterChange={setFilterType}
                dateFrom={dateFrom}
                onDateFromChange={setDateFrom}
                dateTo={dateTo}
                onDateToChange={setDateTo}
                senderFilter={senderFilter}
                onSenderFilterChange={setSenderFilter}
                senderOptions={senderOptions}
                typeFilter={typeFilter}
                onTypeFilterChange={setTypeFilter}
                typeOptions={typeOptions}
                searchPlaceholder={t('feedback-hub-search-placeholder')}
                allLabel={t('feedback-hub-filter-all')}
                privateLabel={t('feedback-hub-filter-private')}
                publicLabel={t('feedback-hub-filter-public')}
                dateFromLabel={t('feedback-hub-filter-date-from')}
                dateToLabel={t('feedback-hub-filter-date-to')}
                senderLabel={t('feedback-hub-filter-sender')}
                typeLabel={t('feedback-hub-filter-type')}
              />
            </div>
            {loading ? (
              <div className="gba:flex gba:justify-center gba:items-center gba:h-40">
                <Spinner size="lg" />
              </div>
            ) : formattedFilteredFeedback.length > 0 ? (
              <FeedbackCards
                feedbackList={formattedFilteredFeedback}
                privateBadgeLabel={t('feedback-hub-badge-private')}
                publicBadgeLabel={t('feedback-hub-badge-public')}
              />
            ) : (
              <EmptyState title={t('feedback-hub-no-feedback')} data-testid="feedback-empty" />
            )}
            {receivedTotal > FEEDBACK_LIST_LIMIT && (
              <div className="gba:mt-4 gba:flex gba:justify-end">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setReceivedPage(p => Math.max(1, p - 1))}
                        className={receivedPage === 1 ? 'gba:pointer-events-none gba:opacity-50' : 'gba:cursor-pointer'}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          setReceivedPage(p => Math.min(Math.ceil(receivedTotal / FEEDBACK_LIST_LIMIT), p + 1))
                        }
                        className={
                          receivedPage >= Math.ceil(receivedTotal / FEEDBACK_LIST_LIMIT)
                            ? 'gba:pointer-events-none gba:opacity-50'
                            : 'gba:cursor-pointer'
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </TabsContent>

          <TabsContent value="given" className="gba:mt-4">
            <div className="gba:space-y-3 gba:mb-4">
              <FeedbackToolbar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                filterType={filterType}
                onFilterChange={setFilterType}
                dateFrom={dateFrom}
                onDateFromChange={setDateFrom}
                dateTo={dateTo}
                onDateToChange={setDateTo}
                senderFilter={senderFilter}
                onSenderFilterChange={setSenderFilter}
                senderOptions={senderOptions}
                typeFilter={typeFilter}
                onTypeFilterChange={setTypeFilter}
                typeOptions={typeOptions}
                searchPlaceholder={t('feedback-hub-search-placeholder')}
                allLabel={t('feedback-hub-filter-all')}
                privateLabel={t('feedback-hub-filter-private')}
                publicLabel={t('feedback-hub-filter-public')}
                dateFromLabel={t('feedback-hub-filter-date-from')}
                dateToLabel={t('feedback-hub-filter-date-to')}
                senderLabel={t('feedback-hub-filter-sender')}
                typeLabel={t('feedback-hub-filter-type')}
              />
            </div>
            {givenLoading ? (
              <div className="gba:flex gba:justify-center gba:items-center gba:h-40">
                <Spinner size="lg" />
              </div>
            ) : formattedFilteredFeedback.length > 0 ? (
              <FeedbackCards
                feedbackList={formattedFilteredFeedback}
                privateBadgeLabel={t('feedback-hub-badge-private')}
                publicBadgeLabel={t('feedback-hub-badge-public')}
              />
            ) : (
              <EmptyState title={t('feedback-hub-no-feedback')} data-testid="feedback-empty-given" />
            )}
            {givenTotal > FEEDBACK_LIST_LIMIT && (
              <div className="gba:mt-4 gba:flex gba:justify-end">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setGivenPage(p => Math.max(1, p - 1))}
                        className={givenPage === 1 ? 'gba:pointer-events-none gba:opacity-50' : 'gba:cursor-pointer'}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setGivenPage(p => Math.min(Math.ceil(givenTotal / FEEDBACK_LIST_LIMIT), p + 1))}
                        className={
                          givenPage >= Math.ceil(givenTotal / FEEDBACK_LIST_LIMIT)
                            ? 'gba:pointer-events-none gba:opacity-50'
                            : 'gba:cursor-pointer'
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests" className="gba:mt-4 gba:space-y-8">
            <div>
              <h4 className="gba:text-sm gba:font-medium gba:mb-2">{t('feedback-hub-requests-received')}</h4>
              {requestsReceivedLoading ? (
                <div className="gba:flex gba:justify-center gba:items-center gba:h-32">
                  <Spinner size="md" />
                </div>
              ) : requestsReceivedList.length === 0 ? (
                <EmptyState title={t('feedback-hub-no-requests-received')} />
              ) : (
                <div className="gba:grid gba:grid-cols-1 gba:gap-4">
                  {requestsReceivedList.map(row => {
                    const dateLabel = row.createdAt ? (formatDate(row.createdAt, 'date.short') ?? '') : ''
                    const name = row.requesterEmployee?.displayName ?? t('feedback-hub-unknown-sender')
                    const isPending = !row.statusRef || String(row.statusRef).indexOf('COMPLETED') < 0
                    const isOverdue = isPending && row.dueDate && new Date(row.dueDate) < new Date()
                    return (
                      <Card key={row.id} className="gba:p-2">
                        <CardContent className="gba:p-2">
                          <div className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:flex-wrap">
                            <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
                              <span className="gba:text-sm gba:font-medium">
                                {t('feedback-hub-from-date', { name, date: dateLabel })}
                              </span>
                              {row.dueDate && (
                                <span className="gba:text-muted-foreground gba:text-xs">
                                  Due {formatDate(row.dueDate, 'date.short') ?? row.dueDate}
                                </span>
                              )}
                              {isOverdue && <Badge variant="destructive">{t('feedback-hub-overdue')}</Badge>}
                            </div>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleRespondToRequest(row)}
                              data-testid={`received-request-respond-${row.id}`}
                              className="gba:flex gba:items-center gba:gap-2"
                            >
                              <PiPencilSimple />
                              {t('feedback-hub-respond')}
                            </Button>
                          </div>
                          {row.message && (
                            <p className="gba:text-sm gba:text-muted-foreground gba:mt-2 gba:line-clamp-2">
                              {row.message}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
              {requestsReceivedTotal > receivedReqPageSize && (
                <div className="gba:mt-4 gba:flex gba:justify-end">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setReceivedReqPage(p => Math.max(1, p - 1))}
                          className={
                            receivedReqPage === 1 ? 'gba:pointer-events-none gba:opacity-50' : 'gba:cursor-pointer'
                          }
                        />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setReceivedReqPage(p =>
                              Math.min(Math.ceil(requestsReceivedTotal / receivedReqPageSize), p + 1)
                            )
                          }
                          className={
                            receivedReqPage >= Math.ceil(requestsReceivedTotal / receivedReqPageSize)
                              ? 'gba:pointer-events-none gba:opacity-50'
                              : 'gba:cursor-pointer'
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>

            <div>
              <h4 className="gba:text-sm gba:font-medium gba:mb-2">{t('feedback-hub-requests-sent')}</h4>
              {sentRequestsLoading ? (
                <div className="gba:flex gba:justify-center gba:items-center gba:h-32">
                  <Spinner size="md" />
                </div>
              ) : sentRequestsList.length === 0 ? (
                <EmptyState title={t('feedback-hub-no-requests-sent')} />
              ) : (
                <div className="gba:grid gba:grid-cols-1 gba:gap-4">
                  {sentRequestsList.map(row => {
                    const dateLabel = row.createdAt ? (formatDate(row.createdAt, 'date.short') ?? '') : ''
                    const name = row.employee?.displayName ?? t('feedback-hub-unknown-sender')
                    const isCompleted = row.statusRef != null && String(row.statusRef).indexOf('COMPLETED') >= 0
                    return (
                      <Card key={row.id} className="gba:p-2">
                        <CardContent className="gba:p-2">
                          <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                            <span className="gba:text-sm gba:font-medium">
                              {t('feedback-hub-to-date', { name, date: dateLabel })}
                            </span>
                            {isCompleted ? (
                              <Button size="sm" variant="secondary" data-testid={`sent-request-view-${row.id}`}>
                                {t('feedback-hub-view-feedback')}
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" data-testid={`sent-request-cancel-${row.id}`}>
                                {t('feedback-hub-cancel')}
                              </Button>
                            )}
                          </div>
                          {row.message && (
                            <p className="gba:text-sm gba:text-muted-foreground gba:mt-2 gba:line-clamp-2">
                              {row.message}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
              {sentRequestsTotal > sentReqPageSize && (
                <div className="gba:mt-4 gba:flex gba:justify-end">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setSentReqPage(p => Math.max(1, p - 1))}
                          className={
                            sentReqPage === 1 ? 'gba:pointer-events-none gba:opacity-50' : 'gba:cursor-pointer'
                          }
                        />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            setSentReqPage(p => Math.min(Math.ceil(sentRequestsTotal / sentReqPageSize), p + 1))
                          }
                          className={
                            sentReqPage >= Math.ceil(sentRequestsTotal / sentReqPageSize)
                              ? 'gba:pointer-events-none gba:opacity-50'
                              : 'gba:cursor-pointer'
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="insights" className="gba:mt-4 gba:space-y-8">
            {insightsLoading && (
              <div className="gba:flex gba:justify-center gba:items-center gba:h-32">
                <Spinner size="lg" />
              </div>
            )}
            <div>
              <h3 className="gba:text-lg gba:font-semibold gba:mb-1">{t('feedback-hub-insights-feedback-title')}</h3>
              <p className="gba:text-muted-foreground gba:text-sm gba:mb-4">
                {t('feedback-hub-insights-feedback-description')}
              </p>
              <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4">
                <Card>
                  <CardContent className="gba:p-4">
                    <p className="gba:text-2xl gba:font-semibold">{insightsFromFeedback.total}</p>
                    <p className="gba:text-sm gba:text-muted-foreground">{t('feedback-hub-insights-total-feedback')}</p>
                    <p className="gba:text-xs gba:text-muted-foreground gba:mt-2">
                      {t('feedback-hub-insights-total-feedback-description')}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="gba:p-4">
                    <p className="gba:text-2xl gba:font-semibold">{insightsFromFeedback.distinctSenders}</p>
                    <p className="gba:text-sm gba:text-muted-foreground">
                      {t('feedback-hub-insights-distinct-senders')}
                    </p>
                    <p className="gba:text-xs gba:text-muted-foreground gba:mt-2">
                      {t('feedback-hub-insights-distinct-senders-description')}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="gba:p-4">
                    <p className="gba:text-2xl gba:font-semibold">
                      {insightsFromFeedback.total > 0
                        ? `${insightsFromFeedback.publicCount} / ${insightsFromFeedback.privateCount}`
                        : '—'}
                    </p>
                    <p className="gba:text-sm gba:text-muted-foreground">{t('feedback-hub-insights-public-private')}</p>
                    <p className="gba:text-xs gba:text-muted-foreground gba:mt-2">
                      {t('feedback-hub-insights-public-private-description')}
                    </p>
                  </CardContent>
                </Card>
                {Object.keys(insightsFromFeedback.countOverTime).length > 0 && (
                  <Card>
                    <CardContent className="gba:p-4">
                      <p className="gba:text-sm gba:font-medium gba:mb-1">
                        {t('feedback-hub-insights-count-over-time')}
                      </p>
                      <p className="gba:text-xs gba:text-muted-foreground gba:mb-3">
                        {t('feedback-hub-insights-count-over-time-description')}
                      </p>
                      <div className="gba:space-y-2">
                        {Object.entries(insightsFromFeedback.countOverTime)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([monthKey, count]) => {
                            const [y, m] = monthKey.split('-').map(Number)
                            const date = !Number.isNaN(y) && !Number.isNaN(m) ? new Date(y, m - 1, 1) : null
                            const rawLabel = date
                              ? date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
                              : monthKey
                            const label = rawLabel ? rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1) : rawLabel
                            return (
                              <div
                                key={monthKey}
                                className="gba:flex gba:items-baseline gba:justify-between gba:gap-2 gba:py-1.5 gba:border-b gba:border-border gba:last:border-0"
                              >
                                <span className="gba:text-sm gba:font-medium">{label}</span>
                                <span className="gba:text-sm gba:text-muted-foreground">{count}</span>
                              </div>
                            )
                          })}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {Object.keys(insightsFromFeedback.byType).length > 0 && (
                  <Card>
                    <CardContent className="gba:p-4">
                      <p className="gba:text-sm gba:font-medium gba:mb-1">
                        {t('feedback-hub-insights-distribution-by-type')}
                      </p>
                      <p className="gba:text-xs gba:text-muted-foreground gba:mb-3">
                        {t('feedback-hub-insights-by-type-description')}
                      </p>
                      <ul className="gba:space-y-1 gba:text-sm gba:text-muted-foreground">
                        {Object.entries(insightsFromFeedback.byType)
                          .filter(([type]) => type != null && String(type).trim() !== '')
                          .map(([type, count]) => (
                            <li key={type}>
                              {type}: {count}
                            </li>
                          ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
                {Object.keys(insightsFromFeedback.byTagOrSkill).length > 0 && (
                  <Card>
                    <CardContent className="gba:p-4">
                      <p className="gba:text-sm gba:font-medium gba:mb-1">
                        {t('feedback-hub-insights-distribution-by-tag-skill')}
                      </p>
                      <p className="gba:text-xs gba:text-muted-foreground gba:mb-3">
                        {t('feedback-hub-insights-by-tag-skill-description')}
                      </p>
                      <ul className="gba:space-y-1 gba:text-sm gba:text-muted-foreground">
                        {Object.entries(insightsFromFeedback.byTagOrSkill).map(([key, count]) => (
                          <li key={key}>
                            {key}: {count}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
            <div>
              <h3 className="gba:text-lg gba:font-semibold gba:mb-1">{t('feedback-hub-insights-review-title')}</h3>
              <p className="gba:text-muted-foreground gba:text-sm gba:mb-4">
                {t('feedback-hub-insights-review-description')}
              </p>
              <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4">
                <Card>
                  <CardContent className="gba:p-4">
                    <p className="gba:text-sm gba:font-medium gba:mb-1">
                      {t('feedback-hub-insights-review-avg-per-skill')}
                    </p>
                    <p className="gba:text-2xl gba:font-semibold gba:text-muted-foreground">—</p>
                    <p className="gba:text-xs gba:text-muted-foreground gba:mt-2">
                      {t('feedback-hub-insights-no-review-data')}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="gba:p-4">
                    <p className="gba:text-sm gba:font-medium gba:mb-1">
                      {t('feedback-hub-insights-review-overall-avg')}
                    </p>
                    <p className="gba:text-2xl gba:font-semibold gba:text-muted-foreground">—</p>
                    <p className="gba:text-xs gba:text-muted-foreground gba:mt-2">
                      {t('feedback-hub-insights-no-review-data')}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="gba:p-4">
                    <p className="gba:text-sm gba:font-medium gba:mb-1">
                      {t('feedback-hub-insights-review-top-strengths')}
                    </p>
                    <p className="gba:text-sm gba:text-muted-foreground">—</p>
                    <p className="gba:text-xs gba:text-muted-foreground gba:mt-2">
                      {t('feedback-hub-insights-no-review-data')}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="gba:p-4">
                    <p className="gba:text-sm gba:font-medium gba:mb-1">
                      {t('feedback-hub-insights-review-growth-areas')}
                    </p>
                    <p className="gba:text-sm gba:text-muted-foreground">—</p>
                    <p className="gba:text-xs gba:text-muted-foreground gba:mt-2">
                      {t('feedback-hub-insights-no-review-data')}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <p className="gba:text-xs gba:text-muted-foreground gba:mt-2">
                {t('feedback-hub-insights-review-placeholder')}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

export default FeedbackTab
