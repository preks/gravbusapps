import type { GraphQLClient } from '@/common/network/graphql/GraphQLClient'
import type { DataQualityFilters } from '../types/dataQuality.types'
import {
  DATA_QUALITY_EMPLOYEES,
  DATA_QUALITY_JOB_ARCHITECTURE,
  FILTER_ORG_UNITS,
  FILTER_SITE_LOCATIONS,
  GET_ACTIVE_STRUCTURE_ID
} from './dataQualityQueries'

/** Safety cap until BFF pagination exists (see dataQualityBff.contract.ts). */
export const DATA_QUALITY_EMPLOYEE_LIMIT = 8000
const JOB_POSITION_SAMPLE_LIMIT = 500
const JOB_PROFILE_SAMPLE_LIMIT = 2000

type RawHourValue = number | string | null

export interface RawEmployeeRow {
  id: string
  fullName?: string | null
  displayName?: string | null
  code?: string | null
  companyEmployees: Array<{ companyId?: string | null; company?: { id: string; name?: string | null } | null }>
  employeePositions: Array<{
    id: string
    structureId?: string | null
    companyId?: string | null
    company?: { id: string; name?: string | null } | null
    siteLocationId?: string | null
    siteLocation?: { id: string; name?: string | null } | null
    costCenterId?: string | null
    costCenter?: { id: string; name?: string | null } | null
    organizationalUnitId?: string | null
    organizationalUnit?: { id: string; name?: string | null } | null
    jobPositionId?: string | null
    hireDate?: string | null
    jobPosition?: {
      id: string
      name?: string | null
      jobProfileId?: string | null
      jobProfile?: {
        id: string
        name?: string | null
        description?: string | null
        descriptionI18n?: unknown
        jobProfileSkillsAggregate?: { aggregate?: { count?: number | null } | null } | null
      } | null
    } | null
  }>
  workingCondition: Array<{
    contractTypeRef?: string | null
    employmentTypeRef?: string | null
    hireDate?: string | null
  }>
  workingHours: Array<{
    weeklyHours?: RawHourValue
    mondayHours?: RawHourValue
    tuesdayHours?: RawHourValue
    wednesdayHours?: RawHourValue
    thursdayHours?: RawHourValue
    fridayHours?: RawHourValue
    saturdayHours?: RawHourValue
    sundayHours?: RawHourValue
  }>
  taxDetails: Array<{
    taxIdentificationNumber?: string | null
    socialSecurityNumber?: string | null
    taxNumber?: string | null
  }>
  bankAccounts: Array<{ id: string; iban?: string | null; accountNumber?: string | null }>
}

export interface RawJobArchitecture {
  jobPositionsTotal: { aggregate?: { count?: number | null } | null }
  jobPositionsMissingProfile: { aggregate?: { count?: number | null } | null }
  jobPositionsSample: Array<{
    id: string
    name?: string | null
    version?: number | null
    activeTo?: string | null
    jobProfileId?: string | null
    jobProfile?: { id: string; name?: string | null; code?: string | null } | null
    jobFunction?: {
      id: string
      name?: string | null
      code?: string | null
      jobFamily?: { id: string; name?: string | null; code?: string | null } | null
    } | null
    jobLevel?: { id: string; name?: string | null; code?: string | null; hierarchyOrder?: number | null } | null
    employeePositions?: Array<{
      firstName?: string | null
      lastName?: string | null
      employeeId?: string | null
      supervisor?: { id: string; firstName?: string | null; lastName?: string | null } | null
    }>
    organizationalUnitEmployees?: Array<{
      organizationalUnit?: { id?: string; name?: string | null } | null
      siteLocation?: { id?: string; name?: string | null } | null
    }>
  }>
  jobProfiles: Array<{
    id: string
    name?: string | null
    code?: string | null
    description?: string | null
    descriptionI18n?: unknown
    jobFunction?: { id: string; name?: string | null; code?: string | null } | null
    jobLevel?: { id: string; name?: string | null; code?: string | null; hierarchyOrder?: number | null } | null
    jobProfileSkills?: Array<{
      id: string
      requiredLevel?: number | null
      skill?: { id: string; name?: string | null } | null
    }>
    jobProfileSkillsAggregate?: { aggregate?: { count?: number | null } | null }
  }>
}

