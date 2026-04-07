import React, { useMemo } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, useTranslation } from '@newwork/nw-design-system'
import { PlusIcon, FolderOpenIcon, ArrowLeftIcon } from '@phosphor-icons/react'
import { useCompanyOrganizationalUnits } from '@/common/data/orgchart/hooks/useCompanyOrganizationalUnits'
import { useTeamCompensationData } from '../../../manager-compensation-planning/hooks/useTeamCompensationData'
import { buildOrgUnitDistributionInputsFromTeamMembers } from '../../../../utils/buildOrgUnitDistributionInputs'
import { formatNumberFunction } from '@/common/utils/windowUtils'
import { CompensationOverviewStatistics } from '../CompensationOverviewStatistics'
import { OverviewOrgUnitSalaryCard } from './OverviewOrgUnitSalaryCard'
import { OverviewPlansTable } from './OverviewPlansTable'
import type { CompensationBudgetPlanRow } from '../../hooks/useBudgetPlansTable'
import translations from '../../_i18n'

const OVERVIEW_ORG_UNIT_LIMIT = 500

export interface OverviewViewProps {
  accessToken: string
  companyId: string
  budgetPlanId: string | null
  plans: CompensationBudgetPlanRow[]
  plansLoading: boolean
  onSelectPlan: (planId: string) => void
  onDeselectPlan: () => void
  onCreatePlan: () => void
  /** Company selector on the plan dashboard header; keeps the selected cycle when switching company. */
  planDetailCompanyToolbar?: React.ReactNode
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
  if (plansLoading && plans.length === 0) {
    return (
      <Card className="gba:p-12 gba:text-center gba:text-muted-foreground" data-testid="overview-plans-loading">
        {t('selector-loading')}
      </Card>
    )
  }

  if (!plansLoading && plans.length === 0) {
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
    <OverviewPlansTable
      plans={plans}
      plansLoading={plansLoading}
      onSelectPlan={onSelectPlan}
      onCreatePlan={onCreatePlan}
    />
  )
}

function PlanDetailView({
  accessToken,
  companyId,
  onBack,
  planDetailCompanyToolbar,
  t
}: Readonly<{
  accessToken: string
  companyId: string
  onBack: () => void
  planDetailCompanyToolbar?: React.ReactNode
  t: (key: string, args?: Record<string, string | number>) => string
}>) {
  const { units: companyOrgUnits } = useCompanyOrganizationalUnits(accessToken, companyId, OVERVIEW_ORG_UNIT_LIMIT)
  const { teamMembers, loading, error, refetch } = useTeamCompensationData({
    accessToken,
    companyId,
    requirePayrollRelevantContractType: true
  })

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

  return (
    <div className="gba:space-y-6">
      <div className="gba:flex gba:w-full gba:min-w-0 gba:flex-nowrap gba:items-center gba:justify-between gba:gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gba:shrink-0 gba:gap-1"
          data-testid="overview-back-to-cycles"
        >
          <ArrowLeftIcon size={16} />
          {t('overview-back-to-cycles')}
        </Button>
        {planDetailCompanyToolbar ? (
          <div
            className="gba:flex gba:min-w-0 gba:flex-1 gba:items-center gba:justify-end"
            data-testid="overview-plan-detail-company-toolbar"
          >
            {planDetailCompanyToolbar}
          </div>
        ) : null}
      </div>

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
        <Card className="gba:w-full" data-testid="compensation-overview-workforce-card">
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

export function OverviewView({
  accessToken,
  companyId,
  budgetPlanId,
  plans,
  plansLoading,
  onSelectPlan,
  onDeselectPlan,
  onCreatePlan,
  planDetailCompanyToolbar
}: Readonly<OverviewViewProps>) {
  const { t } = useTranslation(translations)

  if (budgetPlanId) {
    return (
      <PlanDetailView
        accessToken={accessToken}
        companyId={companyId}
        onBack={onDeselectPlan}
        planDetailCompanyToolbar={planDetailCompanyToolbar}
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
