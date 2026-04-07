import React, { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useTranslation
} from '@newwork/nw-design-system'
import { PlusIcon, FolderOpenIcon, ArrowLeftIcon } from '@phosphor-icons/react'
import { useCompanyOrganizationalUnits } from '@/common/data/orgchart/hooks/useCompanyOrganizationalUnits'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useTeamCompensationData } from '../../../manager-compensation-planning/hooks/useTeamCompensationData'
import { buildOrgUnitDistributionInputsFromTeamMembers } from '../../../../utils/buildOrgUnitDistributionInputs'
import { formatCurrency } from '@/common/utils/numberFormatter'
import { formatNumberFunction, formatDate as formatPlatformDate } from '@/common/utils/windowUtils'
import { CompensationOverviewStatistics } from '../CompensationOverviewStatistics'
import { OverviewOrgUnitSalaryCard } from './OverviewOrgUnitSalaryCard'
import { BudgetPlanStatusBadge } from '../shared/BudgetPlanStatusBadge'
import {
  GET_COMPENSATION_BUDGET_PLAN_BY_PK,
  GET_COMPENSATION_BUDGET_PLAN_COMPANY
} from '../../../../queries/budgetPlanQueries'
import { logBudgetGraphqlFailure } from '../../../../utils/budgetPlanGraphqlDebug'
import { resolveCompanySalaryIncreasePool } from '../../../../utils/budgetCalculations'
import {
  formatBudgetPlanStatusLabelForDisplay,
  formatBudgetDistributionMethodLabelForDisplay
} from './budgetSetupDisplayUtils'
import type { CompensationBudgetPlanRow } from '../../hooks/useBudgetPlansTable'
import type { BudgetPlanStatusApi } from '../../../../types/budgetPlanGraphqlEnums'
import translations from '../../_i18n'

const OVERVIEW_ORG_UNIT_LIMIT = 500

interface OverviewViewProps {
  accessToken: string
  companyId: string
  budgetPlanId: string | null
  plans: CompensationBudgetPlanRow[]
  plansLoading: boolean
  onSelectPlan: (planId: string) => void
  onDeselectPlan: () => void
  onCreatePlan: () => void
}

interface PlanSummary {
  name: string
  fiscalYear: number
  budgetPlanStatus: string
  startDate: string | null
  endDate: string | null
  effectiveDate: string | null
}

interface CompanyBudgetSummary {
  salaryBudgetAmount: number
  salaryBudgetPercent: number
  bonusBudgetAmount: number
  bonusBudgetPercent: number
  currentTotalSalaryCost: number
  headcount: number
  distributionMethod: string | null
  currencyRef: string | null
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return formatPlatformDate(dateStr, 'date.short') ?? '—'
}

