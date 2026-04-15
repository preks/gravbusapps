import { env } from '@/common/env/EnvUtils'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { resolveExecuteDynamicUrl } from '@/common/network/flows/flowEngineUrl'

export type WhiteboardSharePermission = 'view' | 'edit' | 'comment'

const createAssignmentTargets = (userIds: string[]) => ({
  users: userIds,
  capabilities: [],
  organizationalUnits: [],
  companies: [],
  siteLocations: [],
  costCenters: [],
  matrixTeams: []
})

export async function sendWhiteboardShareNotification(
  accessToken: string,
  payload: {
    whiteboardId: string
    whiteboardTitle: string
    recipients: Array<{ userId: string; userName: string; permission: WhiteboardSharePermission }>
    initiatorId: string
    initiatorName?: string
    message?: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const rawBaseUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine'
    const executeDynamicUrl = resolveExecuteDynamicUrl(rawBaseUrl)
    const timestamp = Date.now()
    const blinkGroupId = `whiteboard_share_${timestamp}_${payload.initiatorId}`

    const whiteboardUrl = buildPlatformUrl('/platform/every-office/whiteboards', {
      whiteboardId: payload.whiteboardId
    })

    for (const recipient of payload.recipients) {
      const { userId, permission } = recipient
      const permissionLabel = permission === 'edit' ? 'edit' : permission === 'comment' ? 'view and comment on' : 'view'

      const entityLink = {
        name: payload.whiteboardTitle,
        url: `${globalThis.location?.origin || ''}${whiteboardUrl}`,
        type: 'entity:whiteboard',
        metadata: { entityType: 'whiteboard', entityId: payload.whiteboardId }
      }

      const tags: Record<string, string> = {
        app: 'whiteboard-share',
        blinkGroupId,
        assignedUserId: userId,
        entityType: 'whiteboard',
        entityId: payload.whiteboardId,
        entityName: payload.whiteboardTitle,
        entityDisplayUrl: whiteboardUrl,
        permission
      }

      const baseMessage = `${payload.initiatorName || 'Someone'} shared the whiteboard "${payload.whiteboardTitle}" with you. You can ${permissionLabel} this whiteboard.`
      const taskMessage = payload.message ? `${baseMessage}\n\nMessage: ${payload.message}` : baseMessage

      const requestPayload = {
        templateDefinition: {
          type: 'TEMPLATE',
          name: `Whiteboard Shared: ${payload.whiteboardTitle}`,
          description: 'Whiteboard sharing notification',
          version: 1,
          steps: [
            {
              type: 'TASK',
              title: `Whiteboard Shared: ${payload.whiteboardTitle}`,
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
          tags
        },
        initiatorId: payload.initiatorId,
        stepAssignments: {
          step_0: {
            assignment: {
              assignmentMode: 'ASSIGN',
              targets: createAssignmentTargets([userId]),
              allowReassignment: false
            }
          }
        }
      }

      const response = await fetch(executeDynamicUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(requestPayload)
      })

      if (!response.ok) {
        console.error('[ShareWhiteboard] Failed to send notification:', response.status)
      }
    }

    return { success: true }
  } catch (err) {
    console.error('[ShareWhiteboard] Error sending notifications:', err)
    return { success: false, error: err instanceof Error ? err.message : 'share-notifications-failed' }
  }
}
