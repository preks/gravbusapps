// Core GraphQL Response Types
export interface EmployeeCompany {
  employeeId: string
  companyId: string
  company: Company
}

export interface OrganizationalUnitRelationshipResponse {
  OrganizationalUnitRelationship: OrganizationalUnitRelationship[]
  SiteLocation: SiteLocation[]
  EmployeeSiteLocation: EmployeeSiteLocation[]
  CostCenter: CostCenter[]
  EmployeeCompany: EmployeeCompany[]
}

export interface OrganizationalUnitRelationship {
  id: string
  parentId: string
  childId: string
  parent: OrganizationalUnit | null
  child: OrganizationalUnit | null
}

export interface OrganizationalUnit {
  id: string
  name: string
  type: string | null
  code: string | null
  costCenterId: string | null
  company: Company | null
  organizationalUnitEmployee: EmployeeOrganizationalUnit[]
}

export interface EmployeeOrganizationalUnit {
  id: string
  employeeId: string
  jobPositionId: string
  isMain: boolean
  role: string | null
  managerLevel: string | null
  employee: Employee | null
}

export interface Employee {
  id: string
  businessKey: string | null
  firstName: string | null
  lastName: string | null
}

export interface Company {
  id: string
  name: string
  code: string | null
}

export interface SiteLocation {
  id: string
  name: string
  country: CatalogEntry | null
  region: CatalogEntry | null
  locality: string | null
}

export interface CatalogEntry {
  id: string
  code: string
  value: string
}

export interface EmployeeSiteLocation {
  employeeId: string
  siteLocationId: string
}

// Processed Data Types
export interface OrganizationalNode {
  id: string
  name: string
  type: string | null
  code: string | null
  level: number
  company: Company | null
  costCenterId: string | null
  employees: EmployeeWithCountry[]
  children: OrganizationalNode[]
  employeeCountByCountry: Map<string, number>
  employeeCountByCompany: Map<string, number>
  employeeCountByCostCenter: Map<string, number>
  totalEmployeeCount: number
}

export interface EmployeeWithCountry {
  id: string
  name: string
  businessKey: string | null
  country: string | null
  countryName: string | null
}

// New: Employee with company information
export interface EmployeeWithCompany {
  id: string
  name: string
  businessKey: string | null
  company: string | null
  companyName: string | null
}

// New: Employee with cost center information
export interface EmployeeWithCostCenter {
  id: string
  name: string
  businessKey: string | null
  costCenter: string | null
  costCenterName: string | null
}

// Sunburst Visualization Types
export interface SunburstNode {
  id: string
  name: string
  level: number
  value: number // Employee count
  children: SunburstNode[]
  country?: string
  countryName?: string
  orgUnitType?: string
  companyName?: string
  color?: string
}

export interface HierarchyStatistics {
  totalEmployees: number
  totalOrganizationalUnits: number
  maxLevels: number
  countriesRepresented: number
  companiesCount: number
  costCentersCount: number
}

// Table Data Types for Reporting
export interface HierarchyLevelReportData {
  level: number
  levelName: string
  totalEmployees: number
  organizationalUnits: number
  segments: HierarchySegmentData[]
  percentage: number
}

export interface HierarchySegmentData {
  id: string
  name: string
  employeeCount: number
  percentage: number
  color: string
}

export interface HierarchyTableData {
  location: HierarchyLevelReportData[]
  company: HierarchyLevelReportData[]
  costcenter: HierarchyLevelReportData[]
}

// Query Variables
export interface HierarchyQueryVariables {
  structureId: string
}

// Component Props
export interface HierarchyTreeProps {
  structureId: string
}

export interface SunburstVisualizationProps {
  data: SunburstNode[]
  statistics: HierarchyStatistics
  tableData?: HierarchyTableData
  isLoading: boolean
  error: string | null
  onRefresh: () => void
}

// Country Color Mapping
export interface CountryColorMap {
  [countryCode: string]: string
}

export interface CompanyColorMap {
  [companyCode: string]: string
}

export interface CostCenterColorMap {
  [costCenterCode: string]: string
}

// Filter and Display Options
export interface HierarchyDisplayOptions {
  showEmptyUnits: boolean
  minEmployeesPerUnit: number
  selectedCountries: string[]
  selectedLevels: number[]
  colorBy: 'country' | 'level' | 'company' | 'costcenter'
}

export interface CostCenter {
  id: string
  name: string
  code: string | null
  description: string | null
}
