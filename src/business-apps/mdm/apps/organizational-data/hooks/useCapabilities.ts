import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { Capability, CapabilityLayer } from '../components/tabs/CapabilitiesTab'
import { env } from '@/common/env/EnvUtils'

const ORGCHART_BASE_URL = `${env('NEXT_PUBLIC_ORGCHART_API_URL')}/orgchart/api/v1`

// Interface for raw API data
export interface CapabilityData {
  id: string
  structureId: string
  name: string
  description?: string
  rankInLayer?: number
  layer?: string
  rankInGroup?: number
  groupId?: string
}

export interface CapabilityGroup {
  id: string
  name: string
  description?: string
  structureId: string
  createdAt: string
  updatedAt: string
}

export interface PaginatedCapabilityData {
  data: CapabilityData[]
  paging: {
    offset: number
    totalRecords: number
    hasMore: boolean
  }
}

// Default pagination values
const DEFAULT_PAGE_SIZE = 20
const DEFAULT_PAGE = 1

export const useCapabilities = (context: BusinessAppContextProps) => {
  const [capabilities, setCapabilities] = useState<Capability[]>([])
  const [layers, setLayers] = useState<CapabilityLayer[]>([])
  const [capabilityGroups, setCapabilityGroups] = useState<CapabilityGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const structureId = useRef<string>(context.additionalData?.structureId || 'active')

  // Pagination state
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const restClient = useRestClient(ORGCHART_BASE_URL)

  // Transform API capability data to UI-friendly Capability interface
  const transformCapability = (
    capabilityData: CapabilityData,
    layerMap?: Map<string, string>,
    groupMap?: Map<string, string>
  ): Capability => {
    return {
      id: capabilityData.id,
      name: capabilityData.name,
      category: layerMap?.get(capabilityData.layer ?? '') ?? 'General',
      description: capabilityData.description ?? '',
      structureId: capabilityData.structureId,
      layerId: capabilityData.layer ?? '',
      groupId: capabilityData.groupId ?? '',
      groupName: groupMap?.get(capabilityData.groupId ?? '') ?? ''
    }
  }

  // Fetch capabilities from orgchart API
  const fetchCapabilities = useCallback(
    async (offset?: number): Promise<{ capabilities: CapabilityData[]; totalCount: number }> => {
      try {
        if (!structureId) {
          throw new Error('Structure ID is required to fetch capabilities')
        }
        const getStructureResponse = await restClient.get(`/structures/${structureId.current}`, {
          params: {
            nodeType: 'cost_center'
          },
          headers: {
            Authorization: `Bearer ${context.accessToken}`
          }
        })
        structureId.current = getStructureResponse.structure.structureId

        const params: Record<string, string | number> = {
          structureId: structureId.current
        }

        if (offset !== undefined) {
          params.offset = offset
        }

        const response = await restClient.get<PaginatedCapabilityData>('/capabilities', {
          params,
          headers: {
            Authorization: `Bearer ${context.accessToken}`
          }
        })

        // Extract capabilities and total count from the paginated response
        const capabilityResponse = response

        // Handle the response format with data and paging properties
        if (capabilityResponse && capabilityResponse.data && capabilityResponse.paging) {
          const totalCount = capabilityResponse.paging.totalRecords

          return {
            capabilities: capabilityResponse.data,
            totalCount
          }
        }

        // Fallback for backward compatibility or unexpected response format
        const capabilities = Array.isArray(capabilityResponse) ? capabilityResponse : []

        return {
          capabilities,
          totalCount: capabilities.length
        }
      } catch (error) {
        console.error('Error fetching capabilities:', error)
        throw new Error('Failed to fetch capabilities from orgchart API')
      }
    },
    [context.accessToken, restClient]
  )

  const fetchCapabilityLayers = useCallback(
    async (limit?: number, offset?: number): Promise<{ layers: CapabilityLayer[] }> => {
      try {
        // Get structureId from additionalData or use default
        const structureId = context.additionalData?.structureId || '99b1ba64-a4d3-4dd0-8302-b1dc0c4daaaf'

        if (!structureId) {
          throw new Error('Structure ID is required to fetch capabilities')
        }

        const params: Record<string, string | number> = {
          structureId: structureId
        }

        // Add pagination params if provided
        if (limit !== undefined) {
          params.limit = limit
        }
        if (offset !== undefined) {
          params.offset = offset
        }

        const response = await restClient.get<CapabilityLayer[]>('/capabilities/layers', {
          params,
          headers: {
            Authorization: `Bearer ${context.accessToken}`
          }
        })

        // Extract capabilities and total count from the paginated response
        const layersResponse = response

        // Handle the response format with data and paging properties
        if (layersResponse) {
          return {
            layers: layersResponse as CapabilityLayer[]
          }
        }

        return {
          layers: []
        }
      } catch (error) {
        console.error('Error fetching capabilities:', error)
        throw new Error('Failed to fetch capabilities from orgchart API')
      }
    },
    [context.accessToken, context.additionalData?.structureId, restClient]
  )

  const fetchCapabilityGroups = useCallback(
    async (limit?: number, offset?: number): Promise<{ groups: CapabilityGroup[] }> => {
      try {
        // Get structureId from additionalData or use default
        const structureId = context.additionalData?.structureId || '99b1ba64-a4d3-4dd0-8302-b1dc0c4daaaf'

        if (!structureId) {
          throw new Error('Structure ID is required to fetch capability groups')
        }

        const params: Record<string, string | number> = {
          structureId: structureId
        }

        // Add pagination params if provided
        if (limit !== undefined) {
          params.limit = limit
        }
        if (offset !== undefined) {
          params.offset = offset
        }

        const response = await restClient.get<CapabilityGroup[]>('/capabilities/groups', {
          params,
          headers: {
            Authorization: `Bearer ${context.accessToken}`
          }
        })

        // Extract groups from the response
        const groupsResponse = response

        // Handle the response format
        if (groupsResponse) {
          return {
            groups: groupsResponse as CapabilityGroup[]
          }
        }

        return {
          groups: []
        }
      } catch (error) {
        console.error('Error fetching capability groups:', error)
        throw new Error('Failed to fetch capability groups from orgchart API')
      }
    },
    [context.accessToken, context.additionalData?.structureId, restClient]
  )

  // Load data with pagination
  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Calculate offset based on current page and page size
      const offset = (currentPage - 1) * pageSize
      const limit = pageSize

      // Fetch layers and groups in parallel
      const [{ layers: layersData }, { groups: groupsData }] = await Promise.all([
        fetchCapabilityLayers(limit, offset),
        fetchCapabilityGroups(limit, offset)
      ])

      // Create a layer map for efficient lookup (layerId -> layerName)
      const layerMap = new Map<string, string>()
      layersData.forEach(layer => {
        layerMap.set(layer.id, layer.name)
      })

      // Create a group map for efficient lookup (groupId -> groupName)
      const groupMap = new Map<string, string>()
      groupsData.forEach(group => {
        groupMap.set(group.id, group.name)
      })

      const { capabilities: capabilitiesData, totalCount: totalCountData } = await fetchCapabilities(offset)

      // Transform capabilities with layer names and group names
      const transformedCapabilities = capabilitiesData.map(capabilityData =>
        transformCapability(capabilityData, layerMap, groupMap)
      )

      setCapabilities(transformedCapabilities)
      setTotalCount(totalCountData)
      setLayers(layersData)
      setCapabilityGroups(groupsData)

      // Populate each layer's capabilities array with matching capabilities
      const updatedLayers = layersData.map(layer => {
        // Ensure the layer has a capabilities array
        if (!layer.capabilities) {
          layer.capabilities = []
        }

        // Find capabilities that match this layer's ID
        const matchingCapabilities = transformedCapabilities.filter(capability => capability.layerId === layer.id)

        // Add capabilities that are not already in the layer's capabilities array
        matchingCapabilities.forEach(capability => {
          const capabilityExists = layer.capabilities.some(
            existingCapability => existingCapability.id === capability.id
          )

          if (!capabilityExists) {
            layer.capabilities.push(capability)
          }
        })

        return layer
      })

      setLayers(updatedLayers)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error loading capabilities:', err)
    } finally {
      setIsLoading(false)
    }
  }, [fetchCapabilities, fetchCapabilityLayers, fetchCapabilityGroups, currentPage, pageSize])

  // Filter capabilities by name, code, category or competency area
  const filterCapabilities = useCallback(
    (searchTerm: string = ''): Capability[] => {
      return capabilities.filter(capability => {
        // Search filter
        const matchesSearch =
          !searchTerm ||
          capability.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          capability.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          capability.category.toLowerCase().includes(searchTerm.toLowerCase())

        return matchesSearch
      })
    },
    [capabilities]
  )

  // Search capabilities by name, code, or description
  const searchCapabilities = useCallback(
    (query: string): Capability[] => {
      const searchTerm = query.toLowerCase()
      return capabilities.filter(
        capability =>
          capability.name.toLowerCase().includes(searchTerm) ||
          capability.description?.toLowerCase().includes(searchTerm) ||
          capability.category.toLowerCase().includes(searchTerm)
      )
    },
    [capabilities]
  )

  // Get capability by ID
  const getCapabilityById = useCallback(
    (id: string): Capability | undefined => {
      return capabilities.find(capability => capability.id === id)
    },
    [capabilities]
  )

  const refetch = useCallback(() => {
    return loadData()
  }, [loadData])

  // Load data on mount and when access token changes
  useEffect(() => {
    if (context.accessToken) {
      loadData()
    }
  }, [context.accessToken, loadData])

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  // Handle page size change
  const handlePageSizeChange = useCallback((_current: number, size: number) => {
    setPageSize(size)
    setCurrentPage(1) // Reset to first page when changing page size
  }, [])

  return {
    // Data
    capabilities,
    layers,
    capabilityGroups,
    // State
    isLoading,
    error,
    structureId: structureId.current,

    // Pagination
    totalCount,
    currentPage,
    pageSize,
    handlePageChange,
    handlePageSizeChange,

    // Actions
    refetch,

    // Filter functions
    filterCapabilities,
    searchCapabilities,
    getCapabilityById,

    // Statistics
    totalCapabilities: totalCount
  }
}
