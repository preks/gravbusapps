import React from 'react'
import { create } from 'zustand'
import {
  Alert,
  AlertTitle,
  AlertDescription,
  Button,
  Card,
  CardContent,
  useTranslation
} from '@newwork/nw-design-system'
import { ArrowsClockwiseIcon } from '@phosphor-icons/react'
import type { DistributionMethod } from '../../../../types/compensationPlanningTypes'
import translations from '../../_i18n'
import { BudgetDistributionOrgUnitTable } from './BudgetDistributionOrgUnitTable'

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

const METHOD_OPTIONS: { value: DistributionMethod; label: string; description: string }[] = [
  {
    value: 'proportional_headcount',
    label: 'By Headcount',
    description: 'Distribute proportionally to the number of employees'
  },
  {
    value: 'proportional_salary_cost',
    label: 'By Salary Cost',
    description: 'Distribute proportionally to current total salary cost'
  },
  {
    value: 'performance_weighted',
    label: 'Performance Weighted',
    description: 'Weight by average performance rating per org unit'
  },
  {
    value: 'equal',
    label: 'Equal Split',
    description: 'Distribute equally across all org units'
  },
  {
    value: 'custom',
    label: 'Custom',
    description: 'Manually set budget for each org unit'
  }
]

const BudgetDistributionCriteriaSelector: React.FC<{
  selectedMethod: DistributionMethod
  onMethodChange: (method: DistributionMethod) => void
  disabled?: boolean
  sectionTitle: string
  applyLabel: string
}> = ({ selectedMethod, onMethodChange, disabled = false, sectionTitle, applyLabel }) => (
  <Card className="gba:mb-4">
    <CardContent className="gba:p-4">
      <div className="gba:flex gba:justify-between gba:items-start">
        <div>
          <h3 className="gba:mb-3 gba:text-sm gba:font-semibold">{sectionTitle}</h3>
          <div className="gba:space-y-2">
            {METHOD_OPTIONS.map(opt => (
              <label
                key={opt.value}
                className={`gba:flex gba:items-start gba:gap-2 gba:cursor-pointer ${disabled ? 'gba:cursor-not-allowed gba:opacity-50' : ''}`}
              >
                <input
                  type="radio"
                  name="distributionMethod"
                  value={opt.value}
                  checked={selectedMethod === opt.value}
                  onChange={() => onMethodChange(opt.value)}
                  disabled={disabled}
                  className="gba:mt-1"
                />
                <div>
                  <span className="gba:text-sm gba:font-medium">{opt.label}</span>
                  <span className="gba:ml-2 gba:text-xs gba:text-muted-foreground">{opt.description}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
        <Button disabled>
          <ArrowsClockwiseIcon size={16} className="gba:mr-2" />
          {applyLabel}
        </Button>
      </div>
    </CardContent>
  </Card>
)

export const BudgetDistributionView: React.FC<BudgetDistributionViewProps> = ({ accessToken, companyId }) => {
  const { t } = useTranslation(translations)
  const { selectedMethod, setDistributionMethod } = useBudgetDistributionStore()

  return (
    <div className="gba:space-y-4" data-testid="budget-distribution-view">
      <Alert>
        <AlertTitle>{t('budget-distribution-read-only-title')}</AlertTitle>
        <AlertDescription>{t('budget-distribution-read-only-description')}</AlertDescription>
      </Alert>

      <BudgetDistributionCriteriaSelector
        selectedMethod={selectedMethod}
        onMethodChange={setDistributionMethod}
        disabled
        sectionTitle={t('budget-distribution-method-section-title')}
        applyLabel={t('budget-distribution-apply')}
      />

      <BudgetDistributionOrgUnitTable accessToken={accessToken} companyId={companyId} />
    </div>
  )
}
