import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'
import type { BoardPermission } from '../types'

type TranslateFn = (key: string, args?: Record<string, unknown>) => string

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
  t: TranslateFn,
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
    const baseUrl = CUSTOM_FLOW_ENGINE_API_URL
    const timestamp = Date.now()
    const blinkGroupId = `board_share_${timestamp}_${payload.initiatorId}`

    const boardUrl = `${globalThis.location?.origin || ''}${globalThis.location?.pathname || ''}?boardId=${payload.boardId}`

    for (const recipient of payload.recipients) {
      const permissionLabel =
        recipient.permission === 'edit'
          ? t('notification-permission-edit')
          : recipient.permission === 'comment'
            ? t('notification-permission-comment')
            : t('notification-permission-view')

      const initiatorName = payload.initiatorName || t('notification-someone')
      const baseMessage = t('notification-board-shared-body', {
        initiatorName,
        boardTitle: payload.boardTitle,
        permissionLabel
      })
      const taskMessage = payload.message
        ? t('notification-board-shared-body-with-message', {
            initiatorName,
            boardTitle: payload.boardTitle,
            permissionLabel,
            message: payload.message
          })
        : baseMessage

      const requestPayload = {
        templateDefinition: {
          type: 'TEMPLATE',
          name: t('notification-board-shared-name', { boardTitle: payload.boardTitle }),
          description: t('notification-board-shared-description'),
          version: 1,
          steps: [
            {
              type: 'TASK',
              title: t('notification-board-shared-name', { boardTitle: payload.boardTitle }),
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

      const response = await fetch(`${baseUrl}/templates/execute-dynamic`, {
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
