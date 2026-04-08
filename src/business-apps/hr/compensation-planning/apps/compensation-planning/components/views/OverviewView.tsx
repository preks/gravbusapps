import { Button, useTranslation } from '@newwork/nw-design-system'
import { FolderOpenIcon, PlusIcon } from '@phosphor-icons/react'
import { OverviewPlansTable } from './OverviewPlansTable'
import type { CompensationBudgetPlanRow } from '../../hooks/useBudgetPlansTable'
import translations from '../../_i18n'

export interface OverviewViewProps {
  plans: CompensationBudgetPlanRow[]
  plansLoading: boolean
  onCreatePlan: () => void
  onEditCompensationPlan: (plan: CompensationBudgetPlanRow) => void
}

function PlansListView({
  plans,
  plansLoading,
  onCreatePlan,
  onEditCompensationPlan,
  t
}: Readonly<{
  plans: CompensationBudgetPlanRow[]
  plansLoading: boolean
  onCreatePlan: () => void
  onEditCompensationPlan: (plan: CompensationBudgetPlanRow) => void
  t: (key: string) => string
}>) {
  if (plansLoading && plans.length === 0) {
    return (
      <div
        className="gba:rounded-xl gba:border gba:border-border gba:bg-card gba:p-12 gba:text-center gba:text-muted-foreground"
        data-testid="overview-plans-loading"
      >
        {t('selector-loading')}
      </div>
    )
  }

  if (!plansLoading && plans.length === 0) {
    return (
      <div
        className="gba:rounded-xl gba:border gba:border-border gba:bg-card gba:p-12 gba:text-center"
        data-testid="overview-plans-empty"
      >
        <FolderOpenIcon size={48} className="gba:mx-auto gba:text-muted-foreground/40 gba:mb-4" />
        <h3 className="gba:text-lg gba:font-medium gba:text-foreground gba:mb-2">{t('overview-plans-empty-title')}</h3>
        <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">{t('overview-plans-empty-hint')}</p>
        <Button onClick={onCreatePlan} data-testid="overview-create-plan-empty-button">
          <PlusIcon size={16} className="gba:mr-2" />
          {t('overview-plans-new-button')}
        </Button>
      </div>
    )
  }

  return (
    <OverviewPlansTable
      plans={plans}
      plansLoading={plansLoading}
      onCreatePlan={onCreatePlan}
      onEditPlan={onEditCompensationPlan}
    />
  )
}

export function OverviewView({
  plans,
  plansLoading,
  onCreatePlan,
  onEditCompensationPlan
}: Readonly<OverviewViewProps>) {
  const { t } = useTranslation(translations)

  return (
    <div className="gba:space-y-6" data-testid="compensation-cycles-view">
      <div className="gba:space-y-3" data-testid="overview-compensation-cycles-section">
        <PlansListView
          plans={plans}
          plansLoading={plansLoading}
          onCreatePlan={onCreatePlan}
          onEditCompensationPlan={onEditCompensationPlan}
          t={t}
        />
      </div>
    </div>
  )
}
