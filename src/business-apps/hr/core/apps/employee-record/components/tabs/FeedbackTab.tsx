'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Employee, EmployeeFeedback } from '../../hooks/useEmployeeData'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import {
  employeeFeedbackHubKpiQuery,
  employeeFeedbackListQuery,
  FEEDBACK_LIST_LIMIT
} from '../../queries/feedbackQueries'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { formatDate, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { getTranslatedValue } from '../../utils/formatters'
import { startProcess } from '@/common/utils/start-process'
import { UserInfoProps } from '../../../../../../../common/BusinessAppContext'
import { resolveFlowbotBaseUrl } from '@/common/utils/flowbotUtils'
import { PiPencilSimple } from 'react-icons/pi'
import { AlertCircle, ChevronRight, MessageSquare, Send, TrendingUp, Users } from 'lucide-react'
import translations from '../../_i18n'
import FeedbackCards from './feedback-hub/FeedbackCards'
import FeedbackToolbar from './feedback-hub/FeedbackToolbar'
import { toAvatarSrc } from './feedback-hub/avatar'
import { ExtendedEmployeeFeedback, FormattedFeedback } from './feedback-hub/types'

interface FeedbackTabProps {
  employee: Employee
  accessToken: string
  employeeId?: string
  userInfo?: UserInfoProps
  employeeFeedback?: EmployeeFeedback[]
  isSelfView: boolean
}

type FeedbackStream = 'received' | 'given'

interface PendingRequestRow {
  id: string
  createdAt?: string | null
  employeeId?: string | null
  requesterEmployeeId?: string | null
  requestedOn?: string | null
  dueDate?: string | null
  message?: string | null
  requesterEmployee?: {
    id?: string | null
    displayName?: string | null
    firstName?: string | null
    lastName?: string | null
    employeePosition?: {
      employee?: {
        pictureThumbnail?: string | null
      } | null
    } | null
  } | null
}

interface CountAggregate {
  aggregate?: {
    count?: number | null
  } | null
}

interface LatestFeedbackRow {
  feedbackDate?: string | null
  createdAt?: string | null
}

interface FeedbackHubKpiResponse {
  receivedTotal?: CountAggregate | null
  receivedLast30?: CountAggregate | null
  receivedPrev30?: CountAggregate | null
  givenTotal?: CountAggregate | null
  givenLast30?: CountAggregate | null
  givenPrev30?: CountAggregate | null
  contributorsTotal?: CountAggregate | null
  contributorsLast30?: CountAggregate | null
  contributorsPrev30?: CountAggregate | null
  lastReceived?: LatestFeedbackRow[]
  lastGiven?: LatestFeedbackRow[]
  pendingRequests?: PendingRequestRow[]
  pendingRequestsAggregate?: {
    aggregate?: {
      count?: number | null
    } | null
  } | null
}

interface AiInsightResult {
  raw?: string
  overallSentiment?: string
  commonPositiveThemes?: string[]
  constructiveThemes?: string[]
  reflectionSummary?: string
  toneAnalysis?: string
  recurrentThemes?: string[]
  growthSuggestion?: string
}

interface FeedbackHubKpis {
  receivedTotal: number
  receivedTrend: number
  givenTotal: number
  givenTrend: number
  distinctContributors: number
  contributorTrend: number
  daysSinceReceived: number | null
  daysSinceGiven: number | null
}

const FeedbackTab: React.FC<FeedbackTabProps> = ({
  employee,
  accessToken,
  employeeId,
  userInfo,
  isSelfView = false
}) => {
  const PENDING_REQUESTS_PAGE_SIZE = 20
  const { t } = useTranslation(translations)
  const graphQLClient = useGraphqlClient(accessToken)
  const currentUserEmployeeId = userInfo?.employeeDetails?.employeeId ?? employeeId ?? employee?.id ?? ''

  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const [receivedRows, setReceivedRows] = useState<ExtendedEmployeeFeedback[]>([])
  const [givenRows, setGivenRows] = useState<ExtendedEmployeeFeedback[]>([])
  const [receivedTotal, setReceivedTotal] = useState(0)
  const [givenTotal, setGivenTotal] = useState(0)
  const [receivedPage, setReceivedPage] = useState(1)
  const [givenPage, setGivenPage] = useState(1)
  const [receivedLoading, setReceivedLoading] = useState(false)
  const [givenLoading, setGivenLoading] = useState(false)

  const [kpiLoading, setKpiLoading] = useState(false)
  const [kpis, setKpis] = useState<FeedbackHubKpis>({
    receivedTotal: 0,
    receivedTrend: 0,
    givenTotal: 0,
    givenTrend: 0,
    distinctContributors: 0,
    contributorTrend: 0,
    daysSinceReceived: null,
    daysSinceGiven: null
  })
  const [pendingRequests, setPendingRequests] = useState<PendingRequestRow[]>([])
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const [pendingRequestsPage, setPendingRequestsPage] = useState(1)
  const [showPendingPanel, setShowPendingPanel] = useState(false)

  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [aiTarget, setAiTarget] = useState<FeedbackStream>('received')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiResult, setAiResult] = useState<AiInsightResult | null>(null)

  const buildFeedbackWhere = useCallback(
    (mode: FeedbackStream, withFilters = true) => {
      const andClauses: any[] = [{ isDeleted: { _neq: true } }]

      if (mode === 'received') andClauses.push({ employeeId: { _eq: employee?.id } })
      else andClauses.push({ senderEmployeeId: { _eq: currentUserEmployeeId } })

      if (!isSelfView || filterType === 'public') andClauses.push({ feedbackPublic: { _eq: true } })
      else if (filterType === 'private') andClauses.push({ feedbackPublic: { _eq: false } })

      if (withFilters && dateFrom) {
        andClauses.push({
          _or: [
            { feedbackDate: { _gte: dateFrom } },
            { _and: [{ feedbackDate: { _isNull: true } }, { createdAt: { _gte: `${dateFrom}T00:00:00` } }] }
          ]
        })
      }
      if (withFilters && dateTo) {
        andClauses.push({
          _or: [
            { feedbackDate: { _lte: dateTo } },
            { _and: [{ feedbackDate: { _isNull: true } }, { createdAt: { _lte: `${dateTo}T23:59:59` } }] }
          ]
        })
      }

      if (withFilters && searchTerm.trim()) {
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

      if (withFilters && typeFilter !== 'all') {
        if (typeFilter === t('feedback-hub-type-other')) andClauses.push({ typeRef: { _isNull: true } })
        else {
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
    [employee?.id, currentUserEmployeeId, isSelfView, filterType, dateFrom, dateTo, searchTerm, typeFilter, t]
  )

  const fetchList = useCallback(
    async (mode: FeedbackStream, page: number) => {
      const setter = mode === 'received' ? setReceivedRows : setGivenRows
      const setTotal = mode === 'received' ? setReceivedTotal : setGivenTotal
      const setLoading = mode === 'received' ? setReceivedLoading : setGivenLoading

      setLoading(true)
      try {
        const response = await graphQLClient.request<any>(employeeFeedbackListQuery, {
          where: buildFeedbackWhere(mode),
          limit: FEEDBACK_LIST_LIMIT,
          offset: (page - 1) * FEEDBACK_LIST_LIMIT,
          activeUserLocale: getCurrentActiveUserLocale()
        })
        setter((response?.EmployeeFeedback ?? []) as ExtendedEmployeeFeedback[])
        setTotal(response?.EmployeeFeedbackAggregate?.aggregate?.count ?? 0)
      } finally {
        setLoading(false)
      }
    },
    [graphQLClient, buildFeedbackWhere]
  )

  const fetchKpiData = useCallback(async () => {
    if (!employee?.id || !currentUserEmployeeId) return
    try {
      setKpiLoading(true)
      const now = Date.now()
      const dayMs = 24 * 60 * 60 * 1000
      const last30Start = new Date(now - 30 * dayMs).toISOString()
      const prev30Start = new Date(now - 60 * dayMs).toISOString()
      const response = await graphQLClient.request<FeedbackHubKpiResponse>(employeeFeedbackHubKpiQuery, {
        employeeId: employee.id,
        senderEmployeeId: currentUserEmployeeId,
        last30Start,
        prev30Start,
        last30StartTz: last30Start,
        prev30StartTz: prev30Start,
        pendingLimit: PENDING_REQUESTS_PAGE_SIZE,
        pendingOffset: (pendingRequestsPage - 1) * PENDING_REQUESTS_PAGE_SIZE
      })
      const receivedTotal = response?.receivedTotal?.aggregate?.count ?? 0
      const receivedLast30 = response?.receivedLast30?.aggregate?.count ?? 0
      const receivedPrev30 = response?.receivedPrev30?.aggregate?.count ?? 0
      const givenTotal = response?.givenTotal?.aggregate?.count ?? 0
      const givenLast30 = response?.givenLast30?.aggregate?.count ?? 0
      const givenPrev30 = response?.givenPrev30?.aggregate?.count ?? 0
      const distinctContributors = response?.contributorsTotal?.aggregate?.count ?? 0
      const contributorsLast30 = response?.contributorsLast30?.aggregate?.count ?? 0
      const contributorsPrev30 = response?.contributorsPrev30?.aggregate?.count ?? 0

      const toDateMs = (row?: LatestFeedbackRow) => {
        const raw = row?.feedbackDate ?? row?.createdAt
        if (!raw) return 0
        const parsed = Date.parse(raw)
        return Number.isNaN(parsed) ? 0 : parsed
      }

      const lastReceivedMs = toDateMs(response?.lastReceived?.[0])
      const lastGivenMs = toDateMs(response?.lastGiven?.[0])
      const daysSinceReceived = lastReceivedMs > 0 ? Math.floor((now - lastReceivedMs) / dayMs) : null
      const daysSinceGiven = lastGivenMs > 0 ? Math.floor((now - lastGivenMs) / dayMs) : null

      setKpis({
        receivedTotal,
        receivedTrend: receivedLast30 - receivedPrev30,
        givenTotal,
        givenTrend: givenLast30 - givenPrev30,
        distinctContributors,
        contributorTrend: contributorsLast30 - contributorsPrev30,
        daysSinceReceived,
        daysSinceGiven
      })
      const rows = response?.pendingRequests ?? []
      setPendingRequests(rows)
      setPendingRequestsCount(response?.pendingRequestsAggregate?.aggregate?.count ?? rows.length)
    } finally {
      setKpiLoading(false)
    }
  }, [employee?.id, currentUserEmployeeId, graphQLClient, pendingRequestsPage])

  useEffect(() => {
    fetchList('received', receivedPage)
  }, [fetchList, receivedPage])

  useEffect(() => {
    fetchList('given', givenPage)
  }, [fetchList, givenPage])

  useEffect(() => {
    fetchKpiData()
  }, [fetchKpiData])

  useEffect(() => {
    setReceivedPage(1)
    setGivenPage(1)
  }, [searchTerm, filterType, dateFrom, dateTo, typeFilter])

  const formatFeedback = useCallback(
    (list: ExtendedEmployeeFeedback[], mode: FeedbackStream): FormattedFeedback[] =>
      list.map(feedback => {
        const target =
          mode === 'received'
            ? (feedback.senderEmployee as { firstName?: string; lastName?: string; displayName?: string } | undefined)
            : ((feedback as any).employee as
                | { firstName?: string; lastName?: string; displayName?: string }
                | undefined)
        const firstName = target?.firstName ?? ''
        const lastName = target?.lastName ?? ''
        const sender = (target?.displayName ?? `${firstName} ${lastName}`.trim()) || t('feedback-hub-unknown-sender')
        const rawDate = feedback.feedbackDate ?? (feedback as any).createdAt ?? undefined
        const avatar =
          mode === 'received'
            ? (feedback.senderEmployee?.employeePosition?.employee?.pictureThumbnail ?? null)
            : ((feedback as any)?.employee?.employeePosition?.employee?.pictureThumbnail ?? null)
        return {
          id: feedback.id,
          sender,
          date: rawDate ? (formatDate(rawDate, 'date.short') ?? '') : '',
          rawDate,
          content: feedback.feedback ?? '',
          avatar,
          senderId: feedback.senderEmployeeId,
          firstName,
          lastName,
          rating: feedback.rating,
          private: (feedback as any).feedbackPublic === false,
          feedbackPublic: (feedback as any).feedbackPublic,
          type:
            getTranslatedValue((feedback as any)?.type) || (feedback as any).typeRef || t('feedback-hub-type-other'),
          timestamp: rawDate ? Date.parse(rawDate) : 0
        }
      }),
    [t]
  )

  const receivedList = useMemo(
    () => formatFeedback(receivedRows, 'received').sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)),
    [formatFeedback, receivedRows]
  )
  const givenList = useMemo(
    () => formatFeedback(givenRows, 'given').sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)),
    [formatFeedback, givenRows]
  )
  const typeOptions = useMemo(
    () => Array.from(new Set([...receivedList, ...givenList].map(item => item.type || '').filter(Boolean))).sort(),
    [receivedList, givenList]
  )

  const trendLabel = (value: number) => (value > 0 ? `+${value}` : String(value))

  const extractJsonObjectString = (response: string): string | null => {
    const trimmed = response.trim()
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed
    const first = response.indexOf('{')
    const last = response.lastIndexOf('}')
    return first >= 0 && last > first ? response.slice(first, last + 1) : null
  }

  const readFlowBotResponseText = async (response: Response): Promise<string> => {
    if (!response.body) throw new Error('No response body')
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
    let text = ''
    let frames = ''
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        frames += value
        const chunks = frames.split('\n\n')
        frames = chunks.pop() || ''
        for (const frame of chunks) {
          const lines = frame.split('\n')
          let eventType = ''
          let data = ''
          for (const line of lines) {
            if (line.startsWith('event: ')) eventType = line.slice(7)
            if (line.startsWith('data: ')) data = line.slice(6)
          }
          if (eventType !== 'output-item' || !data) continue
          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'answer' && Array.isArray(parsed.displayData)) {
              for (const item of parsed.displayData) {
                if (item.type === 'textBlock' && item.text) text += item.text
              }
            }
          } catch {
            // no-op
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
    return text
  }

  const fetchAllFeedbackTexts = useCallback(
    async (mode: FeedbackStream): Promise<string[]> => {
      const texts: string[] = []
      const limit = 200
      let offset = 0
      while (true) {
        const response = await graphQLClient.request<any>(employeeFeedbackListQuery, {
          where: buildFeedbackWhere(mode, false),
          limit,
          offset,
          activeUserLocale: getCurrentActiveUserLocale()
        })
        const rows = (response?.EmployeeFeedback ?? []) as Array<{ feedback?: string | null }>
        rows.forEach(row => {
          const value = (row.feedback ?? '').trim()
          if (value) texts.push(value)
        })
        if (rows.length < limit) break
        offset += limit
      }
      return texts
    },
    [graphQLClient, buildFeedbackWhere]
  )

  const runAiInsights = useCallback(
    async (mode: FeedbackStream) => {
      setAiTarget(mode)
      setAiModalOpen(true)
      setAiLoading(true)
      setAiError(null)
      setAiResult(null)

      const cacheKey = `feedback-hub-ai-${mode}-${currentUserEmployeeId}`
      try {
        const cached = sessionStorage.getItem(cacheKey)
        if (cached) {
          setAiResult(JSON.parse(cached) as AiInsightResult)
          setAiLoading(false)
          return
        }
      } catch {
        // no-op
      }

      try {
        const feedbackTexts = await fetchAllFeedbackTexts(mode)
        if (!feedbackTexts.length) {
          setAiResult({ raw: t('feedback-hub-ai-no-feedback-text') })
          setAiLoading(false)
          return
        }

        const prompt =
          mode === 'received'
            ? `Analyze RECEIVED feedback. Return ONLY JSON:
{"overallSentiment":"...", "commonPositiveThemes":["..."], "constructiveThemes":["..."], "reflectionSummary":"..."}
Feedback:
${feedbackTexts.map((text, i) => `${i + 1}. "${text}"`).join('\n')}`
            : `Analyze GIVEN feedback. Return ONLY JSON:
{"toneAnalysis":"...", "recurrentThemes":["..."], "growthSuggestion":"..."}
Feedback:
${feedbackTexts.map((text, i) => `${i + 1}. "${text}"`).join('\n')}`

        const form = new FormData()
        form.append('session_id', '')
        form.append('user_input_text', prompt)
        form.append('llm_model', 'gpt-4.1')
        form.append('use_web_search_tool', 'false')
        form.append(
          'current_page_context',
          JSON.stringify({ type: 'overview', entity_name: 'employee_feedback', url: globalThis.location.href })
        )

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 25000)
        try {
          const response = await fetch(`${resolveFlowbotBaseUrl()}/flowbot/api/agent/v2/chat`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'text/event-stream'
            },
            body: form,
            signal: controller.signal
          })
          if (!response.ok) throw new Error(`AI service returned ${response.status}`)
          const raw = await readFlowBotResponseText(response)
          const jsonPayload = extractJsonObjectString(raw)
          const parsed = jsonPayload ? (JSON.parse(jsonPayload) as AiInsightResult) : ({ raw } as AiInsightResult)
          setAiResult(parsed)
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(parsed))
          } catch {
            // no-op
          }
        } finally {
          clearTimeout(timeout)
        }
      } catch (err) {
        setAiError(err instanceof Error ? err.message : t('feedback-hub-ai-failed'))
      } finally {
        setAiLoading(false)
      }
    },
    [accessToken, currentUserEmployeeId, fetchAllFeedbackTexts, t]
  )

  return (
    <div className="gba:space-y-8 gba:pb-6" data-testid="feedback-tab">
      <div className="gba:pb-4">
        <div className="gba:flex gba:flex-col gba:sm:flex-row gba:justify-between gba:items-center gba:gap-4">
          <div className="gba:max-w-2xl">
            <h2 className="gba:font-bold gba:text-2xl">{t('feedback-hub-title')}</h2>
            <p className="gba:text-muted-foreground gba:text-lg">{t('feedback-hub-description')}</p>
          </div>
          <div className="gba:flex gba:gap-4 gba:items-center gba:self-center">
            <AppAction
              variant="update-primary"
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
            <AppAction
              variant="update-primary"
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

      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-4 gba:gap-4">
        <Card>
          <CardContent className="gba:p-4">
            <p className="gba:text-sm gba:text-muted-foreground gba:flex gba:items-center gba:gap-1.5">
              <MessageSquare className="gba:h-4 gba:w-4" />
              {t('feedback-hub-kpi-received-title')}
            </p>
            <p className="gba:text-2xl gba:font-semibold">{kpis.receivedTotal}</p>
            <p className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1.5">
              <TrendingUp className="gba:h-3.5 gba:w-3.5" />
              {t('feedback-hub-kpi-trend-30d', { value: trendLabel(kpis.receivedTrend) })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="gba:p-4">
            <p className="gba:text-sm gba:text-muted-foreground gba:flex gba:items-center gba:gap-1.5">
              <Send className="gba:h-4 gba:w-4" />
              {t('feedback-hub-kpi-given-title')}
            </p>
            <p className="gba:text-2xl gba:font-semibold">{kpis.givenTotal}</p>
            <p className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1.5">
              <TrendingUp className="gba:h-3.5 gba:w-3.5" />
              {t('feedback-hub-kpi-trend-30d', { value: trendLabel(kpis.givenTrend) })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="gba:p-4">
            <p className="gba:text-sm gba:text-muted-foreground gba:flex gba:items-center gba:gap-1.5">
              <Users className="gba:h-4 gba:w-4" />
              {t('feedback-hub-kpi-contributors-title')}
            </p>
            <p className="gba:text-2xl gba:font-semibold">{kpis.distinctContributors}</p>
            <p className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1.5">
              <TrendingUp className="gba:h-3.5 gba:w-3.5" />
              {t('feedback-hub-kpi-trend-30d', { value: trendLabel(kpis.contributorTrend) })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="gba:p-4">
            <p className="gba:text-sm gba:font-medium gba:mb-2">{t('feedback-hub-suggested-actions-title')}</p>
            <div className="gba:space-y-2 gba:text-sm">
              {pendingRequestsCount > 0 && (
                <button
                  type="button"
                  className="gba:inline-flex gba:items-center gba:gap-1.5 gba:text-left gba:text-primary hover:gba:underline gba:font-medium"
                  onClick={() => {
                    setPendingRequestsPage(1)
                    setShowPendingPanel(true)
                  }}
                >
                  <AlertCircle className="gba:h-4 gba:w-4" />
                  {t('feedback-hub-suggested-pending', { count: pendingRequestsCount })}
                  <ChevronRight className="gba:h-4 gba:w-4" />
                </button>
              )}
              {(kpis.daysSinceReceived == null || kpis.daysSinceReceived > 30) && (
                <div className="gba:space-y-2">
                  <p className="gba:text-muted-foreground">
                    {t('feedback-hub-suggested-no-received', {
                      days:
                        kpis.daysSinceReceived != null ? String(kpis.daysSinceReceived) : t('feedback-hub-days-never')
                    })}
                  </p>
                  <AppAction
                    variant="update-primary"
                    contexts={[
                      {
                        context: FlowContextName.employeeRequestFeedback,
                        contextData: { employeeId: employee?.id, isRequestingFeedback: true }
                      }
                    ]}
                    prefixDataTestId="suggested-request-feedback"
                    accessToken={accessToken}
                    autoExecute={true}
                  >
                    {t('feedback-hub-request-feedback')}
                  </AppAction>
                </div>
              )}
              {(kpis.daysSinceGiven == null || kpis.daysSinceGiven > 30) && (
                <div className="gba:space-y-2">
                  <p className="gba:text-muted-foreground">{t('feedback-hub-suggested-no-given')}</p>
                  <AppAction
                    variant="update-primary"
                    contexts={[
                      { context: FlowContextName.employeeGiveFeedback, contextData: { employeeId: employee?.id } }
                    ]}
                    prefixDataTestId="suggested-give-feedback"
                    accessToken={accessToken}
                    autoExecute={true}
                  >
                    {t('feedback-hub-give-feedback')}
                  </AppAction>
                </div>
              )}
              {pendingRequestsCount === 0 &&
                kpis.daysSinceReceived != null &&
                kpis.daysSinceReceived <= 30 &&
                kpis.daysSinceGiven != null &&
                kpis.daysSinceGiven <= 30 && (
                  <p className="gba:text-muted-foreground">{t('feedback-hub-suggested-healthy')}</p>
                )}
            </div>
          </CardContent>
        </Card>
      </div>

      <FeedbackToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterType={filterType}
        onFilterChange={setFilterType}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        senderFilter="all"
        onSenderFilterChange={() => {}}
        senderOptions={[]}
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

      {kpiLoading && !showPendingPanel && (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-20">
          <Spinner size="md" />
        </div>
      )}

      <div className="gba:grid gba:grid-cols-1 gba:xl:grid-cols-2 gba:gap-6">
        <Card>
          <CardContent className="gba:p-4 gba:space-y-4">
            <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
              <h3 className="gba:text-lg gba:font-semibold">
                {t('feedback-hub-section-received-title', { total: receivedTotal })}
              </h3>
              <Button size="sm" variant="outline" onClick={() => runAiInsights('received')}>
                {t('feedback-hub-ai-insights-button')}
              </Button>
            </div>
            {receivedLoading ? (
              <div className="gba:flex gba:justify-center gba:items-center gba:h-40">
                <Spinner size="lg" />
              </div>
            ) : receivedList.length > 0 ? (
              <FeedbackCards
                feedbackList={receivedList}
                privateBadgeLabel={t('feedback-hub-badge-private')}
                publicBadgeLabel={t('feedback-hub-badge-public')}
                showMoreLabel={t('feedback-hub-show-more')}
                showLessLabel={t('feedback-hub-show-less')}
              />
            ) : (
              <EmptyState title={t('feedback-hub-empty-received')} />
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
          </CardContent>
        </Card>

        <Card>
          <CardContent className="gba:p-4 gba:space-y-4">
            <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
              <h3 className="gba:text-lg gba:font-semibold">
                {t('feedback-hub-section-given-title', { total: givenTotal })}
              </h3>
              <Button size="sm" variant="outline" onClick={() => runAiInsights('given')}>
                {t('feedback-hub-ai-insights-button')}
              </Button>
            </div>
            {givenLoading ? (
              <div className="gba:flex gba:justify-center gba:items-center gba:h-40">
                <Spinner size="lg" />
              </div>
            ) : givenList.length > 0 ? (
              <FeedbackCards
                feedbackList={givenList}
                privateBadgeLabel={t('feedback-hub-badge-private')}
                publicBadgeLabel={t('feedback-hub-badge-public')}
                showMoreLabel={t('feedback-hub-show-more')}
                showLessLabel={t('feedback-hub-show-less')}
              />
            ) : (
              <EmptyState title={t('feedback-hub-empty-given')} />
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
          </CardContent>
        </Card>
      </div>

      <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
        <DialogContent className="gba:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {aiTarget === 'received'
                ? t('feedback-hub-ai-dialog-title-received')
                : t('feedback-hub-ai-dialog-title-given')}
            </DialogTitle>
            <DialogDescription>{t('feedback-hub-ai-dialog-description')}</DialogDescription>
          </DialogHeader>
          {aiLoading ? (
            <div className="gba:flex gba:justify-center gba:items-center gba:h-40">
              <Spinner size="lg" />
            </div>
          ) : aiError ? (
            <p className="gba:text-sm gba:text-destructive">{aiError}</p>
          ) : aiResult ? (
            <div className="gba:space-y-4">
              {aiTarget === 'received' ? (
                <>
                  <div>
                    <p className="gba:text-sm gba:font-medium">{t('feedback-hub-ai-overall-sentiment')}</p>
                    <p className="gba:text-sm gba:text-muted-foreground">
                      {aiResult.overallSentiment ?? aiResult.raw ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="gba:text-sm gba:font-medium">{t('feedback-hub-ai-common-positive-themes')}</p>
                    <ul className="gba:list-disc gba:ml-5 gba:text-sm gba:text-muted-foreground">
                      {(aiResult.commonPositiveThemes ?? []).map((item, idx) => (
                        <li key={`${item}-${idx}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="gba:text-sm gba:font-medium">{t('feedback-hub-ai-constructive-themes')}</p>
                    <ul className="gba:list-disc gba:ml-5 gba:text-sm gba:text-muted-foreground">
                      {(aiResult.constructiveThemes ?? []).map((item, idx) => (
                        <li key={`${item}-${idx}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="gba:text-sm gba:font-medium">{t('feedback-hub-ai-reflection-summary')}</p>
                    <p className="gba:text-sm gba:text-muted-foreground">{aiResult.reflectionSummary ?? '—'}</p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="gba:text-sm gba:font-medium">{t('feedback-hub-ai-tone-analysis')}</p>
                    <p className="gba:text-sm gba:text-muted-foreground">
                      {aiResult.toneAnalysis ?? aiResult.raw ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="gba:text-sm gba:font-medium">{t('feedback-hub-ai-recurrent-themes')}</p>
                    <ul className="gba:list-disc gba:ml-5 gba:text-sm gba:text-muted-foreground">
                      {(aiResult.recurrentThemes ?? []).map((item, idx) => (
                        <li key={`${item}-${idx}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="gba:text-sm gba:font-medium">{t('feedback-hub-ai-growth-suggestion')}</p>
                    <p className="gba:text-sm gba:text-muted-foreground">{aiResult.growthSuggestion ?? '—'}</p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="gba:text-sm gba:text-muted-foreground">{t('feedback-hub-ai-no-insights')}</p>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setAiModalOpen(false)}>
              {t('feedback-hub-ai-close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={showPendingPanel} onOpenChange={setShowPendingPanel}>
        <SheetContent
          side="right"
          className="gba:w-[680px] gba:max-w-[680px] gba:sm:max-w-[680px] gba:p-0 gba:flex gba:flex-col"
          data-testid="feedback-pending-requests-drawer"
        >
          <SheetHeader className="gba:px-6 gba:py-4 gba:border-b gba:border-border">
            <SheetTitle>{t('feedback-hub-pending-panel-title')}</SheetTitle>
            <p className="gba:text-muted-foreground">
              {t('feedback-hub-suggested-pending', { count: pendingRequestsCount })}
            </p>
          </SheetHeader>
          <div className="gba:flex-1 gba:overflow-y-auto gba:p-6 gba:space-y-3">
            {pendingRequests.map(row => {
              const firstName = row.requesterEmployee?.firstName ?? ''
              const lastName = row.requesterEmployee?.lastName ?? ''
              const name =
                (row.requesterEmployee?.displayName ?? `${firstName} ${lastName}`.trim()) ||
                t('feedback-hub-unknown-sender')
              const dateRaw = row.requestedOn ?? row.createdAt ?? row.dueDate ?? ''
              const dateLabel = dateRaw ? (formatDate(dateRaw, 'date.short') ?? '') : ''
              const avatar = toAvatarSrc(row.requesterEmployee?.employeePosition?.employee?.pictureThumbnail)
              return (
                <div key={row.id} className="gba:border gba:border-border gba:rounded-md gba:p-3 gba:space-y-2">
                  <div className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:flex-wrap">
                    <div className="gba:flex gba:items-center gba:gap-3">
                      <Avatar className="gba:h-10 gba:w-10">
                        {avatar && <AvatarImage src={avatar} alt={name} />}
                        <AvatarFallback>{`${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`}</AvatarFallback>
                      </Avatar>
                      <span className="gba:text-sm gba:font-medium">
                        {name} {dateLabel ? `• ${dateLabel}` : ''}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        startProcess({
                          domain: 'employee',
                          processName: 'giveFeedback',
                          payload: { requestId: row.id, employeeId: row.employeeId ?? employee?.id },
                          builderType: 'NATIVE_SCREEN'
                        })
                      }
                    >
                      <PiPencilSimple className="gba:mr-1" />
                      {t('feedback-hub-pending-give-feedback-btn')}
                    </Button>
                  </div>
                  {row.dueDate && (
                    <p className="gba:text-xs gba:text-muted-foreground">
                      {t('feedback-hub-pending-due', { date: formatDate(row.dueDate, 'date.short') ?? row.dueDate })}
                    </p>
                  )}
                  {row.message && <p className="gba:text-sm gba:text-muted-foreground">{row.message}</p>}
                </div>
              )
            })}
          </div>
          {pendingRequestsCount > PENDING_REQUESTS_PAGE_SIZE && (
            <div className="gba:px-6 gba:pb-4 gba:flex gba:justify-end">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPendingRequestsPage(p => Math.max(1, p - 1))}
                      className={
                        pendingRequestsPage === 1 ? 'gba:pointer-events-none gba:opacity-50' : 'gba:cursor-pointer'
                      }
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="gba:px-2 gba:text-sm gba:text-muted-foreground">
                      {t('feedback-hub-pagination-page-of', {
                        page: pendingRequestsPage,
                        total: Math.ceil(pendingRequestsCount / PENDING_REQUESTS_PAGE_SIZE)
                      })}
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setPendingRequestsPage(p =>
                          Math.min(Math.ceil(pendingRequestsCount / PENDING_REQUESTS_PAGE_SIZE), p + 1)
                        )
                      }
                      className={
                        pendingRequestsPage >= Math.ceil(pendingRequestsCount / PENDING_REQUESTS_PAGE_SIZE)
                          ? 'gba:pointer-events-none gba:opacity-50'
                          : 'gba:cursor-pointer'
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
          <SheetFooter className="gba:px-6 gba:py-4 gba:border-t gba:border-border">
            <Button variant="secondary" onClick={() => setShowPendingPanel(false)}>
              {t('feedback-hub-ai-close')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default FeedbackTab
