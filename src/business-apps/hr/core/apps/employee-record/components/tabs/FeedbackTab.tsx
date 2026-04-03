'use client'

import React, { useRef, useState } from 'react'
import { Employee, EmployeeFeedback } from '../../hooks/useEmployeeData'
import { Button, Spinner, useTranslation } from '@newwork/nw-design-system'
import { SparkleIcon } from '@phosphor-icons/react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { UserInfoProps } from '../../../../../../../common/BusinessAppContext'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import translations from '../../_i18n'
import FeedbackToolbar from './feedback-hub/FeedbackToolbar'
import FeedbackHubHeader from './feedback-hub/FeedbackHubHeader'
import FeedbackHubKpiGrid from './feedback-hub/FeedbackHubKpiGrid'
import FeedbackListSection from './feedback-hub/FeedbackListSection'
import FeedbackAnalysisPanel from './feedback-hub/FeedbackAnalysisPanel'
import PendingRequestsSheet from './feedback-hub/PendingRequestsSheet'
import { FEEDBACK_LIST_LIMIT } from '../../queries/feedbackQueries'
import { PENDING_REQUESTS_PAGE_SIZE, useFeedbackHubData } from './feedback-hub/useFeedbackHubData'
import { useFeedbackAnalysis } from '../../hooks/useFeedbackAnalysis'

interface FeedbackTabProps {
  employee: Employee
  accessToken: string
  employeeId?: string
  userInfo?: UserInfoProps
  employeeFeedback?: EmployeeFeedback[]
  isSelfView: boolean
  /** When true, AI Insights button is shown (self-view, manager of employee, or HR). Default true. */
  canViewAiInsights?: boolean
  /** When true, request feedback runs on behalf of the viewed employee. */
  canRequestFeedbackOnBehalf?: boolean
}

