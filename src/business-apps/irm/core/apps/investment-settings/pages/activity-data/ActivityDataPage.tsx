import React from 'react'
import { EngagementSettings } from '@/common/components/common-relations/setting-pages/engagement/EngagementSettings'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogSettings } from '@/common/components/common-relations/setting-pages/hooks/useCatalogSettings'

export interface ActivityDataPageProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
  onBack?: () => void
}

const DATA_TEST_ID = 'InvestmentActivityDataPage'

const ActivityDataPage: React.FC<ActivityDataPageProps> = ({ prefixDataTestId, onBack, ...context }) => {
  const activityTypes = useCatalogSettings(context, 'InvestmentActivityType')
  const taskTypes = useCatalogSettings(context, 'InvestmentTaskType')
  const taskPriorities = useCatalogSettings(context, 'InvestmentTaskPriority')

  return (
    <EngagementSettings
      prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
      onBack={onBack}
      activityTypes={activityTypes}
      taskTypes={taskTypes}
      taskPriorities={taskPriorities}
      showConfigurationTab={true}
      accessToken={context.accessToken}
      userInfo={context.userInfo}
      additionalData={context.additionalData}
      taskTypeCatalogIdentifier="InvestmentTaskType"
    />
  )
}

export default ActivityDataPage
