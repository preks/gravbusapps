import React, { useState, useEffect, useCallback } from 'react'
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

  switch (type) {
    case 'by-employee':
      return search?.trim()
        ? `
        query GetEmployeesSearch {
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
            limit: 50
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
        query GetEmployees {
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
            limit: 50
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
        query GetAccountsSearch {
          Account(
            where: {
              _and: [
                { isDeleted: { _eq: false } }
                { _or: [
                  { name: { _ilike: "%${search}%" } }
                  { email: { _ilike: "%${search}%" } }
                ] }
              ]
            }
            limit: 50
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
        query GetAccounts {
          Account(
            where: { isDeleted: { _eq: false } }
            limit: 50
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
        query GetContactsSearch {
          Contact(
            where: {
              _and: [
                { isDeleted: { _eq: false } }
                { _or: [
                  { firstName: { _ilike: "%${search}%" } }
                  { lastName: { _ilike: "%${search}%" } }
                  { email: { _ilike: "%${search}%" } }
                ] }
              ]
            }
            limit: 50
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
        query GetContacts {
          Contact(
            where: { isDeleted: { _eq: false } }
            limit: 50
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
        query GetLeadsSearch {
          Lead(
            where: {
              _and: [
                { isDeleted: { _eq: false } }
                { _or: [
                  { name: { _ilike: "%${search}%" } }
                  { companyEmail: { _ilike: "%${search}%" } }
                ] }
              ]
            }
            limit: 50
            orderBy: { name: ASC_NULLS_LAST }
          ) {
            id
            name
            companyEmail
          }
        }
      `
        : `
        query GetLeads {
          Lead(
            where: { isDeleted: { _eq: false } }
            limit: 50
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
        query GetOpportunitiesSearch {
          Opportunity(
            where: {
              _and: [
                { isDeleted: { _eq: false } }
                { name: { _ilike: "%${search}%" } }
              ]
            }
            limit: 50
            orderBy: { name: ASC_NULLS_LAST }
          ) {
            id
            name
          }
        }
      `
        : `
        query GetOpportunities {
          Opportunity(
            where: { isDeleted: { _eq: false } }
            limit: 50
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
  const [entities, setEntities] = useState<EntityItem[]>([])
  const [loading, setLoading] = useState(false)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const graphqlClient = useGraphQLClient(accessToken)
  const config = getEntityConfig(entityType)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch entities
  const fetchEntities = useCallback(async () => {
    setLoading(true)
    try {
      const query = buildQuery(entityType, debouncedSearch)
      if (!query) return

      const result = await graphqlClient.request(query)
      const items = transformResults(entityType, result)
      setEntities(items)
    } catch (err) {
      console.error('Failed to fetch entities:', err)
      setEntities([])
    } finally {
      setLoading(false)
    }
  }, [graphqlClient, entityType, debouncedSearch])

  // Fetch on open or search change
  useEffect(() => {
    if (open) {
      fetchEntities()
    }
  }, [open, fetchEntities])

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSearch('')
      setEntities([])
    }
  }, [open])

  const handleSelect = (entity: EntityItem) => {
    onSelect(entity.id, entity.name)
    onOpenChange(false)
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
        <ScrollArea className="gba:h-[400px]">
          <div className="gba:p-2">
            {loading ? (
              <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
                <Spinner size="md" />
                <span className="gba:ml-3 gba:text-muted-foreground">Loading...</span>
              </div>
            ) : entities.length === 0 ? (
              <div className="gba:text-center gba:py-12 gba:text-muted-foreground">
                {search ? 'No results found' : 'Start typing to search'}
              </div>
            ) : (
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
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

export default EntitySelectorOverlay
