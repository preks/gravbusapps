import React, { useState, useCallback, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  Input,
  Button,
  Spinner,
  Alert,
  Avatar,
  AvatarFallback,
  AvatarImage,
  ScrollArea
} from '@newwork/nw-design-system'
import {
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  UserIcon,
  UserCircleIcon,
  BuildingIcon,
  TargetIcon,
  HandshakeIcon
} from '@phosphor-icons/react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { ActivityViewFilter, EntitySelectorProps } from '../../types'
import { getAvatarSrc, getEmployeeAvatarSrc } from '../utils/avatarUtils'

const DATA_TEST_ID_PREFIX = 'SalesActivity360-EntitySelector'

interface Entity {
  id: string
  name: string
  subtitle?: string
  avatar?: string | null
}

// Inline queries for entity selection - includes role (job position) and team (org unit)
const EMPLOYEE_FIELDS = `
  id
  fullName
  firstName
  lastName
  pictureThumbnail
  employeePosition {
    organizationalUnit {
      name
    }
    jobPosition {
      name
    }
  }
`

// Sales Associate capability name for filtering (consistent with Sales Performance module)
const SALES_ASSOCIATE_CAPABILITY = 'Sales Associate'

// Only list entities that actually have at least one Sales-Associate activity,
// so the picker matches the "By X" counts shown on the explore chips.
const HAS_SALES_ASSOCIATE_ACTIVITY = `activities: {
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

const EMPLOYEES_QUERY = `
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
      orderBy: [{ fullName: ASC_NULLS_LAST }]
      limit: $limit
      offset: $offset
    ) {
      ${EMPLOYEE_FIELDS}
    }
  }
`

const EMPLOYEES_SEARCH_QUERY = `
  query GetEmployeesSearch($limit: Int, $offset: Int, $search: String!) {
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
            { fullName: { _ilike: $search } }
            { firstName: { _ilike: $search } }
            { lastName: { _ilike: $search } }
          ] }
        ]
      }
      orderBy: [{ fullName: ASC_NULLS_LAST }]
      limit: $limit
      offset: $offset
    ) {
      ${EMPLOYEE_FIELDS}
    }
  }
`

const ACCOUNTS_QUERY = `
  query GetAccounts($limit: Int, $offset: Int) {
    Account(
      where: { isDeleted: { _eq: false } ${HAS_SALES_ASSOCIATE_ACTIVITY} }
      orderBy: [{ name: ASC_NULLS_LAST }]
      limit: $limit
      offset: $offset
    ) {
      id
      name
      email
      pictureUrl
    }
  }
`

const ACCOUNTS_SEARCH_QUERY = `
  query GetAccountsSearch($limit: Int, $offset: Int, $search: String!) {
    Account(
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { ${HAS_SALES_ASSOCIATE_ACTIVITY} }
          { _or: [
            { name: { _ilike: $search } }
            { email: { _ilike: $search } }
          ] }
        ]
      }
      orderBy: [{ name: ASC_NULLS_LAST }]
      limit: $limit
      offset: $offset
    ) {
      id
      name
      email
      pictureUrl
    }
  }
`

const CONTACTS_QUERY = `
  query GetContacts($limit: Int, $offset: Int) {
    Contact(
      where: { isDeleted: { _eq: false } ${HAS_SALES_ASSOCIATE_ACTIVITY} }
      orderBy: [{ lastName: ASC_NULLS_LAST }]
      limit: $limit
      offset: $offset
    ) {
      id
      firstName
      lastName
      email
      pictureUrl
    }
  }
`

const CONTACTS_SEARCH_QUERY = `
  query GetContactsSearch($limit: Int, $offset: Int, $search: String!) {
    Contact(
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { ${HAS_SALES_ASSOCIATE_ACTIVITY} }
          { _or: [
            { firstName: { _ilike: $search } }
            { lastName: { _ilike: $search } }
            { email: { _ilike: $search } }
          ] }
        ]
      }
      orderBy: [{ lastName: ASC_NULLS_LAST }]
      limit: $limit
      offset: $offset
    ) {
      id
      firstName
      lastName
      email
      pictureUrl
    }
  }
`

const LEADS_QUERY = `
  query GetLeads($limit: Int, $offset: Int) {
    Lead(
      where: { isDeleted: { _eq: false } ${HAS_SALES_ASSOCIATE_ACTIVITY} }
      orderBy: [{ name: ASC_NULLS_LAST }]
      limit: $limit
      offset: $offset
    ) {
      id
      name
      companyEmail
    }
  }
