import { renderHook, waitFor } from '@testing-library/react'
import { useProjects } from '../project-management/hooks/useProjects'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

/**
 * Regression guard for bug 626ea36e ("Project Allocation screen limited to 10
 * projects"). The Project Allocation screen has no pagination controls, so it
 * opts into `fetchAll`, which must page through the backend and return EVERY
 * matching project instead of a single capped page.
 */

const mockRequest = jest.fn()
const mockGraphqlClient = { request: mockRequest }

jest.mock('@/common/network/graphql/useGraphQLClient', () => ({
  useGraphqlClient: jest.fn(() => mockGraphqlClient)
}))

jest.mock('@/common/hooks/useFeature', () => ({
  useFeature: jest.fn(() => false)
}))

jest.mock('@/common/utils/windowUtils', () => ({
  getCurrentActiveStructureId: jest.fn(() => 'structure-1')
}))

const BATCH_SIZE = 100

const buildProjectPage = (offset: number, limit: number, total: number) => {
  const remaining = Math.max(0, total - offset)
  const count = Math.min(limit, remaining)
  const Project = Array.from({ length: count }, (_, index) => ({
    id: `project-${offset + index}`,
    name: `Project ${offset + index}`,
    description: '',
    status: 'IN_PROGRESS'
  }))
  return { Project, ProjectAggregate: { aggregate: { count: total } } }
}

const context = { accessToken: 'token' } as BusinessAppContextProps

describe('useProjects fetchAll (Project Allocation)', () => {
  beforeEach(() => {
    mockRequest.mockReset()
  })

  it('pages through the backend until every project is collected', async () => {
    const total = 230
    mockRequest.mockImplementation((_query: string, variables: { offset: number; limit: number }) =>
      Promise.resolve(buildProjectPage(variables.offset, variables.limit, total))
    )

    const { result } = renderHook(() => useProjects(context, true, 'en-US', { fetchAll: true }))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.projects).toHaveLength(total)
    expect(result.current.totalCount).toBe(total)
    // 230 rows in batches of 100 => offsets 0, 100, 200 (third page short, loop stops).
    expect(mockRequest).toHaveBeenCalledTimes(3)
    const offsets = mockRequest.mock.calls.map(([, variables]) => variables.offset)
    expect(offsets).toEqual([0, BATCH_SIZE, BATCH_SIZE * 2])
  })

  it('fetches only a single default page when fetchAll is not set', async () => {
    mockRequest.mockImplementation((_query: string, variables: { offset: number; limit: number }) =>
      Promise.resolve(buildProjectPage(variables.offset, variables.limit, 230))
    )

    const { result } = renderHook(() => useProjects(context, true, 'en-US'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.projects).toHaveLength(10)
    expect(mockRequest).toHaveBeenCalledTimes(1)
    expect(mockRequest.mock.calls[0][1].limit).toBe(10)
  })
})
