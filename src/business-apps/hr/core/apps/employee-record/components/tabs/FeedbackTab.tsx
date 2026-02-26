'use client'

import React, { useState } from 'react'
import { Employee, EmployeeFeedback } from '../../hooks/useEmployeeData'
import { Button, Spinner, useTranslation } from '@newwork/nw-design-system'
import { Sparkle } from '@phosphor-icons/react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { UserInfoProps } from '../../../../../../../common/BusinessAppContext'
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
}

const FeedbackTab: React.FC<FeedbackTabProps> = ({
  employee,
  accessToken,
  employeeId,
  userInfo,
  isSelfView = false
}) => {
  const { t } = useTranslation(translations)
  const graphQLClient = useGraphqlClient(accessToken)
  const currentUserEmployeeId = userInfo?.employeeDetails?.employeeId ?? employeeId ?? employee?.id ?? ''

  const {
    results: analysisResults,
    isAnalyzing,
    error: analysisError,
    analyze,
    clear: clearAnalysis
  } = useFeedbackAnalysis({ accessToken })
  const [showAnalysis, setShowAnalysis] = useState(false)

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
    typeOptions
  } = useFeedbackHubData({
    employee,
    currentUserEmployeeId,
    isSelfView,
    accessToken,
    userInfo,
    graphQLClient,
    t
  })

  const handleAnalyzeFeedback = async () => {
    const employeeName = `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() || 'Employee'
    if (receivedList.length === 0 && givenList.length === 0) return
    setShowAnalysis(true)
    await analyze({
      employeeName,
      received: receivedList,
      given: givenList
    })
  }

  return (
    <div className="gba:space-y-6 " data-testid="feedback-tab">
      <FeedbackHubHeader t={t} employee={employee} accessToken={accessToken} />

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
        senderLabel={t('feedback-hub-filter-sender')}
        typeLabel={t('feedback-hub-filter-type')}
      />

      {/* AI Analysis button */}
      <div className="gba:flex gba:justify-end">
        <Button
          variant="outline"
          size="sm"
          className="gba:flex gba:items-center gba:gap-2"
          data-testid="analyze-feedback-button"
          disabled={isAnalyzing || (receivedList.length === 0 && givenList.length === 0)}
          onClick={handleAnalyzeFeedback}
        >
          {isAnalyzing ? <Spinner size="sm" /> : <Sparkle className="gba:h-4 gba:w-4" weight="fill" />}
          {isAnalyzing ? 'Analyzing…' : 'AI Analysis'}
        </Button>
      </div>

      {/* AI Analysis Results */}
      {showAnalysis && (
        <FeedbackAnalysisPanel
          receivedResult={analysisResults.received}
          givenResult={analysisResults.given}
          isAnalyzing={isAnalyzing}
          error={analysisError}
          receivedCount={receivedList.length}
          givenCount={givenList.length}
          onClose={() => {
            setShowAnalysis(false)
            clearAnalysis()
          }}
        />
      )}

      {kpiLoading && !showPendingPanel && (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-20">
          <Spinner size="md" />
        </div>
      )}

      <div className="gba:grid gba:grid-cols-1 gba:xl:grid-cols-2 gba:gap-6">
        <FeedbackListSection
          title={t('feedback-hub-section-received-title', { total: receivedTotal })}
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
        />

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
        />
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
