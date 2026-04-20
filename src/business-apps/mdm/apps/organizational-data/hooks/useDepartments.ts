import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Department, OrganizationalStructureApiResponse, OrganizationalUnitNode, CostCenter, Company } from '../types'
import { useOrgchartClient } from '@/common/network/orgchart/useOrgchartClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

export const useDepartments = (context: BusinessAppContextProps) => {
  const [rootDepartments, setRootDepartments] = useState<Department[]>([])
  const [allDepartments, setAllDepartments] = useState<Department[]>([])
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [departmentMap, setDepartmentMap] = useState<Map<string, Department>>(new Map())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const structureId = useRef<string>(getCurrentActiveStructureId() ?? '')

  const orgchartClient = useOrgchartClient(context.accessToken)

  // Transform API organizational unit node to UI-friendly Department interface
  const transformDepartment = (node: OrganizationalUnitNode, allNodes: OrganizationalUnitNode[]): Department => {
    const { data } = node
    const orgUnitData = data.organizationalUnitData

    // Find parent department name
    const parentNode = allNodes.find(n => n.id === node.parentNode)
    const parentDepartmentName = parentNode?.data.organizationalUnitData.name

    // Build supervisor name
    const supervisorName = data.supervisor
      ? `${data.supervisor.firstName} ${data.supervisor.lastName}${data.supervisor.callName ? ` (${data.supervisor.callName})` : ''}`
      : undefined

    // Determine status based on having employees
    const status: 'Active' | 'Inactive' = data.numberOfAssignedEmployees > 0 ? 'Active' : 'Inactive'

    return {
      id: orgUnitData.organizationUnitId,
      nodeId: node.id,
      structureId: '', // Will be set later
      name: orgUnitData.name,
      description: orgUnitData.description,
      code: orgUnitData.code,
      type: orgUnitData.type,
      organizationUnitId: orgUnitData.organizationUnitId,
      parentNodeId: node.parentNode,
      parentDepartmentName,
      // Company and cost center info
      companyId: orgUnitData.company?.companyId,
      companyName: orgUnitData.company?.companyName,
      costCenterId: orgUnitData.costCenter?.costCenterId,
      costCenterName: orgUnitData.costCenter?.costCenterName,
      // Supervisor information
      supervisorId: data.supervisor?.supervisorId,
      supervisorName,
      supervisorRole: data.supervisor?.role,
      supervisorJobPosition: data.supervisor?.mainJobPosition?.jobPositionName,
      // Statistics from API
      numberOfAssignedJobPositions: data.numberOfAssignedJobPositions,
      numberOfAssignedEmployees: data.numberOfAssignedEmployees,
      numberOfTotalJobPositions: data.numberOfTotalJobPositions,
      numberOfChildUnits: data.numberOfChildUnits,
      numberOfOpenJobPositions: data.numberOfOpenJobPositions,
      rank: data.rank,
      // Computed fields
      status,
      level: 0, // Will be computed later
      children: [],
      hasChildren: data.numberOfChildUnits > 0,
      hasSupervisor: Boolean(data.supervisor)
    }
  }

  // Build hierarchical structure from flat node list
  const buildHierarchy = (departments: Department[]): Department[] => {
    // Create lookup map
    const map = new Map<string, Department>()
    departments.forEach(dept => {
      map.set(dept.nodeId, dept)
    })

    // Build hierarchy
    const roots: Department[] = []

    departments.forEach(dept => {
      if (dept.parentNodeId && map.has(dept.parentNodeId)) {
        const parent = map.get(dept.parentNodeId)!
        dept.level = parent.level + 1
        parent.children.push(dept)
      } else {
        dept.level = 0
        roots.push(dept)
      }
    })

    // Sort children by name
    const sortChildren = (dept: Department) => {
      dept.children.sort((a, b) => a.name.localeCompare(b.name))
      dept.children.forEach(sortChildren)
    }

    roots.forEach(sortChildren)
    roots.sort((a, b) => a.name.localeCompare(b.name))

    return roots
  }

  // Fetch organizational units from structures API
  const fetchDepartments = useCallback(async (): Promise<Department[]> => {
    try {
      if (!structureId) {
        throw new Error('Structure ID is required to fetch departments')
      }

      const response = await orgchartClient.getStructuresActive<OrganizationalStructureApiResponse>(
        {
          nodeType: 'organization_unit',
          isPlanningMode: false
        },
        {
          headers: {
            Authorization: `Bearer ${context.accessToken}`
          }
        }
      )

      structureId.current = response.structure.structureId
      // Transform nodes to departments
      const departments = response.nodes.map(node => {
        const dept = transformDepartment(node, response.nodes)
        dept.structureId = response.structure.structureId
        return dept
      })

      return departments
    } catch (error) {
      console.error('Error fetching departments:', error)
      throw new Error('Failed to fetch departments from orgchart API')
    }
  }, [context.accessToken, orgchartClient])

  const fetchCostCenters = useCallback(async (): Promise<CostCenter[]> => {
    try {
      if (!structureId) {
        throw new Error('Structure ID is required to fetch cost centers')
      }

      const response = await orgchartClient.getCostCenters(
        { structureId: structureId.current },
        {
          headers: {
            Authorization: `Bearer ${context.accessToken}`
          }
        }
      )

      if (response?.length > 0) {
        return response
      } else {
        return []
      }
    } catch (error) {
      console.error('Error fetching cost centers:', error)
      throw new Error('Failed to fetch cost centers from orgchart API')
    }
  }, [context.accessToken, orgchartClient])

  const fetchCompanies = useCallback(async (): Promise<Company[]> => {
    try {
      if (!structureId) {
        throw new Error('Structure ID is required to fetch departments')
      }

      const response = await orgchartClient.getCompanies(
        { structureId: structureId.current },
        {
          headers: {
            Authorization: `Bearer ${context.accessToken}`
          }
        }
      )

      if (response?.length > 0) {
        return response
      } else {
        return []
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
      throw new Error('Failed to fetch departments from orgchart API')
    }
  }, [])

  // Load initial data
  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const departmentsData = await fetchDepartments()
      const costCentersData = await fetchCostCenters()
      const companiesData = await fetchCompanies()

      const hierarchicalDepartments = buildHierarchy(departmentsData)

      // Create lookup map
      const map = new Map<string, Department>()
      departmentsData.forEach(dept => {
        map.set(dept.nodeId, dept)
      })

      setAllDepartments(departmentsData)
      setRootDepartments(hierarchicalDepartments)
      setDepartmentMap(map)
      setCostCenters(costCentersData)
      setCompanies(companiesData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error loading departments:', err)
    } finally {
      setIsLoading(false)
    }
  }, [fetchDepartments, fetchCostCenters, fetchCompanies])

  // Expand to specific level
  const expandToLevel = useCallback(
    (level: number) => {
      const newExpandedIds = new Set<string>()

      const addToExpanded = (depts: Department[], currentLevel: number) => {
        depts.forEach(dept => {
          if (currentLevel < level && dept.hasChildren) {
            newExpandedIds.add(dept.nodeId)
          }
          if (dept.children.length > 0) {
            addToExpanded(dept.children, currentLevel + 1)
          }
        })
      }

      addToExpanded(rootDepartments, 0)
      setExpandedIds(newExpandedIds)
    },
    [rootDepartments]
  )

  // Collapse all nodes
  const collapseAll = useCallback(() => {
    setExpandedIds(new Set())
  }, [])

  // Get department by node ID
  const getDepartmentByNodeId = useCallback(
    (nodeId: string): Department | undefined => {
      return departmentMap.get(nodeId)
    },
    [departmentMap]
  )

  // Search departments by name or description
  const searchDepartments = useCallback(
    (query: string): Department[] => {
      const searchTerm = query.toLowerCase()
      return allDepartments.filter(
        dept =>
          dept.name.toLowerCase().includes(searchTerm) ||
          dept.description.toLowerCase().includes(searchTerm) ||
          (dept.code && dept.code.toLowerCase().includes(searchTerm)) ||
          (dept.supervisorName && dept.supervisorName.toLowerCase().includes(searchTerm))
      )
    },
    [allDepartments]
  )

  // Filter departments by type
  const getDepartmentsByType = useCallback(
    (type: 'TEAM' | 'DEPARTMENT'): Department[] => {
      return allDepartments.filter(dept => dept.type === type)
    },
    [allDepartments]
  )

  // Get active departments
  const getActiveDepartments = useCallback((): Department[] => {
    return allDepartments.filter(dept => dept.status === 'Active')
  }, [allDepartments])

  // Get departments with supervisors
  const getDepartmentsWithSupervisors = useCallback((): Department[] => {
    return allDepartments.filter(dept => dept.hasSupervisor)
  }, [allDepartments])

  // Get departments by company
  const getDepartmentsByCompany = useCallback(
    (companyId: string): Department[] => {
      return allDepartments.filter(dept => dept.companyId === companyId)
    },
    [allDepartments]
  )

  // Get total employee count
  const getTotalEmployeeCount = useCallback((): number => {
    return allDepartments.reduce((total, dept) => total + dept.numberOfAssignedEmployees, 0)
  }, [allDepartments])

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
    rootDepartments,
    allDepartments,
    departmentMap,
    costCenters,
    companies,
    expandedIds,

    // State
    isLoading,
    error,

    // Actions
    refetch,
    setExpandedIds,
    expandToLevel,
    collapseAll,

    // Filter and search functions
    getDepartmentByNodeId,
    searchDepartments,
    getDepartmentsByType,
    getActiveDepartments,
    getDepartmentsWithSupervisors,
    getDepartmentsByCompany,

    // Statistics
    totalDepartments: allDepartments.length,
    teams: getDepartmentsByType('TEAM').length,
    departments: getDepartmentsByType('DEPARTMENT').length,
    activeDepartments: getActiveDepartments().length,
    departmentsWithSupervisors: getDepartmentsWithSupervisors().length,
    totalEmployeeCount: getTotalEmployeeCount(),
    structureId: structureId.current
  }
}
