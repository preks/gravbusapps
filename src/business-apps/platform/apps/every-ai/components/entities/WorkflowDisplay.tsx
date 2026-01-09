import React from 'react'
import { EntityCard } from './EntityCard'
import { getOperationBadge } from './utils/displayUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

interface WorkflowDisplayProps {
  workflowId: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
  flowProposal?: string
}

export const WorkflowDisplay: React.FC<WorkflowDisplayProps> = ({
  workflowId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  accessToken: _accessToken,
  operation,
  flowProposal
}) => {
  const operationBadge = getOperationBadge(operation)

  // Format the workflow name for display (e.g., "flow_onestep_workflow" -> "Flow Onestep Workflow")
  const formatWorkflowName = (id: string): string => {
    // Remove "flow_" prefix if present for cleaner display
    const cleanedId = id.startsWith('flow_') ? id.substring(5) : id
    return cleanedId
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
  }

  const icon = (
    <div className="gba:h-12 gba:w-12 gba:rounded-full gba:bg-gradient-to-br gba:from-ai/20 gba:to-ai-secondary/20 gba:flex gba:items-center gba:justify-center">
      <svg className="gba:h-6 gba:w-6 gba:text-ai" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
        />
      </svg>
    </div>
  )

  const handleClick = () => {
    // workflowId is the template_id
    const workflowUrl = buildPlatformUrl('/platform/apps/flow/apps/creator', {
      templateId: workflowId
    })
    // Force reload to ensure updated workflow content is shown
    navigateTo(`${workflowUrl}#manage`, { forceReload: true })
  }

  const title = formatWorkflowName(workflowId)
  const subtitle = 'Workflow Template'

  return (
    <EntityCard
      title={title}
      subtitle={subtitle}
      icon={icon}
      status={operationBadge?.text}
      statusVariant={operationBadge?.variant}
      fields={
        flowProposal
          ? [
              { label: 'Template ID', value: workflowId },
              { label: 'Flow Proposal', value: flowProposal.slice(0, 8) + '...' }
            ]
          : [{ label: 'Template ID', value: workflowId }]
      }
      onClick={handleClick}
    />
  )
}

export default WorkflowDisplay
