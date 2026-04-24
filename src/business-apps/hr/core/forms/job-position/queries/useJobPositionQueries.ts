import { EMPLOYEES_API_URL } from '@/common/utils/serviceResolver.ts'
import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient.ts'
import { useRestClient } from '@/common/network/rest/useRestClient.ts'
import {
  JobPositionMutationPayload,
  JobPositionDeletionPayload,
  GetDepartmentsResponse,
  GetJobFunctionsResponse,
  GetJobProfilesResponse,
  GetSiteLocationsResponse,
  JobPositionFilters,
  JobFunctionFilters,
  JobProfileFilters,
  SiteLocationFilters,
  JobPosition
} from '@/business-apps/hr/core/forms/job-position/utils/JobPosition.types.ts'
import {
  createSearchCondition,
  createWhereCondition
} from '@/business-apps/mdm/apps/job-structure-data/utils/searchQueries.ts'

// ─── Query Parameters ───────────────────────────────────────────────────────

export interface JobPositionQueryParameters extends JobPositionFilters {
  jobPositionId?: string
  offset?: number
  limit?: number
}

export interface DepartmentQueryParameters {
  structureId: string | null
  departmentId?: string
  offset?: number
  limit?: number
  search?: string
}

export interface JobFamilyQueryParameters {
  jobFamilyId?: string
  offset?: number
  limit?: number
  search?: string
}

export interface JobFunctionQueryParameters extends JobFunctionFilters {
  jobFunctionId?: string
  offset?: number
  limit?: number
}

export interface JobLevelQueryParameters {
  jobLevelId?: string
  offset?: number
  limit?: number
  search?: string
}

export interface JobProfileQueryParameters extends JobProfileFilters {
  jobProfileId?: string
  jobFamilyId?: string
  offset?: number
  limit?: number
}

export interface SiteLocationQueryParameters extends SiteLocationFilters {
  structureId: string | null
  siteLocationId?: string
  offset?: number
  limit?: number
}

// ─── GraphQL Queries ─────────────────────────────────────────────────────────

function GET_DEPARTMENT_DATA(params: DepartmentQueryParameters): string {
  const { offset, limit, search, departmentId, structureId } = params
  const structureCondition = structureId ? `, structureId: {_eq: "${structureId}"}` : ''

  const searchCondition = createSearchCondition(search, departmentId)
  const whereCondition = createWhereCondition(departmentId).concat(structureCondition)
  const whereClause = `${whereCondition} ${searchCondition}`

  return `query getDepartmentData {
    departments: OrganizationalUnit(
      orderBy: {name: ASC},
      limit: ${limit},
      offset: ${offset},
      where: { ${whereClause} }) {
      id
      name
      code
    }
    DepartmentAggregate: OrganizationalUnitAggregate(
      where: { ${whereClause}}
    ) {
      aggregate {
        count
      }
    }
  }`
}

function GET_JOB_FUNCTION_DATA(params: JobFunctionQueryParameters): string {
  const { offset, limit, search, jobFunctionId, jobFamilyId } = params

  const whereConditions = []

  if (jobFunctionId) {
    whereConditions.push(`id: {_eq: "${jobFunctionId}"}`)
  }
  if (jobFamilyId) {
    whereConditions.push(`jobFamilyId: {_eq: "${jobFamilyId}"}`)
  }
  if (search) {
    whereConditions.push(`_or: [{name: {_ilike: "%${search}%"}}, {code: {_ilike: "%${search}%"}}]`)
  }

  whereConditions.push('isDeleted: {_eq: false}')

  const whereClause = whereConditions.length > 0 ? whereConditions.join(', ') : ''

  return `query getJobFunctionData {
    jobFunctions: JobFunction(
      orderBy: {name: ASC},
      limit: ${limit},
      offset: ${offset},
      where: { ${whereClause} }) {
      id
      code
      name
      description
      jobFamily {
        id
        code
        name
        description
      }
    }
    JobFunctionAggregate(
      where: { ${whereClause} }
    ) {
      aggregate {
        count
      }
    }
  }`
}

function GET_JOB_PROFILE_DATA(params: JobProfileQueryParameters): string {
  const { offset, limit, search, jobProfileId, jobFunctionId, jobFamilyId, jobLevelId } = params

  const whereConditions = []

  if (jobProfileId) {
    whereConditions.push(`id: {_eq: "${jobProfileId}"}`)
  }
  if (jobFunctionId) {
    whereConditions.push(`jobFunctionId: {_eq: "${jobFunctionId}"}`)
  }
  if (jobFamilyId) {
    whereConditions.push(`jobFunction: {jobFamilyId: {_eq: "${jobFamilyId}"}}`)
  }
  if (jobLevelId) {
    whereConditions.push(`jobLevelId: {_eq: "${jobLevelId}"}`)
  }
  if (search) {
    whereConditions.push(
      `_or: [{name: {_ilike: "%${search}%"}}, {code: {_ilike: "%${search}%"}}, {title: {_ilike: "%${search}%"}}]`
    )
  }

  whereConditions.push('isDeleted: {_eq: false}')

  const whereClause = whereConditions.length > 0 ? whereConditions.join(', ') : ''

  return `query getJobProfileData {
    jobProfiles: JobProfile(
      orderBy: {name: ASC},
      limit: ${limit},
      offset: ${offset},
      where: { ${whereClause} }) {
      id
      code
      title
      name
      description
      jobFunctionId
      jobFunction {
        id
        code
        name
        jobFamily {
          id
          code
          name
        }
      }
      jobLevelId
      jobLevel {
        id
        code
        name
        hierarchyOrder
      }
    }
    JobProfileAggregate(
      where: { ${whereClause} }
    ) {
      aggregate {
        count
      }
    }
  }`
}

