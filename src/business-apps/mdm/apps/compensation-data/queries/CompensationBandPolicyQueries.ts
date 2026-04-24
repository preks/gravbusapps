import { EMPLOYEES_API_URL } from '@/common/utils/serviceResolver.ts'
import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useRestClient } from '@/common/network/rest/useRestClient'
import {
  CompensationBandPolicyMutationPayload,
  CompensationBandPolicyDeletionPayload,
  GetCompensationBandPoliciesResponse
} from '../utils/CompensationBandPolicy.types'
import {
  createSearchCondition,
  createWhereCondition
} from '@/business-apps/mdm/apps/job-structure-data/utils/searchQueries.ts'

// ─── Query/Search ────────────────────────────────────────────────────────────

export interface CompensationBandPolicyQueryParameters {
  compensationBandPolicyId?: string
  offset?: number
  limit?: number
  search?: string
}

function GET_COMPENSATION_BAND_POLICY_DATA(params: CompensationBandPolicyQueryParameters): string {
  const { offset, limit, search, compensationBandPolicyId } = params

  const searchCondition = createSearchCondition(search, compensationBandPolicyId)
  const whereCondition = createWhereCondition(compensationBandPolicyId)
  const whereClause = `${whereCondition} ${searchCondition}`

  return `query getCompensationBandPolicyData {
    compensationBandPolicies: CompensationBandPolicy(
      orderBy: {compensationBand: {name: ASC}},
      limit: ${limit},
      offset: ${offset},
      where: { ${whereClause}}) {
      id
      compensationBand {
        id
        name
        description
      }
      jobLevel {
        id
        name
        code
        hierarchyOrder
      }
      jobFamily {
        id
        name
        code
      }
      geoZone {
        id
        name
      }
      priority
      version
    }
    CompensationBandPolicyAggregate(
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

export function useCompensationBandPolicyQueries(accessToken: string) {
  const graphQLClient = useGraphQLClient(accessToken)
  const restClient = useRestClient(EMPLOYEES_API_URL)

  const fetchCompensationBandPolicies = useCallback(
    async (params: CompensationBandPolicyQueryParameters = {}): Promise<GetCompensationBandPoliciesResponse> => {
      const query = GET_COMPENSATION_BAND_POLICY_DATA({
        limit: params.limit || 300,
        offset: params.offset || 0,
        search: params.search,
        compensationBandPolicyId: params.compensationBandPolicyId
      })

      try {
        return await graphQLClient.request<GetCompensationBandPoliciesResponse>(query)
      } catch (error) {
        console.error('Error fetching compensation band policy data:', error)
        throw error
      }
    },
    [graphQLClient]
  )

  const createCompensationBandPolicy = useCallback(
    async (payload: CompensationBandPolicyMutationPayload): Promise<any> => {
      try {
        const response = await restClient.post('/saveCompensationBandPolicy', payload, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        return response.data
      } catch (error: any) {
        console.error('Failed to create compensation band policy:', error)
        if (error.response?.status === 401) {
          throw new Error('Authentication failed')
        } else if (error.response?.status === 400) {
          throw new Error('Invalid data provided')
        }
        throw new Error('Failed to save compensation band policy')
      }
    },
    [restClient, accessToken]
  )

  const updateCompensationBandPolicy = createCompensationBandPolicy

  const deleteCompensationBandPolicy = useCallback(
    async (payload: CompensationBandPolicyDeletionPayload): Promise<any> => {
      await restClient.post('/saveCompensationBandPolicy', payload, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
    },
    [restClient, accessToken]
  )

  return {
    fetchCompensationBandPolicies,
    createCompensationBandPolicy,
    updateCompensationBandPolicy,
    deleteCompensationBandPolicy
  }
}