`

const LEADS_SEARCH_QUERY = `
  query GetLeadsSearch($limit: Int, $offset: Int, $search: String!) {
    Lead(
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { ${HAS_SALES_ASSOCIATE_ACTIVITY} }
          { _or: [
            { name: { _ilike: $search } }
            { companyEmail: { _ilike: $search } }
          ] }
        ]
      }
      orderBy: [{ name: ASC_NULLS_LAST }]
      limit: $limit
      offset: $offset
    ) {
      id
      name
      companyEmail
    }
  }
`

const OPPORTUNITIES_QUERY = `
  query GetOpportunities($limit: Int, $offset: Int) {
    Opportunity(
      where: { isDeleted: { _eq: false } ${HAS_SALES_ASSOCIATE_ACTIVITY} }
      orderBy: [{ name: ASC_NULLS_LAST }]
      limit: $limit
      offset: $offset
    ) {
      id
      name
      stage
    }
  }
`

const OPPORTUNITIES_SEARCH_QUERY = `
  query GetOpportunitiesSearch($limit: Int, $offset: Int, $search: String!) {
    Opportunity(
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { ${HAS_SALES_ASSOCIATE_ACTIVITY} }
          { name: { _ilike: $search } }
        ]
      }
      orderBy: [{ name: ASC_NULLS_LAST }]
      limit: $limit
      offset: $offset
    ) {
      id
      name
      stage
    }
  }
