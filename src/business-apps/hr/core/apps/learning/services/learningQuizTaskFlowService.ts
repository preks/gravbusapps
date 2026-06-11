import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'
import { trimTrailingSlashes } from './learningServiceUrl'

interface AssignmentTargets {
  users: string[]
  capabilities: string[]
  organizationalUnits: string[]
  companies: string[]
  siteLocations: string[]
  costCenters: string[]
  matrixTeams: string[]
}

export interface LearningQuizTaskEmployee {
  employeeId: string
  userId?: string
}

export interface CreateLearningQuizTasksRequest {
  accessToken: string
  initiatorId: string
  courseId: string
  courseTitle: string
  courseVersionId: string
  assignmentId: string
  sourceDocumentId?: string
  availableUntil: string
  employees: LearningQuizTaskEmployee[]
}

export interface CreateLearningQuizTasksResult {
  success: boolean
  count: number
  workflowIds: string[]
}

const createAssignmentTargets = (userIds: string[]): AssignmentTargets => ({
  users: userIds,
  capabilities: [],
  organizationalUnits: [],
  companies: [],
  siteLocations: [],
  costCenters: [],
  matrixTeams: []
})

function buildContentArticleUrl(contentEntryId: string): string {
  return `/platform/content/intranet/content-record?contentId=${encodeURIComponent(contentEntryId)}&tab=knowledge`
}

function getExecuteDynamicUrl(): string {
  return `${trimTrailingSlashes(CUSTOM_FLOW_ENGINE_API_URL)}/templates/execute-dynamic`
}

function readWorkflowId(response: unknown): string | undefined {
  if (!response || typeof response !== 'object') return undefined
  const record = response as Record<string, unknown>
  const data = record.data
  if (data && typeof data === 'object' && typeof (data as Record<string, unknown>).workflowId === 'string') {
    return (data as Record<string, string>).workflowId
  }
  return typeof record.workflowId === 'string' ? record.workflowId : undefined
}

export async function createLearningQuizTasks(
  request: CreateLearningQuizTasksRequest
): Promise<CreateLearningQuizTasksResult> {
  const workflowIds: string[] = []
  const groupId = `learning_quiz_group_${Date.now()}_${request.assignmentId}`

  for (const employee of request.employees) {
    const assignedUserId = employee.userId || employee.employeeId
    const tags = {
      app: 'learning-quiz',
      learningQuizGroupId: groupId,
      courseId: request.courseId,
      courseVersionId: request.courseVersionId,
      assignmentId: request.assignmentId,
      employeeId: employee.employeeId,
      assignedUserId
    }
    const links = request.sourceDocumentId
      ? [
          {
            name: request.courseTitle,
            url: buildContentArticleUrl(request.sourceDocumentId),
            type: `document:${request.sourceDocumentId}`,
            metadata: {
              contentEntryId: request.sourceDocumentId
            }
          }
        ]
      : []

    const response = await fetch(getExecuteDynamicUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${request.accessToken}`
      },
      body: JSON.stringify({
        templateDefinition: {
          type: 'TEMPLATE',
          name: request.courseTitle,
          description: `Learning quiz: ${request.courseTitle}`,
          version: 1,
          steps: [
            {
              type: 'TASK',
              title: request.courseTitle,
              message: `Complete the learning quiz for ${request.courseTitle}.`,
              form: [],
              links,
              assignment: {
                assignmentMode: 'ASSIGN',
                targets: null,
                allowReassignment: false
              },
              dueDate: request.availableUntil
            }
          ],
          tags
        },
        initiatorId: request.initiatorId,
        stepAssignments: {
          step_0: {
            assignment: {
              assignmentMode: 'ASSIGN',
              targets: createAssignmentTargets([assignedUserId]),
              allowReassignment: false
            }
          }
        },
        initialParameters: tags
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to create learning quiz task for ${employee.employeeId}`)
    }

    const workflowId = readWorkflowId(await response.json().catch(() => null))
    if (workflowId) workflowIds.push(workflowId)
  }

  return { success: true, count: request.employees.length, workflowIds }
}
