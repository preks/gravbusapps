import { useMemo, useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useEmployeeSearch } from '@/common/data/employee/useEmployeeSearch'
import { useInvestmentAccountsList } from '@/common/data/investment/hooks/useInvestmentAccounts'
import { useInvestmentCompanies } from '@/common/data/investment/hooks/useInvestmentCompanies'
import { useInvestmentCompanyGroups } from '@/common/data/investment/hooks/useInvestmentCompanyGroups'
import { useInvestmentContactsList } from '@/common/data/investment/hooks/useInvestmentContacts'
import type { SelectOption as AccountSelectOption } from '@/common/components/common-relations/selects/account-select/AccountSelect'
import type { SelectOption as ContactSelectOption } from '@/common/components/common-relations/selects/contact-select'

type CompanyFormLookupContext = Pick<BusinessAppContextProps, 'accessToken' | 'userInfo' | 'additionalData'>

const toContactOptions = (contacts: ReturnType<typeof useInvestmentContactsList>['contacts']): ContactSelectOption[] =>
  contacts
    .filter(contact => contact.id)
    .map(contact => {
      const displayName =
        contact.fullName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.id!
      const emailChannel = contact.communicationChannels?.find(
        channel =>
          channel.communicationChannel?.code === 'EMAIL' ||
          String(channel.communicationChannelRef || '').includes('EMAIL')
      )
      const phoneChannel = contact.communicationChannels?.find(
        channel =>
          channel.communicationChannel?.code === 'PHONE' ||
          String(channel.communicationChannelRef || '').includes('PHONE')
      )

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
    })

const toAccountOptions = (accounts: ReturnType<typeof useInvestmentAccountsList>['accounts']): AccountSelectOption[] =>
  accounts
    .filter(account => account.id)
    .map(account => {
      const emailChannel = account.communicationChannels?.find(
        channel =>
          channel.communicationChannel?.code === 'EMAIL' ||
          String(channel.communicationChannelRef || '').includes('EMAIL')
      )
      const phoneChannel = account.communicationChannels?.find(
        channel =>
          channel.communicationChannel?.code === 'PHONE' ||
          String(channel.communicationChannelRef || '').includes('PHONE')
      )

      return {
        id: account.id!,
        value: account.id!,
        label: account.name || account.code || account.id!,
        name: account.name || account.code || account.id!,
        pictureThumbnail: account.pictureThumbnail || undefined,
        extraInfo: {
          businessKey: account.businessKey,
          code: account.code,
          website: account.website,
          email: emailChannel?.value,
          phone: phoneChannel?.value,
          ownerEmployee: account.ownerEmployee
        }
      }
    })

export const useCompanyFormLookups = (context: CompanyFormLookupContext, resolvedInvestmentCompanyId?: string) => {
  const [groupSearch, setGroupSearch] = useState('')
  const [ownerCompanySearch, setOwnerCompanySearch] = useState('')
  const employees = useEmployeeSearch(context.accessToken)
  const contacts = useInvestmentContactsList(context, { limit: 20 })
  const accounts = useInvestmentAccountsList(context, {
    limit: 20,
    orderBy: [{ field: 'name', direction: 'ASC_NULLS_LAST' }]
  })
  const groups = useInvestmentCompanyGroups(context.accessToken || '', {
    limit: 100,
    search: groupSearch || undefined,
    orderBy: [{ field: 'name', direction: 'ASC_NULLS_LAST' }]
  })
  const ownerCompanies = useInvestmentCompanies(context.accessToken || '', {
    limit: 100,
    search: ownerCompanySearch || undefined,
    orderBy: [{ field: 'name', direction: 'ASC_NULLS_LAST' }]
  })

  const contactOptions = useMemo(() => toContactOptions(contacts.contacts), [contacts.contacts])
  const accountOptions = useMemo(() => toAccountOptions(accounts.accounts), [accounts.accounts])
  const groupOptions = useMemo(
    () => groups.groups.map(group => ({ value: group.id, label: group.name || group.id })),
    [groups.groups]
  )
  const ownerCompanyOptions = useMemo(
    () =>
      ownerCompanies.companies
        .filter(company => company.id !== resolvedInvestmentCompanyId)
        .map(company => ({ value: company.id, label: company.name || company.code || company.id })),
    [ownerCompanies.companies, resolvedInvestmentCompanyId]
  )

  return {
    employees,
    contacts,
    accounts,
    groups,
    ownerCompanies,
    contactOptions,
    accountOptions,
    groupOptions,
    ownerCompanyOptions,
    setGroupSearch,
    setOwnerCompanySearch
  }
}
