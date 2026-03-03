import { env } from '@/common/env/EnvUtils'
import type { BoardPermission } from '../types'

const createAssignmentTargets = (userIds: string[]) => ({
  users: userIds,
  capabilities: [],
  organizationalUnits: [],
  companies: [],
  siteLocations: [],
  costCenters: [],
  matrixTeams: []
})

export async function sendBoardShareNotification(
  accessToken: string,
  payload: {
    boardId: string
    boardTitle: string
    recipients: Array<{ userId: string; userName: string; permission: BoardPermission }>
    initiatorId: string
    initiatorName?: string
    message?: string
  }
): Promise<void> {
  try {
    const baseUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine'
    const timestamp = Date.now()
    const blinkGroupId = `board_share_${timestamp}_${payload.initiatorId}`

    const boardUrl = `${globalThis.location?.origin || ''}${globalThis.location?.pathname || ''}?boardId=${payload.boardId}`

    for (const recipient of payload.recipients) {
      const permissionLabel =
        recipient.permission === 'edit' ? 'edit' : recipient.permission === 'comment' ? 'view and comment on' : 'view'

      const baseMessage = `${payload.initiatorName || 'Someone'} shared the board "${payload.boardTitle}" with you. You can ${permissionLabel} this board.`
      const taskMessage = payload.message ? `${baseMessage}\n\nMessage: ${payload.message}` : baseMessage

      const requestPayload = {
        templateDefinition: {
          type: 'TEMPLATE',
          name: `Board Shared: ${payload.boardTitle}`,
          description: 'Board sharing notification',
          version: 1,
          steps: [
            {
              type: 'TASK',
              title: `Board Shared: ${payload.boardTitle}`,
              message: taskMessage,
              form: [],
              links: [
                {
                  name: payload.boardTitle,
                  url: boardUrl,
                  type: 'entity:board',
                  metadata: { entityType: 'board', entityId: payload.boardId }
                }
              ],
              assignment: { assignmentMode: 'ASSIGN', targets: null, allowReassignment: false },
              dueInMinutes: 4320
            }
          ],
          tags: {
            app: 'board-share',
            blinkGroupId,
            assignedUserId: recipient.userId,
            entityType: 'board',
            entityId: payload.boardId,
            entityName: payload.boardTitle,
            entityDisplayUrl: boardUrl,
            permission: recipient.permission
          }
        },
        initiatorId: payload.initiatorId,
        stepAssignments: {
          step_0: {
            assignment: {
              assignmentMode: 'ASSIGN',
              targets: createAssignmentTargets([recipient.userId]),
              allowReassignment: false
            }
          }
        }
      }

      const response = await fetch(`${baseUrl}/api/templates/execute-dynamic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(requestPayload)
      })

      if (!response.ok) {
        console.error('[ShareBoard] Failed to send notification:', response.status)
      }
    }
  } catch (err) {
    console.error('[ShareBoard] Error sending notifications:', err)
  }
}
