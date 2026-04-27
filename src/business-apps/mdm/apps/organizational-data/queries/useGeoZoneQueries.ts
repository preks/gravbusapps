import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useOrgchartClient } from '@/common/network/orgchart/useOrgchartClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { useCallback } from 'react'
import { GeoZone, GeoZoneFilters, GeoZoneMutationPayload, GetGeoZonesResponse } from '../types/GeoZone.types'

// ─── Query Parameters ───────────────────────────────────────────────────────

export interface GeoZoneQueryParameters extends GeoZoneFilters {
  geoZoneId?: string
  offset?: number
  limit?: number
}

// ─── GraphQL Queries ─────────────────────────────────────────────────────────

function GET_GEO_ZONE_DATA(params: GeoZoneQueryParameters): string {
  const { offset, limit, search, geoZoneId, structureId } = params

  const whereConditions = []

  if (geoZoneId) {
    whereConditions.push(`id: {_eq: "${geoZoneId}"}`)
  }
  if (structureId) {
    whereConditions.push(`structureId: {_eq: "${structureId}"}`)
  }
  if (search) {
    whereConditions.push(`_or: [{name: {_ilike: "%${search}%"}}, {code: {_ilike: "%${search}%"}}]`)
  }

  whereConditions.push('isDeleted: {_eq: false}')

  const whereClause = whereConditions.length > 0 ? whereConditions.join(', ') : ''

  return `query getGeoZoneData {
    geoZones: GeoZone(
      orderBy: {name: ASC},
      limit: ${limit},
      offset: ${offset},
      where: { ${whereClause} }) {
      id
      name
      code
      description
      version
    }
    GeoZoneAggregate(
      where: { ${whereClause} }
    ) {
      aggregate {
        count
      }
    }
  }`
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGeoZoneQueries(accessToken: string) {
  const graphQLClient = useGraphQLClient(accessToken)
  const orgchartClient = useOrgchartClient(accessToken)

  // Geo Zone queries
  const fetchGeoZones = useCallback(
    async (params: GeoZoneQueryParameters = {}): Promise<GetGeoZonesResponse> => {
      const structureId = params.structureId || getCurrentActiveStructureId() || ''
      if (!structureId) {
        throw new Error('No active structure found')
      }

      const query = GET_GEO_ZONE_DATA({
        limit: params.limit || 100,
        offset: params.offset || 0,
        search: params.search,
        geoZoneId: params.geoZoneId,
        structureId
      })

      try {
        return await graphQLClient.request<GetGeoZonesResponse>(query)
      } catch (error) {
        console.error('Error fetching geo zone data:', error)
        throw error
      }
    },
    [graphQLClient]
  )

  const createGeoZone = useCallback(
    async (payload: GeoZoneMutationPayload): Promise<GeoZone> => {
      try {
        const response = await orgchartClient.createGeoZone(payload, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        return response.data
      } catch (error: any) {
        console.error('Failed to create geo zone:', error)
        if (error.response?.status === 401) {
          throw new Error('Authentication failed')
        } else if (error.response?.status === 400) {
          throw new Error('Invalid data provided')
        }
        throw new Error('Failed to create geo zone')
      }
    },
    [orgchartClient, accessToken]
  )

  const updateGeoZone = useCallback(
    async (geoZoneId: string, payload: GeoZoneMutationPayload): Promise<GeoZone> => {
      try {
        const response = await orgchartClient.updateGeoZone(geoZoneId, payload, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        return response.data
      } catch (error: any) {
        console.error('Failed to update geo zone:', error)
        if (error.response?.status === 401) {
          throw new Error('Authentication failed')
        } else if (error.response?.status === 400) {
          throw new Error('Invalid data provided')
        } else if (error.response?.status === 404) {
          throw new Error('Geo zone not found')
        }
        throw new Error('Failed to update geo zone')
      }
    },
    [orgchartClient, accessToken]
  )

  const deleteGeoZone = useCallback(
    async (geoZoneId: string): Promise<void> => {
      try {
        await orgchartClient.deleteGeoZone(geoZoneId, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      } catch (error: any) {
        console.error('Failed to delete geo zone:', error)
        if (error.response?.status === 401) {
          throw new Error('Authentication failed')
        } else if (error.response?.status === 404) {
          throw new Error('Geo zone not found')
        } else if (error.response?.status === 409) {
          throw new Error('Cannot delete geo zone: it may be in use')
        }
        throw new Error('Failed to delete geo zone')
      }
    },
    [orgchartClient, accessToken]
  )

  return {
    // Fetch operations
    fetchGeoZones,

    // Mutation operations
    createGeoZone,
    updateGeoZone,
    deleteGeoZone
  }
}
