import React from 'react'
import { Workflow, Zap } from 'lucide-react'
import { EntityCard } from './EntityCard'
import { getOperationBadge } from './utils/displayUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

interface WorkflowDisplayProps {
  workflowId: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
  flowProposal?: string
  textTitle?: string
  tool?: string
  link?: string
}

export const WorkflowDisplay: React.FC<WorkflowDisplayProps> = ({
  workflowId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  accessToken: _accessToken,
  operation,
  flowProposal,
  textTitle,
  tool,
  link
}) => {
  const operationBadge = getOperationBadge(operation)
  const isBlink = tool === 'create_blink_task'

  const formatWorkflowName = (id: string): string => {
    const cleanedId = id.startsWith('flow_') ? id.substring(5) : id
    return cleanedId
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
  }

  const IconComponent = isBlink ? Zap : Workflow

  const icon = (
    <div className="gba:h-11 gba:w-11 gba:rounded-xl gba:bg-decorative-foreground/15 gba:flex gba:items-center gba:justify-center">
      <IconComponent className="gba:w-5 gba:h-5 gba:text-decorative-foreground" strokeWidth={1.5} />
    </div>
  )

  const handleClick = () => {
    if (isBlink) {
      const outboxUrl = buildPlatformUrl('/platform/task-manager', {
        view: 'outbox',
        taskId: workflowId
      })
      navigateTo(outboxUrl, { forceReload: true })
      return
    }

    // Prefer backend-provided link (draft handoff, special routes, etc.)
    if (link) {
      // Draft handoff: the link contains `draftId` so it can be copy/pasted across browsers.
      navigateTo(link, { forceReload: true })
      return
    }

    // workflowId is the template_id
    const workflowUrl = buildPlatformUrl('/platform/apps/flow/apps/creator', {
      templateId: workflowId
    })
    navigateTo(`${workflowUrl}#manage`, { forceReload: true })
  }

  const title = textTitle || formatWorkflowName(workflowId)
  const isDraft =
    tool === 'create_workflow_draft' ||
    tool === 'refine_workflow_draft' ||
    Boolean(link?.includes('/flow/draft')) ||
    Boolean(link?.includes('draftId='))
  const subtitle = isBlink ? 'Blink Task' : 'Workflow Template'

  return (
    <EntityCard
      variant="decorative"
      title={title}
      subtitle={subtitle}
      icon={icon}
      status={operationBadge?.text}
      statusVariant={operationBadge?.variant}
      fields={
        isBlink
          ? [{ label: 'Task ID', value: workflowId }]
          : isDraft
            ? [{ label: 'Draft ID', value: workflowId }]
            : flowProposal
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
