import React, { useMemo } from 'react'
import { useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import { CalendarCheckIcon, UserPlusIcon } from '@phosphor-icons/react'
import customer360I18n from '../../../_i18n'
import Customer360Section from '../../../components/Customer360Section'
import AttentionList from '../../components/AttentionList'
import type { Customer360HomeViewProps } from '../../types'

/**
 * Renewals & lifecycle — expiring contracts (sourced from the contract backend)
 * plus a lifecycle lane that surfaces prospective customers to nurture toward
 * activation. The expiring-contract lane shows an awaiting-backend state until
 * the contract aggregation endpoint provides expiry dates.
 */
const RenewalsView: React.FC<Customer360HomeViewProps> = ({ portfolio, openCustomer }) => {
  const { t } = useFluentTranslation(customer360I18n)
  const { rows, loading, error } = portfolio

  const expiring = useMemo(() => rows.filter(row => (row.summary.expiringContracts ?? 0) > 0), [rows])
  const prospects = useMemo(() => rows.filter(row => row.status === 'prospective'), [rows])

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

      <Customer360Section
        title={t('renewals-lifecycle-title')}
        icon={UserPlusIcon}
        count={prospects.length}
        loading={loading}
        error={error}
        errorTitle={t('error-title')}
        isEmpty={!loading && prospects.length === 0}
        emptyTitle={t('renewals-lifecycle-empty-title')}
        emptyDescription={t('renewals-lifecycle-empty-description')}
        testId="customer-360-renewals-lifecycle"
      >
        <AttentionList rows={prospects} openCustomer={openCustomer} testId="customer-360-renewals-lifecycle-list" />
      </Customer360Section>
    </div>
  )
}

export default RenewalsView
export { RenewalsView }
