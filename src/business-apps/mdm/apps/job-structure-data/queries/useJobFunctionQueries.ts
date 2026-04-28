import { EMPLOYEES_API_URL } from '@/common/utils/serviceResolver.ts'
import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useRestClient } from '@/common/network/rest/useRestClient.ts'
import {
  GetJobFunctionsResponse,
  JobFunctionDeletionPayload,
  JobFunctionMutationPayload
} from '@/business-apps/mdm/apps/job-structure-data/utils/JobFunction.types.ts'
import {
  createSearchCondition,
  createWhereCondition
} from '@/business-apps/mdm/apps/job-structure-data/utils/searchQueries.ts'

// ─── Query/Search ────────────────────────────────────────────────────────────

export interface JobFunctionQueryParameters {
  jobFunctionId?: string
  offset?: number
  limit?: number
  search?: string
}

function GET_JOB_FUNCTION_DATA(params: JobFunctionQueryParameters): string {
  const { offset, limit, search, jobFunctionId } = params

  const searchCondition = createSearchCondition(search, jobFunctionId)
  const whereCondition = createWhereCondition(jobFunctionId)
  const whereClause = `${whereCondition} ${searchCondition}`

  return `query getJobFunctionData {
    jobFunctions: JobFunction(
      limit: ${limit},
      offset: ${offset},
      orderBy: { code: ASC }
      where: { ${whereClause}}) {
      id
      name
      nameI18n
      code
      description
      descriptionI18n
      jobFamily {
        id
        name
        code
      }
      version
    }
    JobFunctionAggregate(
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

export function useJobFunctionQueries(accessToken: string) {
  const graphQLClient = useGraphQLClient(accessToken)
  const restClient = useRestClient(EMPLOYEES_API_URL)

  const fetchJobFunctions = useCallback(
    async (params: JobFunctionQueryParameters = {}): Promise<GetJobFunctionsResponse> => {
      const query = GET_JOB_FUNCTION_DATA({
        limit: params.limit || 100,
        offset: params.offset || 0,
        search: params.search,
        jobFunctionId: params.jobFunctionId
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

  const createJobFunction = useCallback(
    async (payload: JobFunctionMutationPayload): Promise<any> => {
      try {
        // await restClient.post('/employee/saveJobFunction', payload, {
        const response = await restClient.post('/saveJobFunction', payload, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        return response.data
      } catch (error: any) {
        console.error('Failed to create job function:', error)
        // Add more specific error handling
        if (error.response?.status === 401) {
          throw new Error('Authentication failed')
        } else if (error.response?.status === 400) {
          throw new Error('Invalid data provided')
        }
        throw new Error('Failed to save job function')
      }
    },
    [restClient, accessToken]
  )

  const updateJobFunction = createJobFunction

  const deleteJobFunction = useCallback(
    async (payload: JobFunctionDeletionPayload): Promise<any> => {
      await restClient.post('/saveJobFunction', payload, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
    },
    [restClient]
  )

  return { fetchJobFunctions, createJobFunction, updateJobFunction, deleteJobFunction }
}
