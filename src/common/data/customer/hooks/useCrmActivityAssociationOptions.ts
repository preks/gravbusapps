import { useMemo } from 'react'
import type { CustomerAccount } from '@/common/data/customer/types/customerAccountTypes'
import type { CustomerContact } from '@/common/data/customer/types/customerContactTypes'
import { useCustomerAccount } from '@/common/data/customer/hooks/useCustomerAccount'
import { useCustomerContact } from '@/common/data/customer/hooks/useCustomerContact'
import { useCustomerOpportunity } from '@/common/data/customer/hooks/useCustomerOpportunity'
import type { SelectOption as ContactSelectOption } from '@/common/components/common-relations/selects/contact-select'
import type { SelectOption as AccountSelectOption } from '@/common/components/common-relations/selects/account-select'
import type {
  CrmActivityAssociationAnchor,
  InvestmentAssociationSelectOption
} from '@/common/components/common-relations/activity-association/types'

export type { CrmActivityAssociationAnchor }

/** Maps a loaded CRM account to the shape expected by shared AccountSelect */
export function mapCustomerAccountToAccountSelectOption(account: CustomerAccount): AccountSelectOption {
  const emailChannel = account.communicationChannels?.find(
    (ch: { communicationChannel?: { code?: string }; communicationChannelRef?: string; value?: string }) =>
      ch.communicationChannel?.code === 'EMAIL' || String(ch.communicationChannelRef || '').includes('EMAIL')
  )
  const phoneChannel = account.communicationChannels?.find(
    (ch: { communicationChannel?: { code?: string }; communicationChannelRef?: string; value?: string }) =>
      ch.communicationChannel?.code === 'PHONE' || String(ch.communicationChannelRef || '').includes('PHONE')
  )
  const displayName =
    account.name ||
    (account as { code?: string }).code ||
    (account as { businessKey?: string }).businessKey ||
    'Account'

  return {
    id: account.id,
    value: account.id,
    label: displayName,
    name: displayName,
    pictureThumbnail: account.pictureThumbnail || undefined,
    extraInfo: {
      email: emailChannel?.value,
      phone: phoneChannel?.value,
      website: (account as { website?: string }).website,
      code: (account as { code?: string }).code
    }
  }
}

/** Maps a loaded CRM contact to the shape expected by shared ContactSelect */
export function mapCustomerContactToContactSelectOption(contact: CustomerContact): ContactSelectOption {
  const emailChannel = contact.communicationChannels?.find(
    (ch: { communicationChannel?: { code?: string }; communicationChannelRef?: string; value?: string }) =>
      ch.communicationChannel?.code === 'EMAIL' || String(ch.communicationChannelRef || '').includes('EMAIL')
  )
  const phoneChannel = contact.communicationChannels?.find(
    (ch: { communicationChannel?: { code?: string }; communicationChannelRef?: string; value?: string }) =>
      ch.communicationChannel?.code === 'PHONE' || String(ch.communicationChannelRef || '').includes('PHONE')
  )
  const displayName =
    (contact as { fullName?: string }).fullName ||
    [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() ||
    contact.email ||
    'Unnamed Contact'

  return {
    id: contact.id,
    value: contact.id,
    label: displayName,
    name: displayName,
    pictureThumbnail: contact.pictureThumbnail || undefined,
    extraInfo: {
      email: emailChannel?.value,
      phone: phoneChannel?.value,
      jobPosition: contact.jobPosition,
      department: contact.department
    }
  }
}

/**
 * Loads CRM account / contact / opportunity association lists for activity secondary pickers.
 * Uses the same by-id queries as record screens (junction-backed relations).
 */
export function useCrmActivityAssociationOptions(
  accessToken: string | null | undefined,
  anchor: CrmActivityAssociationAnchor | null
): {
  /** Options for shared ContactSelect (proper label / extraInfo; not raw selects) */
  contactSelectOptions: ContactSelectOption[]
  /** Junction rows with nested `contact` for ContactSelect display resolution */
  contactJunctionRows: unknown[]
  /** Options for shared AccountSelect */
  accountSelectOptions: AccountSelectOption[]
  /** Junction rows with nested `account` for AccountSelect display resolution */
  accountJunctionRows: unknown[]
  investmentSelectOptions: InvestmentAssociationSelectOption[]
  investmentJunctionRows: unknown[]
  loading: boolean
} {
  const accountPk = anchor?.type === 'account' ? anchor.id : undefined
  const contactPk = anchor?.type === 'contact' ? anchor.id : undefined
  const opportunityPk = anchor?.type === 'opportunity' ? anchor.id : undefined

  const { account, loading: loadingAccount } = useCustomerAccount(accessToken || '', accountPk)
  const { contact, loading: loadingContact } = useCustomerContact(accessToken || '', contactPk)
  const { opportunity, loading: loadingOpp } = useCustomerOpportunity(accessToken || '', opportunityPk)

  return useMemo(() => {
    if (!anchor) {
      return {
        contactSelectOptions: [],
        contactJunctionRows: [],
        accountSelectOptions: [],
        accountJunctionRows: [],
        investmentSelectOptions: [],
        investmentJunctionRows: [],
        loading: false
      }
    }

    if (anchor.type === 'account') {
      const raw = account?.accountContacts ?? []
      const contacts = raw.map(ac => ac.contact).filter((c): c is CustomerContact => Boolean(c?.id))
      return {
        contactSelectOptions: contacts.map(mapCustomerContactToContactSelectOption),
        contactJunctionRows: [...raw],
        accountSelectOptions: [],
        accountJunctionRows: [],
        investmentSelectOptions: [],
        investmentJunctionRows: [],
        loading: loadingAccount
      }
    }

    if (anchor.type === 'contact') {
      const rawAcct = contact?.accountContacts ?? []
      const accounts = rawAcct.map(ac => ac.account).filter((a): a is CustomerAccount => Boolean(a?.id))
      return {
        contactSelectOptions: [],
        contactJunctionRows: [],
        accountSelectOptions: accounts.map(mapCustomerAccountToAccountSelectOption),
        accountJunctionRows: [...rawAcct],
        investmentSelectOptions: [],
        investmentJunctionRows: [],
        loading: loadingContact
      }
    }

    const rawOppContacts = opportunity?.opportunityContacts ?? []
    const oppContacts = rawOppContacts.map(oc => oc.contact).filter((c): c is CustomerContact => Boolean(c?.id))
    const contactJunctionRows = rawOppContacts
      .filter(oc => oc.contact?.id)
      .map(oc => ({
        ...oc,
        contactId: oc.contactId ?? oc.contact?.id,
        contact: oc.contact
      }))

    const rawOppAccounts = opportunity?.opportunityAccounts ?? []
    const oppAccounts = rawOppAccounts.map(oa => oa.account).filter((a): a is CustomerAccount => Boolean(a?.id))
    const accountJunctionRows = rawOppAccounts
      .filter(oa => oa.account?.id)
      .map(oa => ({
        ...oa,
        accountId: oa.accountId ?? oa.account?.id,
        account: oa.account
      }))

    return {
      contactSelectOptions: oppContacts.map(mapCustomerContactToContactSelectOption),
      contactJunctionRows,
      accountSelectOptions: oppAccounts.map(mapCustomerAccountToAccountSelectOption),
      accountJunctionRows,
      investmentSelectOptions: [],
      investmentJunctionRows: [],
      loading: loadingOpp
    }
  }, [anchor, account, contact, opportunity, loadingAccount, loadingContact, loadingOpp])
}
