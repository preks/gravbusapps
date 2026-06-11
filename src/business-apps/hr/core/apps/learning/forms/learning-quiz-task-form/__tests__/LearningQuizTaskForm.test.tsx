import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LearningQuizTaskForm } from '../LearningQuizTaskForm'
import { useLearningAttemptResult } from '../../../hooks/useLearningAttemptResult'
import { useLearningQuizQuestions } from '../../../hooks/useLearningQuizQuestions'
import { startLearningAttempt, submitLearningAttempt } from '../../../services/learningAttemptApi'
import { completeLearningQuizTask } from '../../../services/learningQuizTaskCompletionApi'

void React

jest.mock('@newwork/nw-design-system', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Card: ({ children, ...props }: any) => <section {...props}>{children}</section>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
  Spinner: (props: any) => <div data-testid={props['data-testid'] || 'spinner'} />,
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'learning-quiz-result-score') return `Score: ${params?.score}%`
      if (key === 'learning-quiz-source-link') return `Open source article: ${params?.name}`
      return key
    }
  })
}))

jest.mock('../../../hooks/useLearningQuizQuestions', () => ({
  useLearningQuizQuestions: jest.fn()
}))

jest.mock('../../../hooks/useLearningAttemptResult', () => ({
  useLearningAttemptResult: jest.fn()
}))

jest.mock('../../../services/learningAttemptApi', () => ({
  startLearningAttempt: jest.fn(),
  submitLearningAttempt: jest.fn()
}))

jest.mock('../../../services/learningQuizTaskCompletionApi', () => ({
  completeLearningQuizTask: jest.fn()
}))

const mockUseLearningQuizQuestions = useLearningQuizQuestions as jest.Mock
const mockUseLearningAttemptResult = useLearningAttemptResult as jest.Mock
const mockStartLearningAttempt = startLearningAttempt as jest.Mock
const mockSubmitLearningAttempt = submitLearningAttempt as jest.Mock
const mockCompleteLearningQuizTask = completeLearningQuizTask as jest.Mock

