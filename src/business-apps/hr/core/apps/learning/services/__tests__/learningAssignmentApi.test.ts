import { createLearningAssignmentWithTargets } from '../learningAssignmentApi'

const mockPost = jest.fn()

jest.mock('@/common/env/EnvUtils', () => ({
  env: jest.fn(() => 'https://example.test')
}))

jest.mock('@/common/network/HeaderUtils', () => ({
  setAccessTokenToAuthorizationHeader: (token: string) => `Bearer ${token}`
}))

jest.mock('@/common/network/rest/RestClient', () => ({
  RestClient: jest.fn().mockImplementation(() => ({
    post: mockPost
  }))
}))

describe('learningAssignmentApi', () => {
  beforeEach(() => {
    mockPost.mockReset()
    mockPost
      .mockResolvedValueOnce({ id: 'process-assignment-1', learningAssignment: { id: 'assignment-1' } })
      .mockResolvedValueOnce({ learningAssignmentTarget: { id: 'target-1' } })
      .mockResolvedValueOnce({ learningAttempt: { id: 'attempt-1' } })
      .mockResolvedValueOnce({ learningAssignmentTarget: { id: 'target-2' } })
      .mockResolvedValueOnce({ learningAttempt: { id: 'attempt-2' } })
  })

  it('creates assignment, targets, and attempts in order with deduplicated employees', async () => {
    const result = await createLearningAssignmentWithTargets('token', {
      courseId: 'course-1',
      courseTitle: 'Security',
      courseVersionId: 'version-1',
      companyId: 'company-1',
      employeeIds: ['employee-1', 'employee-1', 'employee-2'],
      teamIds: ['team-1'],
      availableFrom: '2026-06-03T10:00:00.000Z',
      availableUntil: '2026-06-10T10:00:00.000Z'
    })

    expect(result).toEqual({
      assignmentId: 'assignment-1',
      targetIds: ['target-1', 'target-2'],
      attemptIds: ['attempt-1', 'attempt-2']
    })
    expect(mockPost).toHaveBeenNthCalledWith(
      1,
      '/processes/employee/createLearningAssignment',
      {
        learningAssignment: expect.objectContaining({
          company: 'company-1',
          learningCourse: 'course-1',
          learningCourseVersion: 'version-1',
          audienceTargets: { employeeIds: ['employee-1', 'employee-2'], teamIds: ['team-1'] }
        })
      },
      expect.any(Object)
    )
    expect(mockPost).toHaveBeenNthCalledWith(
      2,
      '/processes/employee/createLearningAssignmentTarget',
      {
        learningAssignmentTarget: expect.objectContaining({
          employee: 'employee-1',
          learningAssignment: 'assignment-1',
          resolutionSource: 'DIRECT_LEARNING_TARGET'
        })
      },
      expect.any(Object)
    )
    expect(mockPost).toHaveBeenNthCalledWith(
      3,
      '/processes/employee/createLearningAttempt',
      { learningAttempt: expect.objectContaining({ employee: 'employee-1', status: 'IN_PROGRESS_LEARNING_ATTEMPT' }) },
      expect.any(Object)
    )
  })
})
