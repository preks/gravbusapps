import {
  OrganizationalUnitRelationship,
  OrganizationalNode,
  EmployeeWithCountry,
  SunburstNode,
  HierarchyStatistics,
  HierarchyTableData,
  HierarchyLevelReportData,
  HierarchySegmentData,
  SiteLocation,
  EmployeeSiteLocation,
  CountryColorMap,
  CompanyColorMap,
  CostCenterColorMap,
  CostCenter,
  EmployeeCompany,
  OrganizationalUnitRelationshipResponse
} from '../types/hierarchyTypes'

// NEWWORK ERP Design System - Organizational Hierarchy Colors
// Using CSS variables that map to the design system tokens

// Location/Country Colors - Using entity-location and complementary colors
const LOCATION_COLORS = [
  'var(--nw-entity-location)', // Yellow-600 - Primary location color
  'var(--nw-entity-tech)', // Teal-600 - Technology/modern locations
  'var(--nw-entity-job)', // Sky-600 - Professional locations
  'var(--nw-entity-premium)', // Lime-600 - Premium locations
  'var(--nw-info)', // Blue-600 - Information/standard locations
  'var(--nw-status-running)', // Cyan-600 - Active locations
  'var(--nw-ai-primary-from)', // Purple-600 - AI/strategic locations
  'var(--nw-entity-strategy)', // Fuchsia-600 - Strategic locations
  'var(--nw-warning)', // Orange-600 - Warning/attention locations
  'var(--nw-entity-department)', // Gray-600 - Department locations
  'var(--nw-entity-order)', // Blue-600 - Order/process locations
  'var(--nw-status-pending)' // Yellow-500 - Pending locations
]

// Company Colors - Using entity-order and business-focused colors
const COMPANY_COLORS = [
  'var(--nw-entity-order)', // Blue-600 - Primary company color
  'var(--nw-entity-employee)', // Purple-600 - Employee-focused companies
  'var(--nw-entity-strategy)', // Fuchsia-600 - Strategic companies
  'var(--nw-entity-tech)', // Teal-600 - Technology companies
  'var(--nw-entity-premium)', // Lime-600 - Premium companies
  'var(--nw-info)', // Blue-600 - Information/service companies
  'var(--nw-warning)', // Orange-600 - Manufacturing/industrial companies
  'var(--nw-status-running)', // Cyan-600 - Active/operational companies
  'var(--nw-entity-job)', // Sky-600 - Professional services companies
  'var(--nw-entity-department)', // Gray-600 - Administrative companies
  'var(--nw-ai-primary-from)', // Purple-600 - AI/innovation companies
  'var(--nw-status-pending)' // Yellow-500 - Developing companies
]

// Cost Center Colors - Using entity-department and organizational colors
const COST_CENTER_COLORS = [
  'var(--nw-entity-department)', // Gray-600 - Primary department color
  'var(--nw-entity-employee)', // Purple-600 - HR/employee cost centers
  'var(--nw-entity-tech)', // Teal-600 - IT/technology cost centers
  'var(--nw-entity-job)', // Sky-600 - Operations cost centers
  'var(--nw-entity-order)', // Blue-600 - Sales/order cost centers
  'var(--nw-entity-strategy)', // Fuchsia-600 - Strategic cost centers
  'var(--nw-warning)', // Orange-600 - Finance/accounting cost centers
  'var(--nw-info)', // Blue-600 - Information/admin cost centers
  'var(--nw-status-running)', // Cyan-600 - Active/operational cost centers
  'var(--nw-entity-premium)', // Lime-600 - Premium/executive cost centers
  'var(--nw-ai-primary-from)', // Purple-600 - AI/innovation cost centers
  'var(--nw-status-pending)' // Yellow-500 - Development cost centers
]

// Hierarchy Level Colors - Using structured progression
const LEVEL_COLORS = [
  'var(--nw-entity-strategy)', // Fuchsia-600 - C-Level/Executive
  'var(--nw-entity-employee)', // Purple-600 - VP/Senior Management
  'var(--nw-entity-order)', // Blue-600 - Directors
  'var(--nw-entity-job)', // Sky-600 - Managers
  'var(--nw-entity-tech)', // Teal-600 - Team Leads
  'var(--nw-info)', // Blue-600 - Senior Staff
  'var(--nw-status-running)', // Cyan-600 - Staff
  'var(--nw-entity-department)', // Gray-600 - Associates
  'var(--nw-warning)', // Orange-600 - Entry Level
  'var(--nw-status-pending)' // Yellow-500 - Interns/Trainees
]

