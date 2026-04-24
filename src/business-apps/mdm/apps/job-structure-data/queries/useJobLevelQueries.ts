import { EMPLOYEES_API_URL } from '@/common/utils/serviceResolver.ts'
import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { JobLevelMutationPayload, JobLevelDeletionPayload, GetJobLevelsResponse } from '../utils/JobLevel.types'
import {
  createSearchCondition,
  createWhereCondition
} from '@/business-apps/mdm/apps/job-structure-data/utils/searchQueries.ts'

// ─── Query/Search ────────────────────────────────────────────────────────────

export interface JobLevelQueryParameters {
  jobLevelId?: string
  offset?: number
  limit?: number
  search?: string
}

function GET_JOB_LEVEL_DATA(params: JobLevelQueryParameters): string {
  const { offset, limit, search, jobLevelId } = params

  const searchCondition = createSearchCondition(search, jobLevelId)
  const whereCondition = createWhereCondition(jobLevelId)
  const whereClause = `${whereCondition} ${searchCondition}`

  return `query getJobLevelData {
    jobLevels: JobLevel(
      limit: ${limit},
      offset: ${offset},
      orderBy: { hierarchyOrder: ASC }
      where: { ${whereClause} }) {
      id
      code
      name
      description
      hierarchyOrder
      version
    }
    JobLevelAggregate(
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

export function useJobLevelQueries(accessToken: string) {
  const graphQLClient = useGraphQLClient(accessToken)
  const restClient = useRestClient(EMPLOYEES_API_URL)

  const fetchJobLevels = useCallback(
    async (params: JobLevelQueryParameters = {}): Promise<GetJobLevelsResponse> => {
      const query = GET_JOB_LEVEL_DATA({
        limit: params.limit || 100,
        offset: params.offset || 0,
        search: params.search,
        jobLevelId: params.jobLevelId
      })

      try {
        return await graphQLClient.request<GetJobLevelsResponse>(query)
      } catch (error) {
        console.error('Error fetching job level data:', error)
        throw error
      }
    },
    [graphQLClient]
  )

  const createJobLevel = useCallback(
    async (payload: JobLevelMutationPayload): Promise<any> => {
      try {
        const response = await restClient.post('/saveJobLevel', payload, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        return response.data
      } catch (error: any) {
        console.error('Failed to create job level:', error)
        if (error.response?.status === 401) {
          throw new Error('Authentication failed')
        } else if (error.response?.status === 400) {
          throw new Error('Invalid data provided')
        }
        throw new Error('Failed to save job level')
      }
    },
    [restClient, accessToken]
  )

  const updateJobLevel = createJobLevel

  const deleteJobLevel = useCallback(
    async (payload: JobLevelDeletionPayload): Promise<any> => {
      await restClient.post('/saveJobLevel', payload, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
    },
    [restClient, accessToken]
  )

  return { fetchJobLevels, createJobLevel, updateJobLevel, deleteJobLevel }
}
