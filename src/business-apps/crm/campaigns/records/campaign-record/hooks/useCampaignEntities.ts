import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCampaignRecordQueries } from '../queries'
import { CampaignEntity, CampaignEntityOwner, CampaignEntityType, UseCampaignEntitiesReturn } from '../types'
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'

// Types for GraphQL response entities
interface EntityOwner {
  id: string
  firstName?: string
  lastName?: string
  displayName: string
}

interface LeadEntity {
  id: string
  firstName?: string
  lastName?: string
  createdAt: string
  leadStatus?: { value: string; code?: string }
  ownerEmployee?: EntityOwner
}

interface AccountEntity {
  id: string
  name: string
  createdAt: string
  ownerEmployee?: EntityOwner
}

interface ContactEntity {
  id: string
  firstName?: string
  lastName?: string
  createdAt: string
  ownerEmployee?: EntityOwner
}

interface OpportunityEntity {
  id: string
  name: string
  createdAt: string
  estimatedAmount?: number
  opportunityStatus?: { value: string; code?: string }
  ownerEmployee?: EntityOwner
}

interface AggregateCountEntity {
  aggregate?: {
    count?: number
  }
}

interface CampaignEntitiesResult {
  leads?: LeadEntity[]
  accounts?: AccountEntity[]
  contacts?: ContactEntity[]
  opportunities?: OpportunityEntity[]
  leadsCount?: AggregateCountEntity
  accountsCount?: AggregateCountEntity
  contactsCount?: AggregateCountEntity
  opportunitiesCount?: AggregateCountEntity
}

interface UseCampaignEntitiesOptions {
  enabled?: boolean
}

const normalizeOwner = (owner?: EntityOwner): CampaignEntityOwner => {
  if (!owner) {
    return {
      id: '',
      firstName: '',
      lastName: '',
      displayName: 'Unassigned'
    }
  }

  return {
    id: owner.id || '',
    firstName: owner.firstName || '',
    lastName: owner.lastName || '',
    displayName: owner.displayName || [owner.firstName, owner.lastName].filter(Boolean).join(' ') || 'Unassigned'
  }
}

const normalizeStatusCode = (rawStatus: string): string => {
  const trimmedValue = rawStatus.trim()
  if (!trimmedValue) {
    return ''
  }

  if (trimmedValue.includes(':')) {
    const refParts = trimmedValue.split(':')
    return refParts[refParts.length - 1].toUpperCase()
  }

  return trimmedValue.toUpperCase()
}

const normalizeStatusFilters = (statusFilters: unknown): string[] | undefined => {
  if (!Array.isArray(statusFilters)) {
    return undefined
  }

  const normalizedCodes = statusFilters.map(String).map(normalizeStatusCode).filter(Boolean)

  return normalizedCodes.length > 0 ? Array.from(new Set(normalizedCodes)) : undefined
}

const getEntityTypeTotalCount = (result: CampaignEntitiesResult, entityType: CampaignEntityType): number => {
  if (entityType === 'lead') {
    return result.leadsCount?.aggregate?.count || 0
  }

  if (entityType === 'account') {
    return result.accountsCount?.aggregate?.count || 0
  }

  if (entityType === 'contact') {
    return result.contactsCount?.aggregate?.count || 0
  }

  return result.opportunitiesCount?.aggregate?.count || 0
}

