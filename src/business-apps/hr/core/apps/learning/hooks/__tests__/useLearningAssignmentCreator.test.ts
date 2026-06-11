import { renderHook, act } from '@testing-library/react'
import { useLearningAssignmentCreator } from '../useLearningAssignmentCreator'
import { createLearningAssignmentWithTargets } from '../../services/learningAssignmentApi'
import { createLearningQuizTasks } from '../../services/learningQuizTaskFlowService'

const mockRequest = jest.fn()
const mockGraphqlClient = { request: mockRequest }

jest.mock('@/common/network/graphql/useGraphQLClient', () => ({
  useGraphqlClient: jest.fn(() => mockGraphqlClient)
}))

jest.mock('../../services/learningAssignmentApi', () => ({
  createLearningAssignmentWithTargets: jest.fn()
}))

jest.mock('../../services/learningQuizTaskFlowService', () => ({
  createLearningQuizTasks: jest.fn()
}))

const mockCreateLearningAssignmentWithTargets = createLearningAssignmentWithTargets as jest.Mock
const mockCreateLearningQuizTasks = createLearningQuizTasks as jest.Mock

describe('useLearningAssignmentCreator', () => {
  beforeEach(() => {
    mockRequest.mockReset()
    mockCreateLearningAssignmentWithTargets.mockReset()
    mockCreateLearningQuizTasks.mockReset()
    mockCreateLearningAssignmentWithTargets.mockResolvedValue({
      assignmentId: 'assignment-1',
      targetIds: [],
      attemptIds: []
    })
    mockCreateLearningQuizTasks.mockResolvedValue({ success: true, count: 0, workflowIds: [] })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('uses company id from context first', async () => {
    const { result } = renderHook(() =>
      useLearningAssignmentCreator({
        accessToken: 'token',
        additionalData: { companyId: 'company-context' }
      })
    )

    await act(async () => {
      await result.current.createAssignment({
        courseId: 'course-1',
        courseTitle: 'Course',
        courseVersionId: 'version-1',
        employeeIds: ['employee-1'],
        teamIds: [],
        availableFrom: '2026-06-03T10:00:00.000Z',
        availableUntil: '2026-06-10T10:00:00.000Z'
      })
    })

    expect(mockRequest).not.toHaveBeenCalled()
    expect(mockCreateLearningAssignmentWithTargets).toHaveBeenCalledWith(
      'token',
      expect.objectContaining({ companyId: 'company-context' })
    )
  })

  it('falls back to employee company query', async () => {
    mockRequest.mockResolvedValue({
      Employee: [{ id: 'employee-current', companyEmployees: [{ companyId: 'company-fallback' }] }]
    })
    const { result } = renderHook(() =>
      useLearningAssignmentCreator({
        accessToken: 'token',
        userInfo: {
          id: 'user-1',
          userName: 'user',
          givenName: 'User',
          familyName: 'One',
          nickName: 'User',
          employeeDetails: {
            employeeId: 'employee-current',
            firstName: 'User',
            lastName: 'One',
            supervisor: { id: 'sup', firstName: 'Sup', lastName: 'One', userId: 'sup-user' },
            organizationalUnit: { id: 'ou-1', name: 'Org' }
          }
        }
      })
    )

    await act(async () => {
      await result.current.createAssignment({
        courseId: 'course-1',
        courseTitle: 'Course',
        courseVersionId: 'version-1',
        employeeIds: ['employee-1'],
        teamIds: [],
        availableFrom: '2026-06-03T10:00:00.000Z',
        availableUntil: '2026-06-10T10:00:00.000Z'
      })
    })

    expect(mockCreateLearningAssignmentWithTargets).toHaveBeenCalledWith(
      'token',
      expect.objectContaining({ companyId: 'company-fallback' })
    )
  })

  it('creates learning quiz tasks after assignment persistence succeeds', async () => {
    mockCreateLearningAssignmentWithTargets.mockResolvedValue({
      assignmentId: 'assignment-1',
      targetIds: ['target-1'],
      attemptIds: ['attempt-1']
    })
    const { result } = renderHook(() =>
      useLearningAssignmentCreator({
        accessToken: 'token',
        additionalData: { companyId: 'company-context' },
        userInfo: {
          id: 'hr-user-1',
          userName: 'user',
          givenName: 'User',
          familyName: 'One',
          nickName: 'User',
          employeeDetails: {
            employeeId: 'employee-current',
            firstName: 'User',
            lastName: 'One',
            supervisor: { id: 'sup', firstName: 'Sup', lastName: 'One', userId: 'sup-user' },
            organizationalUnit: { id: 'ou-1', name: 'Org' }
          }
        }
      })
    )

    await act(async () => {
      await result.current.createAssignment({
        courseId: 'course-1',
        courseTitle: 'Course',
        courseVersionId: 'version-1',
        employeeIds: ['employee-1'],
        employeeUserIdsByEmployeeId: { 'employee-1': 'learner-user-1' },
        teamIds: [],
        availableFrom: '2026-06-03T10:00:00.000Z',
        availableUntil: '2026-06-10T10:00:00.000Z',
        sourceDocumentId: 'content-entry-1'
      })
    })

    expect(mockCreateLearningQuizTasks).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: 'token',
        initiatorId: 'hr-user-1',
        assignmentId: 'assignment-1',
        sourceDocumentId: 'content-entry-1',
        employees: [{ employeeId: 'employee-1', userId: 'learner-user-1' }]
      })
    )
  })

  it('keeps the assignment successful when quiz task creation fails', async () => {
    mockCreateLearningAssignmentWithTargets.mockResolvedValue({
      assignmentId: 'assignment-1',
      targetIds: ['target-1'],
      attemptIds: ['attempt-1']
    })
    mockCreateLearningQuizTasks.mockRejectedValue(new Error('flow down'))
    jest.spyOn(console, 'warn').mockImplementation(() => undefined)

    const { result } = renderHook(() =>
      useLearningAssignmentCreator({
        accessToken: 'token',
        additionalData: { companyId: 'company-context' },
        userInfo: {
          id: 'hr-user-1',
          userName: 'user',
          givenName: 'User',
          familyName: 'One',
          nickName: 'User',
          employeeDetails: {
            employeeId: 'employee-current',
            firstName: 'User',
            lastName: 'One',
            supervisor: { id: 'sup', firstName: 'Sup', lastName: 'One', userId: 'sup-user' },
            organizationalUnit: { id: 'ou-1', name: 'Org' }
          }
        }
      })
    )

    let createdAssignment
    await act(async () => {
      createdAssignment = await result.current.createAssignment({
        courseId: 'course-1',
        courseTitle: 'Course',
        courseVersionId: 'version-1',
        employeeIds: ['employee-1'],
        teamIds: [],
        availableFrom: '2026-06-03T10:00:00.000Z',
        availableUntil: '2026-06-10T10:00:00.000Z'
      })
    })

    expect(createdAssignment).toEqual(expect.objectContaining({ assignmentId: 'assignment-1' }))
  })
})
