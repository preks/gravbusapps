import { renderHook, waitFor } from '@testing-library/react'
import { useLearningCourses } from '../useLearningCourses'

const mockRequest = jest.fn()
const mockGraphqlClient = {
  request: mockRequest
}

jest.mock('@/common/network/graphql/useGraphQLClient', () => ({
  useGraphqlClient: jest.fn(() => mockGraphqlClient)
}))

describe('useLearningCourses', () => {
  beforeEach(() => {
    mockRequest.mockReset()
  })

  it('loads and maps learning courses', async () => {
    mockRequest.mockResolvedValue({
      LearningCourse: [
        {
          id: 'course-1',
          version: 2,
          title: 'Security',
          description: 'Security basics',
          status: 'PUBLISHED_LEARNING_COURSE',
          sourceDocumentId: 'document-1',
          passThreshold: '80',
          maxAttempts: 1,
          allowRetake: false,
          anonymous: false,
          ownerEmployeeId: 'employee-1',
          ownerEmployee: {
            displayName: 'Alex Owner',
            firstName: null,
            lastName: null
          },
          updatedAt: '2026-05-19T10:00:00Z'
        }
      ]
    })

    const { result } = renderHook(() => useLearningCourses('token'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeNull()
    expect(result.current.courses).toEqual([
      expect.objectContaining({
        id: 'course-1',
        title: 'Security',
        status: 'PUBLISHED_LEARNING_COURSE',
        sourceDocumentId: 'document-1',
        ownerEmployeeName: 'Alex Owner',
        passThreshold: 80,
        updatedAt: '2026-05-19T10:00:00Z'
      })
    ])
  })

  it('captures query errors', async () => {
    mockRequest.mockRejectedValue(new Error('GraphQL failed'))

    const { result } = renderHook(() => useLearningCourses('token'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.courses).toEqual([])
    expect(result.current.error).toBe('GraphQL failed')
  })
})
