import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useRestClient } from '@/common/network/rest/useRestClient';
import { 
  Company, 
  CompanyHierarchyState, 
  OrgchartApiResponse, 
  OrganizationalNode 
} from '../types';

const ORGCHART_BASE_URL = 'https://newwork-dev.newwork.com/orgchart/api/v1';

export const useCompanies = (context: BusinessAppContextProps) => {
  const [hierarchyState, setHierarchyState] = useState<CompanyHierarchyState>({
    rootCompanies: [],
    allCompanies: [],
    companyMap: new Map(),
    expandedIds: new Set()
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const restClient = useRestClient(ORGCHART_BASE_URL);

  // Transform orgchart node to Company interface
  const transformCompanyNode = (node: OrganizationalNode, allNodes: OrganizationalNode[]): Company => {
    // Calculate hierarchy level
    let level = 0;
    let currentParentId = node.parentNode;
    while (currentParentId) {
      level++;
      const parent = allNodes.find(n => n.id === currentParentId);
      currentParentId = parent?.parentNode;
      // Prevent infinite loops
      if (level > 10) break;
    }

    // Find parent company name
    const parentNode = node.parentNode ? allNodes.find(n => n.id === node.parentNode) : undefined;
    const parentCompanyName = parentNode?.data.companyData.name;

    // Find children
    const children = allNodes.filter(n => n.parentNode === node.id);

    return {
      id: node.data.companyData.id,
      nodeId: node.id,
      structureId: node.data.companyData.structureId,
      name: node.data.companyData.name,
      code: node.data.companyData.code,
      description: node.data.companyData.description,
      parentNodeId: node.parentNode,
      parentCompanyName,
      numberOfAssignedJobPositions: node.data.numberOfAssignedJobPositions,
      numberOfAssignedEmployees: node.data.numberOfAssignedEmployees,
      numberOfTotalJobPositions: node.data.numberOfTotalJobPositions,
      numberOfChildUnits: node.data.numberOfChildUnits,
      numberOfOpenJobPositions: node.data.numberOfOpenJobPositions,
      status: 'Active', // Assume active for now
      level,
      children: [], // Will be populated in buildHierarchy
      hasChildren: children.length > 0
    };
  };

  // Build hierarchy from flat list
  const buildHierarchy = (companies: Company[]): CompanyHierarchyState => {
    const companyMap = new Map<string, Company>();
    const rootCompanies: Company[] = [];

    // First pass: create map for quick lookup
    companies.forEach(company => {
      companyMap.set(company.nodeId, { ...company, children: [] });
    });

    // Second pass: build parent-child relationships
    companies.forEach(company => {
      const companyWithChildren = companyMap.get(company.nodeId)!;
      
      if (company.parentNodeId) {
        const parent = companyMap.get(company.parentNodeId);
        if (parent) {
          parent.children.push(companyWithChildren);
        } else {
          // Parent not found, treat as root
          rootCompanies.push(companyWithChildren);
        }
      } else {
        // No parent, this is a root company
        rootCompanies.push(companyWithChildren);
      }
    });

    // Third pass: update hasChildren property based on actual children
    companyMap.forEach(company => {
      company.hasChildren = company.children.length > 0;
    });

    // Sort companies within each level
    const sortCompanies = (companies: Company[]) => {
      companies.sort((a, b) => a.name.localeCompare(b.name));
      companies.forEach(company => {
        if (company.children.length > 0) {
          sortCompanies(company.children);
        }
      });
    };

    sortCompanies(rootCompanies);

    return {
      rootCompanies,
      allCompanies: companies,
      companyMap,
      expandedIds: new Set()
    };
  };

  // Fetch companies from orgchart API
  const fetchCompanies = async (): Promise<Company[]> => {
    try {
      // Get structureId from additionalData or use default
      const structureId = context.additionalData?.structureId || '99b1ba64-a4d3-4dd0-8302-b1dc0c4daaaf';
      
      if (!structureId) {
        throw new Error('Structure ID is required to fetch companies');
      }

      const response = await restClient.get<OrgchartApiResponse>(
        `/structures/${structureId}`,
        {
          params: { nodeType: 'company' },
          headers: {
            Authorization: `Bearer ${context.accessToken}`
          }
        }
      );

      // Filter only company nodes
      const companyNodes = response.nodes.filter(node => node.type === 'company');
      
      return companyNodes.map(node => transformCompanyNode(node, companyNodes));
    } catch (error) {
      console.error('Error fetching companies:', error);
      throw new Error('Failed to fetch companies from orgchart API');
    }
  };

  // Load initial data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const companies = await fetchCompanies();
      const hierarchy = buildHierarchy(companies);
      setHierarchyState(hierarchy);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error loading companies:', err);
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken]);

  // Toggle expansion state of a company
  const toggleCompanyExpansion = useCallback((companyNodeId: string) => {
    setHierarchyState(prev => {
      const newExpandedIds = new Set(prev.expandedIds);
      
      if (newExpandedIds.has(companyNodeId)) {
        newExpandedIds.delete(companyNodeId);
      } else {
        newExpandedIds.add(companyNodeId);
      }

      return {
        ...prev,
        expandedIds: newExpandedIds
      };
    });
  }, []);

  // Expand all companies up to a certain level
  const expandToLevel = useCallback((maxLevel: number) => {
    const newExpandedIds = new Set<string>();
    
    hierarchyState.allCompanies.forEach(company => {
      if (company.level < maxLevel && company.children.length > 0) {
        newExpandedIds.add(company.nodeId);
      }
    });

    setHierarchyState(prev => ({
      ...prev,
      expandedIds: newExpandedIds
    }));
  }, [hierarchyState.allCompanies]);

  // Collapse all companies
  const collapseAll = useCallback(() => {
    setHierarchyState(prev => ({
      ...prev,
      expandedIds: new Set()
    }));
  }, []);

  // Set expanded IDs directly (for tree component integration)
  const setExpandedIds = useCallback((ids: Set<string>) => {
    setHierarchyState(prev => ({
      ...prev,
      expandedIds: ids
    }));
  }, []);

  // Get company by node ID
  const getCompanyByNodeId = useCallback((nodeId: string): Company | undefined => {
    return hierarchyState.companyMap.get(nodeId);
  }, [hierarchyState.companyMap]);

  // Get all children of a company (recursive)
  const getAllChildren = useCallback((nodeId: string): Company[] => {
    const company = hierarchyState.companyMap.get(nodeId);
    if (!company) return [];

    const allChildren: Company[] = [];
    
    const collectChildren = (parent: Company) => {
      parent.children.forEach(child => {
        allChildren.push(child);
        collectChildren(child);
      });
    };

    collectChildren(company);
    return allChildren;
  }, [hierarchyState.companyMap]);

  // Search companies by name or code
  const searchCompanies = useCallback((query: string): Company[] => {
    const searchTerm = query.toLowerCase();
    return hierarchyState.allCompanies.filter(company =>
      company.name.toLowerCase().includes(searchTerm) ||
      company.code.toLowerCase().includes(searchTerm) ||
      (company.description && company.description.toLowerCase().includes(searchTerm))
    );
  }, [hierarchyState.allCompanies]);

  const refetch = useCallback(() => {
    return loadData();
  }, [loadData]);

  // Load data on mount and when access token changes
  useEffect(() => {
    if (context.accessToken) {
      loadData();
    }
  }, [context.accessToken, loadData]);

  return {
    // Hierarchy data
    rootCompanies: hierarchyState.rootCompanies,
    allCompanies: hierarchyState.allCompanies,
    companyMap: hierarchyState.companyMap,
    expandedIds: hierarchyState.expandedIds,
    
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
  };
}; 