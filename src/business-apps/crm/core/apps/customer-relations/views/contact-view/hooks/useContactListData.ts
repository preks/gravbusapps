import { useState, useCallback } from 'react'
import { Contact, UseContactListDataReturn } from '../types'
import { useGetContactsData, ContactData } from '../queries/ContactQueries'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { enforceQueryLimit } from '../../../../../../common/utils/queryLimits'

interface ContactFilter {
  firstName?: string
  lastName?: string
  name?: string
}

interface UseContactListDataParams {
  search?: string
  sortField: string
  sortOrder: 'ASC' | 'DESC'
  context: BusinessAppContextProps
  sourceApp?: string
  contactTypes?: string[]
  departments?: string[]
  jobTitles?: string[]
  contacts?: ContactFilter[]
  contactInfo?: string[]
  accounts?: string[]
  owners?: string[]
  createdAfter?: string
  createdBefore?: string
}

const transformContactData = (apiContact: ContactData): Contact => {
  return {
    id: apiContact.id,
    firstName: apiContact.firstName || '',
    lastName: apiContact.lastName || '',
    email: apiContact.email || '',
    phone: apiContact.phone || '',
    pictureUrl: apiContact.pictureUrl || '',
    jobTitle: apiContact.jobTitle || '',
    department: apiContact.department || '',
    contactType: apiContact.contactType || '',
    bio: apiContact.bio || '',
    linkedinUrl: apiContact.linkedinUrl?.trim() || '',
    xingUrl: apiContact.xingUrl?.trim() || '',
    birthDate: apiContact.birthDate || '',

    academicTitle: apiContact.academicTitle
      ? {
          id: apiContact.academicTitle.id,
          value: apiContact.academicTitle.value,
          objectValue: apiContact.academicTitle.objectValue
        }
      : undefined,
    account: apiContact.account
      ? {
          id: apiContact.account.id || '',
          name: apiContact.account.name || ''
        }
      : undefined,
    accountId: apiContact.accountId || '',
    ownerEmployee: apiContact.ownerEmployee
      ? {
          id: apiContact.ownerEmployee.id,
          firstName: apiContact.ownerEmployee.firstName || '',
          lastName: apiContact.ownerEmployee.lastName || '',
          displayName:
            apiContact.ownerEmployee.displayName ||
            apiContact.ownerEmployee.fullName ||
            `${apiContact.ownerEmployee.firstName} ${apiContact.ownerEmployee.lastName}`,
          pictureThumbnail: apiContact.ownerEmployee.pictureThumbnail || undefined
        }
      : undefined,
    sourceApp: '',
    createdAt: apiContact.createdAt || '',
    updatedAt: apiContact.updatedAt || ''
  }
}

