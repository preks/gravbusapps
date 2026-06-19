import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('@newwork/nw-design-system', () => jest.requireActual('@/__mocks__/@newwork/nw-design-system'))
jest.mock('@newwork/icons', () => ({
  EmployeeIcon: () => <span data-testid="employee-icon" />
}))
jest.mock('@phosphor-icons/react', () => ({
  SignOutIcon: () => <span data-testid="sign-out-icon" />,
  CaretRightIcon: () => <span data-testid="caret-right-icon" />,
  ArrowSquareOutIcon: () => <span data-testid="external-link-icon" />
}))
jest.mock('@/common/utils/navigationUtils', () => ({
  buildPlatformUrl: (path: string) => path,
  navigateTo: jest.fn()
}))
jest.mock('@/business-apps/platform/apps/every-ai/hooks/useCurrentUserPicture', () => ({
  useCurrentUserPicture: () => ({ pictureThumbnail: null, isLoading: false })
}))

import { navigateTo } from '@/common/utils/navigationUtils'
import { UserMenu } from '../UserMenu'
import { resolveUserMenuAdditionalData, type UserMenuUserInfo } from '../types'

const languageOptions = [
  { label: 'English (US)', value: 'en-US' },
  { label: 'Deutsch (DE)', value: 'de-DE' },
  { label: 'Română (RO)', value: 'ro-RO' }
]

const baseUserInfo: UserMenuUserInfo = {
  id: 'user-1',
  userName: 'jdoe',
  givenName: 'John',
  familyName: 'Doe',
  nickName: '',
  email: 'john@example.com',
  employeeDetails: {
    employeeId: 'emp-1',
    firstName: 'John',
    lastName: 'Doe',
    pictureThumbnail: '',
    jobTitle: 'Engineer',
    supervisor: { id: '', firstName: '', lastName: '', userId: '' },
    organizationalUnit: { id: 'ou-1', name: 'Platform' }
  }
}

const validAdditionalData = {
  isProfileLoaded: true,
  onLogout: jest.fn(),
  dataPrivacyUrl: 'https://example.com/privacy',
  languageOptions,
  selectedLanguage: 'en-US' as const,
  onLanguageChange: jest.fn()
}

describe('UserMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('throws when additionalData is missing required fields', () => {
    expect(() => resolveUserMenuAdditionalData({ isProfileLoaded: true })).toThrow(
      'UserMenu requires additionalData.onLogout as function'
    )
  })

  it('throws when selectedLanguage is not a supported locale', () => {
    expect(() =>
      resolveUserMenuAdditionalData({
        ...validAdditionalData,
        selectedLanguage: 'fr-FR'
      })
    ).toThrow('UserMenu requires additionalData.selectedLanguage to be en-US, de-DE, or ro-RO when provided')
  })

  it('renders profile identity and language selector when host contract is provided', () => {
    render(<UserMenu accessToken="token" userInfo={baseUserInfo} additionalData={validAdditionalData} />)

    expect(screen.getByTestId('user-menu-name')).toHaveTextContent('John Doe')
    expect(screen.getByTestId('user-menu-language-select')).toBeInTheDocument()
    expect(screen.getByTestId('user-menu-language-select')).toHaveValue('en-US')
    expect(screen.getByRole('option', { name: 'Deutsch (DE)' })).toBeInTheDocument()
  })

  it('hides language selector when host contract is incomplete', () => {
    render(
      <UserMenu
        accessToken="token"
        userInfo={baseUserInfo}
        additionalData={{
          isProfileLoaded: true,
          onLogout: jest.fn()
        }}
      />
    )

    expect(screen.getByTestId('user-menu-name')).toBeInTheDocument()
    expect(screen.queryByTestId('user-menu-language-select')).not.toBeInTheDocument()
  })

  it('shows loading state when profile is not loaded', () => {
    render(
      <UserMenu
        accessToken="token"
        userInfo={baseUserInfo}
        additionalData={{ ...validAdditionalData, isProfileLoaded: false }}
      />
    )

    expect(screen.getByTestId('user-menu-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('user-menu-language-select')).not.toBeInTheDocument()
  })

  it('calls onLanguageChange with the selected locale', async () => {
    const user = userEvent.setup()
    const onLanguageChange = jest.fn()

    render(
      <UserMenu
        accessToken="token"
        userInfo={baseUserInfo}
        additionalData={{ ...validAdditionalData, onLanguageChange }}
      />
    )

    await user.selectOptions(screen.getByTestId('user-menu-language-select'), 'de-DE')

    expect(onLanguageChange).toHaveBeenCalledTimes(1)
    expect(onLanguageChange).toHaveBeenCalledWith('de-DE')
  })

  it('notifies the host before navigating to the employee profile', async () => {
    const user = userEvent.setup()
    const onProfileNavigate = jest.fn()

    render(
      <UserMenu
        accessToken="token"
        userInfo={baseUserInfo}
        additionalData={{ ...validAdditionalData, onProfileNavigate }}
      />
    )

    await user.click(screen.getByTestId('user-menu-my-profile'))

    expect(onProfileNavigate).toHaveBeenCalledTimes(1)
    expect(navigateTo).toHaveBeenCalledWith('/platform/employee-record')
    expect(onProfileNavigate.mock.invocationCallOrder[0]).toBeLessThan(
      (navigateTo as jest.Mock).mock.invocationCallOrder[0]
    )
  })
})
