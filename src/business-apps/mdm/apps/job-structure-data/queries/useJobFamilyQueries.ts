import {
  createSearchCondition,
  createWhereCondition
} from '@/business-apps/mdm/apps/job-structure-data/utils/searchQueries.ts'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { EMPLOYEES_API_URL } from '@/common/utils/serviceResolver.ts'
import { useCallback } from 'react'
import { GetJobFamiliesResponse, JobFamilyDeletionPayload, JobFamilyMutationPayload } from '../utils/JobFamily.types'

// ─── Query/Search ────────────────────────────────────────────────────────────

export interface JobFamilyQueryParameters {
  jobFamilyId?: string
  offset?: number
  limit?: number
  search?: string
}

function GET_JOB_FAMILY_DATA(params: JobFamilyQueryParameters): string {
  const { offset, limit, search, jobFamilyId } = params

  const searchCondition = createSearchCondition(search, jobFamilyId)
  const whereCondition = createWhereCondition(jobFamilyId)
  const whereClause = `${whereCondition} ${searchCondition}`

  return `query getJobFamilyData {
    jobFamilies: JobFamily(
      orderBy: {name: ASC},
      limit: ${limit},
      offset: ${offset},
      where: { ${whereClause}}) {
      id
      code
      name
      description
      version
    }
    JobFamilyAggregate(
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

export function useJobFamilyQueries(accessToken: string) {
  const graphQLClient = useGraphQLClient(accessToken)
  const restClient = useRestClient(EMPLOYEES_API_URL)

  const fetchJobFamilies = useCallback(
    async (params: JobFamilyQueryParameters = {}): Promise<GetJobFamiliesResponse> => {
      const query = GET_JOB_FAMILY_DATA({
        limit: params.limit || 100,
        offset: params.offset || 0,
        search: params.search,
        jobFamilyId: params.jobFamilyId
      })

      try {
        return await graphQLClient.request<GetJobFamiliesResponse>(query)
      } catch (error) {
        console.error('Error fetching job family data:', error)
        throw error
      }
    },
    [graphQLClient]
  )

  function createJobFamily(payload: JobFamilyMutationPayload): Promise<any> {
    return request('/createJobFamily', payload)
  }

  function updateJobFamily(payload: JobFamilyMutationPayload): Promise<any> {
    return request('/updateJobFamily', payload)
  }

  function deleteJobFamily(payload: JobFamilyDeletionPayload): Promise<any> {
    return request('/deleteJobFamily', payload)
  }

  const request = useCallback(
    async (url: string, payload: JobFamilyMutationPayload | JobFamilyDeletionPayload): Promise<any> => {
      let response

      try {
        response = await restClient.post(url, payload, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      } catch (error: any) {
        // Handle axios errors (network, HTTP status errors)
        if (error.response?.status === 401) {
          throw new Error('Authentication failed')
        } else if (error.response?.status === 400) {
          throw new Error('Invalid data provided')
        } else if (error.response?.status === 500) {
          throw new Error('Failed to mutate job family due to unknown error')
        } else {
          throw error
        }
      }

      // Check for validation errors in successful responses (201)
      if (response.validationResponse?.errors?.length > 0) {
        const errors = response.validationResponse.errors
        const errorMessages = errors.map((err: any) => `${err.title}: ${err.detail}`).join(', ')
        throw new Error(`Validation failed: ${errorMessages}`)
      }

      return response
    },
    [restClient, accessToken]
  )

  return {
    fetchJobFamilies,
    createJobFamily,
    updateJobFamily,
    deleteJobFamily
  }
}
