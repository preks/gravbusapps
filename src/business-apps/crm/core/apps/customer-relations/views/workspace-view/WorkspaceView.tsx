import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PersonalWorkspace } from '@/common/components/common-relations/view-layouts/personal-workspace'
import { crmWorkspaceConfig } from './config/crmWorkspaceConfig'

/**
 * Workspace View for Customer Relations
 * Renders the personal workspace component with CRM-specific configuration
 * Note: Task and Activity configs are now built inside their respective tab components
 * to enable lazy loading (only fetch data when tab is active)
 */
export const WorkspaceView: React.FC<BusinessAppContextProps> = props => {
  // Config is static and doesn't depend on props - no memoization needed
  const config = crmWorkspaceConfig(props)

  return <PersonalWorkspace config={config} {...props} />
}

export default WorkspaceView
