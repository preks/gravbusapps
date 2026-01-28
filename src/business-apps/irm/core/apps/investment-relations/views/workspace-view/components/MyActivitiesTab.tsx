import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { MyActivitiesView } from '@/common/components/common-relations/view-layouts/personal-workspace/components/activities'
import { useMyActivities } from '../hooks/useMyActivities'

/**
 * My Activities Tab Wrapper
 * Calls useMyActivities hook when this tab is mounted (lazy loading)
 */
export const MyActivitiesTab: React.FC<BusinessAppContextProps> = context => {
  // Call hook only when this component is mounted (i.e., when Activities tab is active)
  const activitiesConfig = useMyActivities(context)

  return (
    <MyActivitiesView
      config={activitiesConfig}
      accessToken={context.accessToken}
      userInfo={context.userInfo}
      dataTestId="workspace-my-activities"
    />
  )
}
