import { GraphQLClient } from '../graphql/GraphQLClient'
import { env } from '@/common/env/EnvUtils'

/**
 * Basic user information
 */
export interface OrgUserBasic {
  id: string
  name: string
  email: string
  avatarUrl?: string
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
        userId
        pictureThumbnail
        communication(
          where: {purpose: {_eq: "INTERNAL"}, value: {_neq: ""}, _or: {channelRef: {_eq: "CommunicationChannel:v1:e-mail"}}}
        ) { value }
      }
    `
  }

  /**
   * Position selection for full queries (includes all organizational data)
   * Filters out deleted entities at the query level for array relationships
   * For object relationships (siteLocation, company, costCenter), filtering happens in the extraction methods
   * structureId is included to filter entities from same structure at application level
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
      siteLocation { 
        id 
        country { 
          id 
          translations {
            value
            localeCode
          }
        }
        region { 
          id 
          translations {
            value
            localeCode
          }
        }
      }
      company { id name isDeleted }
      costCenter { id name isDeleted }
      employeeCapabilities(where: {capability: {isDeleted: {_eq: false}}}) { 
        capability { id name isDeleted structureId } 
      }
      matrixUnitEmployees(where: {matrixUnit: {isDeleted: {_eq: false}}}) { 
        matrixUnit { id name isDeleted structureId } 
      }
      organizationalUnitEmployees(where: {organizationalUnit: {isDeleted: {_eq: false}}}) { 
        organizationalUnit { id name type isDeleted structureId } 
        jobPositionId 
      }
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
   * Priority: employee.userId (Keycloak ID) > position.userId > employeeId > id
   * Note: employee.userId is the Keycloak ID used by chat service
   */
  private normalizeIdFromPosition(p: any): string {
    const email =
      Array.isArray(p?.employee?.communication) && p.employee.communication.length > 0
        ? String(p.employee.communication[0]?.value || '')
        : ''

    // Use employee.userId (Keycloak ID) as primary - this is what chat service needs
    return String(
      p?.employee?.userId ||
        p?.userId ||
        p?.employeeId ||
        p?.id ||
        email ||
        `${p?.firstName || ''} ${p?.lastName || ''}`.trim()
    )
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
      // Convert pictureThumbnail to data URL for avatar display (same as UserSelector)
      const avatarUrl = p?.employee?.pictureThumbnail
        ? `data:image/png;base64,${p.employee.pictureThumbnail}`
        : undefined

      if (!map.has(id)) map.set(id, { id, name, email, avatarUrl })
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
   * Get all active users with avatar URLs (lightweight query).
   * Uses the basic selection which includes pictureThumbnail.
   * No userId filter — includes all employees in the active org structure
   * who have an internal email communication record.
   */
  async getAllUsersBasic(): Promise<OrgUserBasic[]> {
    const positions = await this.fetchPositions({}, 'basic')
    return this.mapPositionsToBasicUnique(positions)
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
          { employeeId: { _eq: String(userId) } },
          { employee: { userId: { _eq: String(userId) } } }
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
   * Only returns users with valid Keycloak userId (required for chat service)
   */
  async getUsersByOrganizationalUnit(organizationalUnitId: string): Promise<OrgUserBasic[]> {
    const positions = await this.fetchPositions(
      {
        employee: { userId: { _isNull: false } },
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
   * Get the manager's userId for a team (organizational unit).
   * Uses the supervisor of the first position found in that org unit.
   * Returns null if the org unit has no positions or the supervisor has no userId.
   */
  async getTeamManagerUserId(organizationalUnitId: string): Promise<string | null> {
    const where = this.buildActiveWhere({
      organizationalUnitEmployees: {
        organizationalUnit: {
          id: { _eq: String(organizationalUnitId) }
        }
      }
    })
    const query = `
      query TeamManagerUserId($where: EmployeePositionBoolExp!) {
        EmployeePosition(where: $where, limit: 1) {
          supervisorEmployeeId
          supervisorEmployee {
            userId
          }
        }
      }
    `
    const data = await this.client.request<{
      EmployeePosition: Array<{
        supervisorEmployeeId?: string | null
        supervisorEmployee?: { userId?: string | null } | null
      }>
    }>(query, { where })
    const position = data?.EmployeePosition?.[0]
    const userId = position?.supervisorEmployee?.userId ?? null
    return userId ? String(userId) : null
  }

  /**
   * Get users by matrix team
   * Only returns users with valid Keycloak userId (required for chat service)
   */
  async getUsersByMatrixTeam(matrixTeamId: string): Promise<OrgUserBasic[]> {
    const positions = await this.fetchPositions(
      {
        employee: { userId: { _isNull: false } },
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
   * Only returns users with valid Keycloak userId (required for chat service)
   */
  async getUsersByCompany(companyId: string): Promise<OrgUserBasic[]> {
    const positions = await this.fetchPositions(
      {
        employee: { userId: { _isNull: false } },
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
   * Only returns users with valid Keycloak userId (required for chat service)
   */
  async getUsersBySiteLocation(siteLocationId: string): Promise<OrgUserBasic[]> {
    const positions = await this.fetchPositions(
      {
        employee: { userId: { _isNull: false } },
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
   * Only returns users with valid Keycloak userId (required for chat service)
   */
  async getUsersByCostCenter(costCenterId: string): Promise<OrgUserBasic[]> {
    const positions = await this.fetchPositions(
      {
        employee: { userId: { _isNull: false } },
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
   * Only returns users with valid Keycloak userId (required for chat service)
   */
  async getUsersByCapability(capabilityId: string): Promise<OrgUserBasic[]> {
    const positions = await this.fetchPositions(
      {
        employee: { userId: { _isNull: false } },
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
   * Get all organizational units (departments and teams) from active structure
   */
  async getOrganizationalUnits(): Promise<Array<{ id: string; name: string; type: string }>> {
    console.log('OrgDirectoryClient: Fetching organizational units...')
    const positions = await this.fetchPositions({}, 'full')

    const ouMap = new Map<string, { id: string; name: string; type: string }>()

    for (const p of positions) {
      const positionStructureId = String(p?.structureId || '')
      const ous = Array.isArray(p?.organizationalUnitEmployees) ? p.organizationalUnitEmployees : []

      for (const link of ous) {
        const ou = link?.organizationalUnit
        // Skip deleted organizational units
        if (ou?.isDeleted) continue
        // Skip if OU is from different structure than position
        const ouStructureId = String(ou?.structureId || '')
        if (ouStructureId && positionStructureId && ouStructureId !== positionStructureId) continue

        const ouId = String(ou?.id || '')
        const ouName = String(ou?.name || '')
        const ouType = String(ou?.type || 'DEPARTMENT')

        if (ouId && !ouMap.has(ouId)) {
          ouMap.set(ouId, { id: ouId, name: ouName, type: ouType })
        }
      }
    }

    const units = Array.from(ouMap.values())
    console.log('OrgDirectoryClient: Found', units.length, 'organizational units from active structure')
    return units
  }

  /**
   * Get all matrix teams from active structure
   */
  async getMatrixTeams(): Promise<Array<{ id: string; name: string }>> {
    console.log('OrgDirectoryClient: Fetching matrix teams...')
    const positions = await this.fetchPositions({}, 'full')

    const matrixMap = new Map<string, { id: string; name: string }>()

    for (const p of positions) {
      const positionStructureId = String(p?.structureId || '')
      const matrixUnits = Array.isArray(p?.matrixUnitEmployees) ? p.matrixUnitEmployees : []

      for (const link of matrixUnits) {
        const matrix = link?.matrixUnit
        // Skip deleted matrix teams
        if (matrix?.isDeleted) continue
        // Skip if matrix team is from different structure than position
        const matrixStructureId = String(matrix?.structureId || '')
        if (matrixStructureId && positionStructureId && matrixStructureId !== positionStructureId) continue

        const matrixId = String(matrix?.id || '')
        const matrixName = String(matrix?.name || '')

        if (matrixId && !matrixMap.has(matrixId)) {
          matrixMap.set(matrixId, { id: matrixId, name: matrixName })
        }
      }
    }

    const teams = Array.from(matrixMap.values())
    console.log('OrgDirectoryClient: Found', teams.length, 'matrix teams from active structure')
    return teams
  }

  /**
   * Get all companies (legal entities)
   */
  async getCompanies(): Promise<Array<{ id: string; name: string }>> {
    console.log('OrgDirectoryClient: Fetching companies...')
    const positions = await this.fetchPositions({}, 'full')

    const companyMap = new Map<string, { id: string; name: string }>()

    for (const p of positions) {
      const company = p?.company
      // Skip deleted companies
      if (company?.isDeleted) continue

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
      // Skip deleted cost centers
      if (costCenter?.isDeleted) continue

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
      if (!location) continue

      const locationId = String(location?.id || '')

      // Construct name from country and region catalog entries
      const countryName = location?.country?.value || location?.country?.code || ''
      const regionName = location?.region?.value || location?.region?.code || ''
      const locationName = [countryName, regionName].filter(Boolean).join(', ') || locationId

      if (locationId && !locationMap.has(locationId)) {
        locationMap.set(locationId, { id: locationId, name: locationName })
      }
    }

    const locations = Array.from(locationMap.values())
    console.log('OrgDirectoryClient: Found', locations.length, 'site locations')
    return locations
  }

  /**
   * Get all capabilities from the active org chart structure
   * Only returns capabilities that belong to the same structure as the positions
   */
  async getCapabilities(): Promise<Array<{ id: string; name: string }>> {
    console.log('OrgDirectoryClient: Fetching capabilities...')
    const positions = await this.fetchPositions({}, 'full')

    // First, collect all active structure IDs from positions
    const activeStructureIds = new Set<string>()
    for (const p of positions) {
      if (p?.structureId) {
        activeStructureIds.add(String(p.structureId))
      }
    }
    console.log('OrgDirectoryClient: Active structure IDs:', Array.from(activeStructureIds))

    const capabilitiesMap = new Map<string, { id: string; name: string }>()

    for (const p of positions) {
      const positionStructureId = String(p?.structureId || '')
      const caps = Array.isArray(p?.employeeCapabilities) ? p.employeeCapabilities : []

      for (const link of caps) {
        const capability = link?.capability
        // Skip deleted capabilities
        if (capability?.isDeleted) continue

        // Only include capabilities from the same structure as the position (active structure)
        const capabilityStructureId = String(capability?.structureId || '')
        if (capabilityStructureId && positionStructureId && capabilityStructureId !== positionStructureId) {
          continue
        }

        const capabilityId = String(capability?.id || '')
        const capabilityName = String(capability?.name || '')

        if (capabilityId && !capabilitiesMap.has(capabilityId)) {
          capabilitiesMap.set(capabilityId, { id: capabilityId, name: capabilityName })
        }
      }
    }

    const capabilities = Array.from(capabilitiesMap.values())
    console.log('OrgDirectoryClient: Found', capabilities.length, 'capabilities from active structure')
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

    // Extract organizational units - only from same structure as position (active structure)
    const ouMap = new Map<string, { id: string; name: string; type: string }>()
    for (const p of positions) {
      const positionStructureId = String(p?.structureId || '')
      const ous = Array.isArray(p?.organizationalUnitEmployees) ? p.organizationalUnitEmployees : []
      for (const link of ous) {
        const ou = link?.organizationalUnit
        // Skip if OU is from different structure than position
        const ouStructureId = String(ou?.structureId || '')
        if (ouStructureId && positionStructureId && ouStructureId !== positionStructureId) {
          continue
        }
        const ouId = String(ou?.id || '')
        const ouName = String(ou?.name || '')
        const ouType = String(ou?.type || 'DEPARTMENT')
        if (ouId && !ouMap.has(ouId)) {
          ouMap.set(ouId, { id: ouId, name: ouName, type: ouType })
        }
      }
    }
    const organizationalUnits = Array.from(ouMap.values())

    // Extract matrix teams - only from same structure as position (active structure)
    const matrixMap = new Map<string, { id: string; name: string }>()
    for (const p of positions) {
      const positionStructureId = String(p?.structureId || '')
      const matrixUnits = Array.isArray(p?.matrixUnitEmployees) ? p.matrixUnitEmployees : []
      for (const link of matrixUnits) {
        const matrix = link?.matrixUnit
        // Skip if matrix team is from different structure than position
        const matrixStructureId = String(matrix?.structureId || '')
        if (matrixStructureId && positionStructureId && matrixStructureId !== positionStructureId) {
          continue
        }
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
      if (!location) continue

      const locationId = String(location?.id || '')
      // Construct name from country and region catalog entries
      const countryName = location?.country?.value || location?.country?.code || ''
      const regionName = location?.region?.value || location?.region?.code || ''
      const locationName = [countryName, regionName].filter(Boolean).join(', ') || locationId

      if (locationId && !locationMap.has(locationId)) {
        locationMap.set(locationId, { id: locationId, name: locationName })
      }
    }
    const siteLocations = Array.from(locationMap.values())

    // Extract capabilities - only from same structure as position (active structure)
    const capabilitiesMap = new Map<string, { id: string; name: string }>()
    for (const p of positions) {
      const positionStructureId = String(p?.structureId || '')
      const caps = Array.isArray(p?.employeeCapabilities) ? p.employeeCapabilities : []
      for (const link of caps) {
        const capability = link?.capability
        // Skip if capability is from different structure than position
        const capabilityStructureId = String(capability?.structureId || '')
        if (capabilityStructureId && positionStructureId && capabilityStructureId !== positionStructureId) {
          continue
        }
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