function GET_SITE_LOCATION_DATA(params: SiteLocationQueryParameters): string {
  const { offset, limit, search, siteLocationId, structureId } = params
  const structureCondition = structureId ? `, structureId: {_eq: "${structureId}"}` : ''

  const searchCondition = createSearchCondition(search, siteLocationId, false)
  const whereCondition = createWhereCondition(siteLocationId).concat(structureCondition)
  const whereClause = `${whereCondition} ${searchCondition}`

  return `query getSiteLocationData {
    siteLocations: SiteLocation(
      orderBy: {name: ASC},
      limit: ${limit},
      offset: ${offset},
      where: { ${whereClause} }) {
      id
      name
      code
    }
    SiteLocationAggregate(
      where: { ${whereClause} }
    ) {
      aggregate {
        count
      }
    }
  }`
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useJobPositionQueries(accessToken: string) {
  const graphQLClient = useGraphQLClient(accessToken)
  const restClient = useRestClient(EMPLOYEES_API_URL)

  // Site Location queries
  const fetchSiteLocations = useCallback(
    async (params: SiteLocationQueryParameters): Promise<GetSiteLocationsResponse> => {
      const query = GET_SITE_LOCATION_DATA({
        limit: params.limit || 100,
        offset: params.offset || 0,
        search: params.search,
        siteLocationId: params.siteLocationId,
        structureId: params.structureId
      })

      try {
        return await graphQLClient.request<GetSiteLocationsResponse>(query)
      } catch (error) {
        console.error('Error fetching site location data:', error)
        throw error
      }
    },
    [graphQLClient]
  )

  // Department queries
  const fetchDepartments = useCallback(
    async (params: DepartmentQueryParameters): Promise<GetDepartmentsResponse> => {
      const query = GET_DEPARTMENT_DATA({
        limit: params.limit || 100,
        offset: params.offset || 0,
        search: params.search,
        departmentId: params.departmentId,
        structureId: params.structureId
      })

      try {
        return await graphQLClient.request<GetDepartmentsResponse>(query)
      } catch (error) {
        console.error('Error fetching department data:', error)
        throw error
      }
    },
    [graphQLClient]
  )

  // Job Function queries (filtered by job family)
  const fetchJobFunctions = useCallback(
    async (params: JobFunctionQueryParameters = {}): Promise<GetJobFunctionsResponse> => {
      const query = GET_JOB_FUNCTION_DATA({
        limit: params.limit || 100,
        offset: params.offset || 0,
        search: params.search,
        jobFunctionId: params.jobFunctionId,
        jobFamilyId: params.jobFamilyId
      })

      try {
        return await graphQLClient.request<GetJobFunctionsResponse>(query)
      } catch (error) {
        console.error('Error fetching job function data:', error)
        throw error
      }
    },
    [graphQLClient]
  )

  // Job Profile queries (filtered by job function, job family, and job level)
  const fetchJobProfiles = useCallback(
    async (params: JobProfileQueryParameters = {}): Promise<GetJobProfilesResponse> => {
      const query = GET_JOB_PROFILE_DATA({
        limit: params.limit || 100,
        offset: params.offset || 0,
        search: params.search,
        jobProfileId: params.jobProfileId,
        jobFunctionId: params.jobFunctionId,
        jobFamilyId: params.jobFamilyId,
        jobLevelId: params.jobLevelId
      })

      try {
        return await graphQLClient.request<GetJobProfilesResponse>(query)
      } catch (error) {
        console.error('Error fetching job profile data:', error)
        throw error
      }
    },
    [graphQLClient]
  )

  // Mutation operations - simplified and streamlined
  const saveJobPosition = useCallback(
    async (payload: JobPositionMutationPayload | JobPositionDeletionPayload): Promise<JobPosition | void> => {
      try {
        const response = await restClient.post('/saveJobPosition', payload, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        return payload.changeMode == 'DELETE' ? undefined : response.data
      } catch (error: any) {
        console.error('Failed to save job position:', error)
        if (error.response?.status === 401) {
          throw new Error('Authentication failed')
        } else if (error.response?.status === 400) {
          throw new Error('Invalid data provided')
        }
        const action = payload.changeMode === 'INSERT' ? 'create new' : payload.changeMode.toLowerCase()
        throw new Error(`Failed to ${action} job position`)
      }
    },
    [restClient, accessToken]
  )

  return {
    // Fetch operations
    fetchSiteLocations,
    fetchDepartments,
    fetchJobFunctions,
    fetchJobProfiles,

    // Simplified mutation operation
    saveJobPosition
  }
}
