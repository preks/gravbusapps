import React from 'react'
import { render, screen } from '@testing-library/react'
import { AssignLearningCourseDialog } from '../AssignLearningCourseDialog'
import { useLearningCourseDetails } from '../../hooks/useLearningCourseDetails'

void React

const mockMultiEmployeeSelect = jest.fn((props: any) => (
  <div data-testid="multi-employee-select" data-initial-count={props.initialEmployees?.length ?? 0} />
))

jest.mock('@newwork/nw-design-system', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  Input: (props: any) => <input {...props} />,
  Spinner: (props: any) => <div data-testid={props['data-testid'] || 'spinner'} />,
  useTranslation: () => ({ t: (key: string) => key })
}))

jest.mock('@/components/multi-employee-select/MultiEmployeeSelect', () => ({
  __esModule: true,
  default: (props: any) => mockMultiEmployeeSelect(props)
}))

jest.mock('../../hooks/useLearningCourseDetails', () => ({
  useLearningCourseDetails: jest.fn()
}))

jest.mock('../../hooks/useLearningAssignmentCreator', () => ({
  useLearningAssignmentCreator: () => ({
    createAssignment: jest.fn(),
    loading: false,
    error: null
  })
}))

const mockUseLearningCourseDetails = useLearningCourseDetails as jest.Mock

describe('AssignLearningCourseDialog', () => {
  beforeEach(() => {
    mockMultiEmployeeSelect.mockClear()
    mockUseLearningCourseDetails.mockReturnValue({
      details: {
        latestVersion: { id: 'course-version-1' }
      },
      loading: false,
      error: null
    })
  })

  it('loads course details with course id first and access token second', () => {
    render(
      <AssignLearningCourseDialog
        open
        onOpenChange={jest.fn()}
        context={{ accessToken: 'access-token' }}
        course={{
          id: 'course-1',
          version: 1,
          title: 'Security',
          description: '',
          status: 'PUBLISHED_LEARNING_COURSE',
          allowRetake: false,
          anonymous: false
        }}
      />
    )

    expect(mockUseLearningCourseDetails).toHaveBeenCalledWith('course-1', 'access-token')
  })

  it('passes selected employee records back into the employee selector', () => {
    render(
      <AssignLearningCourseDialog
        open
        onOpenChange={jest.fn()}
        context={{ accessToken: 'access-token' }}
        course={{
          id: 'course-1',
          version: 1,
          title: 'Security',
          description: '',
          status: 'PUBLISHED_LEARNING_COURSE',
          allowRetake: false,
          anonymous: false
        }}
      />
    )

    const props = mockMultiEmployeeSelect.mock.calls[0][0]
    expect(props.initialEmployees).toEqual([])
    expect(props.onEmployeesChange).toEqual(expect.any(Function))
  })

  it('does not render raw team id entry fields', () => {
    render(
      <AssignLearningCourseDialog
        open
        onOpenChange={jest.fn()}
        context={{ accessToken: 'access-token' }}
        course={{
          id: 'course-1',
          version: 1,
          title: 'Security',
          description: '',
          status: 'PUBLISHED_LEARNING_COURSE',
          allowRetake: false,
          anonymous: false
        }}
      />
    )

    expect(screen.queryByTestId('learning-assign-teams')).not.toBeInTheDocument()
  })
})
