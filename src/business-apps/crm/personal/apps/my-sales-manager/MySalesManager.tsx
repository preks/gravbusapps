import React, { useMemo } from 'react'
import { PageLayout } from '@newwork/nw-design-system'
import { BriefcaseIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PersonalWorkspace } from '@/common/components/common-relations/view-layouts/personal-workspace'
import { crmWorkspaceConfig } from '@/business-apps/crm/core/apps/customer-relations/views/workspace-view/config/crmWorkspaceConfig'
import { buildCrmMyTasksConfig } from '@/business-apps/crm/core/apps/customer-relations/views/workspace-view/config/myTasksConfig'
import { MODULE_COLORS } from '@/common/constants/ui'

export type MySalesManagerProps = BusinessAppContextProps

/**
 * My Sales Manager - CRM Personal Workspace (Standalone)
 * Uses the generic PersonalWorkspace component with CRM-specific configuration
 * Includes PageLayout wrapper for standalone usage
 */
export const MySalesManager: React.FC<MySalesManagerProps> = props => {
  // Call hooks at top level to get task config
  const myTasksConfig = buildCrmMyTasksConfig(props)

  // Build config with task configuration
  const config = useMemo(() => crmWorkspaceConfig(props, myTasksConfig), [props, myTasksConfig])

  return (
    <PageLayout
      headerIcon={BriefcaseIcon}
      headerTitle="My Sales Manager"
      headerDescription="Your personal sales workspace"
      variant={MODULE_COLORS.CRM}
      className="gba:min-h-screen"
    >
      <PersonalWorkspace config={config} color={MODULE_COLORS.CRM} {...props} />
    </PageLayout>
  )
}

export default MySalesManager
