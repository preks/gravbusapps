import React, { useCallback, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useTranslation
} from '@newwork/nw-design-system'
import { PlusIcon, FolderOpenIcon, ArrowLeftIcon, ArrowRightIcon } from '@phosphor-icons/react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { COMPENSATION_BUDGET_REST_BASE_URL } from '../../../../api/compensationBudgetRestConfig'
import { executeCompensationCycleForPlan } from '../../../../api/executeCompensationCycleRest'
import { fetchCompensationBudgetPlanEmployeesForPlanAndCompany } from '../../../../api/fetchCompensationBudgetPlanEmployeesForPlanAndCompany'
import type { CompensationBudgetPlanRowSnapshot } from '../../../../utils/buildCompensationBudgetPlanExecuteRestBodies'
import { OverviewCompanyStatisticsSection } from './OverviewCompanyStatisticsSection'
import { OverviewPlansTable } from './OverviewPlansTable'
import type { CompensationBudgetPlanRow } from '../../hooks/useBudgetPlansTable'
import translations from '../../_i18n'

/** Text + arrow; idle is flat, hover lifts with light fill + shadow. */
const OVERVIEW_NAV_LINK_BUTTON_CLASSNAME =
  'gba:shrink-0 gba:inline-flex gba:h-auto gba:items-center gba:gap-2 gba:rounded-md gba:px-3 gba:py-2 gba:font-normal gba:text-foreground gba:shadow-none gba:transition-shadow gba:transition-colors gba:duration-150 gba:hover:bg-muted gba:hover:shadow-sm gba:focus-visible:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-ring gba:focus-visible:ring-offset-2'

