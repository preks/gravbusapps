import React from 'react'
import GenericEntityDisplay from './GenericEntityDisplay'
import { renderEveryAiEntityCardIcon } from './utils/everyAiEntityCardIcons'
import { Navigation, buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { getEntityUrl } from '../links/EntityLink'

interface WorkflowDisplayProps {
  workflowId: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
  textTitle?: string
  textHuman?: string
  tool?: string
  link?: string
  /** Optional structured metadata from the backend (e.g. taskId for reminders). */
  textFull?: string | Record<string, unknown> | null
}

const readString = (obj: unknown, key: string): string | undefined => {
  if (!obj || typeof obj !== 'object') return undefined
  const value = (obj as Record<string, unknown>)[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

const formatWorkflowName = (id: string): string => {
  const cleanedId = id.startsWith('flow_') ? id.substring(5) : id
  return cleanedId
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
}

export const WorkflowDisplay: React.FC<WorkflowDisplayProps> = ({
  workflowId,
  accessToken,
  operation,
  textTitle,
  textHuman,
  tool,
  link,
  textFull
}) => {
  const isBlink = tool === 'create_blink_task'
  const isReminder = tool === 'create_reminder'
  const isDraft =
    tool === 'create_workflow_draft' ||
    tool === 'refine_workflow_draft' ||
    Boolean(link?.includes('/flow/draft')) ||
    Boolean(link?.includes('draftId='))
  const reminderTaskId = isReminder ? readString(textFull, 'taskId') : undefined

  const handleTitleClick = () => {
    if (isBlink) {
      navigateTo(
        buildPlatformUrl('/platform/task-manager', {
          view: 'outbox',
          taskId: workflowId
        }),
        { forceReload: true }
      )
      return
    }

    if (isReminder && reminderTaskId) {
      navigateTo(
        buildPlatformUrl('/platform/task-manager', {
          view: 'inbox',
          taskId: reminderTaskId
        }),
        { forceReload: true }
      )
      return
    }

    const draftUrl = `${buildPlatformUrl(Navigation.CREATE_FLOW_CREATOR, {
      draftId: workflowId
    })}#manage`

    // Prefer backend-provided link (draft handoff, special routes, etc.)
    if (link) {
      const normalizedLink = link.trim()
      // Draft handoff: the link contains `draftId` so it can be copy/pasted across browsers.
      const isDraftLink = normalizedLink.includes('/flow/draft') || normalizedLink.includes('draftId=')
      const isFlowStudioLink = normalizedLink.includes('/platform/create/flow-studio')
      if (isDraftLink) {
        navigateTo(normalizedLink, { forceReload: true })
        return
      }

      // Older workflow-draft payloads may still carry a `flowId` Flow Studio
      // URL even though the entity actually represents an unsaved draft.
      if (isDraft && isFlowStudioLink) {
        navigateTo(draftUrl, { forceReload: true })
        return
      }

      if (isFlowStudioLink) {
        navigateTo(normalizedLink, { forceReload: true })
        return
      }

      const resolvedLink = getEntityUrl('service_workflow', workflowId, normalizedLink)
      if (resolvedLink) {
        navigateTo(resolvedLink, { forceReload: true })
        return
      }
    }

    if (isDraft) {
      navigateTo(draftUrl, { forceReload: true })
      return
    }

    navigateTo(
      buildPlatformUrl(Navigation.FLOW_DETAIL, {
        flowId: workflowId
      }),
      { forceReload: true }
    )
  }

  const cardIconEntity = isReminder ? 'reminder' : isBlink ? 'blink' : 'service_workflow'
  const cardIconLabel = isReminder ? 'Reminder' : isBlink ? 'Blink Task' : 'Workflow Template'

  return (
    <GenericEntityDisplay
      entity="service_workflow"
      id={workflowId}
      accessToken={accessToken}
      operation={operation}
      textHuman={textHuman}
      textTitle={textTitle || formatWorkflowName(workflowId)}
      link={link}
      variant="decorative"
      icon={renderEveryAiEntityCardIcon(cardIconEntity, {
        variant: 'decorative',
        label: cardIconLabel
      })}
      subtitle={cardIconLabel}
      onTitleClick={handleTitleClick}
    />
  )
}

export default WorkflowDisplay
