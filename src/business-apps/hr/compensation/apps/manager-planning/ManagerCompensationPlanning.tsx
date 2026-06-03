import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  PageLayout,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'

import { ArrowLeftIcon } from '@phosphor-icons/react'

import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  buildPlatformUrl,
  getCurrentUrlWithUpdatedSearchParams,
  navigateTo,
  Navigation
} from '@/common/utils/navigationUtils'
import { useActiveStructureCompanies } from '../../hooks/useActiveStructureCompanies'

import { CompensationCycleSelector } from '../planning/components/shared/CompensationCycleSelector'
import { formatCurrencyRefForDisplay } from '../planning/utils/displayFormatUtils'
import compensationPlanningTranslations from '../planning/_i18n'
import { useManagerPlanningStore, type ManagerSelectedPlanCompanyBudgetRow } from './hooks/useManagerPlanningStore'

import { useDefaultCompanyForCurrentUser } from '../../hooks/useDefaultCompanyForCurrentUser'

import { useTeamCompensationData } from './hooks/useTeamCompensationData'

import { useTeamMemberPerformanceScores } from './hooks/useTeamMemberPerformanceScores'

import { useTeamMembersPipeline } from './hooks/useTeamMembersPipeline'
import { useManagerTeamSalaryBudget } from './hooks/useManagerTeamSalaryBudget'
import { LIST_COMPANIES_BY_IDS, LIST_COMPENSATION_BUDGET_PLAN_COMPANY_BY_PLAN } from '../../queries/budgetPlanQueries'
import { logBudgetGraphqlFailure } from '../../utils/budgetPlanGraphqlDebug'

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

interface SelectedPlanCompanyBudgetGraphqlRow {
  id: string
  version?: unknown
  compensationBudgetPlanId: string
  companyId: string
  salaryBudgetAmount: unknown
  salaryBudgetPercent: unknown
  allocationAmount?: unknown
  bonusBudgetAmount: unknown
  bonusBudgetPercent: unknown
  budgetPlanStatus: string | null
  currentTotalSalaryCost: unknown
  distributionMethod: string | null
  headcount: unknown
  currencyRef: string | null
}

interface SelectedPlanCompanyGraphqlRow {
  id: string
  name: string | null
  code: string | null
}

function num(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) {
    return v
  }
  const n = Number(v)
  return Number.isNaN(n) ? 0 : n
}

