import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { EmailRecipientInput } from '../EmailRecipientInput'
import type { EmailAccount, EmailAddress, EmailContact } from '../../types'
import translations from '../../_i18n'

interface EmailThreadRecipientsProps {
  accounts: EmailAccount[]
  accountId: string
  onAccountIdChange: (value: string) => void
  toRecipients: EmailAddress[]
  onToRecipientsChange: (value: EmailAddress[]) => void
  ccRecipients: EmailAddress[]
  onCcRecipientsChange: (value: EmailAddress[]) => void
  bccRecipients: EmailAddress[]
  onBccRecipientsChange: (value: EmailAddress[]) => void
  showCcBcc: boolean
  onShowCcBccChange: (value: boolean) => void
  searchContacts: (query: string) => EmailContact[]
  'data-testid'?: string
}

export const EmailThreadRecipients: React.FC<EmailThreadRecipientsProps> = ({
  accounts,
  accountId,
  onAccountIdChange,
  toRecipients,
  onToRecipientsChange,
  ccRecipients,
  onCcRecipientsChange,
  bccRecipients,
  onBccRecipientsChange,
  showCcBcc,
  onShowCcBccChange,
  searchContacts,
  'data-testid': testId = 'email-thread-recipients'
}) => {
  const { t } = useTranslation(translations)

  return (
    <div className="gba:space-y-2" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:gap-2">
        <span className="gba:text-xs gba:text-muted-foreground gba:w-10">{t('composer-from')}</span>
        <select
          value={accountId}
          onChange={event => onAccountIdChange(event.target.value)}
          className="gba:h-8 gba:text-sm gba:bg-background gba:border gba:rounded gba:px-2 gba:min-w-72"
          data-testid={`${testId}-from`}
        >
          {accounts.map(account => (
            <option key={account.id} value={account.id}>
              {account.displayName} ({account.emailAddress})
            </option>
          ))}
        </select>
      </div>

      <div className="gba:flex gba:items-start gba:gap-2">
        <span className="gba:text-xs gba:text-muted-foreground gba:w-10 gba:mt-2">{t('composer-to')}</span>
        <EmailRecipientInput
          recipients={toRecipients}
          onChange={onToRecipientsChange}
          searchContacts={searchContacts}
          placeholder={t('composer-recipient-input-placeholder')}
          data-testid={`${testId}-to`}
        />
        {!showCcBcc && (
          <button
            type="button"
            onClick={() => onShowCcBccChange(true)}
            className="gba:text-xs gba:text-primary gba:mt-2 hover:gba:underline"
            data-testid={`${testId}-show-cc-bcc`}
          >
            {t('composer-cc-bcc')}
          </button>
        )}
      </div>

      {showCcBcc && (
        <>
          <div className="gba:flex gba:items-start gba:gap-2">
            <span className="gba:text-xs gba:text-muted-foreground gba:w-10 gba:mt-2">{t('composer-cc')}</span>
            <EmailRecipientInput
              recipients={ccRecipients}
              onChange={onCcRecipientsChange}
              searchContacts={searchContacts}
              placeholder={t('composer-recipient-input-placeholder')}
              data-testid={`${testId}-cc`}
            />
          </div>
          <div className="gba:flex gba:items-start gba:gap-2">
            <span className="gba:text-xs gba:text-muted-foreground gba:w-10 gba:mt-2">{t('composer-bcc')}</span>
            <EmailRecipientInput
              recipients={bccRecipients}
              onChange={onBccRecipientsChange}
              searchContacts={searchContacts}
              placeholder={t('composer-recipient-input-placeholder')}
              data-testid={`${testId}-bcc`}
            />
          </div>
        </>
      )}
    </div>
  )
}
