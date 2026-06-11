import { EMPLOYEES_API_URL } from '@/common/utils/serviceResolver.ts'
import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { JobProfileMutationPayload, JobProfileDeletionPayload, GetJobProfilesResponse } from '../utils/JobProfile.types'
import {
  createSearchCondition,
  createWhereCondition
} from '@/business-apps/mdm/apps/job-structure-data/utils/searchQueries.ts'

// ─── Query/Search ────────────────────────────────────────────────────────────

export interface JobProfileQueryParameters {
  jobProfileId?: string
  offset?: number
  limit?: number
  search?: string
}

function GET_JOB_PROFILE_DATA(params: JobProfileQueryParameters): string {
  const { offset, limit, search, jobProfileId } = params

  const searchCondition = createSearchCondition(search, jobProfileId)
  const whereCondition = createWhereCondition(jobProfileId)
  const whereClause = `${whereCondition} ${searchCondition}`

  return `query getJobProfileData {
    jobProfiles: JobProfile(
      limit: ${limit},
      offset: ${offset},
      orderBy: { code: ASC }
      where: { ${whereClause}}) {
      id
      code
      name
      description
      jobFunction {
        id
        name
        code
      }
      jobLevel {
        id
        name
        code
        hierarchyOrder
      }
      version
      additionalProperties
      jobProfileSkills(where: {isDeleted: {_eq: false}}) {
        requiredLevel
        skill {
          id
          name
        }
      }
    }
    JobProfileAggregate(
      limit: ${limit},
      offset: ${offset},
      where: { ${whereClause}}
    ) {
      aggregate {
        count
      }
    }
  }`
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useJobProfileQueries(accessToken: string) {
  const graphQLClient = useGraphQLClient(accessToken)
  const restClient = useRestClient(EMPLOYEES_API_URL)

  const fetchJobProfiles = useCallback(
    async (params: JobProfileQueryParameters = {}): Promise<GetJobProfilesResponse> => {
      const query = GET_JOB_PROFILE_DATA({
        limit: params.limit || 200,
        offset: params.offset || 0,
        search: params.search,
        jobProfileId: params.jobProfileId
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

  const createJobProfile = useCallback(
    async (payload: JobProfileMutationPayload): Promise<any> => {
      try {
        const response = await restClient.post('/saveJobProfile', payload, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        return response.data
      } catch (error: any) {
        console.error('Failed to create job profile:', error)
        if (error.response?.status === 401) {
          throw new Error('Authentication failed')
        } else if (error.response?.status === 400) {
          throw new Error('Invalid data provided')
        }
        throw new Error('Failed to save job profile')
      }
    },
    [restClient, accessToken]
  )

  const updateJobProfile = createJobProfile

  const deleteJobProfile = useCallback(
    async (payload: JobProfileDeletionPayload): Promise<any> => {
      await restClient.post('/saveJobProfile', payload, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
    },
    [restClient, accessToken]
  )

  return { fetchJobProfiles, createJobProfile, updateJobProfile, deleteJobProfile }
}