/**
 * Build organizational tree structure from relationships
 */
export const buildOrganizationalTree = (
  relationships: OrganizationalUnitRelationship[]
): { nodes: Map<string, OrganizationalNode>; roots: OrganizationalNode[] } => {
  const nodeMap = new Map<string, OrganizationalNode>()
  const childrenMap = new Map<string, string[]>()
  const parentMap = new Map<string, string>()

  // First pass: Create all nodes
  relationships.forEach(rel => {
    // Process parent node
    if (rel.parent && !nodeMap.has(rel.parent.id)) {
      nodeMap.set(rel.parent.id, {
        id: rel.parent.id,
        name: rel.parent.name,
        type: rel.parent.type,
        code: rel.parent.code,
        level: 0,
        company: rel.parent.company,
        costCenterId: rel.parent.costCenterId,
        employees: [],
        children: [],
        employeeCountByCountry: new Map(),
        employeeCountByCompany: new Map(),
        employeeCountByCostCenter: new Map(),
        totalEmployeeCount: 0
      })
    }

    // Process child node
    if (rel.child && !nodeMap.has(rel.child.id)) {
      nodeMap.set(rel.child.id, {
        id: rel.child.id,
        name: rel.child.name,
        type: rel.child.type,
        code: rel.child.code,
        level: 0,
        company: rel.child.company,
        costCenterId: rel.child.costCenterId,
        employees: [],
        children: [],
        employeeCountByCountry: new Map(),
        employeeCountByCompany: new Map(),
        employeeCountByCostCenter: new Map(),
        totalEmployeeCount: 0
      })
    }

    // Build relationships (skip self-references)
    if (rel.parentId !== rel.childId && rel.parent && rel.child) {
      if (!childrenMap.has(rel.parentId)) {
        childrenMap.set(rel.parentId, [])
      }
      childrenMap.get(rel.parentId)!.push(rel.childId)
      parentMap.set(rel.childId, rel.parentId)
    }
  })

  // Second pass: Set up parent-child relationships
  nodeMap.forEach((node, nodeId) => {
    const childIds = childrenMap.get(nodeId) || []
    node.children = childIds.map(childId => nodeMap.get(childId)!).filter(Boolean)
  })

  // Find root nodes (nodes with no parent)
  const roots = Array.from(nodeMap.values()).filter(node => !parentMap.has(node.id))

  return { nodes: nodeMap, roots }
}

/**
 * Calculate organizational levels using BFS
 */
export const calculateOrganizationalLevels = (roots: OrganizationalNode[]): void => {
  const queue = roots.map(node => ({ node, level: 0 }))

  while (queue.length > 0) {
    const { node, level } = queue.shift()!
    node.level = level

    node.children.forEach(child => {
      queue.push({ node: child, level: level + 1 })
    })
  }
}

/**
 * Map employees to countries based on site locations
 */
export const mapEmployeesToCountries = (
  siteLocations: SiteLocation[],
  employeeSiteLocations: EmployeeSiteLocation[]
): Map<string, { country: string; countryName: string }> => {
  const employeeCountryMap = new Map<string, { country: string; countryName: string }>()

  // Create site location lookup
  const siteLocationMap = new Map(siteLocations.map(sl => [sl.id, sl]))

  // Map employees to countries via site locations
  employeeSiteLocations.forEach(esl => {
    const siteLocation = siteLocationMap.get(esl.siteLocationId)
    if (siteLocation?.country) {
      employeeCountryMap.set(esl.employeeId, {
        country: siteLocation.country.code,
        countryName: siteLocation.country.value
      })
    }
  })

  return employeeCountryMap
}

/**
 * Map employees to companies via direct CompanyEmployee relationships
 */
export const mapEmployeesToCompanies = (
  companyEmployees: EmployeeCompany[]
): Map<string, { company: string; companyName: string }> => {
  const employeeCompanyMap = new Map<string, { company: string; companyName: string }>()

  // Map employees to companies using direct CompanyEmployee relationships
  companyEmployees.forEach(companyEmp => {
    if (companyEmp.company) {
      employeeCompanyMap.set(companyEmp.employeeId, {
        company: companyEmp.company.code || companyEmp.company.id,
        companyName: companyEmp.company.name
      })
    }
  })

  return employeeCompanyMap
}

