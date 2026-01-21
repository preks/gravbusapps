import React from 'react'
import { EngagementSettings } from '@/common/components/common-relations/setting-pages/engagement/EngagementSettings'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogSettings } from '@/common/components/common-relations/setting-pages/hooks/useCatalogSettings'

export interface EngagementDataPageProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
  onBack?: () => void
}

const DATA_TEST_ID = 'CustomerEngagementDataPage'

const EngagementDataPage: React.FC<EngagementDataPageProps> = ({ prefixDataTestId, onBack, ...context }) => {
  const activityTypes = useCatalogSettings(context, 'SalesActivityType')
  const taskTypes = useCatalogSettings(context, 'SalesTaskType')
  const taskPriorities = useCatalogSettings(context, 'SalesTaskPriority')

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
      taskTypeCatalogIdentifier="SalesTaskType"
    />
  )
}

export default EngagementDataPage
