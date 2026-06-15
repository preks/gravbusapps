import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Input,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Spinner,
  ScrollArea
} from '@newwork/nw-design-system'
import {
  UserIcon,
  BuildingIcon,
  TargetIcon,
  HandshakeIcon,
  MagnifyingGlassIcon,
  UserCircleIcon
} from '@phosphor-icons/react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { ActivityViewFilter } from '../../../types'
import { getEmployeeAvatarSrc } from '../../utils/avatarUtils'

interface EntitySelectorOverlayProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityType: ActivityViewFilter
  accessToken: string
  onSelect: (entityId: string, entityName: string) => void
}

interface EntityItem {
  id: string
  name: string
  subtitle?: string
  avatar?: string
}

// Number of records fetched per page (initial load + each infinite-scroll step)
const PAGE_SIZE = 20

// Entity configurations
const getEntityConfig = (type: ActivityViewFilter) => {
  switch (type) {
    case 'by-employee':
      return {
        title: 'Select Employee',
        description: 'Choose an employee to view their activities',
        icon: <UserIcon className="gba:w-6 gba:h-6" />,
        placeholder: 'Search employees...',
        color: 'gba:bg-primary/10 gba:text-primary'
      }
    case 'by-account':
      return {
        title: 'Select Account',
        description: 'Choose an account to view related activities',
        icon: <BuildingIcon className="gba:w-6 gba:h-6" />,
        placeholder: 'Search accounts...',
        color: 'gba:bg-accent/10 gba:text-accent-foreground'
      }
    case 'by-contact':
      return {
        title: 'Select Contact',
        description: 'Choose a contact to view their touchpoints',
        icon: <UserCircleIcon className="gba:w-6 gba:h-6" />,
        placeholder: 'Search contacts...',
        color: 'gba:bg-muted gba:text-muted-foreground'
      }
    case 'by-lead':
      return {
        title: 'Select Lead',
        description: 'Choose a lead to view engagement activities',
        icon: <TargetIcon className="gba:w-6 gba:h-6" />,
        placeholder: 'Search leads...',
        color: 'gba:bg-secondary/10 gba:text-secondary-foreground'
      }
    case 'by-opportunity':
      return {
        title: 'Select Opportunity',
        description: 'Choose an opportunity to view opportunity activities',
        icon: <HandshakeIcon className="gba:w-6 gba:h-6" />,
        placeholder: 'Search opportunities...',
        color: 'gba:bg-accent/10 gba:text-accent-foreground'
      }
    default:
      return {
        title: 'Select Entity',
        description: 'Choose an entity',
        icon: <UserIcon className="gba:w-6 gba:h-6" />,
        placeholder: 'Search...',
        color: 'gba:bg-primary/10 gba:text-primary'
      }
  }
}

