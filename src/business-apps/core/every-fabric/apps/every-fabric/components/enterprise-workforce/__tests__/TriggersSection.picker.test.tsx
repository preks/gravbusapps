/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { TriggersSection } from '../sections/TriggersSection'
import type { WorkforceTriggerCreateInput } from '../workforceTypes'

// Mock the document-service email client so the picker lists deterministic
// connected accounts without touching the network.
const listAccounts = jest.fn()
const setAccessToken = jest.fn()
jest.mock('@/business-apps/platform/apps/email-apps/services/EmailApiService', () => ({
  EmailApiService: {
    setAccessToken: (token: string | null) => setAccessToken(token),
    listAccounts: () => listAccounts()
  }
}))

const ACCOUNTS = [
  {
    id: 'acct-1',
    displayName: 'Support',
    emailAddress: 'support@acme.com',
    provider: 'google',
    status: 'active',
    isDefault: true,
    createdAt: '2026-05-01T00:00:00Z'
  },
  {
    id: 'acct-2',
    displayName: 'Sales',
    emailAddress: 'sales@acme.com',
    provider: 'microsoft',
    status: 'active',
    isDefault: false,
    createdAt: '2026-05-02T00:00:00Z'
  }
]

const noopAsync = async () => {}

function renderSection(onCreate: (input: WorkforceTriggerCreateInput) => Promise<void>) {
  return render(
    <TriggersSection
      triggers={[]}
      pendingTriggerId={null}
      accessToken="token-123"
      onCreate={onCreate}
      onUpdate={noopAsync}
      onDelete={noopAsync}
    />
  )
}

async function openInboundForm() {
  fireEvent.click(screen.getByTestId('workforce-trigger-toggle-add'))
  fireEvent.change(screen.getByTestId('workforce-trigger-create-type'), {
    target: { value: 'inbound_email' }
  })
  await waitFor(() => expect(listAccounts).toHaveBeenCalled())
}

beforeEach(() => {
  listAccounts.mockResolvedValue(ACCOUNTS)
})

describe('TriggersSection inbound mailbox picker', () => {
  it('lists connected mailboxes and has no free-text mailbox input', async () => {
    renderSection(noopAsync)
    await openInboundForm()

    // The old arbitrary-address input is gone.
    expect(screen.queryByTestId('workforce-trigger-create-mailbox')).toBeNull()

    const select = await screen.findByTestId('workforce-mailbox-picker-select')
    await waitFor(() => expect(screen.getByText('support@acme.com')).toBeInTheDocument())
    expect(screen.getByText('sales@acme.com')).toBeInTheDocument()
    expect(select).toBeInTheDocument()
  })

  it('creates an inbound trigger bound to {mailbox, email_account_id} from the picked account', async () => {
    const onCreate = jest.fn().mockResolvedValue(undefined)
    renderSection(onCreate)
    await openInboundForm()

    await screen.findByText('support@acme.com')
    fireEvent.change(screen.getByTestId('workforce-mailbox-picker-select'), {
      target: { value: 'acct-2' }
    })
    fireEvent.click(screen.getByTestId('workforce-trigger-create-submit'))

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1))
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'inbound_email',
        config: { mailbox: 'sales@acme.com', email_account_id: 'acct-2' }
      })
    )
  })

  it('includes a subject_filter in the config when patterns are entered', async () => {
    const onCreate = jest.fn().mockResolvedValue(undefined)
    renderSection(onCreate)
    await openInboundForm()

    await screen.findByText('support@acme.com')
    fireEvent.change(screen.getByTestId('workforce-mailbox-picker-select'), {
      target: { value: 'acct-1' }
    })
    fireEvent.change(screen.getByTestId('workforce-trigger-subject-filter-mode'), {
      target: { value: 'prefix' }
    })
    fireEvent.click(screen.getByTestId('workforce-trigger-subject-filter-case'))
    fireEvent.change(screen.getByTestId('workforce-trigger-subject-filter-patterns'), {
      target: { value: 'ticket\n[support]' }
    })
    fireEvent.click(screen.getByTestId('workforce-trigger-create-submit'))

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1))
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'inbound_email',
        config: {
          mailbox: 'support@acme.com',
          email_account_id: 'acct-1',
          subject_filter: {
            patterns: ['ticket', '[support]'],
            mode: 'prefix',
            case_sensitive: true
          }
        }
      })
    )
  })

  it('omits subject_filter when no patterns are entered (forward all)', async () => {
    const onCreate = jest.fn().mockResolvedValue(undefined)
    renderSection(onCreate)
    await openInboundForm()

    await screen.findByText('support@acme.com')
    fireEvent.change(screen.getByTestId('workforce-mailbox-picker-select'), {
      target: { value: 'acct-1' }
    })
    fireEvent.click(screen.getByTestId('workforce-trigger-create-submit'))

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1))
    const input = onCreate.mock.calls[0][0]
    expect(input.config).toEqual({ mailbox: 'support@acme.com', email_account_id: 'acct-1' })
    expect(input.config.subject_filter).toBeUndefined()
  })

  it('blocks creation when no mailbox is selected', async () => {
    const onCreate = jest.fn().mockResolvedValue(undefined)
    renderSection(onCreate)
    await openInboundForm()

    await screen.findByText('support@acme.com')
    // Submit without selecting an account.
    fireEvent.click(screen.getByTestId('workforce-trigger-create-submit'))

    await waitFor(() => expect(screen.getByTestId('workforce-trigger-create-error')).toBeInTheDocument())
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('shows an empty-state with a connect link when no accounts are connected', async () => {
    listAccounts.mockResolvedValue([])
    renderSection(noopAsync)
    await openInboundForm()

    await waitFor(() => expect(screen.getByTestId('workforce-mailbox-picker-empty')).toBeInTheDocument())
    expect(screen.getByTestId('workforce-mailbox-picker-connect-link')).toHaveAttribute('href', '/platform/mail')
  })
})
