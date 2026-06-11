import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { CourseLibraryTab } from '../CourseLibraryTab'
import { useLearningCourses } from '../../hooks/useLearningCourses'

void React

jest.mock('@newwork/nw-design-system', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Card: ({ children, ...props }: any) => <section {...props}>{children}</section>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
  Spinner: (props: any) => <div data-testid={props['data-testid'] || 'spinner'} />,
  Table: ({ children }: any) => <table>{children}</table>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableCell: ({ children, ...props }: any) => <td {...props}>{children}</td>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
  useTranslation: () => ({ t: (key: string) => key })
}))

jest.mock('../../hooks/useLearningCourses', () => ({
  useLearningCourses: jest.fn()
}))

jest.mock('../../components/CourseStatusBadge', () => ({
  CourseStatusBadge: ({ status }: any) => <span>{status}</span>
}))

const mockUseLearningCourses = useLearningCourses as jest.Mock

describe('CourseLibraryTab', () => {
  it('opens edit for the selected course', () => {
    const onEditCourse = jest.fn()
    mockUseLearningCourses.mockReturnValue({
      courses: [
        {
          id: 'course-1',
          title: 'Security',
          description: 'Security course',
          status: 'PUBLISHED_LEARNING_COURSE',
          passThreshold: 70,
          allowRetake: false,
          anonymous: false
        }
      ],
      loading: false,
      error: null,
      refetch: jest.fn()
    })

    render(<CourseLibraryTab accessToken="token" onEditCourse={onEditCourse} />)
    fireEvent.click(screen.getByTestId('learning-edit-course-course-1'))

    expect(onEditCourse).toHaveBeenCalledWith('course-1')
  })

  it('opens assign for a published course', () => {
    const onAssignCourse = jest.fn()
    mockUseLearningCourses.mockReturnValue({
      courses: [
        {
          id: 'course-1',
          title: 'Security',
          description: 'Security course',
          status: 'PUBLISHED_LEARNING_COURSE',
          passThreshold: 70,
          allowRetake: false,
          anonymous: false
        }
      ],
      loading: false,
      error: null,
      refetch: jest.fn()
    })

    render(<CourseLibraryTab accessToken="token" onAssignCourse={onAssignCourse} />)
    fireEvent.click(screen.getByTestId('learning-assign-course-course-1'))

    expect(onAssignCourse).toHaveBeenCalledWith(expect.objectContaining({ id: 'course-1' }))
  })

  it('renders owner display names instead of owner employee ids', () => {
    mockUseLearningCourses.mockReturnValue({
      courses: [
        {
          id: 'course-1',
          title: 'Security',
          description: 'Security course',
          status: 'PUBLISHED_LEARNING_COURSE',
          passThreshold: 70,
          allowRetake: false,
          anonymous: false,
          ownerEmployeeId: 'employee-1',
          ownerEmployeeName: 'Alex Owner'
        }
      ],
      loading: false,
      error: null,
      refetch: jest.fn()
    })

    render(<CourseLibraryTab accessToken="token" />)

    expect(screen.getByText('Alex Owner')).toBeInTheDocument()
    expect(screen.queryByText('employee-1')).not.toBeInTheDocument()
  })
})
