import React from 'react'
import { create } from 'zustand'
import { Alert, AlertTitle, AlertDescription, useTranslation } from '@newwork/nw-design-system'
import type { DistributionMethod } from '../../../../types/compensationPlanningTypes'
import translations from '../../_i18n'
import { BudgetDistributionOrgUnitTable } from './BudgetDistributionOrgUnitTable'
import { BudgetDistributionMethodSelector } from './BudgetDistributionMethodSelector'

interface BudgetDistributionViewProps {
  accessToken: string
  companyId: string
}

interface BudgetDistributionState {
  selectedMethod: DistributionMethod
  setDistributionMethod: (method: DistributionMethod) => void
}

const useBudgetDistributionStore = create<BudgetDistributionState>(set => ({
  selectedMethod: 'proportional_headcount',
  setDistributionMethod: method => set({ selectedMethod: method })
}))

/** Set to `true` to disable changing the distribution method (previous read-only behaviour). */
const LOCK_DISTRIBUTION_METHOD_SELECTION = false

export const BudgetDistributionView: React.FC<BudgetDistributionViewProps> = ({ accessToken, companyId }) => {
  const { t } = useTranslation(translations)
  const { selectedMethod, setDistributionMethod } = useBudgetDistributionStore()

  return (
    <div className="gba:space-y-4" data-testid="budget-distribution-view">
      <Alert>
        <AlertTitle>{t('budget-distribution-read-only-title')}</AlertTitle>
        <AlertDescription>{t('budget-distribution-read-only-description')}</AlertDescription>
      </Alert>

      <BudgetDistributionMethodSelector
        selectedMethod={selectedMethod}
        onMethodChange={setDistributionMethod}
        disabled={LOCK_DISTRIBUTION_METHOD_SELECTION}
        sectionTitle={t('budget-distribution-method-section-title')}
        sectionDescription={t('budget-distribution-method-section-description')}
        t={t}
      />

      <BudgetDistributionOrgUnitTable accessToken={accessToken} companyId={companyId} />
    </div>
  )
}
