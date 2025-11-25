import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCampaignRecordQueries } from '../queries'
import { CampaignEntity, UseCampaignEntitiesReturn } from '../types'

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
  leadStatus: unknown
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
  opportunityStatus: unknown
  ownerEmployee?: EntityOwner
}

interface CampaignEntitiesResult {
  leads?: LeadEntity[]
  accounts?: AccountEntity[]
  contacts?: ContactEntity[]
  opportunities?: OpportunityEntity[]
}

export const useCampaignEntities = (
  context: BusinessAppContextProps,
  campaignId: string
): UseCampaignEntitiesReturn => {
  const [entities, setEntities] = useState<CampaignEntity[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC' | ''>('')

  const { fetchCampaignEntities } = useCampaignRecordQueries(context)

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
            owner: lead.ownerEmployee || {
              id: '',
              firstName: '',
              lastName: '',
              displayName: 'Unassigned'
            }
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
            owner: account.ownerEmployee || {
              id: '',
              firstName: '',
              lastName: '',
              displayName: 'Unassigned'
            }
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
            owner: contact.ownerEmployee || {
              id: '',
              firstName: '',
              lastName: '',
              displayName: 'Unassigned'
            }
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
            owner: opportunity.ownerEmployee || {
              id: '',
              firstName: '',
              lastName: '',
              displayName: 'Unassigned'
            }
          })
        })
      }

      // Apply client-side sorting if specified
      if (sortField && sortOrder) {
        allEntities.sort((a, b) => {
          let valueA: string | number | undefined
          let valueB: string | number | undefined

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
      // Fetch all entities (no offset/limit since we can't paginate across multiple entity types)
      const result = await fetchCampaignEntities({
        campaignId,
        search: search.trim() || undefined,
        orderBy: [{ createdAt: 'DESC' }]
      })

      // Transform and sort all entities
      const allTransformedEntities = transformEntitiesToUnified(result, sortField, sortOrder)

      // Get total count from aggregate queries
      const totalEntitiesCount =
        (result.leadsCount?.aggregate?.count || 0) +
        (result.accountsCount?.aggregate?.count || 0) +
        (result.contactsCount?.aggregate?.count || 0) +
        (result.opportunitiesCount?.aggregate?.count || 0)
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
    fetchCampaignEntities,
    transformEntitiesToUnified
    // Removed currentPage and pageSize - pagination handled client-side in DataTable
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
    if (context.accessToken && campaignId) {
      loadCampaignEntities()
    }
  }, [context.accessToken, campaignId, search, sortField, sortOrder, loadCampaignEntities])
  // Note: currentPage and pageSize removed - pagination is client-side only

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
    setSearch: handleSetSearch,
    setPage,
    setPageSize: handleSetPageSize,
    setSorting,
    refetch
  }
}
