// Shared types for organizational data will be added here
// e.g., common interfaces, enums, type utilities

// Organizational Data Types

// Company Address types
export interface CompanyAddressLine {
  streetAddress?: string
  addressLine2?: string
  addressLine3?: string
  addressLine4?: string
}

export interface CompanyAddress {
  id?: string
  companyId?: string
  addressType?: string
  addressLine?: CompanyAddressLine
  postalCode?: string
  locality?: string
  regionRef?: string
  countryRef?: string
}

// Company-related types based on orgchart API
export interface CompanyData {
  id: string
  structureId: string
  name: string
  code: string
  description?: string
  directorId?: string
  commercialRegistrationNumber?: string
  taxIdentificationNumber?: string
  taxNumber?: string
  valueAddedTaxNumber?: string
  currencyRef?: string
  additionalProperties?: Record<string, unknown>
  addresses?: CompanyAddress[]
  picture?: Record<string, unknown>
  documents?: unknown[]
}

export interface OrganizationalNode {
  id: string
  type: 'company' | 'organizationalUnit'
  parentNode?: string
  data: {
    numberOfAssignedJobPositions: number
    numberOfAssignedEmployees: number
    numberOfTotalJobPositions: number
    numberOfChildUnits: number
    numberOfCompanyAssignedUnits: number
    organizationalUnitData: any
    companyData: CompanyData
    numberOfOpenJobPositions: number
  }
}

export interface OrganizationalEdge {
  id: string
  source: string
  target: string
  relationshipType: 'hierarchical'
  edgeType: 'company' | 'organizationalUnit'
  percentage: number
}

export interface OrganizationalStructure {
  structureId: string
  name: string
  description?: string
  isActive: boolean
  structureType: 'organizational'
  version: number
}

export interface OrgchartApiResponse {
  structure: OrganizationalStructure
  nodes: OrganizationalNode[]
  edges: OrganizationalEdge[]
}

// Director type for companies (similar to ProjectManager)
export interface Director {
  id: string
  displayName?: string
  firstName?: string
  lastName?: string
  pictureThumbnail?: string
}

// Enhanced Company interface for UI display
export interface Company {
  id: string
  nodeId: string // The node ID from the orgchart API
  structureId: string
  name: string
  code: string
  description?: string
  parentNodeId?: string
  parentEdgeSource?: string
  parentCompanyName?: string
  percentage: number | undefined
  edgeId?: string // The edge ID for updating companyEdges
  // New fields from API
  directorId?: string
  director?: Director // Populated director data (similar to Project.manager)
  commercialRegistrationNumber?: string
  taxIdentificationNumber?: string
  taxNumber?: string
  valueAddedTaxNumber?: string
  currencyRef?: string
  additionalProperties?: Record<string, unknown>
  addresses?: CompanyAddress[]
  // Statistics from API
  numberOfAssignedJobPositions: number
  numberOfAssignedEmployees: number
  numberOfTotalJobPositions: number
  numberOfChildUnits: number
  numberOfOpenJobPositions: number
  // Computed fields
  status: 'Active' | 'Inactive'
  level: number // Hierarchy level (0 = root, 1 = child, etc.)
  children: Company[]
  hasChildren: boolean
  pictureThumbnail?: string
  picture?: string
}

// Hierarchy state for managing tree view
export interface CompanyHierarchyState {
  rootCompanies: Company[]
  allCompanies: Company[]
  companyMap: Map<string, Company>
  expandedIds: Set<string>
}

// Other organizational data types
export interface Capability {
  id: string
  name: string
  code: string
  category: 'Technical' | 'Leadership' | 'Analytical' | 'Creative'
  level: number
  competencyArea: string
  certificationRequired: boolean
  description?: string
  isActive: boolean
}