export const useContactListData = (params: UseContactListDataParams): UseContactListDataReturn => {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const { fetchContactsData } = useGetContactsData(params.context)

  const loadPage = useCallback(
    async (
      page: number,
      pageSize = 20,
      additionalFilters?: any,
      overrideSortField?: string,
      overrideSortOrder?: 'ASC' | 'DESC' | '',
      showLoading: boolean = true
    ) => {
      if (!params.context.accessToken) {
        console.warn('No access token provided for contact data loading')
        return
      }

      if (showLoading) {
        setLoading(true)
      }
      setError(null)

      try {
        // Enforce query limit to ensure optimal performance
        const safePageSize = enforceQueryLimit(pageSize)
        const offset = (page - 1) * safePageSize

        // Build where conditions
        const whereCondition: any = {
          isDeleted: { _eq: false }
        }

        const andConditions: any[] = []

        // Add search functionality
        if (params.search?.trim()) {
          const searchPattern = { _ilike: `%${params.search.trim()}%` }
          andConditions.push({
            _or: [
              { firstName: searchPattern },
              { lastName: searchPattern },
              { email: searchPattern },
              { phone: searchPattern },
              { jobTitle: searchPattern },
              { department: searchPattern }, // Added: displayed in department
              { linkedinUrl: searchPattern }, // Added: displayed in contact info
              { xingUrl: searchPattern }, // Added: displayed in contact info
              { contactType: searchPattern },
              { academicTitle: { value: searchPattern } }, // Added: displayed in contact name
              { account: { name: searchPattern } },
              { ownerEmployee: { firstName: searchPattern } },
              { ownerEmployee: { lastName: searchPattern } },
              { ownerEmployee: { displayName: searchPattern } } // Added: displayed in owner
            ]
          })
        }

        // Add contact type filtering
        if (params.contactTypes && params.contactTypes.length > 0) {
          andConditions.push({ contactType: { _in: params.contactTypes } })
        }

        // Add department filtering
        if (params.departments && params.departments.length > 0) {
          andConditions.push({ department: { _in: params.departments } })
        }

        // Add job title filtering
        if (params.jobTitles && params.jobTitles.length > 0) {
          andConditions.push({ jobTitle: { _in: params.jobTitles } })
        }

        // Add contact filtering (by name)
        if (params.contacts && params.contacts.length > 0) {
          const contactNameConditions: any[] = []

          params.contacts.forEach(contactFilter => {
            if (contactFilter.firstName && contactFilter.lastName) {
              // Filter by exact first and last name combination
              contactNameConditions.push({
                _and: [{ firstName: { _eq: contactFilter.firstName } }, { lastName: { _eq: contactFilter.lastName } }]
              })
            } else {
              // Fallback: filter by display name if individual names not available
              const name =
                contactFilter.name || `${contactFilter.firstName || ''} ${contactFilter.lastName || ''}`.trim()
              if (name) {
                contactNameConditions.push({
                  _or: [{ firstName: { _ilike: `%${name}%` } }, { lastName: { _ilike: `%${name}%` } }]
                })
              }
            }
          })

          if (contactNameConditions.length > 0) {
            andConditions.push({ _or: contactNameConditions })
          }
        }

        // Add contact info filtering
        if (params.contactInfo && params.contactInfo.length > 0) {
          const contactInfoConditions: any[] = []

          params.contactInfo.forEach(filter => {
            switch (filter) {
              case 'HAS_EMAIL':
                contactInfoConditions.push({
                  email: { _isNull: false, _neq: '' }
                })
                break
              case 'HAS_PHONE':
                contactInfoConditions.push({
                  phone: { _isNull: false, _neq: '' }
                })
                break
              case 'HAS_LINKEDIN':
                contactInfoConditions.push({
                  linkedinUrl: { _isNull: false, _neq: '' }
                })
                break
              case 'HAS_XING':
                contactInfoConditions.push({
                  xingUrl: { _isNull: false, _neq: '' }
                })
                break
              case 'HAS_JOB_TITLE':
                contactInfoConditions.push({
                  jobTitle: { _isNull: false, _neq: '' }
                })
                break
              case 'MISSING_EMAIL':
                contactInfoConditions.push({
                  _or: [{ email: { _isNull: true } }, { email: { _eq: '' } }]
                })
                break
              case 'MISSING_PHONE':
                contactInfoConditions.push({
                  _or: [{ phone: { _isNull: true } }, { phone: { _eq: '' } }]
                })
                break
            }
          })

          if (contactInfoConditions.length > 0) {
            andConditions.push({ _or: contactInfoConditions })
          }
        }

        // Add account filtering
        if (params.accounts && params.accounts.length > 0) {
          andConditions.push({ accountId: { _in: params.accounts } })
        }

        // Add owner filtering
        if (params.owners && params.owners.length > 0) {
          andConditions.push({ ownerEmployeeId: { _in: params.owners } })
        }

        // Add date filtering
        const dateCondition: any = {}
        if (params.createdAfter) {
          dateCondition._gte = params.createdAfter
        }
        if (params.createdBefore) {
          dateCondition._lte = params.createdBefore
        }
        if (Object.keys(dateCondition).length > 0) {
          andConditions.push({ createdAt: dateCondition })
        }

        // Apply all conditions
        if (andConditions.length > 0) {
          whereCondition._and = andConditions
        }

        // Build order by condition - handle both override and regular sorting
        const orderBy: any = {}
        if (overrideSortField && overrideSortField !== '') {
          if (overrideSortField === 'firstName' || overrideSortField === 'lastName') {
            // Sort by lastName first, then firstName for consistent name sorting
            orderBy.lastName = overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
            orderBy.firstName = overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (overrideSortField === 'accountId') {
            orderBy.account = {
              name: overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
            }
          } else if (overrideSortField === 'email') {
            orderBy.email = overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (overrideSortField === 'createdAt') {
            orderBy.createdAt = overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (overrideSortField === 'ownerEmployeeId') {
            orderBy.ownerEmployee = {
              displayName: overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
            }
          } else if (overrideSortField === 'linkedinUrl') {
            orderBy.linkedinUrl = overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (overrideSortField === 'xingUrl') {
            orderBy.xingUrl = overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (overrideSortField === 'jobTitle') {
            orderBy.jobTitle = overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (overrideSortField === 'department') {
            orderBy.department = overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (overrideSortField === 'contactType') {
            orderBy.contactType = overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (overrideSortField === 'academicTitle') {
            orderBy.academicTitle = {
              value: overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
            }
          } else if (overrideSortField === 'birthDate') {
            orderBy.birthDate = overrideSortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          }
        } else if (params.sortField && params.sortField !== '' && params.sortOrder) {
          if (params.sortField === 'firstName' || params.sortField === 'lastName') {
            // Sort by lastName first, then firstName for consistent name sorting
            orderBy.lastName = params.sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
            orderBy.firstName = params.sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (params.sortField === 'accountId') {
            orderBy.account = {
              name: params.sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
            }
          } else if (params.sortField === 'email') {
            orderBy.email = params.sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (params.sortField === 'jobTitle') {
            orderBy.jobTitle = params.sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (params.sortField === 'createdAt') {
            orderBy.createdAt = params.sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (params.sortField === 'ownerEmployeeId') {
            orderBy.ownerEmployee = {
              displayName: params.sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
            }
          } else if (params.sortField === 'linkedinUrl') {
            orderBy.linkedinUrl = params.sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (params.sortField === 'xingUrl') {
            orderBy.xingUrl = params.sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (params.sortField === 'department') {
            orderBy.department = params.sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (params.sortField === 'contactType') {
            orderBy.contactType = params.sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          } else if (params.sortField === 'academicTitle') {
            orderBy.academicTitle = {
              value: params.sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
            }
          } else if (params.sortField === 'birthDate') {
            orderBy.birthDate = params.sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          }
        }

        const result = await fetchContactsData({
          offset,
          limit: safePageSize,
          where: whereCondition,
          orderBy: Object.keys(orderBy).length > 0 ? [orderBy] : [{ createdAt: 'DESC_NULLS_LAST' }]
        })

        if (result?.Contact) {
          const transformedContacts = result.Contact.map(transformContactData)
          setContacts(transformedContacts)

          const totalCount = result.ContactAggregate?.aggregate?.count || 0
          setTotal(totalCount)
          setCurrentPage(page)
          setPageSize(safePageSize)
          setHasMore(offset + safePageSize < totalCount)
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load contacts'))
        console.error('Error loading contacts:', err)
      } finally {
        setLoading(false)
      }
    },
    [
      fetchContactsData,
      params.search,
      params.sortField,
      params.sortOrder,
      JSON.stringify(params.contactTypes),
      JSON.stringify(params.jobTitles),
      JSON.stringify(params.contacts),
      JSON.stringify(params.contactInfo),
      JSON.stringify(params.accounts),
      JSON.stringify(params.owners),
      params.createdAfter,
      params.createdBefore,
      params.context.accessToken
    ]
  )

  const loadMore = useCallback(() => {
    console.log('Load more contacts requested')
    // Implementation for infinite scroll if needed
  }, [])

  const retry = useCallback(() => {
    console.log('Retrying contact data load')
    loadPage(currentPage, pageSize)
  }, [currentPage, pageSize, loadPage])

  return {
    contacts,
    total,
    loading,
    error,
    hasMore,
    loadMore,
    loadPage,
    retry
  }
}
