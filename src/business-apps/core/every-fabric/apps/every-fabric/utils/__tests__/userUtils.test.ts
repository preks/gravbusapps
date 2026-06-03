import { resolveUserAvatarUrl, toAvatarDataUrl } from '../userUtils'

describe('userUtils avatar resolution', () => {
  it('returns undefined for missing or placeholder thumbnail', () => {
    expect(resolveUserAvatarUrl(undefined)).toBeUndefined()
    expect(
      resolveUserAvatarUrl({
        id: 'u1',
        userName: 'user@test.com',
        givenName: 'Ed',
        familyName: 'R',
        nickName: '',
        employeeDetails: {
          employeeId: 'e1',
          firstName: 'Ed',
          lastName: 'R',
          pictureThumbnail: '{"invalid":true}',
          supervisor: { id: '', firstName: '', lastName: '', userId: '' },
          organizationalUnit: { id: '', name: '' }
        }
      })
    ).toBeUndefined()
  })

  it('prefixes jpeg base64 thumbnails', () => {
    const jpeg = '/9j/abc'
    expect(toAvatarDataUrl(jpeg)).toBe('data:image/jpeg;base64,/9j/abc')
    expect(
      resolveUserAvatarUrl({
        id: 'u1',
        userName: 'user@test.com',
        givenName: 'Ed',
        familyName: 'R',
        nickName: '',
        employeeDetails: {
          employeeId: 'e1',
          firstName: 'Ed',
          lastName: 'R',
          pictureThumbnail: jpeg,
          supervisor: { id: '', firstName: '', lastName: '', userId: '' },
          organizationalUnit: { id: '', name: '' }
        }
      })
    ).toBe('data:image/jpeg;base64,/9j/abc')
  })

  it('passes through https avatar urls unchanged', () => {
    expect(toAvatarDataUrl('https://cdn.example.com/avatar.jpg')).toBe('https://cdn.example.com/avatar.jpg')
  })
})
