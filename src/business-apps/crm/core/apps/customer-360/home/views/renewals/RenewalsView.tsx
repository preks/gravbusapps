import React, { useMemo } from 'react'
import { useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import { CalendarCheckIcon } from '@phosphor-icons/react'
import customer360I18n from '../../../_i18n'
import Customer360Section from '../../../shared/Customer360Section'
import AttentionList from '../../components/AttentionList'
import type { Customer360HomeViewProps } from '../../types'

/**
 * Renewals — expiring contracts sourced from the contract backend. The lane
 * shows an awaiting-backend state until the contract aggregation endpoint
 * provides expiry dates.
 */
const RenewalsView: React.FC<Customer360HomeViewProps> = ({ portfolio, openCustomer }) => {
  const { t } = useFluentTranslation(customer360I18n)
  const { rows, loading, error } = portfolio

  const expiring = useMemo(() => rows.filter(row => (row.summary.expiringContracts ?? 0) > 0), [rows])

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid="customer-360-renewals-view">
      <Customer360Section
        title={t('renewals-expiring-title')}
        icon={CalendarCheckIcon}
        count={expiring.length}
        loading={loading}
        error={error}
        errorTitle={t('error-title')}
        isEmpty={!loading && expiring.length === 0}
        emptyTitle={t('renewals-expiring-empty-title')}
        emptyDescription={t('renewals-expiring-empty-description')}
        testId="customer-360-renewals-expiring"
      >
        <AttentionList rows={expiring} openCustomer={openCustomer} testId="customer-360-renewals-expiring-list" />
      </Customer360Section>
    </div>
  )
}

export default RenewalsView
export { RenewalsView }
