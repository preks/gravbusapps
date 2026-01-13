import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { Company, CompanyHierarchyState, OrgchartApiResponse, OrganizationalNode } from '../types'

const ORGCHART_BASE_URL = `${env('NEXT_PUBLIC_ORGCHART_API_URL')}/orgchart/api/v1`

export const useCompanies = (context: BusinessAppContextProps) => {
  const [hierarchyState, setHierarchyState] = useState<CompanyHierarchyState>({
    rootCompanies: [],
    allCompanies: [],
    companyMap: new Map(),
    expandedIds: new Set()
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const structureId = useRef<string>(context.additionalData?.structureId || 'active')

  const restClient = useRestClient(ORGCHART_BASE_URL)

  // Transform orgchart node to Company interface
  const transformCompanyNode = (
    node: OrganizationalNode,
    allNodes: OrganizationalNode[],
    companyEdges: Array<{
      id: string
      source: string
      target: string
      relationshipType: string
      edgeType: string
      percentage: number
    }>
  ): Company => {
    // Calculate hierarchy level
    let level = 0
    let currentParentId = node.parentNode
    while (currentParentId) {
      level++
      const parent = allNodes.find(n => n.id === currentParentId)
      currentParentId = parent?.parentNode
      // Prevent infinite loops
      if (level > 10) break
    }

    // Find parent company name
    const parentNode = node.parentNode ? allNodes.find(n => n.id === node.parentNode) : undefined
    const parentCompanyName = parentNode?.data.companyData.name

    // Find children
    const children = allNodes.filter(n => n.parentNode === node.id)

    // Find percentage and edgeId from companyEdges
    const edge = companyEdges.find(edge => edge.target === node.id && edge.edgeType === 'company')
    const percentage = edge?.percentage
    const edgeId = edge?.id
    const parentEdgeSource = edge?.source

    return {
      id: node.data.companyData.id,
      nodeId: node.id,
      structureId: node.data.companyData.structureId,
      name: node.data.companyData.name,
      code: node.data.companyData.code,
      description: node.data.companyData.description,
      parentNodeId: node.parentNode,
      parentEdgeSource,
      parentCompanyName,
      percentage,
      edgeId,
      // New fields from API
      directorId: node.data.companyData.directorId,
      commercialRegistrationNumber: node.data.companyData.commercialRegistrationNumber,
      taxIdentificationNumber: node.data.companyData.taxIdentificationNumber,
      taxNumber: node.data.companyData.taxNumber,
      valueAddedTaxNumber: node.data.companyData.valueAddedTaxNumber,
      currencyRef: node.data.companyData.currencyRef,
      additionalProperties: node.data.companyData.additionalProperties,
      addresses: node.data.companyData.addresses,
      // Statistics
      numberOfAssignedJobPositions: node.data.numberOfAssignedJobPositions,
      numberOfAssignedEmployees: node.data.numberOfAssignedEmployees,
      numberOfTotalJobPositions: node.data.numberOfTotalJobPositions,
      numberOfChildUnits: node.data.numberOfChildUnits,
      numberOfOpenJobPositions: node.data.numberOfOpenJobPositions,
      status: 'Active', // Assume active for now
      level,
      children: [], // Will be populated in buildHierarchy
      hasChildren: children.length > 0
    }
  }

  // Build hierarchy from flat list
  const buildHierarchy = (companies: Company[]): CompanyHierarchyState => {
    const companyMap = new Map<string, Company>()
    const rootCompanies: Company[] = []

    // First pass: create map for quick lookup
    companies.forEach(company => {
      companyMap.set(company.nodeId, { ...company, children: [] })
    })

    // Second pass: build parent-child relationships
    companies.forEach(company => {
      const companyWithChildren = companyMap.get(company.nodeId)!

      if (company.parentEdgeSource) {
        const parent = companyMap.get(company.parentEdgeSource)
        if (parent) {
          parent.children.push(companyWithChildren)
        } else {
          // Parent not found in our map, treat as root
          rootCompanies.push(companyWithChildren)
        }
      } else {
        // No edge relationship, this is a root company
        rootCompanies.push(companyWithChildren)
      }
    })

    // Third pass: update hasChildren property based on actual children
    companyMap.forEach(company => {
      company.hasChildren = company.children.length > 0
    })

    // Sort companies within each level
    const sortCompanies = (companies: Company[]) => {
      companies.sort((a, b) => a.name.localeCompare(b.name))
      companies.forEach(company => {
        if (company.children.length > 0) {
          sortCompanies(company.children)
        }
      })
    }

    sortCompanies(rootCompanies)

    return {
      rootCompanies,
      allCompanies: Array.from(companyMap.values()),
      companyMap,
      expandedIds: new Set()
    }
  }

  // Fetch companies from orgchart API
  const fetchCompanies = useCallback(async (): Promise<Company[]> => {
    try {
      // Get structureId from additionalData or use default
      const getStructureResponse = await restClient.get(`/structures/${structureId.current}`, {
        params: {
          nodeType: 'cost_center'
        },
        headers: {
          Authorization: `Bearer ${context.accessToken}`
        }
      })
      structureId.current = getStructureResponse.structure.structureId

      if (!structureId) {
        throw new Error('Structure ID is required to fetch companies')
      }

      const response = await restClient.get<OrgchartApiResponse>(`/structures/${structureId.current}`, {
        params: { nodeType: 'company' },
        headers: {
          Authorization: `Bearer ${context.accessToken}`
        }
      })

      // Filter only company nodes
      const companyNodes = response.nodes.filter(node => node.type === 'company')
      const companyEdges = response.edges

      return companyNodes.map(node => transformCompanyNode(node, companyNodes, companyEdges))
    } catch (error) {
      console.error('Error fetching companies:', error)
      throw new Error('Failed to fetch companies from orgchart API')
    }
  }, [context.accessToken, restClient, structureId])

  // Load initial data
  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const companies = await fetchCompanies()
      const hierarchy = buildHierarchy(companies)
      setHierarchyState(hierarchy)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error loading companies:', err)
    } finally {
      setIsLoading(false)
    }
  }, [fetchCompanies])

  // Toggle expansion state of a company
  const toggleCompanyExpansion = useCallback((companyNodeId: string) => {
    setHierarchyState(prev => {
      const newExpandedIds = new Set(prev.expandedIds)

      if (newExpandedIds.has(companyNodeId)) {
        newExpandedIds.delete(companyNodeId)
      } else {
        newExpandedIds.add(companyNodeId)
      }

      return {
        ...prev,
        expandedIds: newExpandedIds
      }
    })
  }, [])

  // Expand all companies up to a certain level
  const expandToLevel = useCallback(
    (maxLevel: number) => {
      const newExpandedIds = new Set<string>()

      hierarchyState.allCompanies.forEach(company => {
        if (company.level < maxLevel && company.children.length > 0) {
          newExpandedIds.add(company.nodeId)
        }
      })

      setHierarchyState(prev => ({
        ...prev,
        expandedIds: newExpandedIds
      }))
    },
    [hierarchyState.allCompanies]
  )

  // Collapse all companies
  const collapseAll = useCallback(() => {
    setHierarchyState(prev => ({
      ...prev,
      expandedIds: new Set()
    }))
  }, [])

  // Set expanded IDs directly (for tree component integration)
  const setExpandedIds = useCallback((ids: Set<string>) => {
    setHierarchyState(prev => ({
      ...prev,
      expandedIds: ids
    }))
  }, [])

  // Get company by node ID
  const getCompanyByNodeId = useCallback(
    (nodeId: string): Company | undefined => {
      return hierarchyState.companyMap.get(nodeId)
    },
    [hierarchyState.companyMap]
  )

  // Get all children of a company (recursive)
  const getAllChildren = useCallback(
    (nodeId: string): Company[] => {
      const company = hierarchyState.companyMap.get(nodeId)
      if (!company) return []

      const allChildren: Company[] = []

      const collectChildren = (parent: Company) => {
        parent.children.forEach(child => {
          allChildren.push(child)
          collectChildren(child)
        })
      }

      collectChildren(company)
      return allChildren
    },
    [hierarchyState.companyMap]
  )

  // Search companies by name or code
  const searchCompanies = useCallback(
    (query: string): Company[] => {
      const searchTerm = query.toLowerCase()
      return hierarchyState.allCompanies.filter(
        company =>
          company.name.toLowerCase().includes(searchTerm) ||
          company.code.toLowerCase().includes(searchTerm) ||
          (company.description && company.description.toLowerCase().includes(searchTerm))
      )
    },
    [hierarchyState.allCompanies]
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

  return {
    // Hierarchy data
    rootCompanies: hierarchyState.rootCompanies,
    allCompanies: hierarchyState.allCompanies,
    companyMap: hierarchyState.companyMap,
    expandedIds: hierarchyState.expandedIds,
    structureId: structureId.current,

    // State
    isLoading,
    error,

    // Actions
    refetch,
    toggleCompanyExpansion,
    expandToLevel,
    collapseAll,
    setExpandedIds,

    // Helper functions
    getCompanyByNodeId,
    getAllChildren,
    searchCompanies,

    // Raw fetch function for advanced usage
    fetchCompanies
  }
}
