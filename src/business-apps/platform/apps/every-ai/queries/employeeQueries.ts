import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

const EMPLOYEE_BY_ID_QUERY = `
query employeeById($id: uuid) {
  Employee(where: {id: {_eq: $id}}) {
    id
    firstName
    lastName
    pictureThumbnail
    employeePosition {
      jobPosition {
        name
      }
      supervisorEmployee {
        id
        firstName
        lastName
        pictureThumbnail
        employeePosition {
          jobPosition {
            name
          }
        }
      }
    }
  }
}
`

const EMPLOYEE_SEARCH_QUERY = `
query employeeSearch($pattern: String, $limit: Int = 200) {
  Employee(
    where: {
      _or: [
        { firstName: { _ilike: $pattern } }
        { lastName: { _ilike: $pattern } }
      ]
    }
    limit: $limit
  ) {
    id
    firstName
    lastName
    pictureThumbnail
  }
}
`

type EmployeeWithSupervisorInfo = {
  id: string
  firstName: string
  lastName: string
  pictureThumbnail: string | null
  employeePosition: {
    jobPosition: {
      name: string
    } | null
    supervisorEmployee: {
      id: string
      firstName: string
      lastName: string
      pictureThumbnail: string | null
      employeePosition: {
        jobPosition: {
          name: string
        }
      }
    } | null
  }
}

type EmployeeResponse = {
  Employee: EmployeeWithSupervisorInfo[]
}

type Employee = {
  id: string
  firstName: string
  lastName: string
  pictureThumbnail: string | null
  jobPositionName: string | null
  profileUrl: string
}

type EmployeeLight = {
  id: string
  firstName: string
  lastName: string
  pictureThumbnail: string | null
}

type EmployeeSearchResponse = {
  Employee: EmployeeLight[]
}

const loadingState = {
  state: 'loading'
} as const

type ErrorState = {
  state: 'error'
  message: string
}

type SuccessState = {
  state: 'success'
  employee: Employee
  manager: Employee | null
}

type EmployeeDetailsState = typeof loadingState | ErrorState | SuccessState

const idToProfileUrl = (id: string) => `/platform/employee-record?tab=assets&employeeId=${id}`

// In-memory cache for employee details to prevent duplicate requests
const employeeCache = new Map<string, { data: SuccessState; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function useEmployeeDetails(employeeId: string, accessToken: string) {
  const [state, setState] = useState<EmployeeDetailsState>(loadingState)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    async function fetchData() {
      // Check cache first
      const cached = employeeCache.get(employeeId)
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setState(cached.data)
        return
      }

      setState(loadingState)
      try {
        const empRes = (await graphqlClient.request(EMPLOYEE_BY_ID_QUERY, { id: employeeId })) as EmployeeResponse
        const employees = empRes?.Employee
        if (!Array.isArray(employees) || employees.length === 0 || !employees[0]) {
          throw new Error('Employee not found.')
        }
        const employeeWithSupervisor = employees[0]

        const employee = {
          id: employeeWithSupervisor.id,
          firstName: employeeWithSupervisor.firstName,
          lastName: employeeWithSupervisor.lastName,
          pictureThumbnail: employeeWithSupervisor.pictureThumbnail,
          jobPositionName: employeeWithSupervisor.employeePosition?.jobPosition?.name || null,
          profileUrl: idToProfileUrl(employeeId)
        }

        const managerInfo = employeeWithSupervisor.employeePosition?.supervisorEmployee
        const manager = managerInfo
          ? {
              id: managerInfo.id,
              firstName: managerInfo.firstName,
              lastName: managerInfo.lastName,
              pictureThumbnail: managerInfo.pictureThumbnail,
              jobPositionName: managerInfo.employeePosition?.jobPosition?.name,
              profileUrl: idToProfileUrl(managerInfo.id)
            }
          : null

        const successState: SuccessState = {
          state: 'success',
          employee: employee,
          manager: manager
        }

        // Cache the result
        employeeCache.set(employeeId, {
          data: successState,
          timestamp: Date.now()
        })

        setState(successState)
      } catch {
        setState({ state: 'error', message: 'Error fetching employee details.' })
      }
    }
    if (employeeId && accessToken) {
      fetchData()
    }
  }, [employeeId, accessToken])
  // Note: graphqlClient is intentionally omitted from deps to prevent infinite loops

  return { state }
}

