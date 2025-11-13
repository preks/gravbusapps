import { useState, useCallback, useMemo, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

import { useGetContactAccounts } from './useGetContactAccounts'
import { useGetContactOwners } from './useGetContactOwners'
import { useGetContacts } from './useGetContacts'
import { useGetContactInfoFilters } from './useGetContactInfoFilters'
import { useGetContactTypes } from './useGetContactTypes'
import { useGetContactDepartments } from './useGetContactDepartments'

export interface FilterGroup {
  id: string
  title: string // Changed from label to title to match DataFilterGroup
  filters: Array<{ id: string; label: string; value: any; selected: boolean }>
  backendSearch?: (search: string) => {
    filters: Array<{ id: string; label: string; value: any; selected: boolean }>
    loading: boolean
    error: any
  }
}

export interface ContactFilters {
  search: string
  setSearch: (search: string) => void
  selectedFilters: string[]
  filterGroups: FilterGroup[]
  filterLabelMap: Record<string, string>
  addFilter: (filterId: string) => void
  removeFilter: (filterId: string) => void
  clearAllFilters: () => void
  getFilters: () => any
  createdAfter?: string
  createdBefore?: string
  handleDateRangeChange: (after?: string, before?: string) => void
  contactSearch: string
  setContactSearch: (search: string) => void
  accountSearch: string
  setAccountSearch: (search: string) => void
  ownerSearch: string
  setOwnerSearch: (search: string) => void
  filtersInitialized: boolean
}

export const useContactFilters = (context: BusinessAppContextProps): ContactFilters => {
  const [search, setSearch] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [createdAfter, setCreatedAfter] = useState<string | undefined>()
  const [createdBefore, setCreatedBefore] = useState<string | undefined>()
  // Search state for new filter types
  const [contactSearch, setContactSearch] = useState('')
  const [accountSearch, setAccountSearch] = useState('')
  const [ownerSearch, setOwnerSearch] = useState('')
  const [contactTypeSearch, setContactTypeSearch] = useState('')
  const [departmentSearch, setDepartmentSearch] = useState('')
  const [filtersInitialized, setFiltersInitialized] = useState(false)

  // New filter hooks
  const { contacts, isLoading: isContactsLoading, error: contactsError } = useGetContacts(context, contactSearch)

  const {
    contactAccounts,
    isLoading: isAccountsLoading,
    error: accountsError
  } = useGetContactAccounts(context, accountSearch)

  const { contactOwners, isLoading: isOwnersLoading, error: ownersError } = useGetContactOwners(context, ownerSearch)

  const { contactInfoFilters } = useGetContactInfoFilters()

  const {
    contactTypeOptions,
    isLoading: isContactTypesLoading,
    error: contactTypesError
  } = useGetContactTypes(context, contactTypeSearch)

  const {
    departmentOptions,
    isLoading: isDepartmentsLoading,
    error: departmentsError
  } = useGetContactDepartments(context, departmentSearch)

  // Note: contactInfoError is available for future use if needed

  // Initialize filters from URL parameters when all data is loaded
  useEffect(() => {
    if (
      !filtersInitialized &&
      !isContactsLoading &&
      !isAccountsLoading &&
      !isOwnersLoading &&
      !isContactTypesLoading &&
      !isDepartmentsLoading
    ) {
      setFiltersInitialized(true)
    }
  }, [
    isContactsLoading,
    isAccountsLoading,
    isOwnersLoading,
    isContactTypesLoading,
    isDepartmentsLoading,
    filtersInitialized
  ])

  // Backend search functions for new filter types
  const getContactFilters = useCallback(
    (search: string) => {
      // Don't set state during render - use setTimeout to defer it
      setTimeout(() => {
        setContactSearch(search)
      }, 0)

      return {
        filters: contacts.map(contact => ({
          id: `contact-${contact.id}`,
          label: contact.name,
          value: contact.name,
          selected: selectedFilters.includes(`contact-${contact.id}`)
        })),
        loading: isContactsLoading,
        error: contactsError
      }
    },
    [contacts, selectedFilters, isContactsLoading, contactsError]
  )

  const getAccountFilters = useCallback(
    (search: string) => {
      // Don't set state during render - use setTimeout to defer it
      setTimeout(() => {
        setAccountSearch(search)
      }, 0)

      return {
        filters: contactAccounts.map(account => ({
          id: `account-${account.id}`,
          label: account.name,
          value: account.id,
          selected: selectedFilters.includes(`account-${account.id}`)
        })),
        loading: isAccountsLoading,
        error: accountsError
      }
    },
    [contactAccounts, selectedFilters, isAccountsLoading, accountsError]
  )

  const getOwnerFilters = useCallback(
    (search: string) => {
      // Don't set state during render - use setTimeout to defer it
      setTimeout(() => {
        setOwnerSearch(search)
      }, 0)

      return {
        filters: contactOwners.map(owner => ({
          id: `owner-${owner.id}`,
          label: owner.name,
          value: owner.id,
          selected: selectedFilters.includes(`owner-${owner.id}`)
        })),
        loading: isOwnersLoading,
        error: ownersError
      }
    },
    [contactOwners, selectedFilters, isOwnersLoading, ownersError]
  )

  const getContactTypeFilters = useCallback(
    (search: string) => {
      setTimeout(() => {
        setContactTypeSearch(search)
      }, 0)
      return {
        filters: (contactTypeOptions || []).map(option => ({
          id: `contact-type-${option.name}`,
          label: option.name,
          value: option.name,
          selected: selectedFilters.includes(`contact-type-${option.name}`)
        })),
        loading: isContactTypesLoading,
        error: contactTypesError
      }
    },
    [contactTypeOptions, selectedFilters, isContactTypesLoading, contactTypesError]
  )

  const getDepartmentFilters = useCallback(
    (search: string) => {
      setTimeout(() => {
        setDepartmentSearch(search)
      }, 0)
      return {
        filters: (departmentOptions || []).map(option => ({
          id: `department-${option.name}`,
          label: option.name,
          value: option.name,
          selected: selectedFilters.includes(`department-${option.name}`)
        })),
        loading: isDepartmentsLoading,
        error: departmentsError
      }
    },
    [departmentOptions, selectedFilters, isDepartmentsLoading, departmentsError]
  )

  const filterGroups: FilterGroup[] = useMemo(
    () => [
      {
        id: 'contacts',
        title: 'Contact',
        filters: contacts.map(contact => ({
          id: `contact-${contact.id}`,
          label: contact.name,
          value: {
            firstName: contact.firstName,
            lastName: contact.lastName,
            name: contact.name
          },
          selected: selectedFilters.includes(`contact-${contact.id}`)
        })),
        backendSearch: getContactFilters
      },
      {
        id: 'contactInfo',
        title: 'Contact Info',
        filters: contactInfoFilters.map(filter => ({
          id: filter.id,
          label: filter.label,
          value: filter.value,
          selected: selectedFilters.includes(filter.id)
        }))
      },
      {
        id: 'accounts',
        title: 'Account',
        filters: contactAccounts.map(account => ({
          id: `account-${account.id}`,
          label: account.name,
          value: account.id,
          selected: selectedFilters.includes(`account-${account.id}`)
        })),
        backendSearch: getAccountFilters
      },
      {
        id: 'owners',
        title: 'Owner',
        filters: contactOwners.map(owner => ({
          id: `owner-${owner.id}`,
          label: owner.name,
          value: owner.id,
          selected: selectedFilters.includes(`owner-${owner.id}`)
        })),
        backendSearch: getOwnerFilters
      },
      {
        id: 'contactType',
        title: 'Contact Type',
        filters: (contactTypeOptions || []).map(option => ({
          id: `contact-type-${option.name}`,
          label: option.name,
          value: option.name,
          selected: selectedFilters.includes(`contact-type-${option.name}`)
        })),
        backendSearch: getContactTypeFilters
      },
      {
        id: 'departments',
        title: 'Department',
        filters: (departmentOptions || []).map(option => ({
          id: `department-${option.name}`,
          label: option.name,
          value: option.name,
          selected: selectedFilters.includes(`department-${option.name}`)
        })),
        backendSearch: getDepartmentFilters
      }
    ],
    [
      selectedFilters,
      contacts,
      contactAccounts,
      contactOwners,
      contactInfoFilters,
      contactTypeOptions,
      departmentOptions,
      getContactFilters,
      getAccountFilters,
      getOwnerFilters,
      getContactTypeFilters,
      getDepartmentFilters
    ]
  )

  const filterLabelMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {}
    for (const group of filterGroups) {
      for (const filter of group.filters) {
        map[filter.id] = filter.label
      }
    }
    return map
  }, [filterGroups])

  const addFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => {
      if (!prev.includes(filterId)) {
        return [...prev, filterId]
      }
      return prev
    })
  }, [])

  const removeFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => prev.filter(id => id !== filterId))
  }, [])

  const clearAllFilters = useCallback(() => {
    setSelectedFilters([])
  }, [])

  const handleDateRangeChange = useCallback((after?: string, before?: string) => {
    setCreatedAfter(after)
    setCreatedBefore(before)
  }, [])

  const getFilters = useCallback(() => {
    const filters: any = {}

    if (search) filters.search = search
    if (createdAfter) filters.createdAfter = createdAfter
    if (createdBefore) filters.createdBefore = createdBefore

    // Use lookup map instead of nested loops
    const groupToFilterKey: Record<string, string> = {
      contacts: 'contacts',
      contactInfo: 'contactInfo',
      accounts: 'accounts',
      owners: 'owners',
      contactType: 'contactTypes',
      departments: 'departments'
    }

    // Build filter map for O(1) lookup
    const filterMap = new Map<string, { groupId: string; value: any }>()
    for (const group of filterGroups) {
      for (const filter of group.filters) {
        filterMap.set(filter.id, { groupId: group.id, value: filter.value })
      }
    }

    // Process selected filters
    for (const filterId of selectedFilters) {
      const filterData = filterMap.get(filterId)
      if (filterData) {
        const filterKey = groupToFilterKey[filterData.groupId]
        if (filterKey) {
          if (!filters[filterKey]) filters[filterKey] = []
          filters[filterKey].push(filterData.value)
        }
      }
    }

    return filters
  }, [search, selectedFilters, createdAfter, createdBefore, filterGroups])

  return {
    search,
    setSearch,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    clearAllFilters,
    getFilters,
    createdAfter,
    createdBefore,
    handleDateRangeChange,
    contactSearch,
    setContactSearch,
    accountSearch,
    setAccountSearch,
    ownerSearch,
    setOwnerSearch,
    filtersInitialized
  }
}
