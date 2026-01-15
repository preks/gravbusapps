import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PersonalWorkspace } from '@/common/components/common-relations/view-layouts/personal-workspace'
import { crmWorkspaceConfig } from './config/crmWorkspaceConfig'
import { buildCrmMyTasksConfig } from './config/myTasksConfig'
import { useMyActivities } from './hooks/useMyActivities'

/**
 * Workspace View for Customer Relations
 * Renders the personal workspace component with CRM-specific configuration
 */
export const WorkspaceView: React.FC<BusinessAppContextProps> = props => {
  // Call hooks at top level to get task and activities configs
  const myTasksConfig = buildCrmMyTasksConfig(props)
  const myActivitiesConfig = useMyActivities(props)

  // Build config with task and activities configuration
  const config = useMemo(
    () => crmWorkspaceConfig(props, myTasksConfig, myActivitiesConfig),
    [props, myTasksConfig, myActivitiesConfig]
  )

  return <PersonalWorkspace config={config} {...props} />
}

export default WorkspaceView
