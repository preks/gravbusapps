import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PersonalWorkspace } from '@/common/components/common-relations/view-layouts/personal-workspace'
import { irmWorkspaceConfig } from './config/irmWorkspaceConfig'
import { buildIrmMyTasksConfig } from './config/myTasksConfig'
import { useMyActivities } from './hooks/useMyActivities'

/**
 * Workspace View for Investment Relations
 * Renders the personal workspace component with IRM-specific configuration
 */
export const WorkspaceView: React.FC<BusinessAppContextProps> = props => {
  // Call hooks at top level to get task and activities configs
  const myTasksConfig = buildIrmMyTasksConfig(props)
  const myActivitiesConfig = useMyActivities(props)

  // Build config with task and activities configuration
  const config = useMemo(
    () => irmWorkspaceConfig(props, myTasksConfig, myActivitiesConfig),
    [props, myTasksConfig, myActivitiesConfig]
  )

  return <PersonalWorkspace config={config} {...props} />
}

export default WorkspaceView
