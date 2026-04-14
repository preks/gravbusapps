import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'

/**
 * Helper function to create standard assignment targets structure
 */
const createAssignmentTargets = (userIds: string[]) => ({
  users: userIds,
  capabilities: [],
  organizationalUnits: [],
  companies: [],
  siteLocations: [],
  costCenters: [],
  matrixTeams: []
})

export interface GlossaryRequestPayload {
  term: string
  context?: string
  assigneeUserIds: string[]
  initiatorId: string
}

/**
 * Send a glossary entry request workflow task to one or more users
 * Similar to Blinks but uses static form screens
 */
export const sendGlossaryRequest = async (
  accessToken: string,
  payload: GlossaryRequestPayload
): Promise<{ success: boolean; count?: number; error?: string }> => {
  try {
    const baseUrl = CUSTOM_FLOW_ENGINE_API_URL
    const timestamp = Date.now()
    const requestGroupId = `glossary_request_group_${timestamp}_${payload.initiatorId}`

    const workflowIds: string[] = []

    for (const userId of payload.assigneeUserIds) {
      const tags: Record<string, string> = {
        app: 'glossary-entry-request',
        requestGroupId,
        assignedUserId: userId,
        term: payload.term,
        ...(payload.context && { context: payload.context })
      }

      const requestPayload = {
        templateDefinition: {
          type: 'TEMPLATE',
          name: `Glossary Term Request: ${payload.term}`,
          description: `Request to define glossary term: ${payload.term}`,
          version: 1,
          steps: [
            {
              type: 'TASK',
              title: `Glossary Term Request: ${payload.term}`,
              message: payload.context || `Please create a glossary entry for the term "${payload.term}"`,
              form: [],
              assignment: {
                assignmentMode: 'ASSIGN',
                targets: null,
                allowReassignment: false
              },
              dueInMinutes: 4320 // 3 days
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
        },
        // Pass form data as initial parameters for the task form
        initialParameters: {
          term: payload.term,
          context: payload.context || '',
          requesterUserId: payload.initiatorId
        }
      }

      const response = await fetch(`${baseUrl}/templates/execute-dynamic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(requestPayload)
      })

      if (!response.ok) {
        throw new Error(`Failed to create glossary request: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.data?.workflowId) {
        workflowIds.push(data.data.workflowId)
      }
    }

    return { success: true, count: workflowIds.length }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send glossary request' }
  }
}
