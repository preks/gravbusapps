import { GraphQLClient } from '../graphql/GraphQLClient'
import { env } from '@/common/env/EnvUtils'

/**
 * Basic user information
 */
export interface OrgUserBasic {
  id: string
  name: string
  email: string
}

/**
 * Full user information with organizational details
 */
export interface OrgUser extends OrgUserBasic {
  organizationalUnits: string[]
  matrixTeams: string[]
  companies: string[]
  siteLocations: string[]
  costCenters: string[]
  capabilities: string[]
  roleId: string
  managerId: string
  isActive: boolean
}

/**
 * Organizational Directory Client using GraphQL
 * Matches the queries from custom-flow-engine for consistency
 */
export class OrgDirectoryClient {
  private readonly client: GraphQLClient

  constructor(accessToken: string) {
    const endpoint = env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')
    if (!endpoint) {
      throw new Error('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK is not set')
    }
    this.client = new GraphQLClient(endpoint)
    this.client.setAccessToken(accessToken)
  }

  /**
   * Position selection for basic queries (lightweight)
   */
  private positionSelectionBasic(): string {
    return `
      id
      userId
      employeeId
      firstName
      lastName
      employee {
        communication(
          where: {purpose: {_eq: "INTERNAL"}, value: {_neq: ""}, _or: {channelRef: {_eq: "CommunicationChannel:v1:e-mail"}}}
        ) { value }
      }
    `
  }

  /**
   * Position selection for full queries (includes all organizational data)
   */
  private positionSelectionFull(): string {
    return `
      id
      userId
      employeeId
      firstName
      lastName
      structureId
      supervisorEmployeeId
      siteLocation { id name }
      company { id name }
      costCenter { id name }
      employeeCapabilities { capability { id name } }
      matrixUnitEmployees { matrixUnit { id name } }
      organizationalUnitEmployees { organizationalUnit { id name type } jobPositionId }
      employee {
        communication(
          where: {purpose: {_eq: "INTERNAL"}, value: {_neq: ""}, _or: {channelRef: {_eq: "CommunicationChannel:v1:e-mail"}}}
        ) { value }
      }
    `
  }

  /**
   * Build where condition with active structure filter
   */
  private buildActiveWhere(inner?: any): any {
    if (!inner || (typeof inner === 'object' && Object.keys(inner).length === 0)) {
      return { structure: { isActive: { _eq: true } } }
    }
    return { _and: [{ structure: { isActive: { _eq: true } } }, inner] }
  }

  /**
   * Fetch positions from GraphQL
   */
  private async fetchPositions(where: any, selection: 'basic' | 'full' = 'basic'): Promise<any[]> {
    const query = `
      query EmployeePositions($where: EmployeePositionBoolExp!) {
        EmployeePosition(where: $where) {
          ${selection === 'basic' ? this.positionSelectionBasic() : this.positionSelectionFull()}
        }
      }
    `

    const data = await this.client.request<any>(query, { where: this.buildActiveWhere(where) })
    return Array.isArray(data?.EmployeePosition) ? data.EmployeePosition : []
  }

  /**
   * Normalize ID from position data
   * Priority: userId > employeeId > id (position ID should be last resort)
   */
  private normalizeIdFromPosition(p: any): string {
    const email =
      Array.isArray(p?.employee?.communication) && p.employee.communication.length > 0
        ? String(p.employee.communication[0]?.value || '')
        : ''

    return String(p?.userId || p?.employeeId || p?.id || email || `${p?.firstName || ''} ${p?.lastName || ''}`.trim())
  }

  /**
   * Map positions to basic user list (unique by ID)
   */
  private mapPositionsToBasicUnique(positions: any[]): OrgUserBasic[] {
    const map = new Map<string, OrgUserBasic>()
    for (const p of positions || []) {
      const id = this.normalizeIdFromPosition(p)
      const firstName = String(p?.firstName || '')
      const lastName = String(p?.lastName || '')
      const name = firstName && lastName ? `${firstName} ${lastName}` : ''
      const email =
        Array.isArray(p?.employee?.communication) && p.employee.communication.length > 0
          ? String(p.employee.communication[0]?.value || '')
          : ''

      if (!map.has(id)) map.set(id, { id, name, email })
    }

    return Array.from(map.values())
  }

