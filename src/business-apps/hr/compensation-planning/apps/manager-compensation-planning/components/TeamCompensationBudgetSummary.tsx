import React, { useMemo } from 'react'
import { SectionKpiCards, type KpiCardData, useTranslation } from '@newwork/nw-design-system'
import { CurrencyCircleDollarIcon } from '@phosphor-icons/react'
import translations from '../_i18n'

export interface TeamCompensationBudgetSummaryProps {
  /**
   * Formatted total budget (e.g. from API). When omitted, shows a neutral placeholder until the source exists.
   */
  totalBudgetDisplay?: string | null
}

export const TeamCompensationBudgetSummary: React.FC<TeamCompensationBudgetSummaryProps> = ({ totalBudgetDisplay }) => {
  const { t } = useTranslation(translations)

  const cards = useMemo((): KpiCardData[] => {
    const hasValue = totalBudgetDisplay != null && totalBudgetDisplay !== ''
    return [
      {
        id: 'total-budget-available',
        title: t('budget-summary-total-available'),
        value: hasValue ? totalBudgetDisplay : t('budget-summary-placeholder-value'),
        footer: hasValue ? undefined : t('budget-summary-placeholder-footer'),
        icon: <CurrencyCircleDollarIcon className="gba:h-5 gba:w-5" aria-hidden />
      }
    ]
  }, [t, totalBudgetDisplay])

  return (
    <div data-testid="manager-compensation-budget-summary">
      <SectionKpiCards cards={cards} variant="surface" className="gba:grid-cols-1" />
    </div>
  )
}
