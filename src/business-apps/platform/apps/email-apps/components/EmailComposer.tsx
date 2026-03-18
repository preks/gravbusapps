import React from 'react'
import { EmailThreadComposeSurface } from './thread-compose/EmailThreadComposeSurface'
import type { EmailMessage, EmailAccount, ComposeMode, EmailContact } from '../types'

interface EmailComposerProps {
  isOpen: boolean
  onClose: () => void
  mode: ComposeMode
  replyToMessage?: EmailMessage | null
  accounts: EmailAccount[]
  defaultAccountId?: string
  onSent: () => void
  searchContacts: (query: string) => EmailContact[]
  onRecipientsUsed?: (recipients: Array<{ name?: string; email: string }>) => void
  'data-testid'?: string
}

export const EmailComposer: React.FC<EmailComposerProps> = ({
  isOpen,
  onClose,
  mode,
  replyToMessage,
  accounts,
  defaultAccountId,
  onSent,
  searchContacts,
  onRecipientsUsed,
  'data-testid': testId = 'email-composer'
}) => {
  return (
    <EmailThreadComposeSurface
      isOpen={isOpen}
      onClose={onClose}
      mode={mode}
      replyToMessage={replyToMessage}
      accounts={accounts}
      defaultAccountId={defaultAccountId}
      onSent={onSent}
      searchContacts={searchContacts}
      onRecipientsUsed={onRecipientsUsed}
      assistantEnabled
      data-testid={testId}
    />
  )
}
