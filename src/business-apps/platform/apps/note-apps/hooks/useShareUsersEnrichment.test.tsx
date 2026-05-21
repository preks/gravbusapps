import { renderHook, waitFor } from '@testing-library/react'
import { useShareUsersEnrichment } from './useShareUsersEnrichment'

const mockRequest = jest.fn()

jest.mock('@/common/network/graphql/useGraphQLClient', () => ({
  useGraphQLClient: () => ({ request: mockRequest })
}))

describe('useShareUsersEnrichment', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequest.mockImplementation(async (query: string) => {
      if (query.includes('_eq: "sharee-user-id"')) {
        return {
          Employee: [{ displayName: 'Sharee Real Name', pictureThumbnail: undefined as string | undefined }]
        }
      }
      if (query.includes('_eq: "owner-user-id"')) {
        return {
          Employee: [{ displayName: 'Owner From GraphQL', pictureThumbnail: undefined as string | undefined }]
        }
      }
      return { Employee: [] }
    })
  })

  it('prefers GraphQL displayName over placeholder userName for shared users', async () => {
    const { result } = renderHook(() =>
      useShareUsersEnrichment({
        accessToken: 'token',
        open: true,
        currentUserId: 'owner-user-id',
        currentUserName: 'Me',
        sharedUsers: [
          {
            userId: 'sharee-user-id',
            userName: 'Unknown',
            permission: 'edit'
          }
        ]
      })
    )

    await waitFor(() => {
      expect(result.current.sharedUsers[0]?.userName).toBe('Sharee Real Name')
    })
  })

  it('uses GraphQL owner name when currentUserName is missing', async () => {
    const { result } = renderHook(() =>
      useShareUsersEnrichment({
        accessToken: 'token',
        open: true,
        currentUserId: 'owner-user-id',
        currentUserName: undefined,
        sharedUsers: []
      })
    )

    await waitFor(() => {
      expect(result.current.owner.name).toBe('Owner From GraphQL')
    })
  })
})