// GraphQL queries for each entity type - use correct entity names (Account, Contact, Lead, Opportunity)
const buildQuery = (type: ActivityViewFilter, search?: string) => {
  // Sales Associate capability name for filtering (consistent with Sales Performance module)
  const SALES_ASSOCIATE_CAPABILITY = 'Sales Associate'

  // Only list entities that actually have at least one Sales-Associate activity,
  // so the picker matches the "By X" counts shown on the explore chips.
  const hasSalesAssociateActivity = `activities: {
    ownerEmployee: {
      employeePosition: {
        employeeCapabilities: {
          capability: {
            name: { _eq: "${SALES_ASSOCIATE_CAPABILITY}" }
          }
        }
      }
    }
  }`

  switch (type) {
    case 'by-employee':
      return search?.trim()
        ? `
        query GetEmployeesSearch($limit: Int, $offset: Int) {
          Employee(
            where: {
              _and: [
                { isDeleted: { _eq: false } }
                {
                  employeePosition: {
                    employeeCapabilities: {
                      capability: {
                        name: { _eq: "${SALES_ASSOCIATE_CAPABILITY}" }
                      }
                    }
                  }
                }
                { _or: [
                  { fullName: { _ilike: "%${search}%" } }
                  { firstName: { _ilike: "%${search}%" } }
                  { lastName: { _ilike: "%${search}%" } }
                ] }
              ]
            }
            limit: $limit
            offset: $offset
            orderBy: { fullName: ASC_NULLS_LAST }
          ) {
            id
            firstName
            lastName
            displayName
            fullName
            pictureThumbnail
            employeePosition {
              jobPosition { name }
              organizationalUnit { name }
            }
          }
        }
      `
        : `
        query GetEmployees($limit: Int, $offset: Int) {
          Employee(
            where: { 
              isDeleted: { _eq: false }
              employeePosition: {
                employeeCapabilities: {
                  capability: {
                    name: { _eq: "${SALES_ASSOCIATE_CAPABILITY}" }
                  }
                }
              }
            }
            limit: $limit
            offset: $offset
            orderBy: { fullName: ASC_NULLS_LAST }
          ) {
            id
            firstName
            lastName
            displayName
            fullName
            pictureThumbnail
            employeePosition {
              jobPosition { name }
              organizationalUnit { name }
            }
          }
        }
      `
    case 'by-account':
      return search?.trim()
        ? `
        query GetAccountsSearch($limit: Int, $offset: Int) {
          Account(
            where: {
              _and: [
                { isDeleted: { _eq: false } }
                { ${hasSalesAssociateActivity} }
                { _or: [
                  { name: { _ilike: "%${search}%" } }
                  { email: { _ilike: "%${search}%" } }
                ] }
              ]
            }
            limit: $limit
            offset: $offset
            orderBy: { name: ASC_NULLS_LAST }
          ) {
            id
            name
            email
            pictureUrl
          }
        }
      `
        : `
        query GetAccounts($limit: Int, $offset: Int) {
          Account(
            where: { isDeleted: { _eq: false } ${hasSalesAssociateActivity} }
            limit: $limit
            offset: $offset
            orderBy: { name: ASC_NULLS_LAST }
          ) {
            id
            name
            email
            pictureUrl
          }
        }
      `
    case 'by-contact':
      return search?.trim()
        ? `
        query GetContactsSearch($limit: Int, $offset: Int) {
          Contact(
            where: {
              _and: [
                { isDeleted: { _eq: false } }
                { ${hasSalesAssociateActivity} }
                { _or: [
                  { firstName: { _ilike: "%${search}%" } }
                  { lastName: { _ilike: "%${search}%" } }
                  { email: { _ilike: "%${search}%" } }
                ] }
              ]
            }
            limit: $limit
            offset: $offset
            orderBy: { lastName: ASC_NULLS_LAST }
          ) {
            id
            firstName
            lastName
            email
            pictureUrl
          }
        }
      `
        : `
        query GetContacts($limit: Int, $offset: Int) {
          Contact(
            where: { isDeleted: { _eq: false } ${hasSalesAssociateActivity} }
            limit: $limit
            offset: $offset
            orderBy: { lastName: ASC_NULLS_LAST }
          ) {
            id
            firstName
            lastName
            email
            pictureUrl
          }
        }
      `
    case 'by-lead':
      return search?.trim()
        ? `
        query GetLeadsSearch($limit: Int, $offset: Int) {
          Lead(
            where: {
              _and: [
                { isDeleted: { _eq: false } }
                { ${hasSalesAssociateActivity} }
                { _or: [
                  { name: { _ilike: "%${search}%" } }
                  { companyEmail: { _ilike: "%${search}%" } }
                ] }
              ]
            }
            limit: $limit
            offset: $offset
            orderBy: { name: ASC_NULLS_LAST }
          ) {
            id
            name
            companyEmail
          }
        }
      `
        : `
        query GetLeads($limit: Int, $offset: Int) {
          Lead(
            where: { isDeleted: { _eq: false } ${hasSalesAssociateActivity} }
            limit: $limit
            offset: $offset
            orderBy: { name: ASC_NULLS_LAST }
          ) {
            id
            name
            companyEmail
          }
        }
      `
    case 'by-opportunity':
      return search?.trim()
        ? `
        query GetOpportunitiesSearch($limit: Int, $offset: Int) {
          Opportunity(
            where: {
              _and: [
                { isDeleted: { _eq: false } }
                { ${hasSalesAssociateActivity} }
                { name: { _ilike: "%${search}%" } }
              ]
            }
            limit: $limit
            offset: $offset
            orderBy: { name: ASC_NULLS_LAST }
          ) {
            id
            name
          }
        }
      `
        : `
        query GetOpportunities($limit: Int, $offset: Int) {
          Opportunity(
            where: { isDeleted: { _eq: false } ${hasSalesAssociateActivity} }
            limit: $limit
            offset: $offset
            orderBy: { name: ASC_NULLS_LAST }
          ) {
            id
            name
          }
        }
      `
    default:
      return ''
  }
}