/**
 * Map employees to cost centers via their organizational unit's cost center
 */
export const mapEmployeesToCostCenters = (
  relationships: OrganizationalUnitRelationship[],
  costCenters: CostCenter[]
): Map<string, { costCenter: string; costCenterName: string }> => {
  const employeeCostCenterMap = new Map<string, { costCenter: string; costCenterName: string }>()

  // Create cost center lookup
  const costCenterMap = new Map(costCenters.map(cc => [cc.id, cc]))

  // Process each organizational unit and map its employees to the unit's cost center
  const processedUnits = new Set<string>()

  relationships.forEach(rel => {
    ;[rel.parent, rel.child].forEach(orgUnit => {
      if (orgUnit && !processedUnits.has(orgUnit.id)) {
        processedUnits.add(orgUnit.id)

        if (orgUnit.organizationalUnitEmployee && orgUnit.costCenterId) {
          const costCenter = costCenterMap.get(orgUnit.costCenterId)
          if (costCenter) {
            orgUnit.organizationalUnitEmployee.forEach(empOrg => {
              if (empOrg.employee) {
                employeeCostCenterMap.set(empOrg.employeeId, {
                  costCenter: costCenter.code || costCenter.id,
                  costCenterName: costCenter.name
                })
              }
            })
          }
        }
      }
    })
  })

  return employeeCostCenterMap
}

/**
 * Process employees and assign them to organizational nodes with country information
 */
export const processEmployeesWithCountries = (
  nodes: Map<string, OrganizationalNode>,
  relationships: OrganizationalUnitRelationship[],
  employeeCountryMap: Map<string, { country: string; countryName: string }>
): void => {
  // Process each organizational unit and its employees
  const processedUnits = new Set<string>()

  relationships.forEach(rel => {
    ;[rel.parent, rel.child].forEach(orgUnit => {
      if (orgUnit && !processedUnits.has(orgUnit.id)) {
        processedUnits.add(orgUnit.id)
        const node = nodes.get(orgUnit.id)

        if (node && orgUnit.organizationalUnitEmployee) {
          orgUnit.organizationalUnitEmployee.forEach(empOrg => {
            if (empOrg.employee) {
              const countryInfo = employeeCountryMap.get(empOrg.employeeId)
              const employeeName =
                [empOrg.employee.firstName, empOrg.employee.lastName].filter(Boolean).join(' ') ||
                empOrg.employee.businessKey ||
                'Unknown'

              const employeeWithCountry: EmployeeWithCountry = {
                id: empOrg.employee.id,
                name: employeeName,
                businessKey: empOrg.employee.businessKey,
                country: countryInfo?.country || null,
                countryName: countryInfo?.countryName || null
              }

              node.employees.push(employeeWithCountry)

              // Update country count
              const country = countryInfo?.country || 'Unknown'
              node.employeeCountByCountry.set(country, (node.employeeCountByCountry.get(country) || 0) + 1)
            }
          })

          node.totalEmployeeCount = node.employees.length
        }
      }
    })
  })
}

/**
 * Process employees and assign them to organizational nodes with company information
 */
export const processEmployeesWithCompanies = (
  nodes: Map<string, OrganizationalNode>,
  relationships: OrganizationalUnitRelationship[],
  employeeCompanyMap: Map<string, { company: string; companyName: string }>
): void => {
  // Process each organizational unit and its employees
  const processedUnits = new Set<string>()

  relationships.forEach(rel => {
    ;[rel.parent, rel.child].forEach(orgUnit => {
      if (orgUnit && !processedUnits.has(orgUnit.id)) {
        processedUnits.add(orgUnit.id)
        const node = nodes.get(orgUnit.id)

        if (node && orgUnit.organizationalUnitEmployee) {
          // Initialize company count map if not exists
          if (!node.employeeCountByCompany) {
            node.employeeCountByCompany = new Map<string, number>()
          }

          orgUnit.organizationalUnitEmployee.forEach(empOrg => {
            if (empOrg.employee) {
              const companyInfo = employeeCompanyMap.get(empOrg.employeeId)

              // Update company count
              const company = companyInfo?.company || 'Unknown'
              node.employeeCountByCompany.set(company, (node.employeeCountByCompany.get(company) || 0) + 1)
            }
          })
        }
      }
    })
  })
}

