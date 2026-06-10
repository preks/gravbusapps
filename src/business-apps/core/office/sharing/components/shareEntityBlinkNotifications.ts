import { resolveExecuteDynamicUrl } from '@/common/network/flows/flowEngineUrl'
import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'
import type { ShareNotificationContext, SharePermissionId } from '../types'

const createAssignmentTargets = (userIds: string[]) => ({
  users: userIds,
  capabilities: [],
  organizationalUnits: [],
  companies: [],
  siteLocations: [],
  costCenters: [],
  matrixTeams: []
})

function getPermissionLabel(permission: SharePermissionId): string {
  if (permission === 'edit') return 'edit'
  if (permission === 'comment') return 'view and comment on'
  if (permission === 'admin') return 'manage'
  return 'view'
}

export async function sendShareBlinkNotifications(
  context: ShareNotificationContext & {
    entityType: string
    appTag: string
    titlePrefix: string
    entityUrl: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const executeDynamicUrl = resolveExecuteDynamicUrl(CUSTOM_FLOW_ENGINE_API_URL)
    const timestamp = Date.now()
    const blinkGroupId = `${context.appTag}_${timestamp}_${context.initiatorId}`

    for (const recipient of context.recipients) {
      const permissionLabel = getPermissionLabel(recipient.permission)
      const entityLink = {
        name: context.entityTitle,
        url: `${globalThis.location?.origin || ''}${context.entityUrl}`,
        type: `entity:${context.entityType}`,
        metadata: {
          entityType: context.entityType,
          entityId: context.entityId
        }
      }

      const baseMessage = `${context.initiatorName || 'Someone'} shared the ${context.entityType.replaceAll('_', ' ')} "${context.entityTitle}" with you. You can ${permissionLabel} this ${context.entityType.replaceAll('_', ' ')}.`
      const taskMessage = context.message ? `${baseMessage}\n\nMessage: ${context.message}` : baseMessage

      const response = await fetch(executeDynamicUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${context.accessToken}`
        },
        body: JSON.stringify({
          templateDefinition: {
            type: 'TEMPLATE',
            name: `${context.titlePrefix}: ${context.entityTitle}`,
            description: `${context.titlePrefix} notification`,
            version: 1,
            steps: [
              {
                type: 'TASK',
                title: `${context.titlePrefix}: ${context.entityTitle}`,
                message: taskMessage,
                form: [],
                links: [entityLink],
                assignment: {
                  assignmentMode: 'ASSIGN',
                  targets: null,
                  allowReassignment: false
                },
                dueInMinutes: 4320
              }
            ],
            tags: {
              app: context.appTag,
              blinkGroupId,
              assignedUserId: recipient.userId,
              entityType: context.entityType,
              entityId: context.entityId,
              entityName: context.entityTitle,
              entityDisplayUrl: context.entityUrl,
              permission: recipient.permission
            }
          },
          initiatorId: context.initiatorId,
          stepAssignments: {
            step_0: {
              assignment: {
                assignmentMode: 'ASSIGN',
                targets: createAssignmentTargets([recipient.userId]),
                allowReassignment: false
              }
            }
          }
        })
      })

      if (!response.ok) {
        return { success: false, error: `blink-${response.status}` }
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'share-notifications-failed'
    }
  }
}
