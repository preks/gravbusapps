import React, { useMemo, useState } from 'react'
import { Alert, AlertDescription, AlertTitle, Button, useTranslation } from '@newwork/nw-design-system'
import { useTeamCompensationData } from '../../../manager-compensation-planning/hooks/useTeamCompensationData'
import { useBudgetSetupForCompany } from '../../hooks/useBudgetSetupForCompany'
import { BudgetSetupCreatePlanDialog } from './BudgetSetupCreatePlanDialog'
import { BudgetSetupPlansTable } from './BudgetSetupPlansTable'
import translations from '../../_i18n'

export interface BudgetSetupViewProps {
  accessToken: string
  companyId: string
  companyName?: string
}

export const BudgetSetupView: React.FC<BudgetSetupViewProps> = ({ accessToken, companyId, companyName }) => {
  const { t } = useTranslation(translations)
  const [createPlanDialogOpen, setCreatePlanDialogOpen] = useState(false)

  const {
    plans,
    selectedBudgetPlanId,
    companyBudgetPlanRows,
    loadingPlans,
    loadingCompanyRowsList,
    creatingPlan,
    error,
    createPlan
  } = useBudgetSetupForCompany(accessToken, companyId)

  const {
    teamMembers,
    loading: loadingTeam,
    error: teamError
  } = useTeamCompensationData({
    accessToken,
    companyId,
    /** Same scope as Overview: payroll-relevant contract types only. */
    requirePayrollRelevantContractType: true
  })

  const currentSalaryCost = useMemo(
    () => teamMembers.reduce((sum, m) => sum + (m.currentAnnualSalary ?? 0), 0),
    [teamMembers]
  )

  const currencyCode = teamMembers[0]?.currency ?? 'EUR'

  const tableLoading = loadingPlans || loadingCompanyRowsList || loadingTeam

  const toolbarEnd = (
    <Button
      type="button"
      variant="default"
      className="gba:shrink-0"
      disabled={creatingPlan}
      onClick={() => setCreatePlanDialogOpen(true)}
      data-testid="budget-setup-create-new-budget-plan"
    >
      {t('budget-setup-create-new-budget-plan')}
    </Button>
  )

  return (
    <div className="gba:space-y-6" data-testid="budget-setup-view">
      <BudgetSetupCreatePlanDialog
        accessToken={accessToken}
        open={createPlanDialogOpen}
        onOpenChange={setCreatePlanDialogOpen}
        creating={creatingPlan}
        onCreate={createPlan}
        companyId={companyId}
        annualSalaryCost={currentSalaryCost}
        currencyCode={currencyCode}
        companyName={companyName}
        plans={plans}
        loadingPlans={loadingPlans}
        defaultCompensationBudgetPlanId={selectedBudgetPlanId}
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>{t('budget-setup-error-title')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {teamError ? (
        <Alert variant="destructive">
          <AlertTitle>{t('budget-setup-team-error-title')}</AlertTitle>
          <AlertDescription>{teamError}</AlertDescription>
        </Alert>
      ) : null}

      <BudgetSetupPlansTable
        companyId={companyId}
        companyBudgetPlanRows={companyBudgetPlanRows}
        currencyCode={currencyCode}
        plans={plans}
        loading={tableLoading}
        error={null}
        toolbarCompany={null}
        toolbarEnd={toolbarEnd}
      />
    </div>
  )
}
