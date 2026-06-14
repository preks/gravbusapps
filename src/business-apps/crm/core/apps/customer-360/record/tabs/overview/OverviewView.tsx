import React from 'react'
import { EmptyState, useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import AccountHomeView from '@/business-apps/crm/core/records/account-record/views/home-view/HomeView'
import customer360I18n from '../../../_i18n'
import type { Customer360Snapshot, Customer360Subject } from '../../../data/types'
import Customer360KpiHeader from '../../../shared/Customer360KpiHeader'

export interface OverviewViewProps extends BusinessAppContextProps {
  subject: Customer360Subject
  snapshot: Customer360Snapshot
  loading?: boolean
}

/**
 * Overview tab — Customer 360 KPI cards followed by the CRM account record
 * overview content. Activities stay in the dedicated Journal tab.
 */
const OverviewView: React.FC<OverviewViewProps> = ({ subject, snapshot, loading, ...props }) => {
  const { t } = useFluentTranslation(customer360I18n)

  if (!subject.account?.id) {
    return (
      <div className="gba:col-span-12" data-testid="customer-360-overview-placeholder">
        <EmptyState type="custom" title={t('tab-overview')} description={t('placeholder-description')} />
      </div>
    )
  }

  return (
    <div className="gba:col-span-12 gba:flex gba:flex-col gba:gap-4" data-testid="customer-360-overview-view">
      <Customer360KpiHeader snapshot={snapshot} loading={loading} />
      <AccountHomeView {...props} accountId={subject.account.id} accountData={subject.account} hideActivities />
    </div>
  )
}

export default OverviewView
export { OverviewView }
