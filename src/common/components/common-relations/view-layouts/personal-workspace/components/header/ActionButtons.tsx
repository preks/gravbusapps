import React from 'react'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import type { PersonalWorkspaceConfig } from '../../types'

export interface ActionButtonsProps {
  config: PersonalWorkspaceConfig
  accessToken: string
}

/**
 * Action Menu for Personal Workspace
 * Provides quick access to create new tasks and activities via dropdown menu
 */
export const ActionButtons: React.FC<ActionButtonsProps> = ({ config, accessToken }) => {
  // Determine which flow contexts to use based on module
  const isIRM = config.module === 'irm'

  const taskCreateContext = isIRM ? FlowContextName.investmentTaskCreate : FlowContextName.customerTaskCreate

  const activityCreateContext = isIRM
    ? FlowContextName.investmentActivityCreate
    : FlowContextName.customerActivityCreate

  // Build contexts array for AppAction
  const contexts = []

  if (config.entities.activity.enabled) {
    contexts.push({ context: activityCreateContext, contextData: {} })
  }

  if (config.entities.task.enabled) {
    contexts.push({ context: taskCreateContext, contextData: {} })
  }

  // If no contexts available, don't render anything
  if (contexts.length === 0) {
    return null
  }

  return (
    <AppAction
      contexts={contexts}
      accessToken={accessToken}
      variant="header"
      emptyState="hide"
      lazyLoad
      data-testid="workspace-actions-menu"
    />
  )
}
