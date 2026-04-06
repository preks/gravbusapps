import React, { useEffect, useMemo } from 'react'

import {
  Alert,
  AlertDescription,
  AlertTitle,
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
import { formatCurrency } from '@/common/utils/numberFormatter'

import { useActiveStructureCompanies } from '../../hooks/useActiveStructureCompanies'

import { useManagerPlanningStore } from './hooks/useManagerPlanningStore'

import { useDefaultCompanyForCurrentUser } from '../../hooks/useDefaultCompanyForCurrentUser'

import { useTeamCompensationData } from './hooks/useTeamCompensationData'

import { useTeamMemberPerformanceScores } from './hooks/useTeamMemberPerformanceScores'

import { useTeamMembersPipeline } from './hooks/useTeamMembersPipeline'
import { useManagerTeamSalaryBudget } from './hooks/useManagerTeamSalaryBudget'

import { TeamCompensationBudgetSummary } from './components/TeamCompensationBudgetSummary'

import { TeamCompensationDistributionPanel } from './components/TeamCompensationDistributionPanel'

import translations from './_i18n'

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

  useDefaultCompanyForCurrentUser(
    accessToken,
    employeeId,
    companies,
    companiesLoading,
    selectedCompanyId,
    setSelectedCompanyId
  )

  const {
    teamMembers,
    loading: dataLoading,
    error
  } = useTeamCompensationData({
    accessToken,
    companyId: selectedCompanyId,
    supervisorEmployeeId: employeeId ?? undefined,
    supervisorOnly: true,
    /** Aligns with company compensation planning: contract type catalog `payroll_relevant`. */
    requirePayrollRelevantContractType: true
  })

  const {
    totalSalaryBudget,
    loading: salaryBudgetLoading,
    error: salaryBudgetError,
    refetch: refetchSalaryBudget,
    planOuRowIdByOrganizationalUnitId,
    managerOrganizationalUnitId
  } = useManagerTeamSalaryBudget({
    accessToken,
    companyId: selectedCompanyId,
    managerEmployeeId: employeeId,
    teamMembers
  })

  const teamCurrencyCode = teamMembers[0]?.currency ?? 'EUR'

  const totalBudgetDisplay =
    salaryBudgetLoading || !selectedCompanyId || !employeeId
      ? undefined
      : totalSalaryBudget !== null
        ? formatCurrency(totalSalaryBudget, teamCurrencyCode)
        : undefined

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

  const companyToolbarEnd = (
    <>
      {companySelect}
      {companiesLoadErrorMessage}
    </>
  )

  const renderBody = () => {
    if (companiesLoading) {
      return (
        <div className="gba:flex gba:justify-center gba:py-12">
          <Spinner />
        </div>
      )
    }

    if (!selectedCompanyId) {
      return (
        <div
          className="gba:min-h-[400px] gba:overflow-auto gba:bg-background"
          data-testid="manager-compensation-data-body"
        >
          <div className="gba:p-4">{emptyCompanySelectionRow}</div>
        </div>
      )
    }

    return (
      <div
        className="gba:min-h-[400px] gba:overflow-auto gba:bg-background"
        data-testid="manager-compensation-data-body"
      >
        <div className="gba:flex gba:flex-col gba:gap-4 gba:p-4">
          <TeamCompensationBudgetSummary totalBudgetDisplay={totalBudgetDisplay} />
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
            companyToolbarEnd={companyToolbarEnd}
            totalSalaryBudget={totalSalaryBudget}
            salaryBudgetLoading={salaryBudgetLoading}
            salaryBudgetError={salaryBudgetError}
            selectedCompanyId={selectedCompanyId}
            currencyCode={teamCurrencyCode}
            accessToken={accessToken}
            managerEmployeeId={employeeId}
            planOuRowIdByOrganizationalUnitId={planOuRowIdByOrganizationalUnitId}
            managerOrganizationalUnitId={managerOrganizationalUnitId}
            onSaved={() => {
              void refetchSalaryBudget()
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