/**
 * Process employees and assign them to organizational nodes with cost center information
 */
export const processEmployeesWithCostCenters = (
  nodes: Map<string, OrganizationalNode>,
  relationships: OrganizationalUnitRelationship[],
  employeeCostCenterMap: Map<string, { costCenter: string; costCenterName: string }>
): void => {
  // Process each organizational unit and its employees
  const processedUnits = new Set<string>()

  relationships.forEach(rel => {
    ;[rel.parent, rel.child].forEach(orgUnit => {
      if (orgUnit && !processedUnits.has(orgUnit.id)) {
        processedUnits.add(orgUnit.id)
        const node = nodes.get(orgUnit.id)

        if (node && orgUnit.organizationalUnitEmployee) {
          // Initialize cost center count map if not exists
          if (!node.employeeCountByCostCenter) {
            node.employeeCountByCostCenter = new Map<string, number>()
          }

          orgUnit.organizationalUnitEmployee.forEach(empOrg => {
            if (empOrg.employee) {
              const costCenterInfo = employeeCostCenterMap.get(empOrg.employeeId)

              // Update cost center count
              const costCenter = costCenterInfo?.costCenter || 'Unknown'
              node.employeeCountByCostCenter.set(costCenter, (node.employeeCountByCostCenter.get(costCenter) || 0) + 1)
            }
          })
        }
      }
    })
  })
}

/**
 * Generate country color mapping
 */
export const generateCountryColorMap = (countries: Set<string>): CountryColorMap => {
  const colorMap: CountryColorMap = {}
  const countryArray = Array.from(countries).sort() // Sort for consistency

  countryArray.forEach(country => {
    // Use hash for consistent color assignment regardless of order
    const countryHash = country.split('').reduce((hash, char) => {
      return char.charCodeAt(0) + ((hash << 5) - hash)
    }, 0)
    colorMap[country] = LOCATION_COLORS[Math.abs(countryHash) % LOCATION_COLORS.length]
  })

  return colorMap
}

/**
 * Generate company color mapping with consistent colors per company
 */
export const generateCompanyColorMap = (companies: Set<string>): CompanyColorMap => {
  const colorMap: CompanyColorMap = {}
  const companyArray = Array.from(companies).sort() // Sort for consistency

  // Use different colors for companies - using design system tokens
  const COMPANY_COLORS = [
    'var(--nw-chart-1)',
    'var(--nw-chart-2)',
    'var(--nw-chart-3)',
    'var(--nw-chart-4)',
    'var(--nw-chart-5)',
    'var(--nw-chart-6)',
    'var(--nw-chart-7)',
    'var(--nw-chart-8)'
  ]

  companyArray.forEach(company => {
    // Use hash for consistent color assignment regardless of order
    const companyHash = company.split('').reduce((hash, char) => {
      return char.charCodeAt(0) + ((hash << 5) - hash)
    }, 0)
    colorMap[company] = COMPANY_COLORS[Math.abs(companyHash) % COMPANY_COLORS.length]
  })

  return colorMap
}

/**
 * Generate cost center color mapping with consistent colors per cost center
 */
export const generateCostCenterColorMap = (costCenters: Set<string>): CostCenterColorMap => {
  const colorMap: CostCenterColorMap = {}
  const costCenterArray = Array.from(costCenters).sort() // Sort for consistency

  // Use different colors for cost centers - using design system tokens
  const COST_CENTER_COLORS = [
    'var(--nw-chart-1)',
    'var(--nw-chart-2)',
    'var(--nw-chart-3)',
    'var(--nw-chart-4)',
    'var(--nw-chart-5)',
    'var(--nw-chart-6)',
    'var(--nw-chart-7)',
    'var(--nw-chart-8)'
  ]

  costCenterArray.forEach(costCenter => {
    // Use hash for consistent color assignment regardless of order
    const costCenterHash = costCenter.split('').reduce((hash, char) => {
      return char.charCodeAt(0) + ((hash << 5) - hash)
    }, 0)
    colorMap[costCenter] = COST_CENTER_COLORS[Math.abs(costCenterHash) % COST_CENTER_COLORS.length]
  })

  return colorMap
}

