import { createLearningQuizTasks } from '../learningQuizTaskFlowService'

const mockFetch = jest.fn()

jest.mock('@/common/utils/serviceResolver', () => ({
  CUSTOM_FLOW_ENGINE_API_URL: 'https://flow.test/api'
}))

describe('learningQuizTaskFlowService', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    global.fetch = mockFetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { workflowId: 'workflow-1' } })
    })
  })

  it('creates one learning quiz task per target with tags, link, and user assignment', async () => {
    const result = await createLearningQuizTasks({
      accessToken: 'token',
      initiatorId: 'hr-user-1',
      courseId: 'course-1',
      courseTitle: 'Security',
      courseVersionId: 'version-1',
      assignmentId: 'assignment-1',
      sourceDocumentId: 'content-entry-1',
      availableUntil: '2026-06-10T10:00:00.000Z',
      employees: [{ employeeId: 'employee-1', userId: 'learner-user-1' }]
    })

    expect(result).toEqual({ success: true, count: 1, workflowIds: ['workflow-1'] })
    expect(mockFetch).toHaveBeenCalledWith(
      'https://flow.test/api/templates/execute-dynamic',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(String)
      })
    )
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.templateDefinition.tags).toEqual(
      expect.objectContaining({
        app: 'learning-quiz',
        courseId: 'course-1',
        courseVersionId: 'version-1',
        assignmentId: 'assignment-1',
        employeeId: 'employee-1',
        assignedUserId: 'learner-user-1'
      })
    )
    expect(body.templateDefinition.steps[0].links[0]).toEqual(
      expect.objectContaining({
        url: '/platform/content/intranet/content-record?contentId=content-entry-1&tab=knowledge',
        type: 'document:content-entry-1'
      })
    )
    expect(body.stepAssignments.step_0.assignment.targets.users).toEqual(['learner-user-1'])
  })

  it('throws when the flow engine cannot create a task', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false })

    await expect(
      createLearningQuizTasks({
        accessToken: 'token',
        initiatorId: 'hr-user-1',
        courseId: 'course-1',
        courseTitle: 'Security',
        courseVersionId: 'version-1',
        assignmentId: 'assignment-1',
        availableUntil: '2026-06-10T10:00:00.000Z',
        employees: [{ employeeId: 'employee-1', userId: 'learner-user-1' }]
      })
    ).rejects.toThrow('Failed to create learning quiz task for employee-1')
  })
})
