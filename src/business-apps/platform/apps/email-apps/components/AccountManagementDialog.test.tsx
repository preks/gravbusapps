/** @jest-environment jsdom */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { AccountManagementDialog } from './AccountManagementDialog'
import type { EmailAccount } from '../types'

// Persisted owner opt-in goes through the backend (updateAccount), not
// localStorage, so we assert the service call + refresh.
const updateAccount = jest.fn()
jest.mock('../services/EmailApiService', () => ({
  EmailApiService: {
    updateAccount: (id: string, patch: unknown) => updateAccount(id, patch),
    deleteAccount: jest.fn()
  }
}))

jest.mock('../services/MicrosoftOAuthService', () => ({ MicrosoftOAuthService: {} }))
jest.mock('../services/GoogleOAuthService', () => ({ GoogleOAuthService: {} }))
jest.mock('../services/OAuthConfigError', () => ({ OAuthConfigError: class {} }))
jest.mock('../services/EmailProviderSettingsApi', () => ({ EmailProviderSettingsApi: {} }))
jest.mock('./SignatureEditor', () => ({ SignatureEditor: () => null }))
jest.mock('./AccountStatusBadge', () => ({ AccountStatusBadge: () => null }))
jest.mock('../utils/emailDisplayUtils', () => ({ formatRelativeTimeWithT: () => '' }))
jest.mock('../_i18n', () => ({}))

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() }
}))

// Lightweight design-system stand-ins: render children, expose Switch as a
// checkbox forwarding onCheckedChange so the toggle is clickable in jsdom.
jest.mock('@newwork/nw-design-system', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  Dialog: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  Button: ({ children, ...rest }: any) => <button {...rest}>{children}</button>,
  Badge: ({ children }: any) => <span>{children}</span>,
  Switch: ({ checked, onCheckedChange, disabled, ...rest }: any) => (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={() => onCheckedChange?.(!checked)}
      {...rest}
    />
  ),
  AlertDialog: ({ children }: any) => <div>{children}</div>,
  AlertDialogAction: ({ children, ...rest }: any) => <button {...rest}>{children}</button>,
  AlertDialogCancel: ({ children, ...rest }: any) => <button {...rest}>{children}</button>,
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <div>{children}</div>
}))

jest.mock('lucide-react', () => ({
  Mail: () => null,
  RefreshCw: () => null,
  Trash2: () => null,
  Plus: () => null,
  Calendar: () => null,
  MessageSquare: () => null,
  Forward: () => null
}))

function makeAccount(overrides: Partial<EmailAccount> = {}): EmailAccount {
  return {
    id: 'acct-1',
    displayName: 'Support',
    emailAddress: 'support@acme.com',
    provider: 'microsoft',
    status: 'active',
    isDefault: false,
    createdAt: '2026-05-01T00:00:00Z',
    ...overrides
  } as EmailAccount
}

function renderDialog(account: EmailAccount, onAccountsChanged = jest.fn()) {
  render(
    <AccountManagementDialog
      open
      onOpenChange={jest.fn()}
      accounts={[account]}
      onAccountsChanged={onAccountsChanged}
      onAddAccount={jest.fn()}
      data-testid="acct-mgmt"
    />
  )
  return { onAccountsChanged }
}

beforeEach(() => jest.clearAllMocks())

describe('AccountManagementDialog forwarding toggle', () => {
  it('reflects forwardingEnabled=true as checked', () => {
    renderDialog(makeAccount({ forwardingEnabled: true }))
    const toggle = screen.getByTestId('acct-mgmt-forwarding-acct-1') as HTMLInputElement
    expect(toggle.checked).toBe(true)
  })

  it('reflects missing forwardingEnabled as unchecked', () => {
    renderDialog(makeAccount())
    const toggle = screen.getByTestId('acct-mgmt-forwarding-acct-1') as HTMLInputElement
    expect(toggle.checked).toBe(false)
  })

  it('toggling on calls updateAccount with forwardingEnabled=true and refreshes', async () => {
    updateAccount.mockResolvedValueOnce(undefined)
    const { onAccountsChanged } = renderDialog(makeAccount({ forwardingEnabled: false }))

    fireEvent.click(screen.getByTestId('acct-mgmt-forwarding-acct-1'))

    await waitFor(() => expect(updateAccount).toHaveBeenCalledWith('acct-1', { forwardingEnabled: true }))
    await waitFor(() => expect(onAccountsChanged).toHaveBeenCalled())
  })

  it('flips the switch optimistically before the request resolves', async () => {
    let resolveUpdate: () => void = () => {}
    updateAccount.mockReturnValueOnce(
      new Promise<void>(res => {
        resolveUpdate = res
      })
    )
    renderDialog(makeAccount({ forwardingEnabled: false }))
    const toggle = screen.getByTestId('acct-mgmt-forwarding-acct-1') as HTMLInputElement

    fireEvent.click(toggle)

    // Checked immediately, while the PATCH is still pending.
    await waitFor(() => expect(toggle.checked).toBe(true))
    await act(async () => {
      resolveUpdate()
    })
  })

  it('reverts the switch when the update fails', async () => {
    updateAccount.mockRejectedValueOnce(new Error('boom'))
    renderDialog(makeAccount({ forwardingEnabled: false }))
    const toggle = screen.getByTestId('acct-mgmt-forwarding-acct-1') as HTMLInputElement

    fireEvent.click(toggle)

    await waitFor(() => expect(updateAccount).toHaveBeenCalled())
    await waitFor(() => expect(toggle.checked).toBe(false))
  })

  it('toggling off calls updateAccount with forwardingEnabled=false', async () => {
    updateAccount.mockResolvedValueOnce(undefined)
    renderDialog(makeAccount({ forwardingEnabled: true }))

    fireEvent.click(screen.getByTestId('acct-mgmt-forwarding-acct-1'))

    await waitFor(() => expect(updateAccount).toHaveBeenCalledWith('acct-1', { forwardingEnabled: false }))
  })
})