/**
 * Build sunburst visualization data
 * Structure: Hierarchy levels as rings, countries/companies/cost centers as segments within each ring
 */
export const buildSunburstData = (
  nodes: Map<string, OrganizationalNode>,
  colorMap: CountryColorMap | CompanyColorMap | CostCenterColorMap,
  viewMode: 'location' | 'company' | 'costcenter' = 'location',
  colorBy: 'country' | 'level' | 'company' | 'costcenter' = 'country'
): SunburstNode[] => {
  // Group nodes by hierarchy level
  const nodesByLevel = new Map<number, OrganizationalNode[]>()
  let maxLevel = 0

  nodes.forEach(node => {
    maxLevel = Math.max(maxLevel, node.level)
    if (!nodesByLevel.has(node.level)) {
      nodesByLevel.set(node.level, [])
    }
    nodesByLevel.get(node.level)!.push(node)
  })

  // Build level nodes with country/company/cost center children for sunburst rings
  const levelNodes: SunburstNode[] = []

  for (let level = 0; level <= maxLevel; level++) {
    const nodesAtLevel = nodesByLevel.get(level) || []
    if (nodesAtLevel.length === 0) continue

    // Aggregate employee counts by country, company, or cost center for this level
    const segmentAggregation = new Map<
      string,
      {
        count: number
        displayName: string
        orgUnits: string[]
        companies: Set<string>
        countries: Set<string>
        costCenters: Set<string>
      }
    >()

    nodesAtLevel.forEach(node => {
      // Choose aggregation source based on view mode
      let sourceMap: Map<string, number>
      if (viewMode === 'company') {
        sourceMap = node.employeeCountByCompany
      } else if (viewMode === 'costcenter') {
        sourceMap = node.employeeCountByCostCenter
      } else {
        sourceMap = node.employeeCountByCountry
      }

      sourceMap?.forEach((count, segmentKey) => {
        if (count > 0) {
          let displayName: string

          if (viewMode === 'company') {
            // For company mode, get company name from the node's company
            displayName = node.company?.name || segmentKey
          } else if (viewMode === 'costcenter') {
            // For cost center mode, we need to find the cost center name
            // Since we're using the cost center code/id as key, use it as display name for now
            displayName = segmentKey // This will be the cost center code or 'Unknown'
          } else {
            // For location mode, get country name from employees
            displayName = node.employees.find(emp => emp.country === segmentKey)?.countryName || segmentKey
          }

          if (!segmentAggregation.has(segmentKey)) {
            segmentAggregation.set(segmentKey, {
              count: 0,
              displayName,
              orgUnits: [],
              companies: new Set(),
              countries: new Set(),
              costCenters: new Set()
            })
          }

          const existing = segmentAggregation.get(segmentKey)!
          existing.count += count
          existing.orgUnits.push(node.name)

          // Track companies, countries, and cost centers for all nodes
          if (node.company?.name) {
            existing.companies.add(node.company.name)
          }

          // Add countries from employees
          node.employees.forEach(emp => {
            if (emp.countryName) {
              existing.countries.add(emp.countryName)
            }
          })

          // Add cost centers
          if (viewMode === 'costcenter' && segmentKey !== 'Unknown') {
            existing.costCenters.add(displayName)
          }
        }
      })
    })

    // Create segments for this level (countries, companies, or cost centers)
    const segments: SunburstNode[] = []
    segmentAggregation.forEach((data, segmentKey) => {
      segments.push({
        id: `level-${level}-${segmentKey}`,
        name: data.displayName,
        level: level + 1, // Children are one level deeper
        value: data.count,
        children: [],
        country: viewMode === 'location' ? segmentKey : undefined,
        countryName: viewMode === 'location' ? data.displayName : Array.from(data.countries).join(', '),
        orgUnitType: `Level ${level}`,
        companyName: viewMode === 'company' ? data.displayName : Array.from(data.companies).join(', '),
        color: getNodeColor(
          viewMode === 'location' ? segmentKey : null,
          level,
          viewMode === 'company' ? segmentKey : Array.from(data.companies)[0],
          viewMode === 'costcenter' ? segmentKey : undefined,
          colorBy,
          colorMap
        )
      })
    })

    // Create level node with segment children (this creates the ring structure)
    const levelTotalEmployees = Array.from(segmentAggregation.values()).reduce((sum, data) => sum + data.count, 0)

    levelNodes.push({
      id: `level-${level}`,
      name: `Level ${level}`,
      level: level,
      value: levelTotalEmployees,
      children: segments, // Countries/Companies/Cost Centers are children of the level
      orgUnitType: `Organizational Level ${level}`,
      companyName: 'All Companies',
      color: getNodeColor(null, level, 'All Companies', undefined, colorBy, colorMap)
    })
  }

  // Return a single root with all level nodes as children
  const totalEmployees = Array.from(nodes.values()).reduce((sum, node) => sum + node.totalEmployeeCount, 0)

  return [
    {
      id: 'organization-root',
      name: 'Organization',
      level: -1,
      value: totalEmployees,
      children: levelNodes, // Levels are children of root
      orgUnitType: 'Root',
      companyName: 'All Companies',
      color: '#6B7280'
    }
  ]
}