  /**
   * Normalize positions to full user objects
   */
  private normalizePositionsToUsers(positions: any[]): any[] {
    const normalizedUsers = (positions || []).map((p: any) => {
      const email =
        Array.isArray(p?.employee?.communication) && p.employee.communication.length > 0
          ? String(p.employee.communication[0]?.value || '')
          : ''

      const organizationalUnits: string[] = (
        Array.isArray(p?.organizationalUnitEmployees) ? p.organizationalUnitEmployees : []
      )
        .map((x: any) => String(x?.organizationalUnit?.id || ''))
        .filter((v: string) => !!v)

      const matrixTeams: string[] = (Array.isArray(p?.matrixUnitEmployees) ? p.matrixUnitEmployees : [])
        .map((x: any) => String(x?.matrixUnit?.id || ''))
        .filter((v: string) => !!v)

      const companies: string[] = p?.company?.id ? [String(p.company.id)] : []
      const siteLocations: string[] = p?.siteLocation?.id ? [String(p.siteLocation.id)] : []
      const costCenters: string[] = p?.costCenter?.id ? [String(p.costCenter.id)] : []
      const capabilities: string[] = (Array.isArray(p?.employeeCapabilities) ? p.employeeCapabilities : [])
        .map((c: any) => String(c?.capability?.id || ''))
        .filter((v: string) => !!v)

      const id = this.normalizeIdFromPosition(p)

      return {
        id,
        firstName: String(p?.firstName || ''),
        lastName: String(p?.lastName || ''),
        email,
        role: String(
          (Array.isArray(p?.organizationalUnitEmployees) ? p.organizationalUnitEmployees : [])?.[0]?.jobPositionId || ''
        ),
        manager: String(p?.supervisorEmployeeId || ''),
        organizationalUnits,
        matrixTeams,
        companies,
        siteLocations,
        costCenters,
        capabilities
      }
    })

    // Merge duplicate users
    const merged = new Map<string, any>()
    for (const normalizedUser of normalizedUsers) {
      const existing = merged.get(normalizedUser.id) || {
        id: normalizedUser.id,
        firstName: '',
        lastName: '',
        email: '',
        role: String(normalizedUser.role || ''),
        manager: String(normalizedUser.manager || ''),
        organizationalUnits: [] as string[],
        matrixTeams: [] as string[],
        companies: [] as string[],
        siteLocations: [] as string[],
        costCenters: [] as string[],
        capabilities: [] as string[]
      }

      existing.firstName = existing.firstName || normalizedUser.firstName
      existing.lastName = existing.lastName || normalizedUser.lastName
      existing.email = existing.email || normalizedUser.email
      existing.organizationalUnits = Array.from(
        new Set([...(existing.organizationalUnits || []), ...(normalizedUser.organizationalUnits || [])])
      )
      existing.matrixTeams = Array.from(
        new Set([...(existing.matrixTeams || []), ...(normalizedUser.matrixTeams || [])])
      )
      existing.companies = Array.from(new Set([...(existing.companies || []), ...(normalizedUser.companies || [])]))
      existing.siteLocations = Array.from(
        new Set([...(existing.siteLocations || []), ...(normalizedUser.siteLocations || [])])
      )
      existing.costCenters = Array.from(
        new Set([...(existing.costCenters || []), ...(normalizedUser.costCenters || [])])
      )
      existing.capabilities = Array.from(
        new Set([...(existing.capabilities || []), ...(normalizedUser.capabilities || [])])
      )
      merged.set(normalizedUser.id, existing)
    }

    return Array.from(merged.values())
  }

