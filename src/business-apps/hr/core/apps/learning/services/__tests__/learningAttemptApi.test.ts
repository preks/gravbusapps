import { startLearningAttempt, submitLearningAttempt } from '../learningAttemptApi'

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

describe('learningAttemptApi', () => {
  beforeEach(() => {
    mockPost.mockReset()
  })

  it('starts an attempt without sending employee identity', async () => {
    mockPost.mockResolvedValueOnce({
      startLearningAttempt: { attemptId: 'attempt-1', status: 'IN_PROGRESS_LEARNING_ATTEMPT' }
    })

    const result = await startLearningAttempt('token', {
      assignmentId: 'assignment-1',
      learningCourseVersionId: 'version-1'
    })

    expect(result.attemptId).toBe('attempt-1')
    expect(mockPost).toHaveBeenCalledWith(
      '/processes/employee/startLearningAttempt',
      {
        learningAttempt: {
          assignmentId: 'assignment-1',
          learningCourseVersionId: 'version-1'
        }
      },
      { headers: { 'Content-Type': 'application/json' } }
    )
  })

  it('does not treat the Kogito process instance id as the learning attempt id', async () => {
    mockPost.mockResolvedValueOnce({ id: 'process-instance-1' })

    await expect(
      startLearningAttempt('token', {
        assignmentId: 'assignment-1',
        learningCourseVersionId: 'version-1'
      })
    ).rejects.toThrow('Employee service did not return learning attempt id')
  })

  it('reads the attempt id from a nested command response DTO', async () => {
    mockPost.mockResolvedValueOnce({
      id: 'process-instance-1',
      startLearningAttemptResponse: {
        attemptId: 'attempt-1',
        status: 'IN_PROGRESS_LEARNING_ATTEMPT'
      }
    })

    const result = await startLearningAttempt('token', {
      assignmentId: 'assignment-1',
      learningCourseVersionId: 'version-1'
    })

    expect(result.attemptId).toBe('attempt-1')
  })

  it('submits answers and normalizes nested grading metadata', async () => {
    mockPost.mockResolvedValueOnce({
      submitLearningAttempt: {
        attemptId: 'attempt-1',
        status: 'GRADED_LEARNING_ATTEMPT',
        scorePct: '90',
        passed: true,
        bandLabel: 'Pass',
        attemptsLeft: 1,
        canRetake: false
      }
    })

    const result = await submitLearningAttempt('token', {
      attemptId: 'attempt-1',
      learningCourseVersionId: 'version-1',
      timeTakenSeconds: 42,
      answers: [{ questionId: 'question-1', orderNo: 1, selectedKeys: ['A'] }]
    })

    expect(result).toEqual(
      expect.objectContaining({
        attemptId: 'attempt-1',
        status: 'GRADED_LEARNING_ATTEMPT',
        scorePct: 90,
        passed: true,
        bandLabel: 'Pass',
        attemptsLeft: 1,
        canRetake: false
      })
    )
    expect(mockPost).toHaveBeenCalledWith(
      '/processes/employee/submitLearningAttempt',
      {
        learningAttempt: {
          attemptId: 'attempt-1',
          learningCourseVersionId: 'version-1',
          timeTakenSeconds: 42,
          answers: [{ questionId: 'question-1', orderNo: 1, selectedKeys: ['A'] }]
        }
      },
      { headers: { 'Content-Type': 'application/json' } }
    )
  })

  it('normalizes the backend learningAttemptResult DTO shape', async () => {
    mockPost.mockResolvedValueOnce({
      id: 'process-instance-1',
      learningAttemptResult: {
        attemptId: 'attempt-1',
        status: 'GRADED_LEARNING_ATTEMPT',
        scoreRaw: 6,
        scorePct: 50,
        passed: false,
        attemptsUsed: 1,
        attemptsAllowed: 2,
        remainingAttempts: 1,
        canRetake: false
      }
    })

    const result = await submitLearningAttempt('token', {
      attemptId: 'attempt-1',
      learningCourseVersionId: 'version-1',
      answers: []
    })

    expect(result).toEqual(
      expect.objectContaining({
        attemptId: 'attempt-1',
        status: 'GRADED_LEARNING_ATTEMPT',
        scoreRaw: 6,
        scorePct: 50,
        passed: false,
        attemptsUsed: 1,
        attemptsAllowed: 2,
        attemptsLeft: 1,
        canRetake: false
      })
    )
  })
})