export interface OverviewViewProps {
  accessToken: string
  companyId: string
  budgetPlanId: string | null
  /** Resolved plan row for the open cycle (execute cycle / validation). */
  selectedPlan: CompensationBudgetPlanRow | null
  plans: CompensationBudgetPlanRow[]
  plansLoading: boolean
  /** When true, show only the compensation cycles list (table or empty state). */
  overviewCyclesOnly?: boolean
  /** Company selector (toolbar variant); shown on Overview so KPIs follow the selected company. */
  overviewCompanyToolbar?: React.ReactNode
  onOpenCompensationCyclesList: () => void
  onBackToOverviewDashboard: () => void
  onSelectPlan: (planId: string) => void
  onDeselectPlan: () => void
  onCreatePlan: () => void
  /** Refetch compensation cycles after REST execution. */
  onPlansRefetch?: () => void
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
  budgetPlanId,
  selectedPlan,
  onBack,
  onPlansRefetch,
  t
}: Readonly<{
  accessToken: string
  companyId: string
  budgetPlanId: string
  selectedPlan: CompensationBudgetPlanRow | null
  onBack: () => void
  onPlansRefetch?: () => void
  t: (key: string, args?: Record<string, string | number>) => string
}>) {
  const graphqlClient = useGraphQLClient(accessToken)
  const restClient = useRestClient(COMPENSATION_BUDGET_REST_BASE_URL)

  const [executeDialogOpen, setExecuteDialogOpen] = useState(false)
  const [executeBusy, setExecuteBusy] = useState(false)
  const [executeError, setExecuteError] = useState<string | null>(null)

  const planSnapshot: CompensationBudgetPlanRowSnapshot | null = useMemo(() => {
    if (selectedPlan == null) {
      return null
    }
    return {
      id: selectedPlan.id,
      name: selectedPlan.name,
      description: selectedPlan.description,
      fiscalYear: selectedPlan.fiscalYear,
      startDate: selectedPlan.startDate,
      endDate: selectedPlan.endDate,
      effectiveDate: selectedPlan.effectiveDate
    }
  }, [selectedPlan])

  const executeDialogPlanLabel = selectedPlan?.name?.trim() ? selectedPlan.name.trim() : budgetPlanId

  const handleConfirmExecute = useCallback(async () => {
    if (!accessToken || !planSnapshot) {
      return
    }
    setExecuteBusy(true)
    setExecuteError(null)
    try {
      const employees = await fetchCompensationBudgetPlanEmployeesForPlanAndCompany(
        graphqlClient,
        companyId,
        budgetPlanId
      )
      await executeCompensationCycleForPlan(restClient, accessToken, employees, planSnapshot)
      setExecuteDialogOpen(false)
      onPlansRefetch?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Execute failed'
      setExecuteError(msg)
    } finally {
      setExecuteBusy(false)
    }
  }, [accessToken, budgetPlanId, companyId, graphqlClient, onPlansRefetch, planSnapshot, restClient])

  return (
    <div className="gba:space-y-6">
      <div className="gba:flex gba:w-full gba:min-w-0 gba:flex-wrap gba:items-center gba:justify-between gba:gap-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className={OVERVIEW_NAV_LINK_BUTTON_CLASSNAME}
          data-testid="overview-back-to-cycles"
        >
          <ArrowLeftIcon size={18} weight="regular" aria-hidden />
          {t('overview-back-to-cycles')}
        </Button>
        <div className="gba:flex gba:min-w-0 gba:flex-1 gba:flex-wrap gba:items-center gba:justify-end gba:gap-3">
          <Button
            type="button"
            variant="secondary"
            className="gba:shrink-0"
            data-testid="overview-execute-cycle"
            disabled={!planSnapshot}
            onClick={() => setExecuteDialogOpen(true)}
          >
            {t('overview-execute-cycle')}
          </Button>
        </div>
      </div>

      <Dialog
        open={executeDialogOpen}
        onOpenChange={open => {
          setExecuteDialogOpen(open)
          if (open) {
            setExecuteError(null)
          }
        }}
      >
        <DialogContent className="gba:max-w-md" data-testid="overview-execute-cycle-dialog">
          <DialogHeader>
            <DialogTitle>{t('overview-execute-cycle-title')}</DialogTitle>
          </DialogHeader>
          <p className="gba:text-sm gba:text-muted-foreground">{t('overview-execute-cycle-description')}</p>
          <p className="gba:text-xs gba:text-muted-foreground" data-testid="overview-execute-cycle-plan-context">
            {t('overview-execute-cycle-plan-context', { planName: executeDialogPlanLabel })}
          </p>
          {executeError ? (
            <p className="gba:text-sm gba:text-destructive" data-testid="overview-execute-cycle-error">
              {executeError}
            </p>
          ) : null}
          <DialogFooter className="gba:gap-2">
            <Button
              type="button"
              variant="outline"
              data-testid="overview-execute-cycle-cancel"
              onClick={() => setExecuteDialogOpen(false)}
            >
              {t('overview-execute-cycle-cancel')}
            </Button>
            <Button
              type="button"
              data-testid="overview-execute-cycle-confirm"
              disabled={executeBusy || !planSnapshot}
              onClick={() => void handleConfirmExecute()}
            >
              {executeBusy ? t('overview-execute-cycle-running') : t('overview-execute-cycle-confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OverviewCompanyStatisticsSection accessToken={accessToken} companyId={companyId} t={t} />
    </div>
  )
}

export function OverviewView({
  accessToken,
  companyId,
  budgetPlanId,
  selectedPlan,
  plans,
  plansLoading,
  overviewCyclesOnly = false,
  overviewCompanyToolbar,
  onOpenCompensationCyclesList,
  onBackToOverviewDashboard,
  onSelectPlan,
  onDeselectPlan,
  onCreatePlan,
  onPlansRefetch
}: Readonly<OverviewViewProps>) {
  const { t } = useTranslation(translations)

  if (budgetPlanId) {
    return (
      <PlanDetailView
        accessToken={accessToken}
        companyId={companyId}
        budgetPlanId={budgetPlanId}
        selectedPlan={selectedPlan}
        onBack={onDeselectPlan}
        onPlansRefetch={onPlansRefetch}
        t={t}
      />
    )
  }

  if (overviewCyclesOnly) {
    return (
      <div className="gba:space-y-6">
        <div
          className="gba:flex gba:w-full gba:flex-wrap gba:items-center gba:justify-start gba:gap-4"
          data-testid="overview-cycles-list-toolbar"
        >
          <Button
            type="button"
            variant="ghost"
            className={OVERVIEW_NAV_LINK_BUTTON_CLASSNAME}
            data-testid="overview-back-to-overview-dashboard"
            onClick={onBackToOverviewDashboard}
          >
            <ArrowLeftIcon size={18} weight="regular" aria-hidden />
            {t('overview-back-to-overview')}
          </Button>
        </div>
        <div className="gba:space-y-3" data-testid="overview-compensation-cycles-section">
          <PlansListView
            plans={plans}
            plansLoading={plansLoading}
            onSelectPlan={onSelectPlan}
            onCreatePlan={onCreatePlan}
            t={t}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="gba:space-y-6">
      <div
        className="gba:flex gba:w-full gba:flex-wrap gba:items-center gba:justify-between gba:gap-4"
        data-testid="overview-main-toolbar-row"
      >
        <Button
          type="button"
          variant="ghost"
          className={OVERVIEW_NAV_LINK_BUTTON_CLASSNAME}
          data-testid="overview-open-compensation-cycles-link"
          onClick={onOpenCompensationCyclesList}
        >
          {t('overview-back-to-cycles')}
          <ArrowRightIcon size={18} weight="regular" aria-hidden />
        </Button>
        {overviewCompanyToolbar ? (
          <div className="gba:flex gba:min-w-0 gba:flex-1 gba:justify-end" data-testid="overview-main-company-toolbar">
            {overviewCompanyToolbar}
          </div>
        ) : null}
      </div>
      <OverviewCompanyStatisticsSection accessToken={accessToken} companyId={companyId} t={t} />
    </div>
  )
}