export function useEmployeeSearchLight(accessToken: string, params: { search?: string; limit?: number }) {
  const [isLoading, setIsLoading] = useState(false)
  const [employees, setEmployees] = useState<EmployeeLight[]>([])
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const raw = params.search?.trim() ?? ''
        // Guard: avoid hammering GraphQL when search is empty/too short
        if (raw.length < 2) {
          if (!cancelled) {
            setIsLoading(false)
            setEmployees([])
          }
          return
        }
        setIsLoading(true)
        const pattern = `%${raw}%`
        const res = (await graphqlClient.request(EMPLOYEE_SEARCH_QUERY, {
          pattern,
          limit: params.limit ?? 50
        })) as EmployeeSearchResponse
        if (!cancelled) {
          setEmployees(Array.isArray(res?.Employee) ? res.Employee : [])
        }
      } catch {
        if (!cancelled) setEmployees([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    if (accessToken) {
      run()
    }
    return () => {
      cancelled = true
    }
  }, [accessToken, params.search, params.limit])
  // Note: graphqlClient is intentionally omitted from deps to prevent infinite loops

  return { employees, isLoading }
}

// ============================================
// CRM Entity Search Hooks
// ============================================

// Account Search
const ACCOUNT_SEARCH_QUERY = `
query accountSearch($pattern: String, $limit: Int = 50) {
  Account(
    where: {
      _and: [
        { isDeleted: { _eq: false } }
        { _or: [
          { name: { _ilike: $pattern } }
          { email: { _ilike: $pattern } }
          { website: { _ilike: $pattern } }
        ]}
      ]
    }
    limit: $limit
  ) {
    id
    name
    email
    website
  }
}
`

type AccountLight = {
  id: string
  name: string | null
  email: string | null
  website: string | null
}

type AccountSearchResponse = {
  Account: AccountLight[]
}

export function useAccountSearch(accessToken: string, params: { search?: string; limit?: number }) {
  const [isLoading, setIsLoading] = useState(false)
  const [accounts, setAccounts] = useState<AccountLight[]>([])
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const raw = params.search?.trim() ?? ''
        if (raw.length < 2) {
          if (!cancelled) {
            setIsLoading(false)
            setAccounts([])
          }
          return
        }
        setIsLoading(true)
        const pattern = `%${raw}%`
        const res = (await graphqlClient.request(ACCOUNT_SEARCH_QUERY, {
          pattern,
          limit: params.limit ?? 50
        })) as AccountSearchResponse
        if (!cancelled) {
          setAccounts(Array.isArray(res?.Account) ? res.Account : [])
        }
      } catch (e) {
        console.error('[EveryAI] Account search error:', e)
        if (!cancelled) setAccounts([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    if (accessToken) {
      run()
    }
    return () => {
      cancelled = true
    }
  }, [accessToken, params.search, params.limit])
  // Note: graphqlClient is intentionally omitted from deps to prevent infinite loops

  return { accounts, isLoading }
}

// Contact Search
const CONTACT_SEARCH_QUERY = `
query contactSearch($pattern: String, $limit: Int = 50) {
  Contact(
    where: {
      _and: [
        { isDeleted: { _eq: false } }
        { _or: [
          { firstName: { _ilike: $pattern } }
          { lastName: { _ilike: $pattern } }
          { email: { _ilike: $pattern } }
        ]}
      ]
    }
    limit: $limit
  ) {
    id
    firstName
    lastName
    email
    jobTitle
  }
}
`

type ContactLight = {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  jobTitle: string | null
}

type ContactSearchResponse = {
  Contact: ContactLight[]
}

export function useContactSearch(accessToken: string, params: { search?: string; limit?: number }) {
  const [isLoading, setIsLoading] = useState(false)
  const [contacts, setContacts] = useState<ContactLight[]>([])
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const raw = params.search?.trim() ?? ''
        if (raw.length < 2) {
          if (!cancelled) {
            setIsLoading(false)
            setContacts([])
          }
          return
        }
        setIsLoading(true)
        const pattern = `%${raw}%`
        const res = (await graphqlClient.request(CONTACT_SEARCH_QUERY, {
          pattern,
          limit: params.limit ?? 50
        })) as ContactSearchResponse
        if (!cancelled) {
          setContacts(Array.isArray(res?.Contact) ? res.Contact : [])
        }
      } catch (e) {
        console.error('[EveryAI] Contact search error:', e)
        if (!cancelled) setContacts([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    if (accessToken) {
      run()
    }
    return () => {
      cancelled = true
    }
  }, [accessToken, params.search, params.limit])
  // Note: graphqlClient is intentionally omitted from deps to prevent infinite loops

  return { contacts, isLoading }
}

// Lead Search
const LEAD_SEARCH_QUERY = `
query leadSearch($pattern: String, $limit: Int = 50) {
  Lead(
    where: {
      _and: [
        { isDeleted: { _eq: false } }
        { _or: [
          { firstName: { _ilike: $pattern } }
          { lastName: { _ilike: $pattern } }
          { companyName: { _ilike: $pattern } }
          { email: { _ilike: $pattern } }
        ]}
      ]
    }
    limit: $limit
  ) {
    id
    firstName
    lastName
    companyName
    email
  }
}
`