  /**
   * Map normalized user to OrgUser type
   */
  private mapEmployeeToUser(u: any): OrgUser {
    return {
      id: u.id || '',
      name: u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : '',
      email: u.email || '',
      organizationalUnits: u.organizationalUnits || [],
      matrixTeams: u.matrixTeams || [],
      companies: u.companies || [],
      siteLocations: u.siteLocations || [],
      costCenters: u.costCenters || [],
      capabilities: u.capabilities || [],
      roleId: u.role || '',
      managerId: u.manager || '',
      isActive: true
    }
  }

  /**
   * Get all active users in the organization
   */
  async getAllUsers(): Promise<OrgUser[]> {
    console.log('OrgDirectoryClient: Fetching all users...')
    const positions = await this.fetchPositions({}, 'full')
    console.log('OrgDirectoryClient: Fetched', positions.length, 'positions')
    const users = this.normalizePositionsToUsers(positions)
    console.log('OrgDirectoryClient: Normalized to', users.length, 'unique users')
    return users.map(u => this.mapEmployeeToUser(u))
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<OrgUser | null> {
    const positions = await this.fetchPositions(
      {
        _or: [
          { id: { _eq: String(userId) } },
          { userId: { _eq: String(userId) } },
          { employeeId: { _eq: String(userId) } }
        ]
      },
      'full'
    )

    if (positions.length === 0) return null
    const users = this.normalizePositionsToUsers(positions)
    if (users.length === 0) return null

    return this.mapEmployeeToUser(users[0])
  }

  /**
   * Get users by organizational unit
   */
  async getUsersByOrganizationalUnit(organizationalUnitId: string): Promise<OrgUserBasic[]> {
    const positions = await this.fetchPositions(
      {
        organizationalUnitEmployees: {
          organizationalUnit: {
            id: { _eq: String(organizationalUnitId) }
          }
        }
      },
      'basic'
    )
    return this.mapPositionsToBasicUnique(positions)
  }

  /**
   * Get users by matrix team
   */
  async getUsersByMatrixTeam(matrixTeamId: string): Promise<OrgUserBasic[]> {
    const positions = await this.fetchPositions(
      {
        matrixUnitEmployees: {
          matrixUnit: {
            id: { _eq: String(matrixTeamId) }
          }
        }
      },
      'basic'
    )
    return this.mapPositionsToBasicUnique(positions)
  }

  /**
   * Get users by company
   */
  async getUsersByCompany(companyId: string): Promise<OrgUserBasic[]> {
    const positions = await this.fetchPositions(
      {
        company: {
          id: { _eq: String(companyId) }
        }
      },
      'basic'
    )
    return this.mapPositionsToBasicUnique(positions)
  }

  /**
   * Get users by site location
   */
  async getUsersBySiteLocation(siteLocationId: string): Promise<OrgUserBasic[]> {
    const positions = await this.fetchPositions(
      {
        siteLocation: {
          id: { _eq: String(siteLocationId) }
        }
      },
      'basic'
    )
    return this.mapPositionsToBasicUnique(positions)
  }

  /**
   * Get users by cost center
   */
  async getUsersByCostCenter(costCenterId: string): Promise<OrgUserBasic[]> {
    const positions = await this.fetchPositions(
      {
        costCenter: {
          id: { _eq: String(costCenterId) }
        }
      },
      'basic'
    )
    return this.mapPositionsToBasicUnique(positions)
  }

  /**
   * Get users by capability
   */
  async getUsersByCapability(capabilityId: string): Promise<OrgUserBasic[]> {
    const positions = await this.fetchPositions(
      {
        employeeCapabilities: {
          capability: {
            id: { _eq: String(capabilityId) }
          }
        }
      },
      'basic'
    )
    return this.mapPositionsToBasicUnique(positions)
  }

  /**
   * Get all organizational units (departments and teams)
   */
  async getOrganizationalUnits(): Promise<Array<{ id: string; name: string; type: string }>> {
    console.log('OrgDirectoryClient: Fetching organizational units...')
    const positions = await this.fetchPositions({}, 'full')

    const ouMap = new Map<string, { id: string; name: string; type: string }>()

    for (const p of positions) {
      const ous = Array.isArray(p?.organizationalUnitEmployees) ? p.organizationalUnitEmployees : []

      for (const link of ous) {
        const ou = link?.organizationalUnit
        const ouId = String(ou?.id || '')
        const ouName = String(ou?.name || '')
        const ouType = String(ou?.type || 'DEPARTMENT')

        if (ouId && !ouMap.has(ouId)) {
          ouMap.set(ouId, { id: ouId, name: ouName, type: ouType })
        }
      }
    }

    const units = Array.from(ouMap.values())
    console.log('OrgDirectoryClient: Found', units.length, 'organizational units')
    return units
  }

  /**
   * Get all matrix teams
   */
  async getMatrixTeams(): Promise<Array<{ id: string; name: string }>> {
    console.log('OrgDirectoryClient: Fetching matrix teams...')
    const positions = await this.fetchPositions({}, 'full')

    const matrixMap = new Map<string, { id: string; name: string }>()

    for (const p of positions) {
      const matrixUnits = Array.isArray(p?.matrixUnitEmployees) ? p.matrixUnitEmployees : []

      for (const link of matrixUnits) {
        const matrix = link?.matrixUnit
        const matrixId = String(matrix?.id || '')
        const matrixName = String(matrix?.name || '')

        if (matrixId && !matrixMap.has(matrixId)) {
          matrixMap.set(matrixId, { id: matrixId, name: matrixName })
        }
      }
    }

    const teams = Array.from(matrixMap.values())
    console.log('OrgDirectoryClient: Found', teams.length, 'matrix teams')
    return teams
  }

  /**
   * Get all companies
   */
  async getCompanies(): Promise<Array<{ id: string; name: string }>> {
    console.log('OrgDirectoryClient: Fetching companies...')
    const positions = await this.fetchPositions({}, 'full')

    const companyMap = new Map<string, { id: string; name: string }>()

    for (const p of positions) {
      const company = p?.company
      const companyId = String(company?.id || '')
      const companyName = String(company?.name || '')

      if (companyId && !companyMap.has(companyId)) {
        companyMap.set(companyId, { id: companyId, name: companyName })
      }
    }

    const companies = Array.from(companyMap.values())
    console.log('OrgDirectoryClient: Found', companies.length, 'companies')
    return companies
  }

  /**
   * Get all cost centers
   */
  async getCostCenters(): Promise<Array<{ id: string; name: string }>> {
    console.log('OrgDirectoryClient: Fetching cost centers...')
    const positions = await this.fetchPositions({}, 'full')

    const costCenterMap = new Map<string, { id: string; name: string }>()

    for (const p of positions) {
      const costCenter = p?.costCenter
      const costCenterId = String(costCenter?.id || '')
      const costCenterName = String(costCenter?.name || '')

      if (costCenterId && !costCenterMap.has(costCenterId)) {
        costCenterMap.set(costCenterId, { id: costCenterId, name: costCenterName })
      }
    }

    const costCenters = Array.from(costCenterMap.values())
    console.log('OrgDirectoryClient: Found', costCenters.length, 'cost centers')
    return costCenters
  }

  /**
   * Get all site locations
   */
  async getSiteLocations(): Promise<Array<{ id: string; name: string }>> {
    console.log('OrgDirectoryClient: Fetching site locations...')
    const positions = await this.fetchPositions({}, 'full')

    const locationMap = new Map<string, { id: string; name: string }>()

    for (const p of positions) {
      const location = p?.siteLocation
      const locationId = String(location?.id || '')
      const locationName = String(location?.name || '')

      if (locationId && !locationMap.has(locationId)) {
        locationMap.set(locationId, { id: locationId, name: locationName })
      }
    }

    const locations = Array.from(locationMap.values())
    console.log('OrgDirectoryClient: Found', locations.length, 'site locations')
    return locations
  }

  /**
   * Get all capabilities
   */
  async getCapabilities(): Promise<Array<{ id: string; name: string }>> {
    console.log('OrgDirectoryClient: Fetching capabilities...')
    const positions = await this.fetchPositions({}, 'full')

    const capabilitiesMap = new Map<string, { id: string; name: string }>()

    for (const p of positions) {
      const caps = Array.isArray(p?.employeeCapabilities) ? p.employeeCapabilities : []

      for (const link of caps) {
        const capability = link?.capability
        const capabilityId = String(capability?.id || '')
        const capabilityName = String(capability?.name || '')

        if (capabilityId && !capabilitiesMap.has(capabilityId)) {
          capabilitiesMap.set(capabilityId, { id: capabilityId, name: capabilityName })
        }
      }
    }

    const capabilities = Array.from(capabilitiesMap.values())
    console.log('OrgDirectoryClient: Found', capabilities.length, 'capabilities')
    return capabilities
  }

  /**
   * Get all organizational data in a single optimized call
   * This method fetches positions once and extracts all data types from it
   * MUCH more efficient than calling individual methods separately
   */
  async getAllOrganizationalData(): Promise<{
    users: OrgUser[]
    organizationalUnits: Array<{ id: string; name: string; type: string }>
    matrixTeams: Array<{ id: string; name: string }>
    companies: Array<{ id: string; name: string }>
    costCenters: Array<{ id: string; name: string }>
    siteLocations: Array<{ id: string; name: string }>
    capabilities: Array<{ id: string; name: string }>
  }> {
    // Fetch positions once with full data
    const positions = await this.fetchPositions({}, 'full')

    // Extract users
    const normalizedUsers = this.normalizePositionsToUsers(positions)
    const users = normalizedUsers.map(u => this.mapEmployeeToUser(u))

    // Extract organizational units
    const ouMap = new Map<string, { id: string; name: string; type: string }>()
    for (const p of positions) {
      const ous = Array.isArray(p?.organizationalUnitEmployees) ? p.organizationalUnitEmployees : []
      for (const link of ous) {
        const ou = link?.organizationalUnit
        const ouId = String(ou?.id || '')
        const ouName = String(ou?.name || '')
        const ouType = String(ou?.type || 'DEPARTMENT')
        if (ouId && !ouMap.has(ouId)) {
          ouMap.set(ouId, { id: ouId, name: ouName, type: ouType })
        }
      }
    }
    const organizationalUnits = Array.from(ouMap.values())

    // Extract matrix teams
    const matrixMap = new Map<string, { id: string; name: string }>()
    for (const p of positions) {
      const matrixUnits = Array.isArray(p?.matrixUnitEmployees) ? p.matrixUnitEmployees : []
      for (const link of matrixUnits) {
        const matrix = link?.matrixUnit
        const matrixId = String(matrix?.id || '')
        const matrixName = String(matrix?.name || '')
        if (matrixId && !matrixMap.has(matrixId)) {
          matrixMap.set(matrixId, { id: matrixId, name: matrixName })
        }
      }
    }
    const matrixTeams = Array.from(matrixMap.values())

    // Extract companies
    const companyMap = new Map<string, { id: string; name: string }>()
    for (const p of positions) {
      const company = p?.company
      const companyId = String(company?.id || '')
      const companyName = String(company?.name || '')
      if (companyId && !companyMap.has(companyId)) {
        companyMap.set(companyId, { id: companyId, name: companyName })
      }
    }
    const companies = Array.from(companyMap.values())

    // Extract cost centers
    const costCenterMap = new Map<string, { id: string; name: string }>()
    for (const p of positions) {
      const costCenter = p?.costCenter
      const costCenterId = String(costCenter?.id || '')
      const costCenterName = String(costCenter?.name || '')
      if (costCenterId && !costCenterMap.has(costCenterId)) {
        costCenterMap.set(costCenterId, { id: costCenterId, name: costCenterName })
      }
    }
    const costCenters = Array.from(costCenterMap.values())

    // Extract site locations
    const locationMap = new Map<string, { id: string; name: string }>()
    for (const p of positions) {
      const location = p?.siteLocation
      const locationId = String(location?.id || '')
      const locationName = String(location?.name || '')
      if (locationId && !locationMap.has(locationId)) {
        locationMap.set(locationId, { id: locationId, name: locationName })
      }
    }
    const siteLocations = Array.from(locationMap.values())

    // Extract capabilities
    const capabilitiesMap = new Map<string, { id: string; name: string }>()
    for (const p of positions) {
      const caps = Array.isArray(p?.employeeCapabilities) ? p.employeeCapabilities : []
      for (const link of caps) {
        const capability = link?.capability
        const capabilityId = String(capability?.id || '')
        const capabilityName = String(capability?.name || '')
        if (capabilityId && !capabilitiesMap.has(capabilityId)) {
          capabilitiesMap.set(capabilityId, { id: capabilityId, name: capabilityName })
        }
      }
    }
    const capabilities = Array.from(capabilitiesMap.values())

    return {
      users,
      organizationalUnits,
      matrixTeams,
      companies,
      costCenters,
      siteLocations,
      capabilities
    }
  }

  /**
   * Get organizational information (departments, roles, capabilities, etc.)
   */
  async getOrganizationalInfo(): Promise<{
    structureId: string
    departments: Array<{ id: string; name: string; description: string }>
    roles: Array<{ id: string; name: string }>
    teams: Array<{
      id: string
      name: string
      description: string
      leaderId: string
      departmentId: string
      memberIds: string[]
    }>
    capabilities: Array<{ id: string; name: string }>
    userCount: number
  }> {
    const positions = await this.fetchPositions({}, 'full')

    const structureId = positions.length > 0 ? String(positions[0]?.structureId || '') : ''
    const ouMap = new Map<string, any>()
    const rolesMap = new Map<string, any>()
    const capabilitiesMap = new Map<string, any>()

    for (const p of positions) {
      const ous = Array.isArray(p?.organizationalUnitEmployees) ? p.organizationalUnitEmployees : []

      for (const link of ous) {
        const role = link?.jobPositionId
        const ou = link?.organizationalUnit
        const ouId = String(ou?.id || '')

        if (role && !rolesMap.has(role)) {
          rolesMap.set(role, { id: role, name: String(role) })
        }
        if (ouId && !ouMap.has(ouId)) {
          ouMap.set(ouId, {
            id: ouId,
            name: String(ou?.name || ''),
            description: '',
            type: String(ou?.type || '')
          })
        }
      }

      const caps = Array.isArray(p?.employeeCapabilities) ? p.employeeCapabilities : []
      for (const link of caps) {
        const cap = link?.capability
        const capId = String(cap?.id || '')
        if (capId && !capabilitiesMap.has(capId)) {
          capabilitiesMap.set(capId, { id: capId, name: String(cap?.name || '') })
        }
      }
    }

    const departments: any[] = []
    const teams: any[] = []
    for (const ou of Array.from(ouMap.values())) {
      const common = {
        id: String(ou?.id || ''),
        name: String(ou?.name || ''),
        description: String(ou?.description || '')
      }

      if (String(ou?.type || '') === 'TEAM') {
        teams.push({
          ...common,
          leaderId: '',
          departmentId: '',
          memberIds: []
        })
      } else if (String(ou?.type || '') === 'DEPARTMENT') {
        departments.push(common)
      }
    }

    const uniqueIds = new Set<string>()
    for (const position of positions) {
      uniqueIds.add(this.normalizeIdFromPosition(position))
    }

    return {
      structureId,
      departments,
      roles: Array.from(rolesMap.values()),
      teams,
      capabilities: Array.from(capabilitiesMap.values()),
      userCount: uniqueIds.size
    }
  }
}
