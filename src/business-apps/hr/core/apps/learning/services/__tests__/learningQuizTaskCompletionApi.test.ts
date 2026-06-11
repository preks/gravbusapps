import { completeLearningQuizTask } from '../learningQuizTaskCompletionApi'

const mockFetch = jest.fn()

jest.mock('@/common/utils/serviceResolver', () => ({
  CUSTOM_FLOW_ENGINE_API_URL: 'https://flow.test/api'
}))

jest.mock('@/common/utils/decodeJwtSub', () => ({
  decodeAccessTokenSub: jest.fn(() => 'learner-user-1')
}))

describe('learningQuizTaskCompletionApi', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    global.fetch = mockFetch
    mockFetch.mockResolvedValue({
      ok: true
    })
  })

  it('completes the cflow task with the learner user id', async () => {
    await completeLearningQuizTask('token', 'task-1', {
      attemptId: 'attempt-1',
      status: 'GRADED_LEARNING_ATTEMPT'
    })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://flow.test/api/tasks/task-1/complete',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          userId: 'learner-user-1',
          formData: {
            attemptId: 'attempt-1',
            status: 'GRADED_LEARNING_ATTEMPT'
          }
        })
      })
    )
  })
})