const FeedbackTab: React.FC<FeedbackTabProps> = ({
  employee,
  accessToken,
  employeeId,
  userInfo,
  isSelfView = false,
  canViewAiInsights = true,
  canRequestFeedbackOnBehalf = false
}) => {
  const { t } = useTranslation(translations)
  const graphQLClient = useGraphqlClient(accessToken)
  const currentUserEmployeeId = userInfo?.employeeDetails?.employeeId ?? employeeId ?? employee?.id ?? ''

  const {
    results: analysisResults,
    error: analysisError,
    analyze,
    cancelAnalyzingForDirection
  } = useFeedbackAnalysis({ accessToken })
  const [openInsights, setOpenInsights] = useState<{ received: boolean; given: boolean }>({
    received: false,
    given: false
  })
  const [analyzingInsights, setAnalyzingInsights] = useState<{ received: boolean; given: boolean }>({
    received: false,
    given: false
  })
  const lastAnalyzedSignatureRef = useRef<{ received: string | null; given: string | null }>({
    received: null,
    given: null
  })

  const {
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
    typeOptions,
    reloadAllData
  } = useFeedbackHubData({
    employee,
    currentUserEmployeeId,
    isSelfView,
    accessToken,
    userInfo,
    graphQLClient,
    t
  })

  useProcessCompletion({
    onSuccess: () => {
      setShowPendingPanel(false)
      reloadAllData()
    }
  })

  const employeeName = `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() || 'Employee'

  const buildFeedbackSignature = (entries: typeof receivedList) =>
    JSON.stringify(
      entries.map(entry => ({
        id: entry.id ?? `${entry.senderId ?? ''}:${entry.rawDate ?? entry.date}`,
        date: entry.rawDate ?? entry.date,
        content: entry.content,
        type: entry.type,
        rating: entry.rating,
        visibility: entry.feedbackPublic
      }))
    )

  const handleOpenReceivedInsights = async () => {
    setOpenInsights(prev => ({ ...prev, received: true }))
    if (receivedList.length === 0) return

    const signature = buildFeedbackSignature(receivedList)
    const hasCachedResult = !!analysisResults.received
    const isSamePayload = lastAnalyzedSignatureRef.current.received === signature
    if (hasCachedResult && isSamePayload) return
    if (analyzingInsights.received) return

    setAnalyzingInsights(prev => ({ ...prev, received: true }))
    try {
      const result = await analyze({ employeeName, received: receivedList, given: [] })
      if (result?.received) {
        lastAnalyzedSignatureRef.current.received = signature
      }
    } finally {
      setAnalyzingInsights(prev => ({ ...prev, received: false }))
    }
  }

  const handleOpenGivenInsights = async () => {
    setOpenInsights(prev => ({ ...prev, given: true }))
    if (givenList.length === 0) return

    const signature = buildFeedbackSignature(givenList)
    const hasCachedResult = !!analysisResults.given
    const isSamePayload = lastAnalyzedSignatureRef.current.given === signature
    if (hasCachedResult && isSamePayload) return
    if (analyzingInsights.given) return

    setAnalyzingInsights(prev => ({ ...prev, given: true }))
    try {
      const result = await analyze({ employeeName, received: [], given: givenList })
      if (result?.given) {
        lastAnalyzedSignatureRef.current.given = signature
      }
    } finally {
      setAnalyzingInsights(prev => ({ ...prev, given: false }))
    }
  }

  const handleCloseReceivedInsights = () => {
    if (analyzingInsights.received) {
      cancelAnalyzingForDirection('received')
      setAnalyzingInsights(prev => ({ ...prev, received: false }))
    }
    setOpenInsights(prev => ({ ...prev, received: false }))
  }

  const handleCloseGivenInsights = () => {
    if (analyzingInsights.given) {
      cancelAnalyzingForDirection('given')
      setAnalyzingInsights(prev => ({ ...prev, given: false }))
    }
    setOpenInsights(prev => ({ ...prev, given: false }))
  }

  return (
    <div className="gba:space-y-6" data-testid="feedback-tab">
      <FeedbackHubHeader
        t={t}
        employee={employee}
        accessToken={accessToken}
        isSelfView={isSelfView}
        currentUserEmployeeId={currentUserEmployeeId}
        canRequestFeedbackOnBehalf={canRequestFeedbackOnBehalf}
      />

      <FeedbackHubKpiGrid
        t={t}
        kpis={kpis}
        pendingRequestsCount={pendingRequestsCount}
        accessToken={accessToken}
        employee={employee}
        onOpenPendingPanel={() => {
          setPendingRequestsPage(1)
          setShowPendingPanel(true)
        }}
        isSelfView={isSelfView}
      />

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
        allDatesLabel={t('feedback-hub-filter-all-dates')}
        senderLabel={t('feedback-hub-filter-sender')}
        typeLabel={t('feedback-hub-filter-type')}
        clearLabel={t('feedback-hub-filters-clear')}
        onClearFilters={() => {
          setSearchTerm('')
          setFilterType('all')
          setDateFrom('')
          setDateTo('')
          setTypeFilter('all')
        }}
        visibilityFilterLockedToPublic={!isSelfView}
      />

      {kpiLoading && !showPendingPanel && (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-20">
          <Spinner size="md" />
        </div>
      )}

      <div
        className={
          isSelfView ? 'gba:grid gba:grid-cols-1 gba:xl:grid-cols-2 gba:gap-6 gba:items-stretch' : 'gba:space-y-6'
        }
      >
        <FeedbackListSection
          title={t('feedback-hub-section-received-visible-title', { visible: receivedTotal })}
          loading={receivedLoading}
          feedbackList={receivedList}
          emptyLabel={t('feedback-hub-empty-received')}
          total={receivedTotal}
          currentPage={receivedPage}
          onPreviousPage={() => setReceivedPage(p => Math.max(1, p - 1))}
          onNextPage={() => setReceivedPage(p => Math.min(Math.ceil(receivedTotal / FEEDBACK_LIST_LIMIT), p + 1))}
          privateBadgeLabel={t('feedback-hub-badge-private')}
          publicBadgeLabel={t('feedback-hub-badge-public')}
          showMoreLabel={t('feedback-hub-show-more')}
          showLessLabel={t('feedback-hub-show-less')}
          unknownSenderLabel={t('feedback-hub-unknown-sender')}
          headerAction={
            canViewAiInsights ? (
              <Button
                variant="outline"
                size="sm"
                className="gba:flex gba:items-center gba:gap-2"
                data-testid="analyze-received-insights-button"
                disabled={receivedList.length === 0 || analyzingInsights.received}
                onClick={handleOpenReceivedInsights}
              >
                {analyzingInsights.received ? (
                  <Spinner size="sm" />
                ) : (
                  <SparkleIcon className="gba:h-4 gba:w-4" weight="fill" />
                )}
                {analyzingInsights.received
                  ? t('feedback-hub-ai-insights-analyzing')
                  : t('feedback-hub-ai-insights-button')}
              </Button>
            ) : undefined
          }
          showBackContent={openInsights.received}
          footerContent={
            openInsights.received ? (
              <FeedbackAnalysisPanel
                result={analysisResults.received}
                isAnalyzing={analyzingInsights.received}
                error={analyzingInsights.received ? analysisError : null}
                entryCount={receivedList.length}
                onClose={handleCloseReceivedInsights}
              />
            ) : undefined
          }
        />

        {isSelfView && (
          <FeedbackListSection
            title={t('feedback-hub-section-given-title', { total: givenTotal })}
            loading={givenLoading}
            feedbackList={givenList}
            emptyLabel={t('feedback-hub-empty-given')}
            total={givenTotal}
            currentPage={givenPage}
            onPreviousPage={() => setGivenPage(p => Math.max(1, p - 1))}
            onNextPage={() => setGivenPage(p => Math.min(Math.ceil(givenTotal / FEEDBACK_LIST_LIMIT), p + 1))}
            privateBadgeLabel={t('feedback-hub-badge-private')}
            publicBadgeLabel={t('feedback-hub-badge-public')}
            showMoreLabel={t('feedback-hub-show-more')}
            showLessLabel={t('feedback-hub-show-less')}
            unknownSenderLabel={t('feedback-hub-unknown-sender')}
            headerAction={
              <Button
                variant="outline"
                size="sm"
                className="gba:flex gba:items-center gba:gap-2"
                data-testid="analyze-given-insights-button"
                disabled={givenList.length === 0 || analyzingInsights.given}
                onClick={handleOpenGivenInsights}
              >
                {analyzingInsights.given ? (
                  <Spinner size="sm" />
                ) : (
                  <SparkleIcon className="gba:h-4 gba:w-4" weight="fill" />
                )}
                {analyzingInsights.given
                  ? t('feedback-hub-ai-insights-analyzing')
                  : t('feedback-hub-ai-insights-button')}
              </Button>
            }
            showBackContent={openInsights.given}
            footerContent={
              openInsights.given ? (
                <FeedbackAnalysisPanel
                  result={analysisResults.given}
                  isAnalyzing={analyzingInsights.given}
                  error={analyzingInsights.given ? analysisError : null}
                  entryCount={givenList.length}
                  onClose={handleCloseGivenInsights}
                />
              ) : undefined
            }
          />
        )}
      </div>

      <PendingRequestsSheet
        t={t}
        open={showPendingPanel}
        onOpenChange={setShowPendingPanel}
        requests={pendingRequests}
        requestCount={pendingRequestsCount}
        currentPage={pendingRequestsPage}
        pageSize={PENDING_REQUESTS_PAGE_SIZE}
        onPreviousPage={() => setPendingRequestsPage(p => Math.max(1, p - 1))}
        onNextPage={() =>
          setPendingRequestsPage(p => Math.min(Math.ceil(pendingRequestsCount / PENDING_REQUESTS_PAGE_SIZE), p + 1))
        }
        employeeId={employee?.id}
      />
    </div>
  )
}

export default FeedbackTab