// Site Location types based on orgchart API
export interface Employee {
  id: string
  userId?: string
  firstName: string
  lastName: string
  personnelCode?: string
  pictureUrl?: string
  organizationalUnit: {
    organizationalUnitId: string
    organizationalUnitName: string
    organizationalUnitAssignmentId: string
  }
  jobPosition: {
    jobPositionId: string
    jobPositionName: string
  }
  siteLocation: {
    siteLocationId: string
    siteLocationName: string
    siteLocationAssignmentId: string
  }
  company: object
  costCenter: object
  matrixUnit?: {
    matrixUnitId: string
    matrixUnitName: string
    matrixUnitAssignmentId: string
  }
  contractType?: string
}

export interface SiteLocationCostCenter {
  id: string
  structureId: string
  code: string
  name: string
  description: string
  siteLocationId: string
  organizationalUnits: any[]
  employees: any[]
  additionalProperties: object
}

export interface SiteLocationData {
  id: string
  structureId: string
  name: string
  addressLine?: {
    streetAddress: string
    addressLine2: string
    addressLine3: string
  }
  postalCode?: string
  locality?: string
  region_ref?: string
  country_ref?: string
  code?: string
  employees: Employee[]
  costCenters: SiteLocationCostCenter[]
}

export interface PaginatedSiteLocations {
  data: SiteLocationData[]
  paging: {
    offset: number
    totalRecords: number
    hasMore: boolean
  }
}

// Enhanced Site Location interface for UI display
export interface SiteLocation {
  id: string
  structureId: string
  name: string
  code?: string
  address?: string
  postalCode?: string
  locality?: string
  region?: string
  country?: string
  // Computed fields
  employeeCount: number
  costCenterCount: number
  employees: Employee[]
  costCenters: SiteLocationCostCenter[]
  // UI display fields
  fullAddress: string
  status: 'Active' | 'Inactive'
  addressLine?: {
    streetAddress: string
    addressLine2: string
    addressLine3: string
  }
}

export interface SiteLocationCountry {
  id: string
  code: string
  alternativeCode: string
  value: string
  additionalValue1: string
  additionalValue2: string
  additionalValue3: string
}

export interface SiteLocationRegion {
  id: string
  parentEntryId: string
  code: string
  alternativeCode: string
  value: string
  additionalValue1: string
  additionalValue2: string
  objectValue: {
    TimeZone: string
  }
}

// Cost Center types based on orgchart API
export interface CostCenterEmployee {
  employeeId: string
  employeeFirstName: string
  employeeLastName: string
}

export interface CostCenterEmployeeTable {
  id: string
  firstName: string
  lastName: string
  name: string
  jobPosition?: { jobPositionName?: string }
  organizationalUnit?: { organizationalUnitName?: string }
}

export interface CostCenterOrganizationalUnitTable {
  id: string
  name: string
  type?: string
  description?: string
}

export interface CostCenterOrganizationalUnit {
  organizationalUnitId: string
  organizationalUnitName: string
}

export interface CostCenterData {
  id: string
  structureId: string
  code: string
  name: string
  description: string
  siteLocationId?: string
  siteLocationName?: string
  organizationalUnits: CostCenterOrganizationalUnit[]
  employees: CostCenterEmployee[]
  additionalProperties: Record<string, any>
}

// Enhanced Cost Center interface for UI display
export interface CostCenter {
  id: string
  structureId: string
  code: string
  name: string
  description: string
  siteLocationId?: string
  siteLocationName?: string
  // Computed fields
  employeeCount: number
  organizationalUnitCount: number
  employees: CostCenterEmployee[]
  organizationalUnits: CostCenterOrganizationalUnit[]
  additionalProperties: Record<string, any>
  // UI display fields
  status: 'Active' | 'Inactive'
  hasLocation: boolean
}

export interface CostCenterNode {
  id: string
  type: string
  parentNodeId?: string
  costCenterData: CostCenterData
}

// Organizational Unit (Department) types based on orgchart structures API
export interface OrganizationalUnitSupervisor {
  supervisorId: string
  country?: string
  firstName: string
  lastName: string
  callName?: string
  role: string
  personnelCode?: string
  mainJobPosition: {
    jobPositionId: string
    jobPositionName: string
  }
}