/**
 * Get color for a node based on coloring strategy
 */
const getNodeColor = (
  country: string | null,
  level: number,
  companyName: string | undefined,
  costCenterName: string | undefined,
  colorBy: 'country' | 'level' | 'company' | 'costcenter',
  colorMap: CountryColorMap | CompanyColorMap | CostCenterColorMap
): string => {
  switch (colorBy) {
    case 'country':
      return country ? colorMap[country] || '#6B7280' : '#6B7280'
    case 'level':
      return LEVEL_COLORS[level % LEVEL_COLORS.length]
    case 'company':
      // Use the company color map if available, otherwise generate consistent color
      if (companyName && colorMap[companyName]) {
        return colorMap[companyName]
      }
      // Fallback to hash-based color generation for consistency
      const companyHash = (companyName || 'Unknown').split('').reduce((hash, char) => {
        return char.charCodeAt(0) + ((hash << 5) - hash)
      }, 0)
      return COMPANY_COLORS[Math.abs(companyHash) % COMPANY_COLORS.length]
    case 'costcenter':
      return costCenterName ? colorMap[costCenterName] || '#6B7280' : '#6B7280'
    default:
      return '#6B7280'
  }
}

/**
 * Calculate hierarchy statistics
 */
export const calculateHierarchyStatistics = (nodes: Map<string, OrganizationalNode>): HierarchyStatistics => {
  let totalEmployees = 0
  let maxLevels = 0
  const countries = new Set<string>()
  const companies = new Set<string>()
  const costCenters = new Set<string>()

  nodes.forEach(node => {
    totalEmployees += node.totalEmployeeCount
    maxLevels = Math.max(maxLevels, node.level)

    node.employees.forEach(emp => {
      if (emp.country) {
        countries.add(emp.country)
      }
    })

    if (node.company?.name) {
      companies.add(node.company.name)
    }

    if (node.employeeCountByCostCenter) {
      node.employeeCountByCostCenter.forEach((_, costCenter) => {
        if (costCenter !== 'Unknown') {
          costCenters.add(costCenter)
        }
      })
    }
  })

  return {
    totalEmployees,
    totalOrganizationalUnits: nodes.size,
    maxLevels: maxLevels + 1,
    countriesRepresented: countries.size,
    companiesCount: companies.size,
    costCentersCount: costCenters.size
  }
}

/**
 * Process complete hierarchy data
 */
export const processHierarchyData = (
  data: OrganizationalUnitRelationshipResponse
): {
  nodes: Map<string, OrganizationalNode>
  sunburstData: SunburstNode[]
  statistics: HierarchyStatistics
  colorMap: CountryColorMap | CompanyColorMap | CostCenterColorMap
} => {
  // Build organizational tree
  const { nodes, roots } = buildOrganizationalTree(data.OrganizationalUnitRelationship)

  // Calculate levels
  calculateOrganizationalLevels(roots)

  // Map employees to countries
  const employeeCountryMap = mapEmployeesToCountries(data.SiteLocation, data.EmployeeSiteLocation)

  // Map employees to companies
  const employeeCompanyMap = mapEmployeesToCompanies(data.EmployeeCompany)

  // Map employees to cost centers
  const employeeCostCenterMap = mapEmployeesToCostCenters(data.OrganizationalUnitRelationship, data.CostCenter)

  // Process employees with country information
  processEmployeesWithCountries(nodes, data.OrganizationalUnitRelationship, employeeCountryMap)

  // Process employees with company information
  processEmployeesWithCompanies(nodes, data.OrganizationalUnitRelationship, employeeCompanyMap)

  // Process employees with cost center information
  processEmployeesWithCostCenters(nodes, data.OrganizationalUnitRelationship, employeeCostCenterMap)

  // Generate color mapping
  const allCountries = new Set<string>()
  nodes.forEach(node => {
    node.employeeCountByCountry.forEach((_, country) => {
      allCountries.add(country)
    })
  })
  const colorMap = generateCountryColorMap(allCountries)

  // Build sunburst data
  const sunburstData = buildSunburstData(nodes, colorMap, 'location')

  // Calculate statistics
  const statistics = calculateHierarchyStatistics(nodes)

  return { nodes, sunburstData, statistics, colorMap }
}

