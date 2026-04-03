import React, { useState } from 'react'
import { Alert, AlertDescription, AlertTitle, Button, useTranslation } from '@newwork/nw-design-system'
import { useBudgetPlansTable } from '../../hooks/useBudgetPlansTable'
import { CreateBudgetPlanDialog } from './CreateBudgetPlanDialog'
import { BudgetPlanTable } from './BudgetPlanTable'
import translations from '../../_i18n'

export interface BudgetPlanViewProps {
  accessToken: string
  /** Label + company select, aligned with the table primary action (search / filters / Add). */
  companyToolbarGroup: React.ReactNode
}

export const BudgetPlanView: React.FC<BudgetPlanViewProps> = ({ accessToken, companyToolbarGroup }) => {
  const { t } = useTranslation(translations)
  const [createOpen, setCreateOpen] = useState(false)
  const { rows, loading, creating, error, insertPlan } = useBudgetPlansTable(accessToken)

  const toolbarEnd = (
    <Button
      type="button"
      variant="default"
      className="gba:shrink-0"
      disabled={creating}
      onClick={() => setCreateOpen(true)}
      data-testid="budget-plan-create-new-button"
    >
      {t('budget-plan-create-new')}
    </Button>
  )

  return (
    <div className="gba:space-y-6" data-testid="budget-plan-view">
      <CreateBudgetPlanDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        creating={creating}
        onCreate={insertPlan}
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>{t('budget-plan-error-title')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <BudgetPlanTable
        rows={rows}
        loading={loading}
        error={error}
        toolbarCompany={companyToolbarGroup}
        toolbarEnd={toolbarEnd}
      />
    </div>
  )
}