export interface OrganizationalUnitCompany {
  companyId: string
  companyName: string
}

export interface OrganizationalUnitCostCenter {
  costCenterId: string
  costCenterName: string
}

export interface OrganizationalUnitData {
  name: string
  description: string
  organizationUnitId: string
  code?: string
  type: 'TEAM' | 'DEPARTMENT'
  company?: OrganizationalUnitCompany
  costCenter?: OrganizationalUnitCostCenter
}

export interface OrganizationalUnitNodeData {
  numberOfAssignedJobPositions: number
  numberOfAssignedEmployees: number
  numberOfTotalJobPositions: number
  numberOfChildUnits: number
  organizationalUnitData: OrganizationalUnitData
  supervisor?: OrganizationalUnitSupervisor
  rank: number
  numberOfOpenJobPositions: number
}

export interface OrganizationalUnitNode {
  id: string
  type: 'organization_unit'
  parentNode?: string
  data: OrganizationalUnitNodeData
}

export interface OrganizationalUnitEdge {
  id: string
  source: string
  target: string
  relationshipType: 'hierarchical'
  edgeType: 'organization_unit'
  percentage?: number
}

export interface OrganizationalStructureApiResponse {
  structure: OrganizationalStructure
  nodes: OrganizationalUnitNode[]
  edges: OrganizationalUnitEdge[]
}

// Enhanced Department interface for UI display
export interface Department {
  id: string
  nodeId: string // The node ID from the structures API
  structureId: string
  name: string
  description: string
  code?: string
  type: 'TEAM' | 'DEPARTMENT'
  organizationUnitId: string
  parentNodeId?: string
  parentDepartmentName?: string
  // Company and cost center info
  companyId?: string
  companyName?: string
  costCenterId?: string
  costCenterName?: string
  // Supervisor information
  supervisorId?: string
  supervisorName?: string
  supervisorRole?: string
  supervisorJobPosition?: string
  // Statistics from API
  numberOfAssignedJobPositions: number
  numberOfAssignedEmployees: number
  numberOfTotalJobPositions: number
  numberOfChildUnits: number
  numberOfOpenJobPositions: number
  rank: number
  // Computed fields
  status: 'Active' | 'Inactive'
  level: number // Hierarchy level (0 = root, 1 = child, etc.)
  children: Department[]
  hasChildren: boolean
  hasSupervisor: boolean
}

// Hierarchy state for managing tree view
export interface DepartmentHierarchyState {
  rootDepartments: Department[]
  allDepartments: Department[]
  departmentMap: Map<string, Department>
  expandedIds: Set<string>
}

// Matrix Teams (Teams Tab) types based on orgchart matrix-units API
export interface MatrixTeamJobPosition {
  jobPositionId: string
  jobPositionName: string
}

export interface MatrixTeamMatrixUnit {
  matrixUnitId: string
  matrixUnitName: string
  percentage: number
}

export interface MatrixTeamLeader {
  id: string
  firstName: string
  lastName: string
  pictureUrl: string
  role: string
  jobPosition: MatrixTeamJobPosition
  matrixUnit: MatrixTeamMatrixUnit
}

export interface MatrixTeamApiResponse {
  id: string
  structureId: string
  name: string
  description?: string
  createdAt: string
  rank: number
  leader?: MatrixTeamLeader
}

// Enhanced Team interface for UI display
export interface Team {
  id: string
  structureId: string
  name: string
  description: string
  createdAt: string
  rank: number
  // Leader information
  leaderId?: string
  leaderName?: string
  leaderRole?: string
  leaderJobPosition?: string
  leaderPictureUrl?: string
  leaderMatrixUnitName?: string
  leaderPercentage?: number
  // Computed fields
  hasLeader: boolean
  status: 'Active' | 'Inactive'
  createdDate: Date
  age: string // Human readable age like "2 months ago"
}

export {}
