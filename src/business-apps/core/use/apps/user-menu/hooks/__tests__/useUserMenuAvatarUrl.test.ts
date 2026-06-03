import { renderHook } from '@testing-library/react'
import { useUserMenuAvatarUrl } from '../useUserMenuAvatarUrl'
import type { UserMenuUserInfo } from '../../types'

const mockUseCurrentUserPicture = jest.fn()

jest.mock('@/business-apps/platform/apps/every-ai/hooks/useCurrentUserPicture', () => ({
  useCurrentUserPicture: (...args: unknown[]) => mockUseCurrentUserPicture(...args)
}))

const baseUserInfo: UserMenuUserInfo = {
  id: 'user-1',
  userName: 'jdoe',
  givenName: 'John',
  familyName: 'Doe',
  nickName: '',
  employeeDetails: {
    employeeId: 'emp-1',
    firstName: 'John',
    lastName: 'Doe',
    pictureThumbnail: '',
    supervisor: { id: '', firstName: '', lastName: '', userId: '' },
    organizationalUnit: { id: '', name: '' }
  }
}

describe('useUserMenuAvatarUrl', () => {
  beforeEach(() => {
    mockUseCurrentUserPicture.mockReturnValue({ pictureThumbnail: null, isLoading: false })
  })

  it('uses context thumbnail when present', () => {
    const userInfo: UserMenuUserInfo = {
      ...baseUserInfo,
      employeeDetails: {
        ...baseUserInfo.employeeDetails,
        pictureThumbnail: '/9j/abc'
      }
    }

    const { result } = renderHook(() => useUserMenuAvatarUrl({ accessToken: 'token', userInfo, isProfileLoaded: true }))

    expect(result.current).toBe('data:image/jpeg;base64,/9j/abc')
    expect(mockUseCurrentUserPicture).toHaveBeenCalledWith(undefined, '', undefined)
  })

  it('fetches picture when context thumbnail is missing', () => {
    mockUseCurrentUserPicture.mockReturnValue({
      pictureThumbnail: 'data:image/jpeg;base64,fetched',
      isLoading: false
    })

    const { result } = renderHook(() =>
      useUserMenuAvatarUrl({ accessToken: 'token', userInfo: baseUserInfo, isProfileLoaded: true })
    )

    expect(result.current).toBe('data:image/jpeg;base64,fetched')
    expect(mockUseCurrentUserPicture).toHaveBeenCalledWith('emp-1', 'token', 'user-1')
  })

  it('does not fetch when profile is not loaded', () => {
    renderHook(() => useUserMenuAvatarUrl({ accessToken: 'token', userInfo: baseUserInfo, isProfileLoaded: false }))

    expect(mockUseCurrentUserPicture).toHaveBeenCalledWith(undefined, '', undefined)
  })
})
