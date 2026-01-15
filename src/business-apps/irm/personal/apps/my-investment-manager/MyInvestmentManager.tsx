import React, { useMemo } from 'react'
import { PageLayout } from '@newwork/nw-design-system'
import { ChartLineIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PersonalWorkspace } from '@/common/components/common-relations/view-layouts/personal-workspace'
import { irmWorkspaceConfig } from '@/business-apps/irm/core/apps/investment-relations/views/workspace-view/config/irmWorkspaceConfig'
import { buildIrmMyTasksConfig } from '@/business-apps/irm/core/apps/investment-relations/views/workspace-view/config/myTasksConfig'
import { MODULE_COLORS } from '@/common/constants/ui'

export type MyInvestmentManagerProps = BusinessAppContextProps

/**
 * My Investment Manager - IRM Personal Workspace (Standalone)
 * Uses the generic PersonalWorkspace component with IRM-specific configuration
 * Includes PageLayout wrapper for standalone usage
 */
export const MyInvestmentManager: React.FC<MyInvestmentManagerProps> = props => {
  // Call hooks at top level to get task config
  const myTasksConfig = buildIrmMyTasksConfig(props)

  // Build config with task configuration
  const config = useMemo(() => irmWorkspaceConfig(props, myTasksConfig), [props, myTasksConfig])

  return (
    <PageLayout
      headerIcon={ChartLineIcon}
      headerTitle="My Investment Manager"
      headerDescription="Your personal investment workspace"
      variant={MODULE_COLORS.IRM}
      className="gba:min-h-screen"
    >
      <PersonalWorkspace config={config} color={MODULE_COLORS.IRM} {...props} />
    </PageLayout>
  )
}

export default MyInvestmentManager