export const useCampaignEntities = (
  context: BusinessAppContextProps,
  campaignId: string,
  options: UseCampaignEntitiesOptions = {}
): UseCampaignEntitiesReturn => {
  const { enabled = true } = options
  const [entities, setEntities] = useState<CampaignEntity[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC' | ''>('')
  const [activeEntityType, setActiveEntityType] = useState<CampaignEntityType>('lead')
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({})
  const [accountReferenceIds, setAccountReferenceIds] = useState<string[]>([])
  const [accountReferencesInitialized, setAccountReferencesInitialized] = useState(true)

  const { fetchCampaignEntities, fetchCampaignRecord } = useCampaignRecordQueries(context)

  const transformEntitiesToUnified = useCallback(
    (result: CampaignEntitiesResult, sortField?: string, sortOrder?: 'ASC' | 'DESC' | ''): CampaignEntity[] => {
      const allEntities: CampaignEntity[] = []

      // Transform leads
      if (result.leads) {
        result.leads.forEach(lead => {
          allEntities.push({
            id: lead.id,
            name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
            type: 'lead',
            creationDate: lead.createdAt,
            firstName: lead.firstName,
            lastName: lead.lastName,
            status: lead.leadStatus,
            owner: normalizeOwner(lead.ownerEmployee)
          })
        })
      }

      // Transform accounts
      if (result.accounts) {
        result.accounts.forEach(account => {
          allEntities.push({
            id: account.id,
            name: account.name,
            type: 'account',
            creationDate: account.createdAt,
            owner: normalizeOwner(account.ownerEmployee)
          })
        })
      }

      // Transform contacts
      if (result.contacts) {
        result.contacts.forEach(contact => {
          allEntities.push({
            id: contact.id,
            name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
            type: 'contact',
            creationDate: contact.createdAt,
            firstName: contact.firstName,
            lastName: contact.lastName,
            owner: normalizeOwner(contact.ownerEmployee)
          })
        })
      }

      // Transform opportunities
      if (result.opportunities) {
        result.opportunities.forEach(opportunity => {
          allEntities.push({
            id: opportunity.id,
            name: opportunity.name,
            type: 'opportunity',
            creationDate: opportunity.createdAt,
            status: opportunity.opportunityStatus,
            owner: normalizeOwner(opportunity.ownerEmployee)
          })
        })
      }

      // Apply client-side sorting if specified
      if (sortField && sortOrder) {
        allEntities.sort((a, b) => {
          let valueA: string | number = ''
          let valueB: string | number = ''

          switch (sortField) {
            case 'name':
              valueA = a.name?.toLowerCase() || ''
              valueB = b.name?.toLowerCase() || ''
              break
            case 'type':
              valueA = a.type || ''
              valueB = b.type || ''
              break
            case 'ownerEmployeeId':
            case 'owner':
              valueA = a.owner?.displayName?.toLowerCase() || ''
              valueB = b.owner?.displayName?.toLowerCase() || ''
              break
            case 'status':
              valueA = (a as any).status?.value?.toLowerCase?.() || ''
              valueB = (b as any).status?.value?.toLowerCase?.() || ''
              break
            case 'createdAt':
            case 'creationDate':
            default:
              // Default to sorting by creation date
              valueA = new Date(a.creationDate).getTime()
              valueB = new Date(b.creationDate).getTime()
          }

          if (valueA < valueB) return sortOrder === 'ASC' ? -1 : 1
          if (valueA > valueB) return sortOrder === 'ASC' ? 1 : -1
          return 0
        })
      } else {
        // Default sort by creation date (newest first)
        allEntities.sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime())
      }

      return allEntities
    },
    []
  )

  const loadCampaignEntities = useCallback(async () => {
    if (!context.accessToken || !campaignId) {
      setError('No access token or campaign ID available')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      if (activeEntityType === 'account' && !accountReferencesInitialized) {
        return
      }

      const normalizedCreatedAtRange = normalizeDateRange(selectedFilters.createdAt ?? selectedFilters.createdAtRange)
      const normalizedStatuses = normalizeStatusFilters(selectedFilters.status)

      // Fetch all entities (no offset/limit since we can't paginate across multiple entity types)
      const result = await fetchCampaignEntities({
        campaignId,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        search: search.trim() || undefined,
        types: [activeEntityType],
        accountReferenceIds: accountReferenceIds.length > 0 ? accountReferenceIds : undefined,
        statuses: normalizedStatuses,
        createdAtFrom: normalizedCreatedAtRange?.from || undefined,
        createdAtTo: normalizedCreatedAtRange?.to || undefined,
        orderBy: [{ createdAt: 'DESC' }]
      })

      // Transform and sort all entities
      const allTransformedEntities = transformEntitiesToUnified(result, sortField, sortOrder)

      // Get total count from aggregate queries
      const totalEntitiesCount = getEntityTypeTotalCount(result, activeEntityType)
      setTotalCount(totalEntitiesCount)

      // Return ALL entities - let DataTable handle pagination client-side
      setEntities(allTransformedEntities)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setEntities([])
      setTotalCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [
    context.accessToken,
    campaignId,
    search,
    sortField,
    sortOrder,
    activeEntityType,
    accountReferencesInitialized,
    selectedFilters,
    accountReferenceIds,
    fetchCampaignEntities,
    transformEntitiesToUnified,
    currentPage,
    pageSize
  ])

  const setPage = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  const handleSetPageSize = useCallback((newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1) // Reset to first page when changing page size
  }, [])

  const handleSetSearch = useCallback((searchTerm: string) => {
    setSearch(searchTerm)
    setCurrentPage(1) // Reset to first page when searching
  }, [])

  const handleSetFilters = useCallback((filters: Record<string, any>) => {
    setSelectedFilters(filters)
    setCurrentPage(1) // Reset to first page when filtering
  }, [])

  const handleSetActiveEntityType = useCallback((entityType: CampaignEntityType) => {
    setActiveEntityType(entityType)
    setCurrentPage(1)
  }, [])

  const refetch = useCallback(() => {
    loadCampaignEntities()
  }, [loadCampaignEntities])

  // Add sorting handlers
  const setSorting = useCallback((field?: string, order?: 'ASC' | 'DESC') => {
    setSortField(field || '')
    setSortOrder(order || '')
    setCurrentPage(1) // Reset to first page when sorting
  }, [])

  useEffect(() => {
    const loadCampaignReferences = async () => {
      if (!context.accessToken || !campaignId) {
        return
      }
      if (activeEntityType !== 'account') {
        if (!accountReferencesInitialized) {
          setAccountReferencesInitialized(true)
        }
        return
      }

      try {
        setAccountReferencesInitialized(false)
        const result = await fetchCampaignRecord({ campaignId })
        const campaignData = result.SalesCampaign?.[0]
        if (!campaignData) {
          setAccountReferenceIds([])
          setAccountReferencesInitialized(true)
          return
        }

        const references = (campaignData.customerCampaignAccounts ?? [])
          .map(item => item.customerAccountId)
          .filter((id): id is string => Boolean(id))
        setAccountReferenceIds(references)
        setAccountReferencesInitialized(true)
      } catch {
        setAccountReferenceIds([])
        setAccountReferencesInitialized(true)
      }
    }

    loadCampaignReferences().catch(() => undefined)
  }, [activeEntityType, context.accessToken, campaignId, fetchCampaignRecord])

  useEffect(() => {
    if (enabled && context.accessToken && campaignId) {
      loadCampaignEntities()
    }
  }, [
    enabled,
    context.accessToken,
    campaignId,
    search,
    sortField,
    sortOrder,
    currentPage,
    pageSize,
    loadCampaignEntities
  ])

  return {
    entities,
    totalCount,
    isLoading,
    error,
    currentPage,
    pageSize,
    search,
    sortField,
    sortOrder,
    activeEntityType,
    setSearch: handleSetSearch,
    setFilters: handleSetFilters,
    setActiveEntityType: handleSetActiveEntityType,
    setPage,
    setPageSize: handleSetPageSize,
    setSorting,
    refetch
  }
}
