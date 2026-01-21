import React, { useMemo } from 'react'
import { EngagementSettingsLayout } from '@/common/components/common-relations/setting-pages/engagement'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface EngagementDataPageProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
  onBack?: () => void
}

const EngagementDataPage: React.FC<EngagementDataPageProps> = props => {
  const config = useMemo(
    () => ({
      activityTypeCatalog: 'SalesActivityType',
      taskTypeCatalog: 'SalesTaskType',
      taskPriorityCatalog: 'SalesTaskPriority',
      dataTestIdPrefix: 'CustomerEngagementDataPage',
      headerTitle: 'Engagement Data',
      headerDescription: 'Manage activity types, task types, and priorities',
      showConfigurationTab: true
    }),
    []
  )

  return <EngagementSettingsLayout config={config} {...props} />
}

export default EngagementDataPage
