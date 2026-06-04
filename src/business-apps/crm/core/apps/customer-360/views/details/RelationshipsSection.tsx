import React, { useMemo } from 'react'
import { useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import { UsersIcon, BankIcon, UserIcon } from '@phosphor-icons/react'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import customer360I18n from '../../_i18n'
import type { Customer360Subject } from '../../data/types'
import Customer360Section from '../../components/Customer360Section'
import Customer360List, { type Customer360RowData } from '../../components/Customer360List'

interface RelationshipsSectionProps {
  subject: Customer360Subject
  className?: string
}

function contactDisplayName(contact: Record<string, any> | undefined): string {
  if (!contact) return ''
  if (contact.fullName) return contact.fullName
  return [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim()
}

/**
 * Relationship graph for the Details tab: the contacts linked to an account, or
 * the accounts linked to a contact. Rows deep-link to the related CRM record.
 */
const RelationshipsSection: React.FC<RelationshipsSectionProps> = ({ subject, className }) => {
  const { t } = useFluentTranslation(customer360I18n)
  const isAccount = subject.type === 'account'

  const rows = useMemo<Customer360RowData[]>(() => {
    const links = (isAccount ? subject.account?.accountContacts : subject.contact?.accountContacts) ?? []
    const result: Customer360RowData[] = []

    for (const link of links as Record<string, any>[]) {
      if (isAccount) {
        const contact = link.contact
        if (!contact?.id) continue
        result.push({
          id: `contact-${contact.id}`,
          icon: UserIcon,
          primary: contactDisplayName(contact) || t('relationships-unknown-contact'),
          secondary: contact.jobPosition || contact.jobTitle,
          onClick: () => navigateTo(buildPlatformUrl('/platform/crm/contact-record', { contactId: contact.id })),
          testId: `customer-360-relationship-${contact.id}`
        })
        continue
      }

      const account = link.account
      if (!account?.id) continue
      result.push({
        id: `account-${account.id}`,
        icon: BankIcon,
        primary: account.name || t('relationships-unknown-account'),
        secondary: account.legalForm?.value,
        onClick: () => navigateTo(buildPlatformUrl('/platform/crm/account-record', { accountId: account.id })),
        testId: `customer-360-relationship-${account.id}`
      })
    }

    return result
  }, [isAccount, subject.account, subject.contact, t])

  return (
    <Customer360Section
      title={isAccount ? t('relationships-contacts-title') : t('relationships-accounts-title')}
      icon={UsersIcon}
      count={rows.length}
      isEmpty={rows.length === 0}
      emptyTitle={t('relationships-empty-title')}
      emptyDescription={t('relationships-empty-description')}
      errorTitle={t('error-title')}
      testId="customer-360-relationships-section"
      className={className}
    >
      <Customer360List rows={rows} testId="customer-360-relationships-list" />
    </Customer360Section>
  )
}

export default RelationshipsSection
export { RelationshipsSection }