`

// Get entity config based on type
const getEntityConfig = (entityType: ActivityViewFilter) => {
  switch (entityType) {
    case 'by-employee':
      return {
        title: 'Select Employee',
        description: 'Choose a sales team member to view their activities',
        icon: <UserIcon className="gba:w-6 gba:h-6" />,
        searchPlaceholder: 'Search employees...'
      }
    case 'by-account':
      return {
        title: 'Select Account',
        description: 'Choose an account to view related activities',
        icon: <BuildingIcon className="gba:w-6 gba:h-6" />,
        searchPlaceholder: 'Search accounts...'
      }
    case 'by-contact':
      return {
        title: 'Select Contact',
        description: 'Choose a contact to view their activities',
        icon: <UserCircleIcon className="gba:w-6 gba:h-6" />,
        searchPlaceholder: 'Search contacts...'
      }
    case 'by-lead':
      return {
        title: 'Select Lead',
        description: 'Choose a lead to view related activities',
        icon: <TargetIcon className="gba:w-6 gba:h-6" />,
        searchPlaceholder: 'Search leads...'
      }
    case 'by-opportunity':
      return {
        title: 'Select Opportunity',
        description: 'Choose an opportunity to view related activities',
        icon: <HandshakeIcon className="gba:w-6 gba:h-6" />,
        searchPlaceholder: 'Search opportunities...'
      }
    default:
      return {
        title: 'Select Entity',
        description: 'Choose an entity',
        icon: <UserIcon className="gba:w-6 gba:h-6" />,
        searchPlaceholder: 'Search...'
      }
  }
}

export const EntitySelector: React.FC<EntitySelectorProps> = ({ accessToken, entityType, onSelect, onCancel }) => {
  const [search, setSearch] = useState('')
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)
  const config = getEntityConfig(entityType)

  // Load entities based on type
  const loadEntities = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const hasSearch = search.trim().length > 0
      const searchPattern = hasSearch ? `%${search.trim()}%` : undefined
      let query: string
      let transform: (data: any) => Entity[]

      switch (entityType) {
        case 'by-employee':
          query = hasSearch ? EMPLOYEES_SEARCH_QUERY : EMPLOYEES_QUERY
          transform = data =>
            data.Employee?.map((e: any) => {
              const role = e.employeePosition?.jobPosition?.name
              const team = e.employeePosition?.organizationalUnit?.name
              // Build subtitle: "Role · Team" or just one if other is missing
              const parts = [role, team].filter(Boolean)
              const subtitle = parts.length > 0 ? parts.join(' · ') : 'Employee'

              return {
                id: e.id,
                name: e.fullName || `${e.firstName || ''} ${e.lastName || ''}`.trim() || 'Unknown',
                subtitle,
                avatar: getEmployeeAvatarSrc(e.pictureThumbnail)
              }
            }) || []
          break
        case 'by-account':
          query = hasSearch ? ACCOUNTS_SEARCH_QUERY : ACCOUNTS_QUERY
          transform = data =>
            data.Account?.map((a: any) => ({
              id: a.id,
              name: a.name,
              subtitle: a.email,
              avatar: a.pictureUrl
            })) || []
          break
        case 'by-contact':
          query = hasSearch ? CONTACTS_SEARCH_QUERY : CONTACTS_QUERY
          transform = data =>
            data.Contact?.map((c: any) => ({
              id: c.id,
              name: `${c.firstName} ${c.lastName}`,
              subtitle: c.email,
              avatar: c.pictureUrl
            })) || []
          break
        case 'by-lead':
          query = hasSearch ? LEADS_SEARCH_QUERY : LEADS_QUERY
          transform = data =>
            data.Lead?.map((l: any) => ({
              id: l.id,
              name: l.name,
              subtitle: l.companyEmail,
              avatar: null
            })) || []
          break
        case 'by-opportunity':
          query = hasSearch ? OPPORTUNITIES_SEARCH_QUERY : OPPORTUNITIES_QUERY
          transform = data =>
            data.Opportunity?.map((o: any) => ({
              id: o.id,
              name: o.name,
              subtitle: o.stage,
              avatar: null
            })) || []
          break
        default:
          return
      }

      const variables: any = { limit: 50, offset: 0 }
      if (hasSearch) {
        variables.search = searchPattern
      }

      const result = await graphqlClient.request(query, variables)
      setEntities(transform(result))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entities')
      setEntities([])
    } finally {
      setLoading(false)
    }
  }, [entityType, search, graphqlClient])

  // Load entities on mount and when search changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      loadEntities()
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [loadEntities])

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="gba:space-y-6 gba:max-w-2xl gba:mx-auto" data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      {/* Header with back button */}
      <div className="gba:flex gba:items-center gba:gap-4">
        <Button variant="outline" size="icon" onClick={onCancel} data-testid={`${DATA_TEST_ID_PREFIX}-back-button`}>
          <ArrowLeftIcon className="gba:w-5 gba:h-5" />
        </Button>
        <div className="gba:flex-1">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:text-primary">{config.icon}</div>
            <div>
              <h2 className="gba:text-2xl gba:font-bold gba:text-foreground">{config.title}</h2>
              <p className="gba:text-sm gba:text-muted-foreground">{config.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and List Card */}
      <Card>
        <CardHeader className="gba:pb-4">
          <div className="gba:relative">
            <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:text-muted-foreground gba:w-5 gba:h-5" />
            <Input
              placeholder={config.searchPlaceholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="gba:pl-10"
              data-testid={`${DATA_TEST_ID_PREFIX}-search-input`}
            />
          </div>
        </CardHeader>

        <CardContent className="gba:pt-0">
          {loading ? (
            <div
              className="gba:flex gba:items-center gba:justify-center gba:py-12"
              data-testid={`${DATA_TEST_ID_PREFIX}-loading`}
            >
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <Alert variant="destructive" data-testid={`${DATA_TEST_ID_PREFIX}-error`}>
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={loadEntities} className="gba:mt-2">
                Retry
              </Button>
            </Alert>
          ) : entities.length === 0 ? (
            <div
              className="gba:text-center gba:py-12 gba:text-muted-foreground"
              data-testid={`${DATA_TEST_ID_PREFIX}-empty`}
            >
              <p>No results found</p>
              {search && <p className="gba:text-sm gba:mt-1">Try adjusting your search term</p>}
            </div>
          ) : (
            <ScrollArea className="gba:h-[400px]">
              <div className="gba:space-y-1">
                {entities.map(entity => (
                  <button
                    key={entity.id}
                    type="button"
                    onClick={() => onSelect(entity.id, entity.name)}
                    className="gba:w-full gba:flex gba:items-center gba:gap-4 gba:p-3 gba:rounded-lg gba:text-left gba:transition-colors hover:gba:bg-accent gba:border-0 gba:bg-transparent gba:cursor-pointer gba:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-primary"
                    data-testid={`${DATA_TEST_ID_PREFIX}-entity-${entity.id}`}
                  >
                    <Avatar className="gba:h-10 gba:w-10">
                      {entity.avatar ? <AvatarImage src={getAvatarSrc(entity.avatar)} alt={entity.name} /> : null}
                      <AvatarFallback className="gba:bg-primary/10 gba:text-primary">
                        {getInitials(entity.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="gba:flex-1 gba:min-w-0">
                      <p className="gba:font-medium gba:text-foreground gba:truncate">{entity.name}</p>
                      {entity.subtitle && (
                        <p className="gba:text-sm gba:text-muted-foreground gba:truncate">{entity.subtitle}</p>
                      )}
                    </div>
                    <svg
                      className="gba:w-5 gba:h-5 gba:text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default EntitySelector
