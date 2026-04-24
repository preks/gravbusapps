import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  PageLayout,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'

import { ArrowLeftIcon } from '@phosphor-icons/react'

import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  buildPlatformUrl,
  getCurrentUrlWithUpdatedSearchParams,
  navigateTo,
  Navigation
} from '@/common/utils/navigationUtils'
import { useActiveStructureCompanies } from '../../hooks/useActiveStructureCompanies'

import { CompensationCycleSelector } from '../compensation-planning/components/shared/CompensationCycleSelector'
import compensationPlanningTranslations from '../compensation-planning/_i18n'
import { useManagerPlanningStore } from './hooks/useManagerPlanningStore'

import { useDefaultCompanyForCurrentUser } from '../../hooks/useDefaultCompanyForCurrentUser'

import { useTeamCompensationData } from './hooks/useTeamCompensationData'

import { useTeamMemberPerformanceScores } from './hooks/useTeamMemberPerformanceScores'

import { useTeamMembersPipeline } from './hooks/useTeamMembersPipeline'
import { useManagerTeamSalaryBudget } from './hooks/useManagerTeamSalaryBudget'

import { TeamCompensationDistributionPanel } from './components/TeamCompensationDistributionPanel'
import { SupervisorOrgUnitProposalReview } from './components/SupervisorOrgUnitProposalReview'
import translations from './_i18n'

interface SupervisorReviewUrl {
  companyId: string
  orgUnitId: string
  planOuRowId: string
  teamLabel: string
  /** Set when opening review from HR Department submissions — back navigates there, not team compensation. */
  reviewSource: 'department-submissions' | null
}

function parseSupervisorReviewUrl(): SupervisorReviewUrl | null {
  if (globalThis.window === undefined) {
    return null
  }
  const p = new URLSearchParams(globalThis.window.location.search)
  if (p.get('supervisorReview') !== '1') {
    return null
  }
  const companyId = p.get('companyId') ?? ''
  const orgUnitId = p.get('orgUnitId') ?? ''
  const planOuRowId = p.get('planOuRowId') ?? ''
  const teamLabel = p.get('teamLabel') ?? ''
  if (!companyId || !orgUnitId || !planOuRowId) {
    return null
  }
  const reviewSource = p.get('reviewSource')
  return {
    companyId,
    orgUnitId,
    planOuRowId,
    teamLabel,
    reviewSource: reviewSource === 'department-submissions' ? 'department-submissions' : null
  }
}