export function buildEmployeeWhereClause(filters: DataQualityFilters, structureId: string): Record<string, unknown> {
  const parts: Record<string, unknown>[] = [{ isDeleted: { _eq: false } }]

  const posFilter: Record<string, unknown> = {
    exitDate: { _isNull: true },
    structureId: { _eq: structureId }
  }
  if (filters.companyId) {
    posFilter.companyId = { _eq: filters.companyId }
  }
  if (filters.siteLocationId) {
    posFilter.siteLocationId = { _eq: filters.siteLocationId }
  }
  if (filters.organizationalUnitId) {
    posFilter.organizationalUnitId = { _eq: filters.organizationalUnitId }
  }

  parts.push({ employeePositions: posFilter })

  const search = filters.search?.trim()
  if (search) {
    const q = `%${search}%`
    parts.push({
      _or: [{ fullName: { _ilike: q } }, { displayName: { _ilike: q } }, { code: { _ilike: q } }]
    })
  }

  return { _and: parts }
}

export async function fetchActiveStructureId(client: GraphQLClient): Promise<string | null> {
  const res = await client.request<{ Structure: Array<{ id: string }> }>(GET_ACTIVE_STRUCTURE_ID)
  return res.Structure?.[0]?.id ?? null
}

export async function fetchEmployeesForDataQuality(
  client: GraphQLClient,
  filters: DataQualityFilters,
  structureId: string
): Promise<RawEmployeeRow[]> {
  const where = buildEmployeeWhereClause(filters, structureId)
  const res = await client.request<{ Employee: RawEmployeeRow[] }>(DATA_QUALITY_EMPLOYEES, {
    where,
    limit: DATA_QUALITY_EMPLOYEE_LIMIT,
    structureId
  })
  return res.Employee ?? []
}

export async function fetchEmployeeForDataQuality(
  client: GraphQLClient,
  employeeId: string,
  filters: DataQualityFilters,
  structureId: string
): Promise<RawEmployeeRow | null> {
  const baseWhere = buildEmployeeWhereClause(filters, structureId) as { _and?: Array<Record<string, unknown>> }
  const where = {
    _and: [{ id: { _eq: employeeId } }, ...(baseWhere._and ?? [])]
  }
  const res = await client.request<{ Employee: RawEmployeeRow[] }>(DATA_QUALITY_EMPLOYEES, {
    where,
    limit: 1,
    structureId
  })
  return res.Employee?.[0] ?? null
}

export async function fetchJobArchitecture(client: GraphQLClient, structureId: string): Promise<RawJobArchitecture> {
  return client.request<RawJobArchitecture>(DATA_QUALITY_JOB_ARCHITECTURE, {
    jpLimit: JOB_POSITION_SAMPLE_LIMIT,
    jprofLimit: JOB_PROFILE_SAMPLE_LIMIT,
    structureId
  })
}

export async function fetchSiteLocations(
  client: GraphQLClient
): Promise<Array<{ id: string; name?: string | null; code?: string | null }>> {
  const res = await client.request<{ SiteLocation: Array<{ id: string; name?: string | null; code?: string | null }> }>(
    FILTER_SITE_LOCATIONS,
    { limit: 800 }
  )
  return res.SiteLocation ?? []
}

export async function fetchOrgUnits(
  client: GraphQLClient,
  structureId: string
): Promise<Array<{ id: string; name?: string | null }>> {
  const res = await client.request<{ OrganizationalUnit: Array<{ id: string; name?: string | null }> }>(
    FILTER_ORG_UNITS,
    { structureId, limit: 800 }
  )
  return res.OrganizationalUnit ?? []
}