// Transform query results to EntityItem format - use correct entity names
const transformResults = (type: ActivityViewFilter, data: any): EntityItem[] => {
  switch (type) {
    case 'by-employee':
      return (data?.Employee || []).map((e: any) => ({
        id: e.id,
        name: e.displayName || e.fullName || `${e.firstName || ''} ${e.lastName || ''}`.trim() || 'Unknown',
        subtitle:
          [e.employeePosition?.jobPosition?.name, e.employeePosition?.organizationalUnit?.name]
            .filter(Boolean)
            .join(' · ') || undefined,
        avatar: getEmployeeAvatarSrc(e.pictureThumbnail)
      }))
    case 'by-account':
      return (data?.Account || []).map((a: any) => ({
        id: a.id,
        name: a.name || 'Unnamed Account',
        subtitle: a.email,
        avatar: a.pictureUrl || undefined
      }))
    case 'by-contact':
      return (data?.Contact || []).map((c: any) => ({
        id: c.id,
        name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown Contact',
        subtitle: c.email,
        avatar: c.pictureUrl || undefined
      }))
    case 'by-lead':
      return (data?.Lead || []).map((l: any) => ({
        id: l.id,
        name: l.name || 'Unknown Lead',
        subtitle: l.companyEmail
      }))
    case 'by-opportunity':
      return (data?.Opportunity || []).map((o: any) => ({
        id: o.id,
        name: o.name || 'Unnamed Opportunity'
      }))
    default:
      return []
  }
}