/**
 * Generate table data from organizational nodes for reporting by level
 */
export const generateTableData = (
  nodes: Map<string, OrganizationalNode>,
  statistics: HierarchyStatistics
): HierarchyTableData => {
  // Group nodes by level
  const levelGroups = new Map<number, OrganizationalNode[]>()

  nodes.forEach(node => {
    if (!levelGroups.has(node.level)) {
      levelGroups.set(node.level, [])
    }
    levelGroups.get(node.level)!.push(node)
  })

  const generateLevelReportData = (viewMode: 'location' | 'company' | 'costcenter'): HierarchyLevelReportData[] => {
    const result: HierarchyLevelReportData[] = []

    // Sort levels numerically
    const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b)

    sortedLevels.forEach(level => {
      const levelNodes = levelGroups.get(level) || []
      const totalEmployees = levelNodes.reduce((sum, node) => sum + node.totalEmployeeCount, 0)
      const organizationalUnits = levelNodes.length

      // Aggregate segments (countries, companies, or cost centers) for this level
      const segmentAggregation = new Map<string, { count: number; displayName: string }>()

      levelNodes.forEach(node => {
        let countMap: Map<string, number>

        switch (viewMode) {
          case 'company':
            countMap = node.employeeCountByCompany
            break
          case 'costcenter':
            countMap = node.employeeCountByCostCenter
            break
          default: // location
            countMap = node.employeeCountByCountry
        }

        countMap.forEach((count, segmentKey) => {
          if (count > 0) {
            // For display name, use the segment key or try to find a better name
            let displayName = segmentKey

            if (viewMode === 'company' && node.company?.name) {
              displayName = node.company.name
            } else if (viewMode === 'location') {
              // Try to get country name from employees
              const employeeWithCountry = node.employees.find(emp => emp.country === segmentKey)
              displayName = employeeWithCountry?.countryName || segmentKey
            }

            if (segmentAggregation.has(segmentKey)) {
              segmentAggregation.get(segmentKey)!.count += count
            } else {
              segmentAggregation.set(segmentKey, { count, displayName })
            }
          }
        })
      })

      // Create segments array
      const segments: HierarchySegmentData[] = []
      const colorMaps = {
        location: generateCountryColorMap(new Set(segmentAggregation.keys())),
        company: generateCompanyColorMap(new Set(segmentAggregation.keys())),
        costcenter: generateCostCenterColorMap(new Set(segmentAggregation.keys()))
      }

      segmentAggregation.forEach((data, segmentKey) => {
        // Fallback colors based on view mode
        const fallbackColors = {
          location: LOCATION_COLORS[0],
          company: COMPANY_COLORS[0],
          costcenter: COST_CENTER_COLORS[0]
        }

        segments.push({
          id: segmentKey,
          name: data.displayName,
          employeeCount: data.count,
          percentage: totalEmployees > 0 ? Math.round((data.count / totalEmployees) * 100) : 0,
          color: colorMaps[viewMode][segmentKey] || fallbackColors[viewMode]
        })
      })

      // Sort segments by employee count (descending)
      segments.sort((a, b) => b.employeeCount - a.employeeCount)

      result.push({
        level,
        levelName: `Level ${level}`,
        totalEmployees,
        organizationalUnits,
        segments,
        percentage: statistics.totalEmployees > 0 ? Math.round((totalEmployees / statistics.totalEmployees) * 100) : 0
      })
    })

    return result
  }

  return {
    location: generateLevelReportData('location'),
    company: generateLevelReportData('company'),
    costcenter: generateLevelReportData('costcenter')
  }
}
