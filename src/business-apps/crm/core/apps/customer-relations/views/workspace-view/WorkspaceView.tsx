import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PersonalWorkspace } from '@/common/components/common-relations/view-layouts/personal-workspace'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import { crmWorkspaceConfig } from './config/crmWorkspaceConfig'

/**
 * Workspace View for Customer Relations
 * Renders the personal workspace component with CRM-specific configuration
 * Note: Task and Activity configs are now built inside their respective tab components
 * to enable lazy loading (only fetch data when tab is active)
 */
export const WorkspaceView: React.FC<BusinessAppContextProps> = props => {
  const docuSignEnabled = useFeature<boolean>(Feature.CRM.DocuSign.Key) === true
  const config = crmWorkspaceConfig(props)

  return <PersonalWorkspace config={config} docuSignEnabled={docuSignEnabled} {...props} />
}

export default WorkspaceView
