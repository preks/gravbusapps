import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { AssignmentsTab } from '../AssignmentsTab'
import { useLearningAssignments } from '../../hooks/useLearningAssignments'

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
  useTranslation: () => ({ t: (key: string, params?: Record<string, unknown>) => `${key}${params?.count ?? ''}` })
}))

jest.mock('../../hooks/useLearningAssignments', () => ({
  useLearningAssignments: jest.fn()
}))

const mockUseLearningAssignments = useLearningAssignments as jest.Mock

describe('AssignmentsTab', () => {
  it('renders compact course cards and opens course detail on click', () => {
    mockUseLearningAssignments.mockReturnValue({
      groups: [
        {
          courseId: 'course-1',
          courseTitle: 'Security',
          assignments: [],
          summary: {
            assigned: 2,
            inProgress: 1,
            submittedOrGraded: 1,
            passed: 1,
            overdue: 0
          },
          rows: [
            {
              employeeId: 'employee-1',
              employeeName: 'Alex Morgan',
              assignmentStatus: 'ACTIVE_LEARNING_ASSIGNMENT',
              assignmentStatusLabel: 'Active',
              attemptStatus: 'IN_PROGRESS_LEARNING_ATTEMPT',
              attemptStatusLabel: 'In progress',
              availableUntil: '2099-06-10T10:00:00.000Z'
            }
          ]
        }
      ],
      loading: false,
      error: null,
      refetch: jest.fn()
    })

    render(<AssignmentsTab accessToken="token" />)

    expect(screen.getByText('Security')).toBeInTheDocument()
    expect(screen.getByText('learning-assignments-metric-assigned')).toBeInTheDocument()
    expect(screen.queryByText('Alex Morgan')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('learning-assignment-card-course-1'))

    expect(screen.getByTestId('learning-assignment-detail-course-1')).toBeInTheDocument()
    expect(screen.getByText('Alex Morgan')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('In progress')).toBeInTheDocument()

    fireEvent.click(screen.getByText('learning-assignments-back'))

    expect(screen.getByTestId('learning-assignment-card-course-1')).toBeInTheDocument()
    expect(screen.queryByText('Alex Morgan')).not.toBeInTheDocument()
  })
})
