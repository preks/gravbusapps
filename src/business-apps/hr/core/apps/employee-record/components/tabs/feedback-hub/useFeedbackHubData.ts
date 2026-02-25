'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Employee } from '../../../hooks/useEmployeeData'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import {
  employeeFeedbackHubKpiQuery,
  employeeFeedbackListQuery,
  FEEDBACK_LIST_LIMIT
} from '../../../queries/feedbackQueries'
import { ExtendedEmployeeFeedback, FeedbackHubKpiResponse, FeedbackHubKpis, PendingRequestRow } from './types'
import { formatFeedbackList } from './feedbackHubFormatters'

type FeedbackStream = 'received' | 'given'

interface UseFeedbackHubDataProps {
  employee: Employee
  currentUserEmployeeId: string
  isSelfView: boolean
  graphQLClient: {
    request: <T = any>(query: string, variables?: Record<string, unknown>) => Promise<T>
  }
  t: (key: string, options?: Record<string, unknown>) => string
}

export const PENDING_REQUESTS_PAGE_SIZE = 20

export const useFeedbackHubData = ({
  employee,
  currentUserEmployeeId,
  isSelfView,
  graphQLClient,
  t
}: UseFeedbackHubDataProps) => {
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

  const buildFeedbackWhere = useCallback(
    (mode: FeedbackStream) => {
      const andClauses: any[] = [{ isDeleted: { _neq: true } }]

      if (mode === 'received') andClauses.push({ employeeId: { _eq: employee?.id } })
      else andClauses.push({ senderEmployeeId: { _eq: currentUserEmployeeId } })

      if (!isSelfView || filterType === 'public') andClauses.push({ feedbackPublic: { _eq: true } })
      else if (filterType === 'private') andClauses.push({ feedbackPublic: { _eq: false } })

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

      if (typeFilter !== 'all') {
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

  const receivedList = useMemo(
    () => formatFeedbackList(receivedRows, 'received', t).sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)),
    [receivedRows, t]
  )

  const givenList = useMemo(
    () => formatFeedbackList(givenRows, 'given', t).sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)),
    [givenRows, t]
  )

  const typeOptions = useMemo(
    () =>
      Array.from(new Set([...receivedList, ...givenList].map(item => item.type || '').filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [receivedList, givenList]
  )

  return {
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    typeFilter,
    setTypeFilter,
    receivedList,
    givenList,
    receivedTotal,
    givenTotal,
    receivedPage,
    setReceivedPage,
    givenPage,
    setGivenPage,
    receivedLoading,
    givenLoading,
    kpiLoading,
    kpis,
    pendingRequests,
    pendingRequestsCount,
    pendingRequestsPage,
    setPendingRequestsPage,
    showPendingPanel,
    setShowPendingPanel,
    typeOptions
  }
}
