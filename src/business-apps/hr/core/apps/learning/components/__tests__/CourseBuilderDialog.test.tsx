import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CourseBuilderDialog } from '../CourseBuilderDialog'
import { generateLearningQuizFromDocument } from '../../services/learningQuizGeneratorApi'
import { publishLearningQuiz } from '../../services/learningPublishApi'
import { useLearningCourseDetails } from '../../hooks/useLearningCourseDetails'

void React

jest.mock('@newwork/nw-design-system', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Card: ({ children, ...props }: any) => <section {...props}>{children}</section>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
  Dialog: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  DialogDescription: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  DialogHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  DialogTitle: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
  Input: (props: any) => <input {...props} />,
  Spinner: (props: any) => <div data-testid={props['data-testid'] || 'spinner'} />,
  Textarea: (props: any) => <textarea {...props} />,
  useTranslation: () => ({ t: (key: string) => key })
}))

jest.mock('../DocumentUploadStep', () => ({
  DocumentUploadStep: ({ onCreated, mode, initialDraft }: any) => (
    <button
      type="button"
      data-testid="mock-document-upload-create-button"
      data-mode={mode}
      data-title={initialDraft?.title}
      onClick={() =>
        onCreated({
          courseId: initialDraft?.courseId ?? 'course-1',
          sourceDocumentId: 'content-entry-1',
          title: initialDraft?.title ?? 'Security course',
          ownerEmployeeId: 'employee-1',
          maxAttempts: 1,
          version: 4
        })
      }
    >
      create draft
    </button>
  )
}))

jest.mock('../../services/learningQuizGeneratorApi', () => ({
  generateLearningQuizFromDocument: jest.fn()
}))

jest.mock('../../services/learningPublishApi', () => ({
  publishLearningQuiz: jest.fn()
}))

jest.mock('../../hooks/useLearningCourseDetails', () => ({
  useLearningCourseDetails: jest.fn()
}))

const mockGenerateLearningQuizFromDocument = generateLearningQuizFromDocument as jest.Mock
const mockPublishLearningQuiz = publishLearningQuiz as jest.Mock
const mockUseLearningCourseDetails = useLearningCourseDetails as jest.Mock

const editDetails = {
  course: {
    id: 'course-1',
    version: 4,
    title: 'Existing quiz',
    description: 'Existing description',
    status: 'DRAFT_LEARNING_COURSE',
    sourceDocumentId: 'content-entry-1',
    passThreshold: 75,
    maxAttempts: 2,
    allowRetake: false,
    anonymous: false,
    ownerEmployeeId: 'employee-1'
  },
  latestVersion: {
    id: 'version-1',
    versionNo: 3
  },
  sourceDocumentId: 'content-entry-1',
  quiz: {
    title: 'Existing quiz',
    description: 'Existing description',
    passThreshold: 75,
    maxAttempts: 2,
    coveredTopics: ['Existing'],
    uncoveredTopics: [],
    scoringGrid: { perQuestion: {}, bandDefinitions: { bands: [] } },
    questions: [
      {
        id: 'question-1',
        orderNo: 1,
        prompt: 'Existing question?',
        questionType: 'MCQ_SINGLE_LEARNING_QUESTION',
        options: [
          { key: 'A', text: 'Existing correct' },
          { key: 'B', text: 'Existing wrong' }
        ],
        correctOptionKeys: ['A'],
        points: 1,
        explanation: 'Existing explanation',
        topic: ''
      }
    ]
  }
}

const context = {
  accessToken: 'token',
  userInfo: {
    id: 'user-1',
    employeeDetails: {
      employeeId: 'employee-1'
    }
  }
} as any

