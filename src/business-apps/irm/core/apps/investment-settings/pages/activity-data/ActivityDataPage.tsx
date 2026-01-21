import React, { useMemo } from 'react'
import { EngagementSettingsLayout } from '@/common/components/common-relations/setting-pages/engagement'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface ActivityDataPageProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
  onBack?: () => void
}

const ActivityDataPage: React.FC<ActivityDataPageProps> = props => {
  const config = useMemo(
    () => ({
      activityTypeCatalog: 'InvestmentActivityType',
      taskTypeCatalog: 'InvestmentTaskType',
      taskPriorityCatalog: 'InvestmentTaskPriority',
      dataTestIdPrefix: 'InvestmentActivityDataPage',
      headerTitle: 'Activity Data',
      headerDescription: 'Manage activity types, task types, and priorities',
      showConfigurationTab: true
    }),
    []
  )

  return <EngagementSettingsLayout config={config} {...props} />
}

export default ActivityDataPage
