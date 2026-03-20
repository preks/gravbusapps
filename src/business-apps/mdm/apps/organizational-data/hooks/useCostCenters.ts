import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CostCenterData, CostCenter, CostCenterNode } from '../types'
import { useOrgchartClient } from '@/common/network/orgchart/useOrgchartClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

export const useCostCenters = (context: BusinessAppContextProps) => {
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [costCenterNodes, setCostCenterNodes] = useState<CostCenterNode[]>([])
  const [costCenterDetails, setCostCenterDetails] = useState<Map<string, unknown>>(new Map())
  const structureId = useRef<string>(getCurrentActiveStructureId() ?? '')

  const orgchartClient = useOrgchartClient(context.accessToken)

  // Transform API cost center data to UI-friendly CostCenter interface
  const transformCostCenter = (costCenterData: CostCenterData): CostCenter => {
    // Determine status based on having employees or organizational units
    const status: 'Active' | 'Inactive' =
      costCenterData.employees.length > 0 || costCenterData.organizationalUnits.length > 0 ? 'Active' : 'Inactive'

    const hasLocation = Boolean(costCenterData.siteLocationId && costCenterData.siteLocationName)

    return {
      id: costCenterData.id,
      structureId: costCenterData.structureId,
      code: costCenterData.code,
      name: costCenterData.name,
      description: costCenterData.description,
      siteLocationId: costCenterData.siteLocationId,
      siteLocationName: costCenterData.siteLocationName,
      employeeCount: costCenterData.employees.length,
      organizationalUnitCount: costCenterData.organizationalUnits.length,
      employees: costCenterData.employees,
      organizationalUnits: costCenterData.organizationalUnits,
      additionalProperties: costCenterData.additionalProperties,
      status,
      hasLocation
    }
  }

  const transformCostCenterNode = (costCenterNode: Record<string, unknown>): CostCenterNode => ({
    costCenterData: (costCenterNode.data as Record<string, unknown>).costCenterData as CostCenterData,
    id: costCenterNode.id as string,
    type: costCenterNode.type as string,
    ...(costCenterNode.parentNode ? { parentNodeId: costCenterNode.parentNode as string } : {})
  })

  // Fetch cost centers from orgchart API
  const fetchCostCenters = useCallback(async (): Promise<CostCenter[]> => {
    try {
      // Get structureId from additionalData or use default

      if (!structureId) {
        throw new Error('Structure ID is required to fetch cost centers')
      }
      const getStructureResponse = await orgchartClient.getStructure(
        structureId.current,
        {
          nodeType: 'cost_center'
        },
        {
          headers: {
            Authorization: `Bearer ${context.accessToken}`
          }
        }
      )
      structureId.current = getStructureResponse.structure.structureId

      setCostCenterNodes(getStructureResponse.nodes.map(transformCostCenterNode))

      const response = await orgchartClient.getCostCenters(
        { structureId: structureId.current },
        {
          headers: {
            Authorization: `Bearer ${context.accessToken}`
          }
        }
      )

      return response.map(transformCostCenter)
    } catch (error) {
      console.error('Error fetching cost centers:', error)
      throw new Error('Failed to fetch cost centers from orgchart API')
    }
  }, [context.accessToken, orgchartClient])

  // Load initial data
  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const costCentersData = await fetchCostCenters()
      setCostCenters(costCentersData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error loading cost centers:', err)
    } finally {
      setIsLoading(false)
    }
  }, [fetchCostCenters])

  // Filter cost centers by various criteria
  const filterCostCenters = useCallback(
    (
      searchTerm: string = '',
      status?: 'Active' | 'Inactive' | 'ALL',
      hasLocation?: 'With Location' | 'Without Location' | 'ALL'
    ): CostCenter[] => {
      return costCenters.filter(costCenter => {
        // Search filter
        const matchesSearch =
          !searchTerm ||
          costCenter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          costCenter.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          costCenter.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (costCenter.siteLocationName && costCenter.siteLocationName.toLowerCase().includes(searchTerm.toLowerCase()))

        // Status filter
        const matchesStatus = !status || status === 'ALL' || costCenter.status === status

        // Location filter
        const matchesLocation =
          !hasLocation ||
          hasLocation === 'ALL' ||
          (hasLocation === 'With Location' && costCenter.hasLocation) ||
          (hasLocation === 'Without Location' && !costCenter.hasLocation)

        return matchesSearch && matchesStatus && matchesLocation
      })
    },
    [costCenters]
  )

  // Get active cost centers
  const getActiveCostCenters = useCallback((): CostCenter[] => {
    return costCenters.filter(costCenter => costCenter.status === 'Active')
  }, [costCenters])

  // Get inactive cost centers
  const getInactiveCostCenters = useCallback((): CostCenter[] => {
    return costCenters.filter(costCenter => costCenter.status === 'Inactive')
  }, [costCenters])

  // Get cost centers with locations
  const getCostCentersWithLocation = useCallback((): CostCenter[] => {
    return costCenters.filter(costCenter => costCenter.hasLocation)
  }, [costCenters])

  // Get cost centers without locations
  const getCostCentersWithoutLocation = useCallback((): CostCenter[] => {
    return costCenters.filter(costCenter => !costCenter.hasLocation)
  }, [costCenters])

  // Search cost centers by name, code, or description
  const searchCostCenters = useCallback(
    (query: string): CostCenter[] => {
      const searchTerm = query.toLowerCase()
      return costCenters.filter(
        costCenter =>
          costCenter.name.toLowerCase().includes(searchTerm) ||
          costCenter.code.toLowerCase().includes(searchTerm) ||
          costCenter.description.toLowerCase().includes(searchTerm) ||
          (costCenter.siteLocationName && costCenter.siteLocationName.toLowerCase().includes(searchTerm))
      )
    },
    [costCenters]
  )

  // Get cost center by ID
  const getCostCenterById = useCallback(
    (id: string): CostCenter | undefined => {
      return costCenters.find(costCenter => costCenter.id === id)
    },
    [costCenters]
  )

  // Get cost centers by site location
  const getCostCentersBySiteLocation = useCallback(
    (siteLocationId: string): CostCenter[] => {
      return costCenters.filter(costCenter => costCenter.siteLocationId === siteLocationId)
    },
    [costCenters]
  )

  // Get cost centers with employees
  const getCostCentersWithEmployees = useCallback((): CostCenter[] => {
    return costCenters.filter(costCenter => costCenter.employeeCount > 0)
  }, [costCenters])

  // Get cost centers with organizational units
  const getCostCentersWithOrgUnits = useCallback((): CostCenter[] => {
    return costCenters.filter(costCenter => costCenter.organizationalUnitCount > 0)
  }, [costCenters])

  // Get total employee count across all cost centers
  const getTotalEmployeeCount = useCallback((): number => {
    return costCenters.reduce((total, costCenter) => total + costCenter.employeeCount, 0)
  }, [costCenters])

  // Get employees for a specific cost center
  const getEmployees = useCallback(
    async (costCenterId: string): Promise<unknown> => {
      try {
        // Check if we already have this data cached
        const cacheKey = `${costCenterId}-employees`
        if (costCenterDetails.has(cacheKey)) {
          return costCenterDetails.get(cacheKey)
        }

        const response = await orgchartClient.getEmployeesCostCenters(costCenterId, {
          headers: {
            Authorization: `Bearer ${context.accessToken}`
          }
        })

        // Cache the response
        setCostCenterDetails(prev => new Map(prev.set(cacheKey, response)))

        return response
      } catch (error) {
        console.error(`Error fetching employees for cost center ${costCenterId}:`, error)
        throw new Error('Failed to fetch employees')
      }
    },
    [context.accessToken, orgchartClient, costCenterDetails]
  )

  // Get organizational units for a specific cost center
  const getOrgUnits = useCallback(
    async (costCenterId: string): Promise<unknown> => {
      try {
        // Check if we already have this data cached
        const cacheKey = `${costCenterId}-orgUnits`
        if (costCenterDetails.has(cacheKey)) {
          return costCenterDetails.get(cacheKey)
        }

        const response = await orgchartClient.getOrganizationalUnits(
          {
            costCenterId,
            structureId: structureId.current,
            costCenterAssign: false
          },
          {
            headers: {
              Authorization: `Bearer ${context.accessToken}`
            }
          }
        )

        // Cache the response
        setCostCenterDetails(prev => new Map(prev.set(cacheKey, response)))

        return response
      } catch (error) {
        console.error(`Error fetching organizational units for cost center ${costCenterId}:`, error)
        throw new Error('Failed to fetch organizational units')
      }
    },
    [context.accessToken, orgchartClient, costCenterDetails, structureId]
  )

  // Clear cached data for a specific cost center
  const clearCostCenterCache = useCallback((costCenterId: string) => {
    setCostCenterDetails(prev => {
      const newMap = new Map(prev)
      // Remove all entries that start with the costCenterId
      for (const key of newMap.keys()) {
        if (key.startsWith(`${costCenterId}-`)) {
          newMap.delete(key)
        }
      }
      return newMap
    })
  }, [])

  // Clear all cached data
  const clearAllCache = useCallback(() => {
    setCostCenterDetails(new Map())
  }, [])

  const refetch = useCallback(() => {
    return loadData()
  }, [loadData])

  // Load data on mount and when access token changes
  useEffect(() => {
    if (context.accessToken) {
      loadData()
    }
  }, [context.accessToken, loadData])

  return {
    // Data
    costCenters,
    structureId: structureId.current,
    costCenterNodes,
    costCenterDetails,

    // State
    isLoading,
    error,

    // Actions
    refetch,
    getEmployees,
    getOrgUnits,
    clearCostCenterCache,
    clearAllCache,

    // Filter functions
    filterCostCenters,
    searchCostCenters,
    getCostCenterById,
    getActiveCostCenters,
    getInactiveCostCenters,
    getCostCentersWithLocation,
    getCostCentersWithoutLocation,
    getCostCentersBySiteLocation,
    getCostCentersWithEmployees,
    getCostCentersWithOrgUnits,

    // Statistics
    totalCostCenters: costCenters.length,
    activeCostCenters: getActiveCostCenters().length,
    inactiveCostCenters: getInactiveCostCenters().length,
    costCentersWithLocation: getCostCentersWithLocation().length,
    costCentersWithoutLocation: getCostCentersWithoutLocation().length,
    totalEmployeeCount: getTotalEmployeeCount(),
    costCentersWithEmployees: getCostCentersWithEmployees().length,
    costCentersWithOrgUnits: getCostCentersWithOrgUnits().length
  }
}