function PlansListView({
  plans,
  plansLoading,
  onSelectPlan,
  onCreatePlan,
  t
}: Readonly<{
  plans: CompensationBudgetPlanRow[]
  plansLoading: boolean
  onSelectPlan: (planId: string) => void
  onCreatePlan: () => void
  t: (key: string) => string
}>) {
  if (plansLoading) {
    return (
      <Card className="gba:p-12 gba:text-center gba:text-muted-foreground" data-testid="overview-plans-loading">
        {t('selector-loading')}
      </Card>
    )
  }

  if (plans.length === 0) {
    return (
      <Card className="gba:p-12 gba:text-center" data-testid="overview-plans-empty">
        <FolderOpenIcon size={48} className="gba:mx-auto gba:text-muted-foreground/40 gba:mb-4" />
        <h3 className="gba:text-lg gba:font-medium gba:text-foreground gba:mb-2">{t('overview-plans-empty-title')}</h3>
        <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">{t('overview-plans-empty-hint')}</p>
        <Button onClick={onCreatePlan} data-testid="overview-create-plan-empty-button">
          <PlusIcon size={16} className="gba:mr-2" />
          {t('overview-plans-new-button')}
        </Button>
      </Card>
    )
  }

  return (
    <div className="gba:space-y-6">
      <div className="gba:flex gba:items-center gba:justify-between">
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">{t('overview-plans-title')}</h3>
          <p className="gba:text-sm gba:text-muted-foreground">{t('overview-plans-description')}</p>
        </div>
        <Button onClick={onCreatePlan} data-testid="overview-create-plan-button">
          <PlusIcon size={16} className="gba:mr-2" />
          {t('overview-plans-new-button')}
        </Button>
      </div>

      <Card className="gba:overflow-hidden" data-testid="overview-plans-table-container">
        <Table data-testid="overview-plans-table">
          <TableHeader>
            <TableRow>
              <TableHead className="gba:whitespace-nowrap">{t('overview-plans-col-name')}</TableHead>
              <TableHead className="gba:whitespace-nowrap">{t('overview-plans-col-status')}</TableHead>
              <TableHead className="gba:whitespace-nowrap">{t('overview-plans-col-fiscal-year')}</TableHead>
              <TableHead className="gba:whitespace-nowrap">{t('overview-plans-col-start')}</TableHead>
              <TableHead className="gba:whitespace-nowrap">{t('overview-plans-col-end')}</TableHead>
              <TableHead className="gba:whitespace-nowrap">{t('overview-plans-col-effective')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map(plan => (
              <TableRow
                key={plan.id}
                className="gba:cursor-pointer gba:hover:bg-muted"
                onClick={() => onSelectPlan(plan.id)}
                data-testid={`overview-plan-row-${plan.id}`}
              >
                <TableCell className="gba:font-medium gba:text-foreground">{plan.name}</TableCell>
                <TableCell>
                  <BudgetPlanStatusBadge status={plan.budgetPlanStatus as BudgetPlanStatusApi} />
                </TableCell>
                <TableCell className="gba:text-sm gba:text-muted-foreground">{plan.fiscalYear}</TableCell>
                <TableCell className="gba:text-sm gba:text-muted-foreground">{formatDate(plan.startDate)}</TableCell>
                <TableCell className="gba:text-sm gba:text-muted-foreground">{formatDate(plan.endDate)}</TableCell>
                <TableCell className="gba:text-sm gba:text-muted-foreground">
                  {formatDate(plan.effectiveDate)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

function PlanDetailView({
  accessToken,
  companyId,
  budgetPlanId,
  onBack,
  t
}: Readonly<{
  accessToken: string
  companyId: string
  budgetPlanId: string
  onBack: () => void
  t: (key: string, args?: Record<string, string | number>) => string
}>) {
  const graphqlClient = useGraphQLClient(accessToken)
  const { units: companyOrgUnits } = useCompanyOrganizationalUnits(accessToken, companyId, OVERVIEW_ORG_UNIT_LIMIT)
  const { teamMembers, loading, error, refetch } = useTeamCompensationData({
    accessToken,
    companyId,
    requirePayrollRelevantContractType: true
  })

  const [planSummary, setPlanSummary] = useState<PlanSummary | null>(null)
  const [companyBudget, setCompanyBudget] = useState<CompanyBudgetSummary | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoadingPlan(true)
      try {
        const [planResult, companyResult] = await Promise.all([
          graphqlClient.request<{
            CompensationBudgetPlan_by_pk: PlanSummary | null
          }>(GET_COMPENSATION_BUDGET_PLAN_BY_PK, { id: budgetPlanId }),
          graphqlClient.request<{
            CompensationBudgetPlanCompany: Array<CompanyBudgetSummary & { id: string }>
          }>(GET_COMPENSATION_BUDGET_PLAN_COMPANY, {
            planId: budgetPlanId,
            companyId
          })
        ])
        if (cancelled) return

        setPlanSummary(planResult.CompensationBudgetPlan_by_pk ?? null)
        const rows = companyResult.CompensationBudgetPlanCompany ?? []
        setCompanyBudget(rows.length > 0 ? rows[0] : null)
      } catch (err) {
        logBudgetGraphqlFailure('PlanDetailView:planContext', err)
        if (!cancelled) {
          setPlanSummary(null)
          setCompanyBudget(null)
        }
      } finally {
        if (!cancelled) setLoadingPlan(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [budgetPlanId, companyId, accessToken, graphqlClient])

  const orgUnitSalaryRows = useMemo(() => {
    return buildOrgUnitDistributionInputsFromTeamMembers(teamMembers, {
      unassignedLabel: t('overview-org-unit-unassigned'),
      companyOrgUnits
    }).map(o => ({
      orgUnitId: o.orgUnitId,
      orgUnitName: o.orgUnitName,
      headcount: o.headcount,
      salaryCost: o.currentTotalSalaryCost,
      bonusCostYtd: o.currentTotalBonusYtd
    }))
  }, [companyOrgUnits, teamMembers, t])

  const totalSalaryAcrossOrgUnits = useMemo(
    () => orgUnitSalaryRows.reduce((sum, r) => sum + r.salaryCost, 0),
    [orgUnitSalaryRows]
  )

  const totalBonusAcrossOrgUnits = useMemo(
    () => orgUnitSalaryRows.reduce((sum, r) => sum + r.bonusCostYtd, 0),
    [orgUnitSalaryRows]
  )

  const totalHeadcount = teamMembers.length
  const totalSalaryCost = teamMembers.reduce((sum, m) => sum + (m.currentAnnualSalary ?? 0), 0)
  const totalBonuses = teamMembers.reduce((sum, m) => sum + (m.currentBonusTotal ?? 0), 0)
  const currency = teamMembers[0]?.currency ?? 'EUR'
  const avgSalary = totalHeadcount > 0 ? totalSalaryCost / totalHeadcount : 0

  const salaryPool = useMemo(() => {
    if (!companyBudget) return null
    return resolveCompanySalaryIncreasePool({
      salaryBudgetAmount: companyBudget.salaryBudgetAmount,
      salaryBudgetPercent: companyBudget.salaryBudgetPercent,
      currentTotalSalaryCost: companyBudget.currentTotalSalaryCost
    })
  }, [companyBudget])

  return (
    <div className="gba:space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="gba:gap-1" data-testid="overview-back-to-cycles">
        <ArrowLeftIcon size={16} />
        {t('overview-back-to-cycles')}
      </Button>

      {planSummary && !loadingPlan && (
        <Card data-testid="overview-plan-context-card">
          <CardHeader>
            <div className="gba:flex gba:items-center gba:gap-3">
              <CardTitle>{planSummary.name}</CardTitle>
              <BudgetPlanStatusBadge status={planSummary.budgetPlanStatus} />
            </div>
          </CardHeader>
          <CardContent className="gba:space-y-3">
            <div className="gba:grid gba:grid-cols-2 md:gba:grid-cols-4 gba:gap-4">
              <div>
                <p className="gba:text-xs gba:text-muted-foreground">{t('overview-plan-fiscal-year')}</p>
                <p className="gba:text-sm gba:font-medium">{planSummary.fiscalYear}</p>
              </div>
              {planSummary.startDate && (
                <div>
                  <p className="gba:text-xs gba:text-muted-foreground">{t('overview-plan-start')}</p>
                  <p className="gba:text-sm gba:font-medium">{planSummary.startDate}</p>
                </div>
              )}
              {planSummary.endDate && (
                <div>
                  <p className="gba:text-xs gba:text-muted-foreground">{t('overview-plan-end')}</p>
                  <p className="gba:text-sm gba:font-medium">{planSummary.endDate}</p>
                </div>
              )}
              {planSummary.effectiveDate && (
                <div>
                  <p className="gba:text-xs gba:text-muted-foreground">{t('overview-plan-effective')}</p>
                  <p className="gba:text-sm gba:font-medium">{planSummary.effectiveDate}</p>
                </div>
              )}
            </div>

            {companyBudget && (
              <>
                <Separator />
                <div className="gba:grid gba:grid-cols-2 md:gba:grid-cols-4 gba:gap-4">
                  <div>
                    <p className="gba:text-xs gba:text-muted-foreground">{t('overview-plan-salary-budget')}</p>
                    <p className="gba:text-sm gba:font-medium gba:tabular-nums">
                      {salaryPool != null ? formatCurrency(salaryPool, companyBudget.currencyRef ?? currency) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="gba:text-xs gba:text-muted-foreground">{t('overview-plan-headcount')}</p>
                    <p className="gba:text-sm gba:font-medium gba:tabular-nums">
                      {companyBudget.headcount > 0 ? formatNumberFunction(String(companyBudget.headcount), '0,0') : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="gba:text-xs gba:text-muted-foreground">{t('overview-plan-distribution')}</p>
                    <p className="gba:text-sm gba:font-medium">
                      {formatBudgetDistributionMethodLabelForDisplay(companyBudget.distributionMethod, t)}
                    </p>
                  </div>
                  <div>
                    <p className="gba:text-xs gba:text-muted-foreground">{t('overview-plan-status')}</p>
                    <p className="gba:text-sm gba:font-medium">
                      {formatBudgetPlanStatusLabelForDisplay(planSummary.budgetPlanStatus, t)}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <CompensationOverviewStatistics
        employeeCount={totalHeadcount}
        annualSalaryCost={totalSalaryCost}
        averageSalary={avgSalary}
        bonusesYtd={totalBonuses}
        currency={currency}
        isLoading={loading}
        error={error}
        onRetry={refetch}
      />

      {!loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'row', gap: '1.5rem' }}>
          <Card style={{ flex: 1 }} data-testid="compensation-overview-breakdown-card">
            <CardHeader>
              <CardTitle>{t('overview-section-breakdown-title')}</CardTitle>
            </CardHeader>
            <CardContent className="gba:space-y-3">
              <div className="gba:flex gba:flex-col gba:gap-3">
                <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
                  <span className="gba:text-sm gba:text-muted-foreground">{t('overview-row-total-salary')}</span>
                  <span className="gba:text-sm gba:font-medium gba:tabular-nums">
                    {formatCurrency(totalSalaryCost, currency)}
                  </span>
                </div>
                <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
                  <span className="gba:text-sm gba:text-muted-foreground">{t('overview-row-bonuses-ytd')}</span>
                  <span className="gba:text-sm gba:font-medium gba:tabular-nums">
                    {formatCurrency(totalBonuses, currency)}
                  </span>
                </div>
              </div>
              <Separator />
              <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
                <span className="gba:text-sm gba:font-semibold">{t('overview-row-total-comp')}</span>
                <span className="gba:text-sm gba:font-semibold gba:tabular-nums">
                  {formatCurrency(totalSalaryCost + totalBonuses, currency)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card style={{ flex: 1 }} data-testid="compensation-overview-workforce-card">
            <CardHeader>
              <CardTitle>{t('overview-section-workforce-title')}</CardTitle>
            </CardHeader>
            <CardContent className="gba:space-y-3">
              <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
                <span className="gba:text-sm gba:text-muted-foreground">{t('overview-row-employees')}</span>
                <span className="gba:text-sm gba:font-medium gba:tabular-nums">
                  {formatNumberFunction(String(totalHeadcount), '0,0')}
                </span>
              </div>
              <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
                <span className="gba:text-sm gba:text-muted-foreground">{t('overview-row-with-salary')}</span>
                <span className="gba:text-sm gba:font-medium gba:tabular-nums">
                  {formatNumberFunction(String(teamMembers.filter(m => m.currentAnnualSalary != null).length), '0,0')}
                </span>
              </div>
              <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
                <span className="gba:text-sm gba:text-muted-foreground">{t('overview-row-with-band')}</span>
                <span className="gba:text-sm gba:font-medium gba:tabular-nums">
                  {formatNumberFunction(String(teamMembers.filter(m => m.compensationBand != null).length), '0,0')}
                </span>
              </div>
              <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
                <span className="gba:text-sm gba:text-muted-foreground">{t('overview-row-compa')}</span>
                <span className="gba:text-sm gba:font-medium gba:tabular-nums">
                  {(() => {
                    const withRatio = teamMembers.filter(m => m.compaRatio != null)
                    if (withRatio.length === 0) return '—'
                    const avg = withRatio.reduce((s, m) => s + (m.compaRatio ?? 0), 0) / withRatio.length
                    return formatNumberFunction(String(avg), '0.00[,]00')
                  })()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!loading && !error && (
        <OverviewOrgUnitSalaryCard
          rows={orgUnitSalaryRows}
          totalSalaryAcrossUnits={totalSalaryAcrossOrgUnits}
          totalBonusAcrossUnits={totalBonusAcrossOrgUnits}
          currency={currency}
          teamMemberCount={teamMembers.length}
        />
      )}
    </div>
  )
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  accessToken,
  companyId,
  budgetPlanId,
  plans,
  plansLoading,
  onSelectPlan,
  onDeselectPlan,
  onCreatePlan
}) => {
  const { t } = useTranslation(translations)

  if (budgetPlanId) {
    return (
      <PlanDetailView
        accessToken={accessToken}
        companyId={companyId}
        budgetPlanId={budgetPlanId}
        onBack={onDeselectPlan}
        t={t}
      />
    )
  }

  return (
    <div className="gba:space-y-6">
      <PlansListView
        plans={plans}
        plansLoading={plansLoading}
        onSelectPlan={onSelectPlan}
        onCreatePlan={onCreatePlan}
        t={t}
      />
    </div>
  )
}
