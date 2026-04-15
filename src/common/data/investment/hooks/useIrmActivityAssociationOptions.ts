import { useMemo } from 'react'
import type {
  ActivityAssociationAnchor,
  InvestmentAssociationSelectOption
} from '@/common/components/common-relations/activity-association/types'
import type { SelectOption as ContactSelectOption } from '@/common/components/common-relations/selects/contact-select'
import type { SelectOption as AccountSelectOption } from '@/common/components/common-relations/selects/account-select'
import type { InvestmentAccount } from '@/common/data/investment/types/investmentAccountTypes'
import type { InvestmentContact } from '@/common/data/investment/types/investmentContactTypes'
import type { InvestmentInvestmentAccount } from '@/common/data/investment/types/investmentAccountAssociationTypes'
import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import { useInvestmentAccount } from '@/common/data/investment/hooks/useInvestmentAccount'
import { useInvestmentContact } from '@/common/data/investment/hooks/useInvestmentContact'
import { useInvestmentOpportunity } from '@/common/data/investment/hooks/useInvestmentOpportunity'
import { useInvestment } from '@/common/data/investment/hooks/useInvestment.new'

function mapInvestmentAccountToAccountSelectOption(account: InvestmentAccount): AccountSelectOption {
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
    id: account.id!,
    value: account.id!,
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

function mapInvestmentContactToContactSelectOption(contact: InvestmentContact): ContactSelectOption {
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
    (contact as { email?: string }).email ||
    'Unnamed Contact'

  return {
    id: contact.id!,
    value: contact.id!,
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

function mapInvestmentCoreToSelectOption(inv: Pick<Investment, 'id' | 'name' | 'code'> | null | undefined) {
  if (!inv?.id) {
    return null
  }
  const label = inv.name || inv.code || 'Investment'
  const opt: InvestmentAssociationSelectOption = {
    id: inv.id,
    value: inv.id,
    label,
    name: label
  }
  return opt
}

function dedupeInvestmentSelectOptions(opts: InvestmentAssociationSelectOption[]): InvestmentAssociationSelectOption[] {
  const seen = new Set<string>()
  const out: InvestmentAssociationSelectOption[] = []
  for (const o of opts) {
    if (seen.has(o.id)) {
      continue
    }
    seen.add(o.id)
    out.push(o)
  }
  return out
}

function investmentOptionsFromJunctionRows(
  rows: Array<{ investment?: Pick<Investment, 'id' | 'name' | 'code'> | null } | null | undefined>
): InvestmentAssociationSelectOption[] {
  const opts = rows
    .map(r => mapInvestmentCoreToSelectOption(r?.investment))
    .filter((o): o is InvestmentAssociationSelectOption => o !== null)
  return dedupeInvestmentSelectOptions(opts)
}

type AccountWithIrmContacts = InvestmentAccount & {
  investmentAccountContact?: Array<{ contact?: InvestmentContact | null; contactId?: string | null }>
}

function accountContactJunctionRowsFromInvestmentAccount(
  account: InvestmentAccount | null | undefined
): Array<{ contact?: InvestmentContact | null; contactId?: string | null }> {
  if (!account) {
    return []
  }
  const raw = account as AccountWithIrmContacts
  return raw.investmentAccountContact ?? raw.accountContacts ?? []
}

/**
 * Loads IRM account / contact / opportunity / investment association lists for activity secondary pickers.
 */
export function useIrmActivityAssociationOptions(
  accessToken: string | null | undefined,
  anchor: ActivityAssociationAnchor | null
): {
  contactSelectOptions: ContactSelectOption[]
  contactJunctionRows: unknown[]
  accountSelectOptions: AccountSelectOption[]
  accountJunctionRows: unknown[]
  investmentSelectOptions: InvestmentAssociationSelectOption[]
  investmentJunctionRows: unknown[]
  loading: boolean
} {
  const accountPk = anchor?.type === 'account' ? anchor.id : undefined
  const contactPk = anchor?.type === 'contact' ? anchor.id : undefined
  const opportunityPk = anchor?.type === 'opportunity' ? anchor.id : undefined
  const investmentPk = anchor?.type === 'investment' ? anchor.id : undefined

  const { account, loading: loadingAccount } = useInvestmentAccount(accessToken || '', accountPk)
  const { contact, loading: loadingContact } = useInvestmentContact(accessToken || '', contactPk)
  const { opportunity, loading: loadingOpp } = useInvestmentOpportunity(accessToken || '', opportunityPk)
  const { investment, loading: loadingInvestment } = useInvestment(
    accessToken || '',
    investmentPk,
    'irmActivityAssociation'
  )

  return useMemo(() => {
    const empty = {
      contactSelectOptions: [] as ContactSelectOption[],
      contactJunctionRows: [] as unknown[],
      accountSelectOptions: [] as AccountSelectOption[],
      accountJunctionRows: [] as unknown[],
      investmentSelectOptions: [] as InvestmentAssociationSelectOption[],
      investmentJunctionRows: [] as unknown[],
      loading: false
    }

    if (!anchor) {
      return empty
    }

    if (anchor.type === 'account') {
      const raw = account?.accountContacts ?? []
      const contacts = raw.map(ac => ac.contact).filter((c): c is InvestmentContact => Boolean(c?.id))
      const invRows = (account?.investments ?? []) as InvestmentInvestmentAccount[]
      return {
        contactSelectOptions: contacts.map(mapInvestmentContactToContactSelectOption),
        contactJunctionRows: [...raw],
        accountSelectOptions: [],
        accountJunctionRows: [],
        investmentSelectOptions: investmentOptionsFromJunctionRows(invRows),
        investmentJunctionRows: [...invRows],
        loading: loadingAccount
      }
    }

    if (anchor.type === 'contact') {
      const rawAcct = contact?.accountContacts ?? []
      const accounts = rawAcct.map(ac => ac.account).filter((a): a is InvestmentAccount => Boolean(a?.id))
      const invRows = rawAcct.flatMap(ac => {
        const acc = ac.account as InvestmentAccount | null | undefined
        return acc?.investments ?? []
      }) as InvestmentInvestmentAccount[]
      return {
        contactSelectOptions: [],
        contactJunctionRows: [],
        accountSelectOptions: accounts.map(mapInvestmentAccountToAccountSelectOption),
        accountJunctionRows: [...rawAcct],
        investmentSelectOptions: investmentOptionsFromJunctionRows(invRows),
        investmentJunctionRows: [...invRows],
        loading: loadingContact
      }
    }

    if (anchor.type === 'investment') {
      const raw = investment?.investmentAccounts ?? []
      const accounts = raw.map(ia => ia.investmentAccount).filter((a): a is InvestmentAccount => Boolean(a?.id))
      const accountJunctionRows = raw
        .filter(ia => ia.investmentAccount?.id)
        .map(ia => ({
          ...ia,
          accountId: ia.investmentAccountId ?? ia.investmentAccount?.id,
          account: ia.investmentAccount
        }))

      const contactJunctionAccum: Array<{ contact?: InvestmentContact | null; contactId?: string | null }> = []
      for (const ia of raw) {
        const acc = ia.investmentAccount
        if (!acc) {
          continue
        }
        contactJunctionAccum.push(...accountContactJunctionRowsFromInvestmentAccount(acc))
      }
      const seenContact = new Set<string>()
      const contacts: InvestmentContact[] = []
      for (const row of contactJunctionAccum) {
        const c = row.contact
        if (!c?.id || seenContact.has(c.id)) {
          continue
        }
        seenContact.add(c.id)
        contacts.push(c)
      }

      return {
        contactSelectOptions: contacts.map(mapInvestmentContactToContactSelectOption),
        contactJunctionRows: contactJunctionAccum as unknown[],
        accountSelectOptions: accounts.map(mapInvestmentAccountToAccountSelectOption),
        accountJunctionRows,
        investmentSelectOptions: [],
        investmentJunctionRows: [],
        loading: loadingInvestment
      }
    }

    const rawOppContacts = opportunity?.opportunityContacts ?? []
    const oppContacts = rawOppContacts.map(oc => oc.contact).filter((c): c is InvestmentContact => Boolean(c?.id))
    const contactJunctionRows = rawOppContacts
      .filter(oc => oc.contact?.id)
      .map(oc => ({
        ...oc,
        contactId: oc.contactId ?? oc.contact?.id,
        contact: oc.contact
      }))

    const rawOppAccounts = opportunity?.opportunityAccounts ?? []
    const oppAccounts = rawOppAccounts.map(oa => oa.account).filter((a): a is InvestmentAccount => Boolean(a?.id))
    const accountJunctionRows = rawOppAccounts
      .filter(oa => oa.account?.id)
      .map(oa => ({
        ...oa,
        accountId: oa.accountId ?? oa.account?.id,
        account: oa.account
      }))

    return {
      contactSelectOptions: oppContacts.map(mapInvestmentContactToContactSelectOption),
      contactJunctionRows,
      accountSelectOptions: oppAccounts.map(mapInvestmentAccountToAccountSelectOption),
      accountJunctionRows,
      investmentSelectOptions: [],
      investmentJunctionRows: [],
      loading: loadingOpp
    }
  }, [anchor, account, contact, opportunity, investment, loadingAccount, loadingContact, loadingOpp, loadingInvestment])
}
