import React, { useMemo } from 'react'
import { useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import { WarningCircleIcon } from '@phosphor-icons/react'
import customer360I18n from '../../../_i18n'
import Customer360Section from '../../../components/Customer360Section'
import AttentionList from '../../components/AttentionList'
import ProvisionalNote from '../../components/ProvisionalNote'
import { ATTENTION_THRESHOLD } from '../../../data/portfolio/types'
import type { Customer360HomeViewProps } from '../../types'

/**
 * AI Attention Worklist — the full prioritized queue of customers that need a
 * human (or the agent) to act. Rows are scored by composite risk and ordered
 * highest-first, each explaining why it surfaced.
 */
const WorklistView: React.FC<Customer360HomeViewProps> = ({ portfolio, openCustomer }) => {
  const { t } = useFluentTranslation(customer360I18n)
  const { rows, loading, error } = portfolio

  const worklistRows = useMemo(
    () => rows.filter(row => row.attentionScore >= ATTENTION_THRESHOLD || row.attentionReasons.length > 0),
    [rows]
  )

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid="customer-360-worklist-view">
      <p className="gba:text-sm gba:text-muted-foreground">{t('worklist-intro')}</p>
      {portfolio.provisional ? <ProvisionalNote /> : null}

      <Customer360Section
        title={t('worklist-title')}
        icon={WarningCircleIcon}
        count={worklistRows.length}
        loading={loading}
        error={error}
        errorTitle={t('error-title')}
        isEmpty={!loading && worklistRows.length === 0}
        emptyTitle={t('worklist-empty-title')}
        emptyDescription={t('worklist-empty-description')}
        testId="customer-360-worklist-section"
      >
        <AttentionList rows={worklistRows} openCustomer={openCustomer} testId="customer-360-worklist-list" />
      </Customer360Section>
    </div>
  )
}

export default WorklistView
export { WorklistView }