export const ManagerCompensationPlanning: React.FC<BusinessAppContextProps> = context => {
  const { accessToken, userInfo } = context

  const employeeId = userInfo?.employeeDetails?.employeeId

  const { t } = useTranslation(translations)
  const { t: tCompensationPlan } = useTranslation(compensationPlanningTranslations)

  const {
    searchQuery,
    selectedCompanyId,
    setSelectedCompanyId,
    selectedCompensationPlanId,
    setSelectedCompensationPlanId,
    sidebarFilterIds,
    filterSalaryMin,
    filterSalaryMax,
    filterLastRaiseFrom,
    filterLastRaiseTo,
    sortField,
    sortDirection,
    currentPage,
    pageSize
  } = useManagerPlanningStore()

  const { companies, loading: companiesLoading, error: companiesLoadError } = useActiveStructureCompanies(accessToken)

  useEffect(() => {
    if (companiesLoading) return
    if (selectedCompanyId == null) return
    if (companies.length === 0) {
      setSelectedCompanyId(null)
      return
    }
    if (!companies.some(c => c.id === selectedCompanyId)) {
      setSelectedCompanyId(null)
    }
  }, [companiesLoading, companies, selectedCompanyId, setSelectedCompanyId])

  const [supervisorReview, setSupervisorReview] = useState<SupervisorReviewUrl | null>(() => parseSupervisorReviewUrl())

  useLayoutEffect(() => {
    const sup = parseSupervisorReviewUrl()
    if (sup) {
      setSupervisorReview(sup)
      setSelectedCompanyId(sup.companyId)
      return
    }
    setSupervisorReview(null)
  }, [setSelectedCompanyId])

  useEffect(() => {
    const syncFromUrl = () => {
      const sup = parseSupervisorReviewUrl()
      if (sup) {
        setSupervisorReview(sup)
        return
      }
      setSupervisorReview(null)
    }
    globalThis.addEventListener('popstate', syncFromUrl)
    return () => globalThis.removeEventListener('popstate', syncFromUrl)
  }, [])

  const exitSupervisorReviewMode = useCallback(() => {
    setSupervisorReview(null)
    const next = getCurrentUrlWithUpdatedSearchParams({
      supervisorReview: null,
      orgUnitId: null,
      planOuRowId: null,
      teamLabel: null,
      reviewSource: null
    })
    navigateTo(next)
  }, [])

  const navigateToDepartmentSubmissions = useCallback(() => {
    if (!supervisorReview) {
      return
    }
    const url = buildPlatformUrl(Navigation.HR_COMPENSATION_PLANNING, {
      companyId: supervisorReview.companyId,
      view: 'submissions'
    })
    navigateTo(url, { fullPage: true })
  }, [supervisorReview])

  useDefaultCompanyForCurrentUser(
    accessToken,
    employeeId,
    companies,
    companiesLoading,
    selectedCompanyId,
    setSelectedCompanyId
  )

  const effectiveCompanyId = supervisorReview?.companyId ?? selectedCompanyId

  const loadTeamData = Boolean(effectiveCompanyId) && (Boolean(supervisorReview) || selectedCompensationPlanId != null)

  const {
    teamMembers,
    loading: dataLoading,
    error,
    refetch: refetchTeam
  } = useTeamCompensationData({
    accessToken,
    companyId: effectiveCompanyId,
    orgUnitId: supervisorReview?.orgUnitId ?? undefined,
    supervisorEmployeeId: supervisorReview ? undefined : (employeeId ?? undefined),
    supervisorOnly: supervisorReview == null,
    /** Aligns with company compensation planning: contract type catalog `payroll_relevant`. */
    requirePayrollRelevantContractType: true,
    enabled: loadTeamData
  })

  const {
    totalSalaryBudget,
    totalOrgUnitAllocationAmount,
    loading: salaryBudgetLoading,
    error: salaryBudgetError,
    refetch: refetchSalaryBudget,
    planOuRowIdByOrganizationalUnitId,
    managerOrganizationalUnitId,
    compensationPlanChoices
  } = useManagerTeamSalaryBudget({
    accessToken,
    companyId: effectiveCompanyId,
    managerEmployeeId: employeeId,
    teamMembers,
    selectedCompensationBudgetPlanId: selectedCompensationPlanId
  })

  const compensationCycleSelectPlanId = useMemo((): string | null => {
    if (compensationPlanChoices.length === 0) {
      return null
    }
    if (selectedCompensationPlanId != null && compensationPlanChoices.some(p => p.id === selectedCompensationPlanId)) {
      return selectedCompensationPlanId
    }
    return null
  }, [compensationPlanChoices, selectedCompensationPlanId])

  useEffect(() => {
    if (compensationPlanChoices.length === 0) {
      return
    }
    if (selectedCompensationPlanId != null && !compensationPlanChoices.some(p => p.id === selectedCompensationPlanId)) {
      setSelectedCompensationPlanId(null)
    }
  }, [compensationPlanChoices, selectedCompensationPlanId, setSelectedCompensationPlanId])

  const teamCurrencyCode = teamMembers[0]?.currency ?? 'EUR'

  const supervisorEmployeeDisplayNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const tm of teamMembers) {
      const label = tm.displayName || `${tm.firstName} ${tm.lastName}`.trim() || tm.employeeCode
      map.set(tm.employeeId, label)
    }
    return map
  }, [teamMembers])

  const employeeIdsForPerformance = useMemo(() => [...new Set(teamMembers.map(m => m.employeeId))], [teamMembers])

  const {
    scoreByEmployeeId,
    loading: performanceScoresLoading,
    error: performanceScoresError,
    performanceCyclesQueryError
  } = useTeamMemberPerformanceScores(accessToken, employeeIdsForPerformance)

  const teamMembersWithPerformance = useMemo(
    () =>
      teamMembers.map(m => ({
        ...m,
        performanceOverallScore: scoreByEmployeeId.get(m.employeeId) ?? null,
        performanceRatingScaleMax: 5
      })),
    [teamMembers, scoreByEmployeeId]
  )

  const [proposalsLocked, setProposalsLocked] = useState(false)

  useEffect(() => {
    setProposalsLocked(false)
  }, [selectedCompanyId])

  const mergeSavedRowIds = useCallback((ids?: Record<string, string>) => {
    if (!ids || Object.keys(ids).length === 0) {
      return
    }
    setProposalsLocked(true)
  }, [])

  const handleNewProposalUnlock = useCallback(() => {
    setProposalsLocked(false)
    void refetchSalaryBudget()
    void refetchTeam()
  }, [refetchSalaryBudget, refetchTeam])

  const onSupervisorReviewDataChanged = useCallback(() => {
    void refetchSalaryBudget()
    void refetchTeam()
  }, [refetchSalaryBudget, refetchTeam])

  const pipeline = useTeamMembersPipeline({
    members: teamMembersWithPerformance,
    searchQuery,
    sidebarFilterIds,
    filterSalaryMin,
    filterSalaryMax,
    filterLastRaiseFrom,
    filterLastRaiseTo,
    sortField,
    sortDirection,
    currentPage,
    pageSize,
    paginate: false
  })

  const companiesLoadErrorMessage =
    !companiesLoading && companies.length === 0 && companiesLoadError ? (
      <p
        className="gba:max-w-sm gba:text-right gba:text-sm gba:text-destructive"
        data-testid="manager-compensation-companies-error"
      >
        {t('error-companies-load', { message: companiesLoadError })}
      </p>
    ) : null

  const emptyCompanyContextRow = (
    <div
      className="gba:flex gba:w-full gba:flex-col gba:gap-2 sm:gba:flex-row sm:gba:items-start sm:gba:justify-between"
      data-testid="manager-compensation-empty-company-bar"
    >
      <p className="gba:min-w-0 gba:text-sm gba:text-muted-foreground">{t('empty-select-company-hint')}</p>
      {companiesLoadErrorMessage}
    </div>
  )

  const renderBody = () => {
    if (companiesLoading) {
      return (
        <div className="gba:flex gba:justify-center gba:py-12">
          <Spinner />
        </div>
      )
    }

    if (!effectiveCompanyId) {
      return (
        <div
          className="gba:min-h-[400px] gba:overflow-auto gba:bg-background"
          data-testid="manager-compensation-data-body"
        >
          <div className="gba:p-4">{emptyCompanyContextRow}</div>
        </div>
      )
    }

    if (supervisorReview) {
      const backFromHrSubmissions = supervisorReview.reviewSource === 'department-submissions'
      return (
        <div className="gba:min-h-0 gba:overflow-auto gba:bg-background" data-testid="manager-compensation-data-body">
          <div className="gba:flex gba:w-full gba:flex-col gba:gap-3 gba:px-4 gba:pb-4 gba:pt-0">
            <Button
              type="button"
              variant="ghost"
              className="gba:-ms-2 gba:self-start gba:gap-2 gba:px-2"
              data-testid="manager-compensation-exit-supervisor-review"
              onClick={backFromHrSubmissions ? navigateToDepartmentSubmissions : exitSupervisorReviewMode}
            >
              <ArrowLeftIcon className="gba:size-4" aria-hidden />
              {backFromHrSubmissions
                ? t('supervisor-review-back-to-department-submissions')
                : t('supervisor-review-back-to-team')}
            </Button>
            <SupervisorOrgUnitProposalReview
              accessToken={accessToken}
              supervisorEmployeeId={employeeId}
              planOuRowId={supervisorReview.planOuRowId}
              organizationalUnitLabel={supervisorReview.teamLabel || supervisorReview.orgUnitId}
              currencyCode={teamCurrencyCode}
              employeeDisplayNameById={supervisorEmployeeDisplayNameById}
              onSupervisorReviewDataChanged={onSupervisorReviewDataChanged}
            />
          </div>
        </div>
      )
    }

    return (
      <div
        className="gba:min-h-[400px] gba:overflow-auto gba:bg-background"
        data-testid="manager-compensation-data-body"
      >
        <div className="gba:flex gba:flex-col gba:gap-4 gba:p-4">
          <div
            className="gba:flex gba:w-full gba:flex-wrap gba:items-end gba:justify-start gba:gap-3 gba:border-b gba:border-border gba:pb-4"
            data-testid="manager-compensation-cycle-toolbar"
          >
            <CompensationCycleSelector
              plans={compensationPlanChoices}
              plansLoading={salaryBudgetLoading}
              selectedPlanId={compensationCycleSelectPlanId}
              onPlanChange={setSelectedCompensationPlanId}
              t={tCompensationPlan}
            />
          </div>
          {salaryBudgetError ? (
            <Alert variant="destructive" data-testid="manager-compensation-salary-budget-error">
              <AlertTitle>{t('error-salary-budget-title')}</AlertTitle>
              <AlertDescription>{salaryBudgetError}</AlertDescription>
            </Alert>
          ) : null}
          {performanceCyclesQueryError ? (
            <Alert variant="default" data-testid="manager-compensation-performance-cycles-query-error">
              <AlertTitle>{t('error-performance-cycles-query-title')}</AlertTitle>
              <AlertDescription>
                {t('error-performance-cycles-query', { message: performanceCyclesQueryError })}
              </AlertDescription>
            </Alert>
          ) : null}
          {performanceScoresError ? (
            <Alert variant="destructive" data-testid="manager-compensation-performance-scores-error">
              <AlertTitle>{t('error-performance-scores-title')}</AlertTitle>
              <AlertDescription>{t('error-performance-scores', { message: performanceScoresError })}</AlertDescription>
            </Alert>
          ) : null}
          {selectedCompensationPlanId == null ? (
            <p className="gba:text-sm gba:text-muted-foreground" data-testid="manager-compensation-select-cycle-hint">
              {t('select-compensation-cycle-hint')}
            </p>
          ) : (
            <TeamCompensationDistributionPanel
              teamMembers={teamMembersWithPerformance}
              filteredRows={pipeline.filteredSorted}
              totalFiltered={pipeline.totalFiltered}
              loading={dataLoading || performanceScoresLoading}
              error={error}
              totalSalaryBudget={totalSalaryBudget}
              totalOrgUnitAllocationAmount={totalOrgUnitAllocationAmount}
              salaryBudgetLoading={salaryBudgetLoading}
              salaryBudgetError={salaryBudgetError}
              selectedCompanyId={effectiveCompanyId}
              currencyCode={teamCurrencyCode}
              accessToken={accessToken}
              managerEmployeeId={employeeId}
              planOuRowIdByOrganizationalUnitId={planOuRowIdByOrganizationalUnitId}
              managerOrganizationalUnitId={managerOrganizationalUnitId}
              onMergeSavedRowIds={mergeSavedRowIds}
              proposalsLockedAfterSubmit={proposalsLocked}
              onNewProposalUnlock={handleNewProposalUnlock}
              onSaved={() => {
                void refetchSalaryBudget()
                void refetchTeam()
              }}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <PageLayout
      headerTitle={t('title')}
      headerDescription={t('subtitle')}
      onBack={null as unknown as (() => void) | undefined}
      className="gba:min-h-screen"
    >
      <div className={supervisorReview != null ? 'gba:space-y-0' : 'gba:space-y-6'}>{renderBody()}</div>
    </PageLayout>
  )
}
