// Connected-mailbox picker for inbound_email triggers.
//
// Replaces the old free-text address input: an operator can only bind a
// mailbox that they actually connected (and authenticated) in the Email app,
// which is owned by document-service. We list those verified accounts and bind
// the trigger to one by id + verified address — never a typed string. This
// closes the "type a colleague's address" impersonation hole.

import { ArrowClockwiseIcon } from '@phosphor-icons/react'
import React, { useCallback, useEffect, useState } from 'react'
import { EmailApiService } from '@/business-apps/platform/apps/email-apps/services/EmailApiService'
import type { EmailAccount } from '@/business-apps/platform/apps/email-apps/types'

// Where operators connect a new mailbox (OAuth / IMAP) — the existing Email
// app account setup. Opened in a new tab so the half-filled trigger form is
// preserved; the operator returns and hits Refresh.
const EMAIL_APP_PATH = '/platform/mail'

export interface SelectedMailbox {
  id: string
  emailAddress: string
}

interface InboundMailboxPickerProps {
  accessToken: string
  selectedAccountId: string | null
  onSelect: (account: SelectedMailbox | null) => void
}

export const InboundMailboxPicker: React.FC<InboundMailboxPickerProps> = ({
  accessToken,
  selectedAccountId,
  onSelect
}) => {
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadAccounts = useCallback(async () => {
    if (!accessToken) {
      setLoadError('Sign in to load your connected mailboxes.')
      return
    }
    setIsLoading(true)
    setLoadError(null)
    try {
      EmailApiService.setAccessToken(accessToken)
      const result = await EmailApiService.listAccounts()
      setAccounts(result)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load connected mailboxes.')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    void loadAccounts()
  }, [loadAccounts])

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const accountId = event.target.value
    const account = accounts.find(item => item.id === accountId)
    onSelect(account ? { id: account.id, emailAddress: account.emailAddress } : null)
  }

  // Forwarding is an owner opt-in on the account; without it document-service
  // never forwards inbound mail, so the trigger silently never fires.
  const selectedAccount = selectedAccountId ? accounts.find(item => item.id === selectedAccountId) : undefined
  const forwardingDisabled = selectedAccount !== undefined && selectedAccount.forwardingEnabled !== true

  return (
    <div className="gba:mt-2 gba:flex gba:flex-col gba:gap-2" data-testid="workforce-mailbox-picker">
      <div className="gba:flex gba:items-center gba:gap-2">
        <select
          aria-label="Connected mailbox"
          value={selectedAccountId ?? ''}
          onChange={handleChange}
          disabled={isLoading || accounts.length === 0}
          className="gba:h-9 gba:flex-1 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-2 gba:text-sm gba:text-foreground gba:disabled:opacity-50"
          data-testid="workforce-mailbox-picker-select"
        >
          <option value="">{isLoading ? 'Loading mailboxes…' : 'Select a connected mailbox'}</option>
          {accounts.map(account => (
            <option key={account.id} value={account.id}>
              {account.emailAddress}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void loadAccounts()}
          disabled={isLoading}
          aria-label="Refresh connected mailboxes"
          className="gba:inline-flex gba:h-9 gba:w-9 gba:items-center gba:justify-center gba:rounded-lg gba:border gba:border-border gba:bg-background gba:text-muted-foreground gba:hover:bg-muted/60 gba:hover:text-foreground gba:disabled:opacity-50"
          data-testid="workforce-mailbox-picker-refresh"
        >
          <ArrowClockwiseIcon className="gba:h-4 gba:w-4" />
        </button>
      </div>

      {loadError && (
        <p className="gba:text-[11px] gba:text-destructive" data-testid="workforce-mailbox-picker-error">
          {loadError}
        </p>
      )}

      {!isLoading && !loadError && accounts.length === 0 && (
        <p className="gba:text-[11px] gba:text-muted-foreground" data-testid="workforce-mailbox-picker-empty">
          No connected mailboxes yet.{' '}
          <a
            href={EMAIL_APP_PATH}
            target="_blank"
            rel="noopener noreferrer"
            className="gba:font-medium gba:text-primary gba:underline"
            data-testid="workforce-mailbox-picker-connect-link"
          >
            Connect a mailbox in the Email app
          </a>{' '}
          then refresh.
        </p>
      )}

      {forwardingDisabled && (
        <p className="gba:text-[11px] gba:text-warning" data-testid="workforce-mailbox-picker-forwarding-hint">
          Forwarding is off for this mailbox. Enable &quot;Forward to Workforce&quot; for it in the Email app, or this
          trigger will not receive mail.
        </p>
      )}

      <p className="gba:text-[11px] gba:text-muted-foreground">
        Only mailboxes you have connected can be used. The address is taken from the verified account.
      </p>
    </div>
  )
}
