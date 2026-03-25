// Shared types for job structure data will be added here
// e.g., common interfaces, enums, type utilities

// Job Level interfaces
export interface JobLevel {
  id: string
  name: string
  nameI18n?: { [key: string]: string }
  code?: string
  description?: string
  descriptionI18n?: { [key: string]: string }
  level: number // derived from hierarchyOrder
  jobLevelGroupId: string // from jobLevelGroupRef
  compensationBandId?: string
  compensationBand?: {
    id: string
    name: string
    payGrade?: number
  }
  version?: number
  // Additional computed fields
  displayName: string
  salaryGrade?: number // derived from compensation band
  experienceYears?: number // could be derived or added later
}

// Job Level Group interfaces
export interface JobLevelGroup {
  id: string
  name: string
  code: string
  description?: string
  category: string
  isActive: boolean
  translations?: any
  additionalValue1?: string
  additionalValue2?: string
  additionalValue3?: string
  // Computed fields
  jobLevels: JobLevel[]
  jobLevelCount: number
  color: string // for UI display
  version?: string
}

// Job Family interfaces - supports hierarchical structure
export interface JobFamily {
  id: string
  name: string
  code: string
  description?: string
  parentEntryId?: string // Reference to parent job family
  isActive: boolean
  translations?: { [key: string]: string }
  objectValue?: any // Additional data from catalog
  // Computed/UI fields
  level: number // Hierarchy level (0 = root, 1 = child, etc.)
  children: JobFamily[] // Child job families
  hasChildren: boolean // Whether this family has child families
  isExpanded?: boolean // UI state for tree view
  parentFamily?: JobFamily // Reference to parent family object
}

// Job Function interfaces
export interface JobFunction {
  id: string
  name: string
  nameI18n?: { [key: string]: string }
  code?: string
  description?: string
  descriptionI18n?: { [key: string]: string }
  jobLevelGroup?: {
    id: string
    value: string
  }
  jobLevelGroupRef?: string
  jobFamily?: {
    id: string
    value: string
  }
  jobFamilyRef?: string
  version?: number
  // Computed fields for UI
  displayName: string
  isActive: boolean
}

// Job Profile interfaces
export interface JobProfile {
  id: string
  name: string
  nameI18n?: { [key: string]: string }
  code: string
  description?: string
  descriptionI18n?: { [key: string]: string }
  jobFunction?: {
    id: string
    name: string
  }
  jobFunctionId?: string
  jobLevel?: {
    id: string
    name: string
  }
  jobLevelId?: string
  contractType?: {
    id: string
    value: string
  }
  contractTypeRef?: string
  employmentType?: {
    id: string
    value: string
  }
  employmentTypeRef?: string
  recordState?: string
  version?: number
  jobProfileSkills?: Array<{
    id: string
    skillId: string
    requiredLevel?: number | null
    skill?: {
      id: string
      name: string
    }
  }>
  // Computed fields for UI
  displayName: string
  isActive: boolean
}

// Utility types for Job Family hierarchy management
export interface JobFamilyTreeNode extends JobFamily {
  depth: number // How deep in the tree this node is
  path: string[] // Array of parent IDs leading to this node
  isLeaf: boolean // Whether this is a leaf node (no children)
}

export interface JobFamilyHierarchyState {
  rootFamilies: JobFamily[] // Top-level families (no parent)
  allFamilies: JobFamily[] // Flat list of all families
  familyMap: Map<string, JobFamily> // Quick lookup by ID
  expandedIds: Set<string> // Which families are currently expanded in UI
}

// API response types for Job Family catalog
export interface JobFamilyCatalogEntry {
  id: string
  parentEntryId?: string
  code: string
  value: string // The display name
  objectValue: any
  translations?: { [key: string]: string }
}

export interface JobFamilyCatalogResponse {
  data: JobFamilyCatalogEntry[]
  totalRecords?: number
}

export {}