describe('LearningQuizTaskForm', () => {
  beforeEach(() => {
    mockUseLearningAttemptResult.mockReturnValue({
      result: null,
      loading: false,
      error: null,
      refetch: jest.fn()
    })
    mockUseLearningQuizQuestions.mockReturnValue({
      loading: false,
      error: null,
      refetch: jest.fn(),
      questions: [
        {
          id: 'question-1',
          orderNo: 1,
          prompt: 'Single?',
          questionType: 'MCQ_SINGLE_LEARNING_QUESTION',
          options: [
            { key: 'A', text: 'A' },
            { key: 'B', text: 'B' }
          ],
          points: 1
        },
        {
          id: 'question-2',
          orderNo: 2,
          prompt: 'Multi?',
          questionType: 'MCQ_MULTI_LEARNING_QUESTION',
          options: [
            { key: 'A', text: 'A' },
            { key: 'B', text: 'B' }
          ],
          points: 1
        },
        {
          id: 'question-3',
          orderNo: 3,
          prompt: 'True?',
          questionType: 'TRUE_FALSE_LEARNING_QUESTION',
          options: [
            { key: 'true', text: 'True' },
            { key: 'false', text: 'False' }
          ],
          points: 1
        }
      ]
    })
    mockStartLearningAttempt.mockReset()
    mockSubmitLearningAttempt.mockReset()
    mockCompleteLearningQuizTask.mockReset()
    mockStartLearningAttempt.mockResolvedValue({
      attemptId: 'attempt-1',
      status: 'IN_PROGRESS_LEARNING_ATTEMPT'
    })
    mockSubmitLearningAttempt.mockResolvedValue({
      attemptId: 'attempt-1',
      status: 'GRADED_LEARNING_ATTEMPT',
      scorePct: 100,
      passed: true,
      canRetake: false
    })
    mockCompleteLearningQuizTask.mockResolvedValue(undefined)
  })

  it('submits selected answers before completing the cflow task', async () => {
    render(
      <LearningQuizTaskForm
        accessToken="token"
        sourceLink={{ name: 'Security Article', url: '/article' }}
        additionalData={{
          psi_taskId: 'task-1',
          psi_taskPayload: {
            courseVersionId: 'version-1',
            assignmentId: 'assignment-1'
          }
        }}
      />
    )

    expect(screen.getByTestId('learning-quiz-source-link')).toHaveTextContent('Open source article: Security Article')

    await waitFor(() => expect(mockStartLearningAttempt).toHaveBeenCalled())
    fireEvent.click(screen.getByTestId('learning-quiz-answer-question-1-A'))
    fireEvent.click(screen.getByTestId('learning-quiz-answer-question-2-A'))
    fireEvent.click(screen.getByTestId('learning-quiz-answer-question-2-B'))
    fireEvent.click(screen.getByTestId('learning-quiz-answer-question-3-true'))
    fireEvent.click(screen.getByTestId('learning-quiz-submit-button'))

    await waitFor(() => expect(mockSubmitLearningAttempt).toHaveBeenCalled())
    await waitFor(() => expect(mockCompleteLearningQuizTask).toHaveBeenCalled())

    expect(mockSubmitLearningAttempt).toHaveBeenCalledWith(
      'token',
      expect.objectContaining({
        attemptId: 'attempt-1',
        learningCourseVersionId: 'version-1',
        answers: [
          { questionId: 'question-1', orderNo: 1, selectedKeys: ['A'] },
          { questionId: 'question-2', orderNo: 2, selectedKeys: ['A', 'B'] },
          { questionId: 'question-3', orderNo: 3, selectedKeys: ['true'] }
        ]
      })
    )
    expect(mockSubmitLearningAttempt.mock.invocationCallOrder[0]).toBeLessThan(
      mockCompleteLearningQuizTask.mock.invocationCallOrder[0]
    )
    await waitFor(() => expect(screen.getByTestId('learning-quiz-result')).toHaveTextContent('Score: 100%'))
  })

  it('ignores stale task attempt ids and submits the current learner resolved attempt', async () => {
    mockStartLearningAttempt.mockResolvedValue({
      attemptId: 'resolved-attempt-1',
      status: 'IN_PROGRESS_LEARNING_ATTEMPT'
    })

    render(
      <LearningQuizTaskForm
        accessToken="token"
        additionalData={{
          psi_taskId: 'task-1',
          psi_taskPayload: {
            courseVersionId: 'version-1',
            assignmentId: 'assignment-1',
            attemptId: 'stale-attempt-1'
          }
        }}
      />
    )

    await waitFor(() => expect(mockStartLearningAttempt).toHaveBeenCalled())
    expect(mockStartLearningAttempt).toHaveBeenCalledWith(
      'token',
      expect.not.objectContaining({ attemptId: expect.any(String) })
    )

    fireEvent.click(screen.getByTestId('learning-quiz-answer-question-1-A'))
    fireEvent.click(screen.getByTestId('learning-quiz-answer-question-2-A'))
    fireEvent.click(screen.getByTestId('learning-quiz-answer-question-3-true'))
    fireEvent.click(screen.getByTestId('learning-quiz-submit-button'))

    await waitFor(() => expect(mockSubmitLearningAttempt).toHaveBeenCalled())
    expect(mockSubmitLearningAttempt).toHaveBeenCalledWith(
      'token',
      expect.objectContaining({ attemptId: 'resolved-attempt-1' })
    )
  })

  it('renders a persisted completed result after refresh instead of the quiz form', async () => {
    mockUseLearningAttemptResult.mockReturnValue({
      result: {
        attemptId: 'attempt-1',
        status: 'GRADED_LEARNING_ATTEMPT',
        scorePct: 50,
        passed: false,
        attemptsLeft: 1,
        canRetake: false
      },
      loading: false,
      error: null,
      refetch: jest.fn()
    })

    render(
      <LearningQuizTaskForm
        accessToken="token"
        additionalData={{
          psi_taskId: 'task-1',
          psi_taskPayload: {
            courseVersionId: 'version-1',
            assignmentId: 'assignment-1'
          }
        }}
      />
    )

    await waitFor(() => expect(screen.getByTestId('learning-quiz-result')).toHaveTextContent('Score: 50%'))
    expect(screen.queryByTestId('learning-quiz-submit-button')).not.toBeInTheDocument()
    expect(mockStartLearningAttempt).not.toHaveBeenCalled()
  })
})
