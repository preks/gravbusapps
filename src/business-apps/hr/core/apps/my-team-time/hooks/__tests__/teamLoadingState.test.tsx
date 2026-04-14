import { renderHook, waitFor } from '@testing-library/react'
import { useTeamCapacity } from '../useTeamCapacity'
import { useTeamOperationalStatus } from '../useTeamOperationalStatus'

const mockRequest = jest.fn()

jest.mock('@/common/network/graphql/useGraphQLClient', () => ({
  useGraphQLClient: jest.fn(() => ({
    request: mockRequest
  }))
}))

describe('my-team-time empty team loading states', () => {
  beforeEach(() => {
    mockRequest.mockReset()
  })

  it('stops operational status loading when no team members are available', async () => {
    const { result } = renderHook(() => useTeamOperationalStatus('token', [], []))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.status.workingNow).toEqual([])
    expect(mockRequest).not.toHaveBeenCalled()
  })

  it('stops capacity loading when no team members are available', async () => {
    const { result } = renderHook(() => useTeamCapacity('token', [], []))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.rows).toEqual([])
    expect(mockRequest).not.toHaveBeenCalled()
  })
})
