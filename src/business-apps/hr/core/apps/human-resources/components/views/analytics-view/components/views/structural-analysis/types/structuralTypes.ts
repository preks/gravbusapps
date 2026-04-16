// Base interfaces for structural analysis
export interface StructuralAnalysisQueryVariables {
  structureId: string
  limit?: number
  offset?: number
}

// Employee interface
export interface Employee {
  id: string
  firstName: string | null
  lastName: string | null
  fullName?: string
}

// Organizational Unit interface
export interface OrganizationalUnit {
  id: string
  name: string
  code: string | null
  description: string | null
  companyId: string | null
  costCenterId: string | null
  employees: Employee[]
  company?: Company
  organizationalUnitEmployee?: Array<{
    id: string
    employeeId: string
    employee: Employee | null
  }>
}

// Company interface
export interface Company {
  id: string
  name: string
  code: string | null
}

// Cost Center interface
export interface CostCenter {
  id: string
  name: string
  code: string | null
  description: string | null
}

// Site Location interface
export interface SiteLocation {
  id: string
  name: string
  code: string | null
  country: {
    code: string
    value: string
  } | null
  region: {
    code: string
    value: string
  } | null
}

// Employee with location information
export interface EmployeeWithLocation extends Employee {
  siteLocation: SiteLocation
}

// Processed organizational node
export interface OrganizationalNode {
  id: string
  name: string
  description: string | null
  parentId: string | null
  level: number
  employees: Employee[]
  employeeCount: number
  directReports: number
  spanOfControl: number
  company?: Company
  costCenter?: CostCenter
}

// Span of Control Analysis
export interface SpanOfControlData {
  managerId: string
  managerName: string
  organizationalUnit: string
  directReports: number
  managerLevel: string | null
  efficiency: 'Optimal' | 'Overloaded' | 'Underutilized'
  recommendation: string
}

// Span of Control Summary
export interface SpanOfControlSummary {
  totalManagers: number
  averageSpan: number
  optimalCount: number
  underUtilizedCount: number
  overBurdenedCount: number
  recommendedSpanMin: number
  recommendedSpanMax: number
}

// Organizational Depth Analysis
export interface DepthAnalysisData {
  level: number
  unitCount: number
  employeeCount: number
  averageSpanOfControl: number
  efficiency: number
}

// Reporting Chain Analysis
export interface ReportingChainData {
  chainId: string
  topManager: string
  levels: number
  totalEmployees: number
  averageSpanOfControl: number
  chainPath?: string
  bottlenecks: string[]
  efficiency: number
}

// Reporting Chain Summary
export interface ReportingChainSummary {
  averageChainLength: number
  maxChainLength: number
  minChainLength: number
  chainDistribution: Array<{
    length: number
    count: number
    percentage: number
  }>
  bottlenecks: Array<{
    managerId: string
    managerName: string
    chainsThroughManager: number
    impact: number
  }>
}

// Sunburst visualization data
export interface SunburstNode {
  name: string
  value: number
  level: number
  employees: string[]
  children?: SunburstNode[]
  color?: string
  fill?: string // For chart rendering
  key?: string // For React rendering keys
  id?: string // For chart identification
}

// Statistics interfaces
export interface StructuralStatistics {
  totalEmployees: number
  totalUnits: number
  totalManagers: number
  maxDepth: number
  hierarchyDepth: number // alias for maxDepth
  averageSpanOfControl: number
  averageReportingChainLength: number
  organizationalEfficiency: number
  structuralHealthScore: number
}

export interface SpanOfControlStatistics {
  optimalManagers: number
  overloadedManagers: number
  underutilizedManagers: number
  averageSpanOfControl: number
}

export interface DepthStatistics {
  totalLevels: number
  averageEmployeesPerLevel: number
  mostPopulatedLevel: number
  optimalDepthRange: string
}

export interface ReportingChainStatistics {
  totalChains: number
  averageChainLength: number
  longestChain: number
  chainsWithBottlenecks: number
}

// GraphQL Response Types
export interface OrganizationalUnitRelationship {
  id: string
  parentId?: string
  childId: string
  structureId: string
  parent?: OrganizationalUnit
  child: OrganizationalUnit
}

export interface EmployeeSiteLocation {
  id: string
  employeeId: string
  siteLocationId: string
  employee?: Employee
  siteLocation?: SiteLocation
}

// GraphQL Query Response Types
export interface StructuralAnalysisResponse {
  OrganizationalUnitRelationship: OrganizationalUnitRelationship[]
  SiteLocation: SiteLocation[]
  EmployeeSiteLocation: EmployeeSiteLocation[]
  Employee: Employee[]
}

// Chart Configuration Types
export interface ChartColorScheme {
  primary: string[]
  depth: string[]
  status: {
    optimal: string
    warning: string
    critical: string
  }
}

// Tab Types
export type AnalysisTab =
  | 'span-control'
  | 'depth-analysis'
  | 'reporting-chains'
  | 'overview'
  | 'organizational-hierarchy'

// Organizational Depth Analysis Types
export interface DepthAnalysisSummary {
  maxDepth: number
  averageDepth: number
  departmentDepths: Array<{
    departmentId: string
    departmentName: string
    depth: number
    employeeCount: number
    efficiency: number
  }>
  levelDistribution: Array<{
    level: number
    unitCount: number
    employeeCount: number
    percentage: number
  }>
}