function mapSelectedPlanCompanyBudgetRow(
  raw: SelectedPlanCompanyBudgetGraphqlRow
): ManagerSelectedPlanCompanyBudgetRow {
  return {
    id: raw.id,
    version: num(raw.version),
    compensationBudgetPlanId: raw.compensationBudgetPlanId,
    companyId: raw.companyId,
    salaryBudgetAmount: num(raw.salaryBudgetAmount),
    salaryBudgetPercent: num(raw.salaryBudgetPercent),
    allocationAmount: num(raw.allocationAmount),
    bonusBudgetAmount: num(raw.bonusBudgetAmount),
    bonusBudgetPercent: num(raw.bonusBudgetPercent),
    budgetPlanStatus: raw.budgetPlanStatus ?? '',
    currentTotalSalaryCost: num(raw.currentTotalSalaryCost),
    distributionMethod: raw.distributionMethod ?? '',
    headcount: num(raw.headcount),
    currencyRef: raw.currencyRef ?? null
  }
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
    selectedPlanCompanyId,
    setSelectedPlanCompanyId,
    selectedOrgUnitId,
    setSelectedOrgUnitId,
    selectedCompensationPlanId,
    setSelectedCompensationPlanId,
    selectedPlanCompanyBudgetRows,
    selectedPlanCompanyBudgetRowsLoading,
    selectedPlanCompanies,
    selectedPlanCompaniesLoading,
    setSelectedPlanCompanyBudgetRows,
    setSelectedPlanCompanyBudgetRowsLoading,
    setSelectedPlanCompanyBudgetRowsError,
    setSelectedPlanCompanies,
    setSelectedPlanCompaniesLoading,
    setSelectedPlanCompaniesError,
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
  const graphqlClient = useGraphQLClient(accessToken ?? '')

  useEffect(() => {
    let cancelled = false

    if (!accessToken || selectedCompensationPlanId == null) {
      setSelectedPlanCompanyBudgetRows([])
      setSelectedPlanCompanyBudgetRowsLoading(false)
      setSelectedPlanCompanyBudgetRowsError(null)
      setSelectedPlanCompanies([])
      setSelectedPlanCompaniesLoading(false)
      setSelectedPlanCompaniesError(null)
      return
    }

    setSelectedPlanCompanyBudgetRowsLoading(true)
    setSelectedPlanCompanyBudgetRowsError(null)
    setSelectedPlanCompanies([])
    setSelectedPlanCompaniesLoading(true)
    setSelectedPlanCompaniesError(null)

    graphqlClient
      .request<{ CompensationBudgetPlanCompany: SelectedPlanCompanyBudgetGraphqlRow[] }>(
        LIST_COMPENSATION_BUDGET_PLAN_COMPANY_BY_PLAN,
        { planId: selectedCompensationPlanId }
      )
      .then(result => {
        if (cancelled) {
          return
        }
        const rows = (result.CompensationBudgetPlanCompany ?? []).map(mapSelectedPlanCompanyBudgetRow)
        setSelectedPlanCompanyBudgetRows(rows)
        const companyIds = [...new Set(rows.map(row => row.companyId).filter(id => id.trim().length > 0))]

        if (companyIds.length === 0) {
          setSelectedPlanCompanies([])
          setSelectedPlanCompaniesLoading(false)
          return
        }

        graphqlClient
          .request<{ Company: SelectedPlanCompanyGraphqlRow[] }>(LIST_COMPANIES_BY_IDS, { companyIds })
          .then(companyResult => {
            if (cancelled) {
              return
            }
            const companiesForPlan = (companyResult.Company ?? []).map(company => ({
              id: company.id,
              name: company.name?.trim() || company.id,
              code: company.code ?? null
            }))
            setSelectedPlanCompanies(companiesForPlan)
          })
          .catch((err: unknown) => {
            if (cancelled) {
              return
            }
            logBudgetGraphqlFailure('ManagerCompensationPlanning.selectedPlanCompanyDetails', err)
            const message = err instanceof Error ? err.message : 'Failed to load selected plan company details'
            setSelectedPlanCompanies([])
            setSelectedPlanCompaniesError(message)
          })
          .finally(() => {
            if (!cancelled) {
              setSelectedPlanCompaniesLoading(false)
            }
          })
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return
        }
        logBudgetGraphqlFailure('ManagerCompensationPlanning.selectedPlanCompanyBudgetRows', err)
        const message = err instanceof Error ? err.message : 'Failed to load selected plan company budgets'
        setSelectedPlanCompanyBudgetRows([])
        setSelectedPlanCompanyBudgetRowsError(message)
        setSelectedPlanCompanies([])
        setSelectedPlanCompaniesError(null)
        setSelectedPlanCompaniesLoading(false)
      })
      .finally(() => {
        if (!cancelled) {
          setSelectedPlanCompanyBudgetRowsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [
    accessToken,
    graphqlClient,
    selectedCompensationPlanId,
    setSelectedPlanCompanyBudgetRows,
    setSelectedPlanCompanyBudgetRowsError,
    setSelectedPlanCompanyBudgetRowsLoading,
    setSelectedPlanCompanies,
    setSelectedPlanCompaniesError,
    setSelectedPlanCompaniesLoading
  ])

  const selectedPlanCompanyOptions = useMemo(() => {
    const companyNameById = new Map(selectedPlanCompanies.map(company => [company.id, company.name]))
    const companyIds = [...new Set(selectedPlanCompanyBudgetRows.map(row => row.companyId))]
    return companyIds
      .map(id => ({
        id,
        name: companyNameById.get(id) ?? id
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [selectedPlanCompanyBudgetRows, selectedPlanCompanies])

  const selectedPlanCompanyIds = useMemo(
    () => [...new Set(selectedPlanCompanyBudgetRows.map(row => row.companyId).filter(id => id.trim().length > 0))],
    [selectedPlanCompanyBudgetRows]
  )

  const selectedTeamCompanyIds = useMemo(() => {
    if (selectedPlanCompanyId != null && selectedPlanCompanyIds.includes(selectedPlanCompanyId)) {
      return [selectedPlanCompanyId]
    }
    return selectedPlanCompanyIds
  }, [selectedPlanCompanyId, selectedPlanCompanyIds])

  useEffect(() => {
    if (selectedCompensationPlanId == null) {
      if (selectedPlanCompanyId != null) {
        setSelectedPlanCompanyId(null)
      }
      return
    }

    if (selectedPlanCompanyOptions.length === 0) {
      if (selectedPlanCompanyId != null) {
        setSelectedPlanCompanyId(null)
      }
      return
    }

    if (
      selectedPlanCompanyId == null ||
      !selectedPlanCompanyOptions.some(option => option.id === selectedPlanCompanyId)
    ) {
      setSelectedPlanCompanyId(selectedPlanCompanyOptions[0].id)
    }
  }, [selectedCompensationPlanId, selectedPlanCompanyId, selectedPlanCompanyOptions, setSelectedPlanCompanyId])

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

  const loadTeamData = supervisorReview
    ? Boolean(effectiveCompanyId)
    : selectedCompensationPlanId != null &&
      !selectedPlanCompanyBudgetRowsLoading &&
      selectedTeamCompanyIds.length > 0 &&
      Boolean(employeeId)

  const {
    teamMembers,
    loading: dataLoading,
    error,
    refetch: refetchTeam
  } = useTeamCompensationData({
    accessToken,
    companyId: supervisorReview ? effectiveCompanyId : undefined,
    companyIds: supervisorReview ? undefined : selectedTeamCompanyIds,
    orgUnitId: supervisorReview?.orgUnitId ?? undefined,
    supervisorEmployeeId: supervisorReview ? undefined : (employeeId ?? undefined),
    supervisorOnly: supervisorReview == null,
    /** Aligns with company compensation planning: contract type catalog `payroll_relevant`. */
    requirePayrollRelevantContractType: true,
    resolveManagerOrgUnitToParent: supervisorReview == null,
    enabled: loadTeamData
  })

  const orgUnitOptions = useMemo(() => {
    const byId = new Map<string, string>()
    for (const member of teamMembers) {
      const id = member.organizationalUnitId?.trim()
      if (!id) {
        continue
      }
      const label = member.orgUnitName?.trim() || id
      if (!byId.has(id)) {
        byId.set(id, label)
      }
    }
    return [...byId.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [teamMembers])

  useEffect(() => {
    if (supervisorReview || selectedCompensationPlanId == null) {
      if (selectedOrgUnitId != null) {
        setSelectedOrgUnitId(null)
      }
      return
    }
    if (orgUnitOptions.length === 0) {
      if (selectedOrgUnitId != null) {
        setSelectedOrgUnitId(null)
      }
      return
    }
    if (selectedOrgUnitId == null || !orgUnitOptions.some(option => option.id === selectedOrgUnitId)) {
      setSelectedOrgUnitId(orgUnitOptions[0].id)
    }
  }, [orgUnitOptions, selectedCompensationPlanId, selectedOrgUnitId, setSelectedOrgUnitId, supervisorReview])

  const selectedOrgUnitTeamMembers = useMemo(() => {
    if (supervisorReview || selectedOrgUnitId == null) {
      return teamMembers
    }
    return teamMembers.filter(member => member.organizationalUnitId === selectedOrgUnitId)
  }, [selectedOrgUnitId, supervisorReview, teamMembers])

  const {
    totalSalaryBudget,
    loading: salaryBudgetLoading,
    error: salaryBudgetError,
    refetch: refetchSalaryBudget,
    planOuRowIdByOrganizationalUnitId,
    managerOrganizationalUnitId,
    activeCompanyBudgetCurrencyRef,
    compensationPlanChoices
  } = useManagerTeamSalaryBudget({
    accessToken,
    companyId: effectiveCompanyId,
    managerEmployeeId: employeeId,
    teamMembers: selectedOrgUnitTeamMembers,
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

  const teamCurrencyCode =
    formatCurrencyRefForDisplay(activeCompanyBudgetCurrencyRef) ||
    selectedOrgUnitTeamMembers[0]?.currency ||
    teamMembers[0]?.currency ||
    'EUR'

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

  const selectedOrgUnitTeamMembersWithPerformance = useMemo(() => {
    if (supervisorReview || selectedOrgUnitId == null) {
      return teamMembersWithPerformance
    }
    return teamMembersWithPerformance.filter(member => member.organizationalUnitId === selectedOrgUnitId)
  }, [selectedOrgUnitId, supervisorReview, teamMembersWithPerformance])

  const [proposalsLocked, setProposalsLocked] = useState(false)

  useEffect(() => {
    setProposalsLocked(false)
  }, [selectedCompanyId, selectedCompensationPlanId, selectedOrgUnitId])

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
    members: selectedOrgUnitTeamMembersWithPerformance,
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
            <div className="gba:flex gba:min-w-0 gba:flex-wrap gba:items-center gba:gap-2">
              <span className="gba:shrink-0 gba:whitespace-nowrap gba:text-sm gba:font-medium gba:text-foreground">
                {tCompensationPlan('selector-company-label')}
              </span>
              <Select
                value={
                  selectedPlanCompanyId != null &&
                  selectedPlanCompanyOptions.some(option => option.id === selectedPlanCompanyId)
                    ? selectedPlanCompanyId
                    : undefined
                }
                onValueChange={val => setSelectedPlanCompanyId(val || null)}
                disabled={
                  selectedCompensationPlanId == null ||
                  selectedPlanCompanyBudgetRowsLoading ||
                  selectedPlanCompaniesLoading ||
                  selectedPlanCompanyOptions.length === 0
                }
              >
                <SelectTrigger
                  className="gba:!w-max gba:min-w-72 gba:max-w-lg"
                  data-testid="manager-compensation-company-selector"
                >
                  <SelectValue
                    placeholder={
                      selectedPlanCompanyBudgetRowsLoading || selectedPlanCompaniesLoading
                        ? tCompensationPlan('selector-loading')
                        : tCompensationPlan('selector-company-placeholder')
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {selectedPlanCompanyOptions.map(option => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="gba:flex gba:min-w-0 gba:flex-wrap gba:items-center gba:gap-2">
              <span className="gba:shrink-0 gba:whitespace-nowrap gba:text-sm gba:font-medium gba:text-foreground">
                {t('selector-org-unit-label')}
              </span>
              <Select
                value={
                  selectedOrgUnitId != null && orgUnitOptions.some(option => option.id === selectedOrgUnitId)
                    ? selectedOrgUnitId
                    : undefined
                }
                onValueChange={val => setSelectedOrgUnitId(val || null)}
                disabled={selectedCompensationPlanId == null || dataLoading || orgUnitOptions.length === 0}
              >
                <SelectTrigger
                  className="gba:!w-max gba:min-w-72 gba:max-w-lg"
                  data-testid="manager-compensation-org-unit-selector"
                >
                  <SelectValue
                    placeholder={dataLoading ? t('selector-org-unit-loading') : t('selector-org-unit-placeholder')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {orgUnitOptions.map(option => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              teamMembers={selectedOrgUnitTeamMembersWithPerformance}
              filteredRows={pipeline.filteredSorted}
              totalFiltered={pipeline.totalFiltered}
              loading={dataLoading || performanceScoresLoading}
              error={error}
              totalSalaryBudget={totalSalaryBudget}
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
      <div className={supervisorReview == null ? 'gba:space-y-6' : 'gba:space-y-0'}>{renderBody()}</div>
    </PageLayout>
  )
}
