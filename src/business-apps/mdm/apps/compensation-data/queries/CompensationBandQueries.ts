import { EMPLOYEES_API_URL } from '@/common/utils/serviceResolver.ts'
import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useRestClient } from '@/common/network/rest/useRestClient'
import {
  CompensationBandMutationPayload,
  CompensationBandDeletionPayload,
  GetCompensationBandsResponse
} from '../utils/CompensationBand.types'
import {
  createSearchCondition,
  createWhereCondition
} from '@/business-apps/mdm/apps/job-structure-data/utils/searchQueries.ts'

// ─── Query/Search ────────────────────────────────────────────────────────────

export interface CompensationBandQueryParameters {
  compensationBandId?: string
  offset?: number
  limit?: number
  search?: string
}

function GET_COMPENSATION_BAND_DATA(params: CompensationBandQueryParameters): string {
  const { offset, limit, search, compensationBandId } = params

  const searchCondition = createSearchCondition(search, compensationBandId)
  const whereCondition = createWhereCondition(compensationBandId)
  const whereClause = `${whereCondition} ${searchCondition}`

  return `query getCompensationBandData {
    compensationBands: CompensationBand(
      orderBy: {name: ASC},
      limit: ${limit},
      offset: ${offset},
      where: { ${whereClause}}) {
      id
      name
      description
      currencyRef
      minSalary
      maxSalary
      version
    }
    CompensationBandAggregate(
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

export function useCompensationBandQueries(accessToken: string) {
  const graphQLClient = useGraphQLClient(accessToken)
  const restClient = useRestClient(EMPLOYEES_API_URL)

  const fetchCompensationBands = useCallback(
    async (params: CompensationBandQueryParameters = {}): Promise<GetCompensationBandsResponse> => {
      const query = GET_COMPENSATION_BAND_DATA({
        limit: params.limit || 300,
        offset: params.offset || 0,
        search: params.search,
        compensationBandId: params.compensationBandId
      })

      try {
        return await graphQLClient.request<GetCompensationBandsResponse>(query)
      } catch (error) {
        console.error('Error fetching compensation band data:', error)
        throw error
      }
    },
    [graphQLClient]
  )

  const createCompensationBand = useCallback(
    async (payload: CompensationBandMutationPayload): Promise<any> => {
      try {
        const response = await restClient.post('/saveCompensationBand', payload, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        return response.data
      } catch (error: any) {
        console.error('Failed to create compensation band:', error)
        if (error.response?.status === 401) {
          throw new Error('Authentication failed')
        } else if (error.response?.status === 400) {
          throw new Error('Invalid data provided')
        }
        throw new Error('Failed to save compensation band')
      }
    },
    [restClient, accessToken]
  )

  const updateCompensationBand = createCompensationBand

  const deleteCompensationBand = useCallback(
    async (payload: CompensationBandDeletionPayload): Promise<any> => {
      await restClient.post('/saveCompensationBand', payload, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
    },
    [restClient, accessToken]
  )

  return { fetchCompensationBands, createCompensationBand, updateCompensationBand, deleteCompensationBand }
}
