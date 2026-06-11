import { publishLearningQuiz } from '../learningPublishApi'
import type { EditableLearningQuiz } from '../../types'

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

const quiz: EditableLearningQuiz = {
  title: 'Security quiz',
  description: 'Security description',
  passThreshold: 80,
  maxAttempts: 2,
  coveredTopics: ['Access'],
  uncoveredTopics: [],
  scoringGrid: {
    perQuestion: {},
    bandDefinitions: { bands: [{ label: 'Pass', min: 80 }] }
  },
  questions: [
    {
      id: 'q_1',
      orderNo: 1,
      prompt: 'Which practice is secure?',
      questionType: 'MCQ_SINGLE_LEARNING_QUESTION',
      options: [
        { key: 'A', text: 'Use MFA' },
        { key: 'B', text: 'Share passwords' }
      ],
      correctOptionKeys: ['A'],
      points: 1,
      explanation: 'MFA helps.',
      topic: 'Access'
    }
  ]
}

describe('learningPublishApi', () => {
  beforeEach(() => {
    mockPost.mockReset()
    mockPost
      .mockResolvedValueOnce({ id: 'process-version-1', learningCourseVersion: { id: 'course-version-1' } })
      .mockResolvedValueOnce({ learningMaterial: { id: 'material-1' } })
      .mockResolvedValueOnce({
        learningQuestionsBatchResult: { learningCourseVersionId: 'course-version-1', questions: [], savedCount: 1 }
      })
      .mockResolvedValueOnce({ learningScoringGrid: { id: 'grid-1' } })
      .mockResolvedValueOnce({ learningCourse: { id: 'course-1' } })
  })

  it('publishes a reviewed quiz in dependency order', async () => {
    const versionId = await publishLearningQuiz('token', {
      courseId: 'course-1',
      courseVersion: 3,
      versionNo: 4,
      sourceDocumentId: 'content-entry-1',
      ownerEmployeeId: 'employee-1',
      publishedBy: 'user-1',
      quiz
    })

    expect(versionId).toBe('course-version-1')
    expect(mockPost).toHaveBeenNthCalledWith(
      1,
      '/processes/employee/createLearningCourseVersion',
      {
        learningCourseVersion: expect.objectContaining({
          learningCourse: 'course-1',
          versionNo: 4,
          generatorAgentId: 'learning_quiz_generator',
          publishedBy: 'user-1',
          snapshot: expect.objectContaining({
            title: 'Security quiz',
            maxAttempts: 2,
            questions: [expect.objectContaining({ orderNo: 1 })]
          })
        })
      },
      { headers: { 'Content-Type': 'application/json' } }
    )
    const versionPayload = mockPost.mock.calls[0][1].learningCourseVersion
    expect(versionPayload.snapshot.questions[0]).toEqual(
      expect.not.objectContaining({
        id: expect.any(String)
      })
    )
    expect(mockPost).toHaveBeenNthCalledWith(
      2,
      '/processes/employee/createLearningMaterial',
      {
        learningMaterial: {
          learningCourse: 'course-1',
          contentDocumentId: 'content-entry-1',
          role: 'PRIMARY_LEARNING_MATERIAL',
          orderNo: 1
        }
      },
      { headers: { 'Content-Type': 'application/json' } }
    )
    expect(mockPost).toHaveBeenNthCalledWith(
      3,
      '/processes/employee/batchSaveLearningQuestions',
      {
        learningQuestionsBatch: {
          learningCourseVersionId: 'course-version-1',
          questions: [
            expect.objectContaining({
              orderNo: 1,
              prompt: 'Which practice is secure?',
              questionType: 'MCQ_SINGLE_LEARNING_QUESTION',
              options: { A: 'Use MFA', B: 'Share passwords' },
              correctKeys: { keys: ['A'] },
              points: 1
            })
          ]
        }
      },
      { headers: { 'Content-Type': 'application/json' } }
    )
    expect(mockPost).toHaveBeenNthCalledWith(
      4,
      '/processes/employee/createLearningScoringGrid',
      {
        learningScoringGrid: expect.objectContaining({
          learningCourseVersion: 'course-version-1',
          perQuestion: {
            '1': {
              points: 1,
              correctKeys: ['A']
            }
          }
        })
      },
      { headers: { 'Content-Type': 'application/json' } }
    )
    expect(mockPost).toHaveBeenNthCalledWith(
      5,
      '/processes/employee/updateLearningCourse',
      {
        learningCourse: expect.objectContaining({
          id: 'course-1',
          version: 3,
          ownerEmployee: 'employee-1',
          maxAttempts: 2,
          status: 'PUBLISHED_LEARNING_COURSE'
        })
      },
      { headers: { 'Content-Type': 'application/json' } }
    )
    expect(mockPost).not.toHaveBeenCalledWith(
      '/processes/employee/createLearningQuestion',
      expect.anything(),
      expect.anything()
    )
  })

  it('normalizes duplicate question order numbers before batch save and scoring', async () => {
    mockPost.mockReset()
    mockPost
      .mockResolvedValueOnce({ learningCourseVersion: { id: 'course-version-1' } })
      .mockResolvedValueOnce({ learningMaterial: { id: 'material-1' } })
      .mockResolvedValueOnce({
        learningQuestionsBatchResult: { learningCourseVersionId: 'course-version-1', questions: [], savedCount: 2 }
      })
      .mockResolvedValueOnce({ learningScoringGrid: { id: 'grid-1' } })
      .mockResolvedValueOnce({ learningCourse: { id: 'course-1' } })

    const duplicateOrderQuiz: EditableLearningQuiz = {
      ...quiz,
      questions: [
        { ...quiz.questions[0], id: 'q_2', orderNo: 10, prompt: 'Second?', correctOptionKeys: ['B'] },
        { ...quiz.questions[0], id: 'q_1', orderNo: 10, prompt: 'First?', correctOptionKeys: ['A'] }
      ]
    }

    await publishLearningQuiz('token', {
      courseId: 'course-1',
      sourceDocumentId: 'content-entry-1',
      ownerEmployeeId: 'employee-1',
      quiz: duplicateOrderQuiz
    })

    expect(mockPost).toHaveBeenNthCalledWith(
      3,
      '/processes/employee/batchSaveLearningQuestions',
      {
        learningQuestionsBatch: expect.objectContaining({
          questions: [
            expect.objectContaining({ orderNo: 1, prompt: 'Second?', correctKeys: { keys: ['B'] } }),
            expect.objectContaining({ orderNo: 2, prompt: 'First?', correctKeys: { keys: ['A'] } })
          ]
        })
      },
      { headers: { 'Content-Type': 'application/json' } }
    )
    expect(mockPost).toHaveBeenNthCalledWith(
      4,
      '/processes/employee/createLearningScoringGrid',
      {
        learningScoringGrid: expect.objectContaining({
          perQuestion: {
            '1': { points: 1, correctKeys: ['B'] },
            '2': { points: 1, correctKeys: ['A'] }
          }
        })
      },
      { headers: { 'Content-Type': 'application/json' } }
    )
  })

  it('does not update the course when batch question save fails', async () => {
    mockPost.mockReset()
    mockPost
      .mockResolvedValueOnce({ learningCourseVersion: { id: 'course-version-1' } })
      .mockResolvedValueOnce({ learningMaterial: { id: 'material-1' } })
      .mockRejectedValueOnce(new Error('question batch failed'))

    await expect(
      publishLearningQuiz('token', {
        courseId: 'course-1',
        sourceDocumentId: 'content-entry-1',
        ownerEmployeeId: 'employee-1',
        quiz
      })
    ).rejects.toThrow('question batch failed')

    expect(mockPost).toHaveBeenCalledTimes(3)
    expect(mockPost).not.toHaveBeenCalledWith(
      '/processes/employee/updateLearningCourse',
      expect.anything(),
      expect.anything()
    )
  })
})
