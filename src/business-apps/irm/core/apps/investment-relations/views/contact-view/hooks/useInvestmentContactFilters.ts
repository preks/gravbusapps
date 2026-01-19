import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { DataFilterGroup, DataFilter } from '@/components/data-filter/DataFilter'
import { DateRangeFilter } from '@/business-apps/crm/core/apps/customer-relations/views/lead-view/components/DateRangeFilter'

interface SimpleItem {
  id: string
  label: string
}
interface AccountItem {
  id: string
  name: string
}

export const useInvestmentContactFilters = (
  context: BusinessAppContextProps,
  selectedFilters: string[],
  setSelectedFilters: (filters: string[]) => void
) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  // Filters initialization state
  const [filtersInitialized, setFiltersInitialized] = useState(false)

  // Distinct option states (old CRM contact-list parity)
  const [owners, setOwners] = useState<SimpleItem[]>([])
  const [contacts, setContacts] = useState<SimpleItem[]>([])
  const [accounts, setAccounts] = useState<AccountItem[]>([])
  const [contactTypes, setContactTypes] = useState<string[]>([])
  const [departments, setDepartments] = useState<string[]>([])

  const [loading, setLoading] = useState({
    owners: false,
    contacts: false,
    accounts: false,
    types: false,
    departments: false
  })
  const [errors, setErrors] = useState<{ [k: string]: Error | null }>({})

  // Birth date range filter state
  const [birthDateAfter, setBirthDateAfter] = useState<string | undefined>(undefined)
  const [birthDateBefore, setBirthDateBefore] = useState<string | undefined>(undefined)

  const loadDistinct = useCallback(
    async (key: string, search: string = '') => {
      if (!context.accessToken) return
      const setL = (k: keyof typeof loading, v: boolean) => setLoading(prev => ({ ...prev, [k]: v }))
      const setE = (k: string, e: Error | null) => setErrors(prev => ({ ...prev, [k]: e }))
      try {
        switch (key) {
          case 'owners':
            setL('owners', true)
            setE('owners', null)
            const ownersRes = await graphqlClient.request<{
              InvestmentContact: Array<{
                ownerEmployee: { id: string; displayName?: string; firstName?: string; lastName?: string } | null
              }>
            }>(`
            query GetContactOwners {
              InvestmentContact(
                where: { isDeleted: { _eq: false }, ownerEmployee: { id: { _isNull: false } ${search.trim() ? `, _or: [ { firstName: { _ilike: "%${search}%" } }, { lastName: { _ilike: "%${search}%" } }, { displayName: { _ilike: "%${search}%" } } ]` : ''} } }
                distinctOn: [ownerEmployeeId]
                limit: 50
              ) {
                ownerEmployee { id displayName firstName lastName }
              }
            }
          `)
            setOwners(
              (ownersRes.InvestmentContact || [])
                .filter(r => r.ownerEmployee)
                .map(r => {
                  const e = r.ownerEmployee!
                  const label = e.displayName || `${e.firstName || ''} ${e.lastName || ''}`.trim() || 'Unknown'
                  return { id: e.id, label }
                })
            )
            setL('owners', false)
            break
          case 'contacts':
            setL('contacts', true)
            setE('contacts', null)
            const contactsRes = await graphqlClient.request<{ InvestmentContact: Array<{ fullName?: string }> }>(`
            query GetContactsFullNames {
              InvestmentContact(
                where: { isDeleted: { _eq: false } ${search.trim() ? `, fullName: { _ilike: "%${search}%" }` : ''} }
                limit: 100
              ) { fullName }
            }
          `)
            const contactNames = new Set<string>()
            ;(contactsRes.InvestmentContact || []).forEach(c => {
              if (c.fullName) contactNames.add(c.fullName)
            })
            setContacts(Array.from(contactNames).map(n => ({ id: n, label: n })))
            setL('contacts', false)
            break
          case 'accounts':
            setL('accounts', true)
            setE('accounts', null)
            const accountsRes = await graphqlClient.request<{
              InvestmentContact: Array<{ investmentAccountContact: Array<{ account?: { id: string; name: string } }> }>
            }>(`
            query GetAccountsForContacts {
              InvestmentContact(
                where: { isDeleted: { _eq: false } }
                limit: 100
              ) {
                investmentAccountContact { account { id name } }
              }
            }
          `)
            const accMap = new Map<string, string>()
            ;(accountsRes.InvestmentContact || []).forEach(r => {
              ;(r.investmentAccountContact || []).forEach(rel => {
                const a = rel.account
                if (a?.id) accMap.set(a.id, a.name)
              })
            })
            setAccounts(Array.from(accMap.entries()).map(([id, name]) => ({ id, name })))
            setL('accounts', false)
            break
          case 'types':
            setL('types', true)
            setE('types', null)
            const typesRes = await graphqlClient.request<{ InvestmentContact: Array<{ type?: string }> }>(`
            query GetContactTypesDistinct {
              InvestmentContact(
                where: { isDeleted: { _eq: false } }
                limit: 200
              ) { type }
            }
          `)
            const typeSet = new Set<string>()
            ;(typesRes.InvestmentContact || []).forEach(r => {
              if (r.type) typeSet.add(r.type)
            })
            setContactTypes(Array.from(typeSet))
            setL('types', false)
            break
          case 'departments':
            setL('departments', true)
            setE('departments', null)
            const depRes = await graphqlClient.request<{ InvestmentContact: Array<{ department?: string }> }>(`
            query GetDepartmentsDistinct {
              InvestmentContact(
                where: { isDeleted: { _eq: false } }
                limit: 200
              ) { department }
            }
          `)
            const depSet = new Set<string>()
            ;(depRes.InvestmentContact || []).forEach(r => {
              if (r.department) depSet.add(r.department)
            })
            setDepartments(Array.from(depSet))
            setL('departments', false)
            break
        }
      } catch (e) {
        setE(key, e as Error)
        setL(key as any, false)
      }
    },
    [context.accessToken, graphqlClient]
  )

  useEffect(() => {
    loadDistinct('owners')
    loadDistinct('contacts')
    loadDistinct('accounts')
    loadDistinct('types')
    loadDistinct('departments')
  }, [loadDistinct])

  // Track when all initial filter loading is complete
  useEffect(() => {
    const anyLoading = loading.owners || loading.contacts || loading.accounts || loading.types || loading.departments

    setFiltersInitialized(!anyLoading)
  }, [loading])

  const filterLabelMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {}
    owners.forEach(o => {
      map[`owner:${o.id}`] = o.label
    })
    contacts.forEach(c => {
      map[`contact:${c.id}`] = c.label
    })
    accounts.forEach(a => {
      map[`account:${a.id}`] = a.name
    })
    contactTypes.forEach(t => {
      map[`type:${t}`] = t
    })
    departments.forEach(d => {
      map[`department:${d}`] = d
    })
    map['info:HAS_EMAIL'] = 'Has email'
    map['info:MISSING_EMAIL'] = 'Missing email'
    map['info:HAS_PHONE'] = 'Has phone'
    map['info:MISSING_PHONE'] = 'Missing phone'
    return map
  }, [owners, contacts, accounts, contactTypes, departments])

  const toFilters = useCallback(
    (items: SimpleItem[], prefix: string): DataFilter[] => {
      return items.map(i => ({
        id: `${prefix}:${i.id}`,
        label: i.label,
        selected: selectedFilters.includes(`${prefix}:${i.id}`)
      }))
    },
    [selectedFilters]
  )

  const filterGroups: DataFilterGroup[] = useMemo(
    () => [
      {
        id: 'owners',
        title: 'Owner',
        filters: toFilters(owners, 'owner'),
        backendSearch: () => ({ filters: toFilters(owners, 'owner'), loading: loading.owners, error: errors.owners })
      },
      {
        id: 'contacts',
        title: 'Contact',
        filters: toFilters(contacts, 'contact'),
        backendSearch: () => ({
          filters: toFilters(contacts, 'contact'),
          loading: loading.contacts,
          error: errors.contacts
        })
      },
      {
        id: 'communicationChannels',
        title: 'Contact Info',
        filters: [
          { id: 'info:HAS_EMAIL', label: 'Has email', selected: selectedFilters.includes('info:HAS_EMAIL') },
          {
            id: 'info:MISSING_EMAIL',
            label: 'Missing email',
            selected: selectedFilters.includes('info:MISSING_EMAIL')
          },
          { id: 'info:HAS_PHONE', label: 'Has phone', selected: selectedFilters.includes('info:HAS_PHONE') },
          { id: 'info:MISSING_PHONE', label: 'Missing phone', selected: selectedFilters.includes('info:MISSING_PHONE') }
        ]
      },
      {
        id: 'accounts',
        title: 'Account',
        filters: accounts.map(a => ({
          id: `account:${a.id}`,
          label: a.name,
          selected: selectedFilters.includes(`account:${a.id}`)
        })),
        backendSearch: () => ({
          filters: accounts.map(a => ({
            id: `account:${a.id}`,
            label: a.name,
            selected: selectedFilters.includes(`account:${a.id}`)
          })),
          loading: loading.accounts,
          error: errors.accounts
        })
      },
      {
        id: 'contactType',
        title: 'Contact Type',
        filters: contactTypes.map(t => ({
          id: `type:${t}`,
          label: t,
          selected: selectedFilters.includes(`type:${t}`)
        })),
        backendSearch: () => ({
          filters: contactTypes.map(t => ({
            id: `type:${t}`,
            label: t,
            selected: selectedFilters.includes(`type:${t}`)
          })),
          loading: loading.types,
          error: errors.types
        })
      },
      {
        id: 'departments',
        title: 'Department',
        filters: departments.map(d => ({
          id: `department:${d}`,
          label: d,
          selected: selectedFilters.includes(`department:${d}`)
        })),
        backendSearch: () => ({
          filters: departments.map(d => ({
            id: `department:${d}`,
            label: d,
            selected: selectedFilters.includes(`department:${d}`)
          })),
          loading: loading.departments,
          error: errors.departments
        })
      },
      {
        id: 'birthDate',
        title: 'Birth Date',
        customComponent: React.createElement(DateRangeFilter as any, {
          createdAfter: birthDateAfter,
          createdBefore: birthDateBefore,
          onDateRangeChange: (after?: string, before?: string) => {
            setBirthDateAfter(after)
            setBirthDateBefore(before)
          },
          className: 'gba:border-0 gba:shadow-none gba:p-0 gba:bg-transparent'
        }),
        hideSearch: true
      }
    ],
    [
      owners,
      contacts,
      accounts,
      contactTypes,
      departments,
      loading,
      errors,
      toFilters,
      birthDateAfter,
      birthDateBefore,
      selectedFilters
    ]
  )

  const handleFilterChange = useCallback(
    (filterId: string, selected: boolean) => {
      setSelectedFilters(selected ? [...selectedFilters, filterId] : selectedFilters.filter(f => f !== filterId))
    },
    [selectedFilters, setSelectedFilters]
  )

  return { filterGroups, filterLabelMap, handleFilterChange, birthDateAfter, birthDateBefore, filtersInitialized }
}
