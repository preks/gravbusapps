import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  PageLayout,
  Spinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'

import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentUrlWithUpdatedSearchParams, navigateTo } from '@/common/utils/navigationUtils'
import { useActiveStructureCompanies } from '../../hooks/useActiveStructureCompanies'

import { useManagerPlanningStore } from './hooks/useManagerPlanningStore'

import { useDefaultCompanyForCurrentUser } from '../../hooks/useDefaultCompanyForCurrentUser'

import { useTeamCompensationData } from './hooks/useTeamCompensationData'

import { useTeamMemberPerformanceScores } from './hooks/useTeamMemberPerformanceScores'

import { useTeamMembersPipeline } from './hooks/useTeamMembersPipeline'
import { useManagerTeamSalaryBudget } from './hooks/useManagerTeamSalaryBudget'

import { TeamCompensationDistributionPanel } from './components/TeamCompensationDistributionPanel'
import { SupervisorOrgUnitProposalReview } from './components/SupervisorOrgUnitProposalReview'
import type { ManagerEmployeeBudgetRowEntry } from './hooks/useManagerTeamProposalSubmit'

import translations from './_i18n'

interface SupervisorReviewUrl {
  companyId: string
  orgUnitId: string
  planOuRowId: string
  teamLabel: string
}

function parseSupervisorReviewUrl(): SupervisorReviewUrl | null {
  if (typeof globalThis.window === 'undefined') {
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
  return { companyId, orgUnitId, planOuRowId, teamLabel }
}

export const ManagerCompensationPlanning: React.FC<BusinessAppContextProps> = context => {
  const { accessToken, userInfo } = context

  const employeeId = userInfo?.employeeDetails?.employeeId

  const { t } = useTranslation(translations)

  const {
    searchQuery,
    selectedCompanyId,
    setSelectedCompanyId,
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
    const parsed = parseSupervisorReviewUrl()
    if (parsed) {
      setSupervisorReview(parsed)
      setSelectedCompanyId(parsed.companyId)
    }
  }, [setSelectedCompanyId])

  useEffect(() => {
    const syncSupervisorFromUrl = () => {
      setSupervisorReview(parseSupervisorReviewUrl())
    }
    window.addEventListener('popstate', syncSupervisorFromUrl)
    return () => window.removeEventListener('popstate', syncSupervisorFromUrl)
  }, [])

  const exitSupervisorReviewMode = useCallback(() => {
    setSupervisorReview(null)
    const next = getCurrentUrlWithUpdatedSearchParams({
      supervisorReview: null,
      orgUnitId: null,
      planOuRowId: null,
      teamLabel: null
    })
    navigateTo(next)
  }, [])

  useDefaultCompanyForCurrentUser(
    accessToken,
    employeeId,
    companies,
    companiesLoading,
    selectedCompanyId,
    setSelectedCompanyId
  )

  const effectiveCompanyId = supervisorReview?.companyId ?? selectedCompanyId

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
    requirePayrollRelevantContractType: true
  })

  const {
    totalSalaryBudget,
    loading: salaryBudgetLoading,
    error: salaryBudgetError,
    refetch: refetchSalaryBudget,
    planOuRowIdByOrganizationalUnitId,
    managerOrganizationalUnitId,
    activeCompensationBudgetPlanId
  } = useManagerTeamSalaryBudget({
    accessToken,
    companyId: effectiveCompanyId,
    managerEmployeeId: employeeId,
    teamMembers
  })

  const teamCurrencyCode = teamMembers[0]?.currency ?? 'EUR'

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

  const [employeeBudgetRows, setEmployeeBudgetRows] = useState<Record<string, ManagerEmployeeBudgetRowEntry>>({})
  const [proposalsLocked, setProposalsLocked] = useState(false)

  useEffect(() => {
    setEmployeeBudgetRows({})
    setProposalsLocked(false)
  }, [selectedCompanyId])

  const mergeSavedRowIds = useCallback((ids?: Record<string, string>) => {
    if (!ids) {
      return
    }
    setEmployeeBudgetRows(prev => {
      const next = { ...prev }
      for (const [employeeId, rowId] of Object.entries(ids)) {
        next[employeeId] = { rowId, status: 'draft' }
      }
      return next
    })
  }, [])

  const onDraftProposalsSubmitted = useCallback(() => {
    setEmployeeBudgetRows(prev => {
      const next = { ...prev }
      for (const key of Object.keys(next)) {
        const entry = next[key]
        if (entry.status === 'draft') {
          next[key] = { rowId: entry.rowId, status: 'submitted' }
        }
      }
      return next
    })
    setProposalsLocked(true)
  }, [])

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

  const companySelectValue =
    selectedCompanyId != null && companies.some(c => c.id === selectedCompanyId) ? selectedCompanyId : undefined

  const companySelect = (
    <Select
      value={companySelectValue}
      onValueChange={val => setSelectedCompanyId(val || null)}
      disabled={!companiesLoading && companies.length === 0}
    >
      <SelectTrigger className="gba:w-[300px]" data-testid="manager-compensation-company-select">
        <SelectValue placeholder={t('select-company-placeholder')} />
      </SelectTrigger>

      <SelectContent>
        {companies.map(company => (
          <SelectItem key={company.id} value={company.id}>
            {company.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const companiesLoadErrorMessage =
    !companiesLoading && companies.length === 0 && companiesLoadError ? (
      <p
        className="gba:max-w-sm gba:text-right gba:text-sm gba:text-destructive"
        data-testid="manager-compensation-companies-error"
      >
        {t('error-companies-load', { message: companiesLoadError })}
      </p>
    ) : null

  const emptyCompanySelectionRow = (
    <div
      className="gba:flex gba:w-full gba:flex-row gba:flex-wrap gba:items-start gba:justify-between gba:gap-4"
      data-testid="manager-compensation-empty-company-bar"
    >
      <p className="gba:min-w-0 gba:flex-1 gba:text-sm gba:text-muted-foreground">{t('empty-select-company-hint')}</p>
      <div className="gba:flex gba:shrink-0 gba:flex-col gba:items-end gba:gap-2">
        {companySelect}
        {companiesLoadErrorMessage}
      </div>
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
          <div className="gba:p-4">{emptyCompanySelectionRow}</div>
        </div>
      )
    }

    if (supervisorReview) {
      return (
        <div
          className="gba:min-h-[400px] gba:overflow-auto gba:bg-background"
          data-testid="manager-compensation-data-body"
        >
          <div className="gba:flex gba:flex-col gba:gap-4 gba:p-4">
            <Button
              type="button"
              variant="outline"
              className="gba:self-start"
              data-testid="manager-compensation-exit-supervisor-review"
              onClick={exitSupervisorReviewMode}
            >
              {t('supervisor-review-back-to-team')}
            </Button>
            <SupervisorOrgUnitProposalReview
              accessToken={accessToken}
              supervisorEmployeeId={employeeId}
              planOuRowId={supervisorReview.planOuRowId}
              organizationalUnitLabel={supervisorReview.teamLabel || supervisorReview.orgUnitId}
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
          <TeamCompensationDistributionPanel
            teamMembers={teamMembersWithPerformance}
            filteredRows={pipeline.filteredSorted}
            totalFiltered={pipeline.totalFiltered}
            loading={dataLoading || performanceScoresLoading}
            error={error}
            totalSalaryBudget={totalSalaryBudget}
            salaryBudgetLoading={salaryBudgetLoading}
            salaryBudgetError={salaryBudgetError}
            selectedCompanyId={effectiveCompanyId}
            activeCompensationBudgetPlanId={activeCompensationBudgetPlanId}
            currencyCode={teamCurrencyCode}
            accessToken={accessToken}
            managerEmployeeId={employeeId}
            planOuRowIdByOrganizationalUnitId={planOuRowIdByOrganizationalUnitId}
            managerOrganizationalUnitId={managerOrganizationalUnitId}
            employeeBudgetRowState={employeeBudgetRows}
            onMergeSavedRowIds={mergeSavedRowIds}
            proposalsLockedAfterSubmit={proposalsLocked}
            onDraftProposalsSubmitted={onDraftProposalsSubmitted}
            onSaved={() => {
              void refetchSalaryBudget()
              void refetchTeam()
            }}
          />
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
      <div className="gba:space-y-6">{renderBody()}</div>
    </PageLayout>
  )
}