describe('CourseBuilderDialog', () => {
  beforeEach(() => {
    mockGenerateLearningQuizFromDocument.mockReset()
    mockPublishLearningQuiz.mockReset()
    mockUseLearningCourseDetails.mockReturnValue({ details: null, loading: false, error: null, refetch: jest.fn() })
  })

  it('shows loading while AI generation is pending', async () => {
    mockGenerateLearningQuizFromDocument.mockReturnValue(new Promise(() => undefined))

    render(<CourseBuilderDialog open onOpenChange={jest.fn()} context={context} />)
    fireEvent.click(screen.getByTestId('mock-document-upload-create-button'))

    await waitFor(() => expect(screen.getByTestId('learning-generation-loading')).toBeInTheDocument())
    expect(mockGenerateLearningQuizFromDocument).toHaveBeenCalledWith('token', {
      courseId: 'course-1',
      contentEntryId: 'content-entry-1',
      title: 'Security course',
      passThreshold: 70
    })
    expect(screen.getByText('learning-builder-draft-created')).toBeInTheDocument()
    expect(screen.queryByText('course-1')).not.toBeInTheDocument()
  })

  it('advances to review when AI generation succeeds', async () => {
    mockGenerateLearningQuizFromDocument.mockResolvedValue({
      content: {
        success: true,
        quiz: {
          title: 'Generated quiz',
          description: 'Generated description',
          questions: [
            {
              id: 'q_1',
              prompt: 'What is secure access?',
              options: [
                { key: 'A', text: 'Controlled access' },
                { key: 'B', text: 'Shared passwords' }
              ],
              correct_keys: ['A']
            },
            {
              id: 'q_2',
              prompt: 'Which policy applies?',
              options: [
                { key: 'A', text: 'Security policy' },
                { key: 'B', text: 'Travel policy' }
              ],
              correct_keys: ['A']
            }
          ]
        },
        scoring_grid: {
          pass_threshold: 80
        },
        coverage_report: {
          covered_topics: ['Security', 'Policy']
        }
      }
    })

    render(<CourseBuilderDialog open onOpenChange={jest.fn()} context={context} />)
    fireEvent.click(screen.getByTestId('mock-document-upload-create-button'))

    await waitFor(() => expect(screen.getByTestId('learning-review-placeholder')).toBeInTheDocument())
    expect(screen.getByTestId('learning-review-title-input')).toHaveValue('Generated quiz')
    expect(screen.getByTestId('learning-review-question-count')).toHaveTextContent('2')
    expect(screen.getByTestId('learning-review-pass-threshold-input')).toHaveValue(80)
    expect(screen.getByTestId('learning-review-max-attempts-input')).toHaveValue(1)
    expect(screen.getByTestId('learning-review-covered-topics')).toHaveTextContent('Security, Policy')
  })

  it('stays on generation step and allows retry when AI generation fails', async () => {
    mockGenerateLearningQuizFromDocument.mockRejectedValueOnce(new Error('Agent failed')).mockResolvedValueOnce({
      content: {
        success: true,
        quiz: {
          title: 'Retry quiz',
          questions: [
            {
              prompt: 'Retry question?',
              options: ['Yes', 'No'],
              correct_answer: 'Yes'
            }
          ]
        },
        scoring_grid: { pass_threshold: 70 },
        coverage_report: { covered_topics: [] }
      }
    })

    render(<CourseBuilderDialog open onOpenChange={jest.fn()} context={context} />)
    fireEvent.click(screen.getByTestId('mock-document-upload-create-button'))

    await waitFor(() => expect(screen.getByTestId('learning-generation-error')).toHaveTextContent('Agent failed'))
    fireEvent.click(screen.getByTestId('learning-generation-retry-button'))

    await waitFor(() => expect(screen.getByTestId('learning-review-placeholder')).toBeInTheDocument())
    expect(mockGenerateLearningQuizFromDocument).toHaveBeenCalledTimes(2)
  })

  it('publishes the reviewed quiz with edited questions and choices', async () => {
    mockGenerateLearningQuizFromDocument.mockResolvedValue({
      content: {
        success: true,
        quiz: {
          title: 'Generated quiz',
          description: 'Generated description',
          questions: [
            {
              id: 'q_1',
              prompt: 'Original question?',
              options: [
                { key: 'A', text: 'Original correct' },
                { key: 'B', text: 'Original wrong' }
              ],
              correct_keys: ['A'],
              topic: 'Security',
              explanation: 'Original explanation'
            }
          ]
        },
        scoring_grid: { pass_threshold: 70 },
        coverage_report: { covered_topics: ['Security'] }
      }
    })
    mockPublishLearningQuiz.mockResolvedValue('version-1')

    render(<CourseBuilderDialog open onOpenChange={jest.fn()} context={context} />)
    fireEvent.click(screen.getByTestId('mock-document-upload-create-button'))

    await waitFor(() => expect(screen.getByTestId('learning-review-placeholder')).toBeInTheDocument())
    fireEvent.change(screen.getByTestId('learning-review-question-prompt-0'), {
      target: { value: 'Edited question?' }
    })
    fireEvent.change(screen.getByTestId('learning-review-question-0-option-1'), {
      target: { value: 'Edited correct answer' }
    })
    fireEvent.change(screen.getByTestId('learning-review-max-attempts-input'), {
      target: { value: '3' }
    })
    fireEvent.click(screen.getByTestId('learning-review-question-0-correct-1'))
    fireEvent.click(screen.getByTestId('learning-review-publish-button'))

    await waitFor(() => expect(mockPublishLearningQuiz).toHaveBeenCalledTimes(1))
    expect(mockPublishLearningQuiz).toHaveBeenCalledWith(
      'token',
      expect.objectContaining({
        courseId: 'course-1',
        courseVersion: 4,
        sourceDocumentId: 'content-entry-1',
        ownerEmployeeId: 'employee-1',
        quiz: expect.objectContaining({
          maxAttempts: 3,
          questions: [
            expect.objectContaining({
              prompt: 'Edited question?',
              correctOptionKeys: ['B'],
              options: expect.arrayContaining([expect.objectContaining({ key: 'B', text: 'Edited correct answer' })])
            })
          ]
        })
      })
    )
    expect(screen.getByTestId('learning-publish-success')).toBeInTheDocument()
  })

  it('keeps publish errors on the review step so publishing can be retried', async () => {
    mockGenerateLearningQuizFromDocument.mockResolvedValue({
      content: {
        success: true,
        quiz: {
          title: 'Generated quiz',
          questions: [
            {
              prompt: 'Question?',
              options: ['Yes', 'No'],
              correct_answer: 'Yes'
            }
          ]
        },
        scoring_grid: { pass_threshold: 70 },
        coverage_report: { covered_topics: [] }
      }
    })
    mockPublishLearningQuiz.mockRejectedValueOnce(new Error('Publish failed')).mockResolvedValueOnce('version-1')

    render(<CourseBuilderDialog open onOpenChange={jest.fn()} context={context} />)
    fireEvent.click(screen.getByTestId('mock-document-upload-create-button'))

    await waitFor(() => expect(screen.getByTestId('learning-review-placeholder')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('learning-review-publish-button'))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Publish failed'))

    fireEvent.click(screen.getByTestId('learning-review-publish-button'))
    await waitFor(() => expect(mockPublishLearningQuiz).toHaveBeenCalledTimes(2))
    expect(screen.getByTestId('learning-publish-success')).toBeInTheDocument()
  })

  it('loads an existing draft course into editable review mode', async () => {
    mockUseLearningCourseDetails.mockReturnValue({
      details: editDetails,
      loading: false,
      error: null,
      refetch: jest.fn()
    })

    render(<CourseBuilderDialog open onOpenChange={jest.fn()} context={context} mode="edit" courseId="course-1" />)

    await waitFor(() => expect(screen.getByTestId('learning-review-placeholder')).toBeInTheDocument())
    expect(screen.getByTestId('learning-review-title-input')).toHaveValue('Existing quiz')
    expect(screen.getByTestId('learning-review-question-prompt-0')).toHaveValue('Existing question?')
    expect(screen.getByTestId('learning-edit-notice')).toHaveTextContent('learning-edit-draft-notice')
  })

  it('does not auto-regenerate draft edits and supports manual regeneration', async () => {
    mockUseLearningCourseDetails.mockReturnValue({
      details: editDetails,
      loading: false,
      error: null,
      refetch: jest.fn()
    })
    mockGenerateLearningQuizFromDocument.mockResolvedValue({
      content: {
        success: true,
        quiz: {
          title: 'Regenerated quiz',
          questions: [{ prompt: 'Regenerated question?', options: ['Yes', 'No'], correct_answer: 'Yes' }]
        },
        scoring_grid: { pass_threshold: 70 },
        coverage_report: { covered_topics: [] }
      }
    })

    render(<CourseBuilderDialog open onOpenChange={jest.fn()} context={context} mode="edit" courseId="course-1" />)

    await waitFor(() => expect(screen.getByTestId('learning-review-placeholder')).toBeInTheDocument())
    expect(mockGenerateLearningQuizFromDocument).not.toHaveBeenCalled()

    fireEvent.click(screen.getByTestId('learning-change-source-button'))
    expect(screen.getByTestId('mock-document-upload-create-button')).toHaveAttribute('data-mode', 'edit')
    fireEvent.click(screen.getByTestId('mock-document-upload-create-button'))
    await waitFor(() => expect(screen.getByTestId('learning-review-placeholder')).toBeInTheDocument())
    expect(mockGenerateLearningQuizFromDocument).not.toHaveBeenCalled()

    fireEvent.click(screen.getByTestId('learning-regenerate-quiz-button'))
    await waitFor(() => expect(screen.getByTestId('learning-review-title-input')).toHaveValue('Regenerated quiz'))
    expect(mockGenerateLearningQuizFromDocument).toHaveBeenCalledTimes(1)
  })

  it('publishes edits to a published course as a new version', async () => {
    mockUseLearningCourseDetails.mockReturnValue({
      details: {
        ...editDetails,
        course: { ...editDetails.course, status: 'PUBLISHED_LEARNING_COURSE' }
      },
      loading: false,
      error: null,
      refetch: jest.fn()
    })
    mockPublishLearningQuiz.mockResolvedValue('version-4')

    render(<CourseBuilderDialog open onOpenChange={jest.fn()} context={context} mode="edit" courseId="course-1" />)

    await waitFor(() => expect(screen.getByTestId('learning-review-placeholder')).toBeInTheDocument())
    expect(screen.getByTestId('learning-edit-notice')).toHaveTextContent('learning-edit-published-notice')
    fireEvent.click(screen.getByTestId('learning-review-publish-button'))

    await waitFor(() => expect(mockPublishLearningQuiz).toHaveBeenCalledTimes(1))
    expect(mockPublishLearningQuiz).toHaveBeenCalledWith(
      'token',
      expect.objectContaining({
        courseId: 'course-1',
        versionNo: 4
      })
    )
  })
})
