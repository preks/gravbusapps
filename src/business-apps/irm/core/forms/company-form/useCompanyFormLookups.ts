import { useMemo, useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useEmployeeSearch } from '@/common/data/employee/useEmployeeSearch'
import { useInvestmentCompanies } from '@/common/data/investment/hooks/useInvestmentCompanies'
import { useInvestmentCompanyGroups } from '@/common/data/investment/hooks/useInvestmentCompanyGroups'
import { useInvestmentContactsList } from '@/common/data/investment/hooks/useInvestmentContacts'
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

export const useCompanyFormLookups = (context: CompanyFormLookupContext, resolvedInvestmentCompanyId?: string) => {
  const [groupSearch, setGroupSearch] = useState('')
  const [ownerCompanySearch, setOwnerCompanySearch] = useState('')
  const employees = useEmployeeSearch(context.accessToken)
  const contacts = useInvestmentContactsList(context, { limit: 20 })
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
    groups,
    ownerCompanies,
    contactOptions,
    groupOptions,
    ownerCompanyOptions,
    setGroupSearch,
    setOwnerCompanySearch
  }
}
