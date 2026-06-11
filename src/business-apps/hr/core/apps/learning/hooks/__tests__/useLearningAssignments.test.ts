import { formatLearningAssignmentStatus, mapLearningAssignmentGroups } from '../useLearningAssignments'

describe('mapLearningAssignmentGroups', () => {
  it('groups assignments by course and calculates progress counts', () => {
    const groups = mapLearningAssignmentGroups([
      {
        id: 'assignment-1',
        title: 'Security',
        status: 'ACTIVE_LEARNING_ASSIGNMENT',
        availableUntil: '2099-06-10T10:00:00.000Z',
        learningCourseId: 'course-1',
        learningCourse: { id: 'course-1', title: 'Security', status: 'PUBLISHED_LEARNING_COURSE' },
        learningAssignmentTargets: [
          {
            id: 'target-1',
            employeeId: 'employee-1',
            employee: { id: 'employee-1', displayName: 'Alex Morgan' }
          },
          {
            id: 'target-2',
            employeeId: 'employee-2',
            employee: { id: 'employee-2', firstName: 'Sam', lastName: 'Rivera' }
          }
        ],
        learningAttempts: [
          {
            id: 'attempt-1',
            employeeId: 'employee-1',
            status: 'IN_PROGRESS_LEARNING_ATTEMPT'
          },
          {
            id: 'attempt-2',
            employeeId: 'employee-2',
            status: 'GRADED_LEARNING_ATTEMPT',
            scorePct: '90',
            passed: true
          }
        ]
      }
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0]).toEqual(
      expect.objectContaining({
        courseId: 'course-1',
        courseTitle: 'Security',
        summary: {
          assigned: 2,
          inProgress: 1,
          submittedOrGraded: 1,
          passed: 1,
          overdue: 0
        }
      })
    )
    expect(groups[0].rows).toEqual([
      expect.objectContaining({
        employeeId: 'employee-1',
        employeeName: 'Alex Morgan',
        assignmentStatusLabel: 'Active',
        attemptStatus: 'IN_PROGRESS_LEARNING_ATTEMPT',
        attemptStatusLabel: 'In progress'
      }),
      expect.objectContaining({
        employeeId: 'employee-2',
        employeeName: 'Sam Rivera',
        attemptStatus: 'GRADED_LEARNING_ATTEMPT',
        attemptStatusLabel: 'Graded',
        scorePct: 90
      })
    ])
  })

  it('formats learning status enum values for display', () => {
    expect(formatLearningAssignmentStatus('ACTIVE_LEARNING_ASSIGNMENT')).toBe('Active')
    expect(formatLearningAssignmentStatus('IN_PROGRESS_LEARNING_ATTEMPT')).toBe('In progress')
    expect(formatLearningAssignmentStatus('NOT_STARTED_LEARNING_ATTEMPT')).toBe('Not started')
  })

  it('uses neutral fallback labels instead of visible ids', () => {
    const groups = mapLearningAssignmentGroups([
      {
        id: 'assignment-1',
        status: 'ACTIVE_LEARNING_ASSIGNMENT',
        learningCourseId: 'course-1',
        learningAssignmentTargets: [
          {
            id: 'target-1',
            employeeId: 'employee-1',
            employee: null
          }
        ],
        learningAttempts: []
      }
    ])

    expect(groups[0]).toEqual(expect.objectContaining({ courseTitle: 'Untitled course' }))
    expect(groups[0].rows[0]).toEqual(expect.objectContaining({ employeeName: 'Unknown employee' }))
  })
})