export const EntitySelectorOverlay: React.FC<EntitySelectorOverlayProps> = ({
  open,
  onOpenChange,
  entityType,
  accessToken,
  onSelect
}) => {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [entities, setEntities] = useState<EntityItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const graphqlClient = useGraphQLClient(accessToken)
  const config = getEntityConfig(entityType)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch a single page. When append is true, results are added (infinite scroll);
  // otherwise they replace the current list (initial load / new search).
  const fetchPage = useCallback(
    async (term: string, pageOffset: number, append: boolean) => {
      const query = buildQuery(entityType, term)
      if (!query) return

      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      try {
        const result = await graphqlClient.request(query, { limit: PAGE_SIZE, offset: pageOffset })
        const items = transformResults(entityType, result)

        setEntities(prev => {
          if (!append) return items
          const existingIds = new Set(prev.map(entity => entity.id))
          return [...prev, ...items.filter(item => !existingIds.has(item.id))]
        })
        setHasMore(items.length >= PAGE_SIZE)
        setOffset(pageOffset)
      } catch (err) {
        console.error('Failed to fetch entities:', err)
        if (!append) setEntities([])
        setHasMore(false)
      } finally {
        if (append) {
          setLoadingMore(false)
        } else {
          setLoading(false)
        }
      }
    },
    [graphqlClient, entityType]
  )

  // Initial load + reload whenever the search term or entity type changes while open
  useEffect(() => {
    if (!open) return
    fetchPage(debouncedSearch, 0, false).catch(() => undefined)
  }, [open, debouncedSearch, entityType, fetchPage])

  // Reset state when the overlay closes
  useEffect(() => {
    if (!open) {
      setSearch('')
      setDebouncedSearch('')
      setEntities([])
      setOffset(0)
      setHasMore(false)
    }
  }, [open])

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return
    fetchPage(debouncedSearch, offset + PAGE_SIZE, true).catch(() => undefined)
  }, [loading, loadingMore, hasMore, fetchPage, debouncedSearch, offset])

  // Infinite scroll: load the next page when the bottom sentinel enters the viewport
  useEffect(() => {
    if (!open || !hasMore || loading) return
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const viewport =
      scrollContainerRef.current?.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]') ?? null

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          loadMore()
        }
      },
      { root: viewport, rootMargin: '120px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [open, hasMore, loading, loadMore])

  const handleSelect = (entity: EntityItem) => {
    onSelect(entity.id, entity.name)
    onOpenChange(false)
  }

  let resultsContent: React.ReactNode
  if (loading) {
    resultsContent = (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
        <Spinner size="md" />
        <span className="gba:ml-3 gba:text-muted-foreground">Loading...</span>
      </div>
    )
  } else if (entities.length === 0) {
    resultsContent = (
      <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
        {debouncedSearch ? 'No results found' : 'No results'}
      </div>
    )
  } else {
    resultsContent = (
      <div className="gba:space-y-1">
        {entities.map(entity => (
          <button
            key={entity.id}
            type="button"
            onClick={() => handleSelect(entity)}
            className="gba:flex gba:items-center gba:gap-3 gba:w-full gba:p-3 gba:rounded-lg gba:text-left gba:border-0 gba:bg-transparent hover:gba:bg-accent/50 gba:transition-colors gba:cursor-pointer"
          >
            <Avatar className="gba:h-10 gba:w-10 gba:shrink-0">
              {entity.avatar ? <AvatarImage src={entity.avatar} /> : null}
              <AvatarFallback className="gba:text-sm">{entity.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="gba:flex-1 gba:min-w-0">
              <p className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{entity.name}</p>
              {entity.subtitle && (
                <p className="gba:text-xs gba:text-muted-foreground gba:truncate">{entity.subtitle}</p>
              )}
            </div>
          </button>
        ))}

        {/* Sentinel + spinner for infinite scroll */}
        {hasMore && <div ref={sentinelRef} className="gba:h-px gba:w-full" aria-hidden="true" />}
        {loadingMore && (
          <div className="gba:flex gba:items-center gba:justify-center gba:py-3">
            <Spinner size="sm" />
          </div>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:sm:max-w-[500px] gba:p-0 gba:overflow-hidden">
        {/* Header with gradient */}
        <div className="gba:bg-gradient-to-r gba:from-primary/5 gba:to-accent/5 gba:p-6 gba:border-b">
          <DialogHeader>
            <div className="gba:flex gba:items-center gba:gap-4">
              <div
                className={`gba:flex gba:items-center gba:justify-center gba:w-12 gba:h-12 gba:rounded-xl ${config.color}`}
              >
                {config.icon}
              </div>
              <div>
                <DialogTitle className="gba:text-xl">{config.title}</DialogTitle>
                <DialogDescription>{config.description}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Search */}
        <div className="gba:p-4 gba:border-b">
          <div className="gba:relative">
            <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground gba:pointer-events-none gba:z-10" />
            <Input
              placeholder={config.placeholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="gba:!pl-10"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div ref={scrollContainerRef}>
          <ScrollArea className="gba:h-[400px]">
            <div className="gba:p-2">{resultsContent}</div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default EntitySelectorOverlay
