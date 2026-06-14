import React from 'react'
import { RecordLayout, Spinner, useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import customer360I18n from '../_i18n'
import { useCustomer360 } from '../data/record/useCustomer360'
import { useCustomerRoot } from '../data/record/useCustomerRoot'
import { useCustomer360RecordHeader } from './header/useCustomer360RecordHeader'
import { useCustomer360Tabs } from './tabs/useCustomer360Tabs'
import { useCustomer360RecordRoute } from './useCustomer360RecordRoute'

interface Customer360RecordProps extends BusinessAppContextProps {
  subjectId: string
  onBack: () => void
}

const Customer360Record: React.FC<Customer360RecordProps> = ({ subjectId, onBack, ...context }) => {
  const { t } = useFluentTranslation(customer360I18n)
  const { activeTab, handleTabChange } = useCustomer360RecordRoute()
  const { subject, loading, error } = useCustomerRoot(context.accessToken, subjectId)
  const { snapshot, loading: snapshotLoading } = useCustomer360(context.accessToken, subject)

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !subject) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-screen">
        <div className="gba:text-center">
          <p className="gba:text-lg" data-testid="customer-360-error-message">
            {error || t('not-found')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <Customer360RecordLayout
      {...context}
      subject={subject}
      snapshot={snapshot}
      snapshotLoading={snapshotLoading}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      onBack={onBack}
    />
  )
}

interface Customer360RecordLayoutProps extends BusinessAppContextProps {
  subject: NonNullable<ReturnType<typeof useCustomerRoot>['subject']>
  snapshot: ReturnType<typeof useCustomer360>['snapshot']
  snapshotLoading: boolean
  activeTab: string
  onTabChange: (value: string) => void
  onBack: () => void
}

const Customer360RecordLayout: React.FC<Customer360RecordLayoutProps> = ({
  subject,
  snapshot,
  snapshotLoading,
  activeTab,
  onTabChange,
  onBack,
  ...context
}) => {
  const header = useCustomer360RecordHeader({ subject, snapshot, snapshotLoading })
  const views = useCustomer360Tabs({ context, subject, snapshot, loading: snapshotLoading })

  return (
    <RecordLayout
      data-testid="customer-360-detail"
      headerOrientation="horizontal"
      headerAvatar={header.headerAvatar}
      headerOverline={header.headerOverline}
      onBack={onBack}
      headerTitle={subject.displayName}
      headerSlotMain={header.headerSlotMain}
      headerActions={header.headerActions}
      views={views}
      currentView={activeTab}
      onViewChange={onTabChange}
    />
  )
}

export { Customer360Record }
export default Customer360Record
