import React from 'react'
import { Bell, Workflow, Zap } from 'lucide-react'
import { EntityCard } from './EntityCard'
import { getOperationBadge } from './utils/displayUtils'
import { Navigation, buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { getEntityUrl } from '../links/EntityLink'

interface WorkflowDisplayProps {
  workflowId: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
  flowProposal?: string
  textTitle?: string
  tool?: string
  link?: string
  /** Optional structured metadata from the backend (e.g. taskId for reminders). */
  textFull?: string | Record<string, unknown> | null
}

/** Extract a string field from the loosely-typed text_full payload. */
const readString = (obj: unknown, key: string): string | undefined => {
  if (!obj || typeof obj !== 'object') return undefined
  const value = (obj as Record<string, unknown>)[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export const WorkflowDisplay: React.FC<WorkflowDisplayProps> = ({
  workflowId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  accessToken: _accessToken,
  operation,
  flowProposal,
  textTitle,
  tool,
  link,
  textFull
}) => {
  const operationBadge = getOperationBadge(operation)
  const isBlink = tool === 'create_blink_task'
  const isReminder = tool === 'create_reminder'
  const reminderTaskId = isReminder ? readString(textFull, 'taskId') : undefined
  const reminderDueFormatted = isReminder ? readString(textFull, 'reminderDateTimeFormatted') : undefined

  const formatWorkflowName = (id: string): string => {
    const cleanedId = id.startsWith('flow_') ? id.substring(5) : id
    return cleanedId
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
  }

  const IconComponent = isReminder ? Bell : isBlink ? Zap : Workflow

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

    // Reminders live as a single inbox task — deep-link into EveryBox when we
    // know the task id. If the backend could not resolve it (e.g. read-model
    // lag), fall through to the default behavior below.
    if (isReminder && reminderTaskId) {
      const inboxUrl = buildPlatformUrl('/platform/task-manager', {
        view: 'inbox',
        taskId: reminderTaskId
      })
      navigateTo(inboxUrl, { forceReload: true })
      return
    }

    // Prefer backend-provided link (draft handoff, special routes, etc.)
    if (link) {
      // Draft handoff: the link contains `draftId` so it can be copy/pasted across browsers.
      const isDraftLink = link.includes('/flow/draft') || link.includes('draftId=')
      if (isDraftLink) {
        navigateTo(link, { forceReload: true })
        return
      }

      const resolvedLink = getEntityUrl('service_workflow', workflowId, link)
      if (resolvedLink) {
        navigateTo(resolvedLink, { forceReload: true })
        return
      }
    }

    const launcherUrl = buildPlatformUrl(Navigation.FLOW_LAUNCHER, {
      tab: 'my-launches',
      flowId: workflowId
    })
    navigateTo(launcherUrl, { forceReload: true })
  }

  const title = textTitle || formatWorkflowName(workflowId)
  const isDraft =
    tool === 'create_workflow_draft' ||
    tool === 'refine_workflow_draft' ||
    Boolean(link?.includes('/flow/draft')) ||
    Boolean(link?.includes('draftId='))
  const subtitle = isReminder ? 'Reminder' : isBlink ? 'Blink Task' : 'Workflow Template'

  const fields = isReminder
    ? reminderDueFormatted
      ? [{ label: 'Due', value: reminderDueFormatted }]
      : []
    : isBlink
      ? [{ label: 'Task ID', value: workflowId }]
      : isDraft
        ? [{ label: 'Draft ID', value: workflowId }]
        : flowProposal
          ? [
              { label: 'Template ID', value: workflowId },
              { label: 'Flow Proposal', value: flowProposal.slice(0, 8) + '...' }
            ]
          : [{ label: 'Template ID', value: workflowId }]

  return (
    <EntityCard
      variant="decorative"
      title={title}
      subtitle={subtitle}
      icon={icon}
      status={operationBadge?.text}
      statusVariant={operationBadge?.variant}
      fields={fields}
      onClick={handleClick}
    />
  )
}

export default WorkflowDisplay
