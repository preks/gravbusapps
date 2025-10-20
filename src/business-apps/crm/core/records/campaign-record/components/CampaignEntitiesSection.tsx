import React, { useState, useCallback } from 'react'
import { DataContainer } from '@/components/layout/dataContainer'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCampaignEntities } from '../hooks/useCampaignEntities'
import CampaignEntitiesTable from './CampaignEntitiesTable'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { DateRangeFilter } from '@/business-apps/crm/core/apps/customer-relations/views/lead-view/components/DateRangeFilter'

export interface CampaignEntitiesSectionProps extends BusinessAppContextProps {
  campaignId: string
}

/**
 * Campaign Entities Section component that follows the exact same pattern as CampaignManagement
 */
export const CampaignEntitiesSection: React.FC<CampaignEntitiesSectionProps> = props => {
  const { campaignId } = props

  // Use the campaign entities hook
  const {
    entities,
    isLoading,
    error,
    totalCount,
    currentPage,
    pageSize,
    search,
    sortField,
    sortOrder,
    setSearch,
    setPage,
    setSorting,
    refetch
  } = useCampaignEntities(props, campaignId)

  // Local filter state
  const [selectedEntityTypes, setSelectedEntityTypes] = useState<string[]>([])
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [createdAfter, setCreatedAfter] = useState<string | undefined>()
  const [createdBefore, setCreatedBefore] = useState<string | undefined>()

  // Build dynamic owner and status options from data
  const uniqueOwners = Array.from(
    new Map(
      (entities || []).map(e => [e.owner?.id || e.owner?.displayName || '', e.owner?.displayName || 'Unassigned'])
    ).entries()
  ).filter(([id]) => Boolean(id)) as [string, string][]

  const uniqueStatuses = Array.from(new Set((entities || []).map((e: any) => (e.status?.value as string) || 'Unknown')))

  const filterGroups = [
    {
      id: 'entityTypes',
      title: getTranslationFromI18nKeyAndLabel('campaign.entities.filters.entityType', 'Entity Type'),
      filters: [
        { id: 'type:lead', label: 'Leads', selected: selectedEntityTypes.includes('lead') },
        { id: 'type:account', label: 'Accounts', selected: selectedEntityTypes.includes('account') },
        { id: 'type:contact', label: 'Contacts', selected: selectedEntityTypes.includes('contact') },
        { id: 'type:opportunity', label: 'Opportunities', selected: selectedEntityTypes.includes('opportunity') }
      ]
    },
    {
      id: 'owners',
      title: getTranslationFromI18nKeyAndLabel('campaign.entities.filters.owner', 'Owner'),
      filters: uniqueOwners.map(([id, label]) => ({
        id: `owner:${id}`,
        label,
        selected: selectedOwnerIds.includes(id)
      }))
    },
    {
      id: 'status',
      title: getTranslationFromI18nKeyAndLabel('campaign.entities.filters.status', 'Status'),
      filters: uniqueStatuses.map(s => ({ id: `status:${s}`, label: s, selected: selectedStatuses.includes(s) }))
    },
    {
      id: 'creationDate',
      title: getTranslationFromI18nKeyAndLabel('campaign.entities.filters.creationDate', 'Creation Date'),
      filters: [],
      hideSearch: true,
      customComponent: (
        <DateRangeFilter
          createdAfter={createdAfter}
          createdBefore={createdBefore}
          onDateRangeChange={(after?: string, before?: string) => {
            setCreatedAfter(after)
            setCreatedBefore(before)
          }}
        />
      )
    }
  ]

  // Create filter label map
  const filterLabelMap: Record<string, string> = {
    'type:lead': 'Leads',
    'type:account': 'Accounts',
    'type:contact': 'Contacts',
    'type:opportunity': 'Opportunities',
    ...Object.fromEntries(uniqueOwners.map(([id, label]) => [`owner:${id}`, label])),
    ...Object.fromEntries(uniqueStatuses.map(s => [`status:${s}`, s]))
  }

  // Get selected filters
  const selectedFilters = [
    ...selectedEntityTypes.map(t => `type:${t}`),
    ...selectedOwnerIds.map(id => `owner:${id}`),
    ...selectedStatuses.map(s => `status:${s}`)
  ]

  // Handle filter change
  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    if (filterId.startsWith('type:')) {
      const typeId = filterId.replace('type:', '')
      setSelectedEntityTypes(prev =>
        selected ? Array.from(new Set([...prev, typeId])) : prev.filter(t => t !== typeId)
      )
    } else if (filterId.startsWith('owner:')) {
      const ownerId = filterId.replace('owner:', '')
      setSelectedOwnerIds(prev =>
        selected ? Array.from(new Set([...prev, ownerId])) : prev.filter(o => o !== ownerId)
      )
    } else if (filterId.startsWith('status:')) {
      const status = filterId.replace('status:', '')
      setSelectedStatuses(prev => (selected ? Array.from(new Set([...prev, status])) : prev.filter(s => s !== status)))
    }
  }, [])

  // Handle set filter (for clear all)
  const handleSetFilter = useCallback((filters: string[]) => {
    setSelectedEntityTypes(filters.filter(f => f.startsWith('type:')).map(f => f.replace('type:', '')))
    setSelectedOwnerIds(filters.filter(f => f.startsWith('owner:')).map(f => f.replace('owner:', '')))
    setSelectedStatuses(filters.filter(f => f.startsWith('status:')).map(f => f.replace('status:', '')))
  }, [])

  // Handle pagination change
  const handlePaginationChange = useCallback(
    (page: number, newPageSize?: number) => {
      setPage(page)
      // Note: pageSize changes would need to be implemented in the hook if needed
    },
    [setPage]
  )

  // Handle sorting change
  const handleSortingChange = useCallback(
    (field: string, order: 'ASC' | 'DESC' | '') => {
      if (order === '') {
        setSorting(undefined, undefined)
      } else {
        setSorting(field, order)
      }
    },
    [setSorting]
  )

  // Handle table change (for compatibility)
  const handleTableChange = useCallback((pagination: any, filters: any, sorter: any) => {
    // This is called by the table for various changes
  }, [])

  // Apply client-side filtering for now
  const visibleEntities = entities.filter((e: any) => {
    const q = (search || '').trim().toLowerCase()
    if (q) {
      const typeLabel = (e.type || '').toString().toLowerCase()
      const statusLabel = (e.status?.value || '').toString().toLowerCase()
      const ownerLabel = (e.owner?.displayName || '').toString().toLowerCase()
      const nameLabel = (e.name || '').toString().toLowerCase()
      const matches =
        nameLabel.includes(q) || ownerLabel.includes(q) || typeLabel.includes(q) || statusLabel.includes(q)
      if (!matches) return false
    }
    if (selectedEntityTypes.length > 0 && !selectedEntityTypes.includes(e.type)) return false
    if (selectedOwnerIds.length > 0 && !selectedOwnerIds.includes(e.owner?.id || '')) return false
    if (selectedStatuses.length > 0) {
      const val = e.status?.value || 'Unknown'
      if (!selectedStatuses.includes(val)) return false
    }
    if (createdAfter && new Date(e.creationDate) < new Date(createdAfter)) return false
    if (createdBefore && new Date(e.creationDate) > new Date(createdBefore)) return false
    return true
  })

  return (
    <div data-testid="campaign-entities-section-content">
      <DataContainer
        dataControllerProps={{
          search,
          setSearch,
          debounceDelay: 500,
          filter: selectedFilters,
          setFilter: handleSetFilter,
          filterLabelMap,
          dateRange: {
            createdAfter,
            createdBefore,
            onClear: () => {
              setCreatedAfter(undefined)
              setCreatedBefore(undefined)
            }
          },
          listTitle: (
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span>{getTranslationFromI18nKeyAndLabel('campaign.entities.title', 'Campaign Entities')}</span>
                <span className="gba:text-gray-500">({visibleEntities.length})</span>
              </div>
            </div>
          ),
          searchPlaceholder: getTranslationFromI18nKeyAndLabel(
            'campaign.entities.search.placeholder',
            'Search entities...'
          ),
          actions: [],
          'data-testid': 'campaign-entities-data-controller'
        }}
        dataFilterProps={{
          filterGroups,
          onFilterChange: handleFilterChange
        }}
        dataBody={
          <CampaignEntitiesTable
            entities={visibleEntities}
            isLoading={isLoading}
            error={error}
            totalCount={visibleEntities.length}
            currentPage={currentPage}
            pageSize={pageSize}
            sortField={sortField || ''}
            sortOrder={sortOrder || ''}
            onTableChange={handleTableChange}
            onPaginationChange={handlePaginationChange}
            onSortingChange={handleSortingChange}
            accessToken={props.accessToken}
          />
        }
      />
    </div>
  )
}

export default CampaignEntitiesSection