type LeadLight = {
  id: string
  firstName: string | null
  lastName: string | null
  companyName: string | null
  email: string | null
}

type LeadSearchResponse = {
  Lead: LeadLight[]
}

export function useLeadSearch(accessToken: string, params: { search?: string; limit?: number }) {
  const [isLoading, setIsLoading] = useState(false)
  const [leads, setLeads] = useState<LeadLight[]>([])
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const raw = params.search?.trim() ?? ''
        if (raw.length < 2) {
          if (!cancelled) {
            setIsLoading(false)
            setLeads([])
          }
          return
        }
        setIsLoading(true)
        const pattern = `%${raw}%`
        const res = (await graphqlClient.request(LEAD_SEARCH_QUERY, {
          pattern,
          limit: params.limit ?? 50
        })) as LeadSearchResponse
        if (!cancelled) {
          setLeads(Array.isArray(res?.Lead) ? res.Lead : [])
        }
      } catch (e) {
        console.error('[EveryAI] Lead search error:', e)
        if (!cancelled) setLeads([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    if (accessToken) {
      run()
    }
    return () => {
      cancelled = true
    }
  }, [accessToken, params.search, params.limit])
  // Note: graphqlClient is intentionally omitted from deps to prevent infinite loops

  return { leads, isLoading }
}

// Opportunity Search
const OPPORTUNITY_SEARCH_QUERY = `
query opportunitySearch($pattern: String, $limit: Int = 50) {
  Opportunity(
    where: {
      _and: [
        { isDeleted: { _eq: false } }
        { _or: [
          { name: { _ilike: $pattern } }
          { code: { _ilike: $pattern } }
        ]}
      ]
    }
    limit: $limit
  ) {
    id
    name
    code
    estimatedAmount
  }
}
`

type OpportunityLight = {
  id: string
  name: string | null
  code: string | null
  estimatedAmount: number | null
}

type OpportunitySearchResponse = {
  Opportunity: OpportunityLight[]
}

export function useOpportunitySearch(accessToken: string, params: { search?: string; limit?: number }) {
  const [isLoading, setIsLoading] = useState(false)
  const [opportunities, setOpportunities] = useState<OpportunityLight[]>([])
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const raw = params.search?.trim() ?? ''
        if (raw.length < 2) {
          if (!cancelled) {
            setIsLoading(false)
            setOpportunities([])
          }
          return
        }
        setIsLoading(true)
        const pattern = `%${raw}%`
        const res = (await graphqlClient.request(OPPORTUNITY_SEARCH_QUERY, {
          pattern,
          limit: params.limit ?? 50
        })) as OpportunitySearchResponse
        if (!cancelled) {
          setOpportunities(Array.isArray(res?.Opportunity) ? res.Opportunity : [])
        }
      } catch (e) {
        console.error('[EveryAI] Opportunity search error:', e)
        if (!cancelled) setOpportunities([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    if (accessToken) {
      run()
    }
    return () => {
      cancelled = true
    }
  }, [accessToken, params.search, params.limit])
  // Note: graphqlClient is intentionally omitted from deps to prevent infinite loops

  return { opportunities, isLoading }
}

// Entity type for generic use
export type EntityType = 'employee' | 'account' | 'contact' | 'lead' | 'opportunity'

const DS_ENTITY: Record<string, EntityType> = {
  employee: 'employee',
  account: 'account',
  investment_account: 'account',
  contact: 'contact',
  investment_contact: 'contact',
  lead: 'lead',
  investment_lead: 'lead',
  opportunity: 'opportunity',
  investment_opportunity: 'opportunity'
}

const SEARCHABLE_DATA_SOURCE_TYPES = new Set(['CUSTOM_ENTITY', 'INTERNAL_ENTITY'])

/** Field name heuristics; optional `fieldSchema` supplies `x-dataSource.entity` (e.g. custom flow "New Field" → opportunity). */
export function getEntityTypeFromFieldName(fieldName: string, fieldSchema?: any): EntityType {
  const ds = fieldSchema?.['x-dataSource']
  if (SEARCHABLE_DATA_SOURCE_TYPES.has(ds?.type) && typeof ds?.entity === 'string') {
    const k = ds.entity
      .trim()
      .replace(/-/g, '_')
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .toLowerCase()
    if (DS_ENTITY[k]) return DS_ENTITY[k]
  }

  const lowerName = fieldName.toLowerCase()
  if (lowerName === 'account' || lowerName.includes('accountid')) return 'account'
  if (lowerName === 'contact' || lowerName.includes('contactid')) return 'contact'
  if (lowerName === 'lead' || lowerName.includes('leadid')) return 'lead'
  if (lowerName === 'opportunity' || lowerName.includes('opportunityid')) return 'opportunity'
  // Default to employee for employee-related fields
  return 'employee'
}
