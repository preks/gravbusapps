export { default } from './OrgHierarchyReport'

// Export components for external use
export { default as RadialBarChart } from './components/RadialBarChart'
export type { RadialBarChartProps } from './components/RadialBarChart'

// Export types for external use
export type {
  SunburstNode,
  HierarchyStatistics,
  OrganizationalNode,
  CountryColorMap,
  CompanyColorMap,
  CostCenterColorMap,
  HierarchyDisplayOptions
} from './types/hierarchyTypes'

// Export hooks for external use
export { useHierarchyDataIntegration } from './hooks/useHierarchyData'
export type { ViewMode } from './hooks/useHierarchyData'

// Export utilities for external use
export {
  processHierarchyData,
  buildOrganizationalTree,
  calculateOrganizationalLevels,
  mapEmployeesToCountries,
  mapEmployeesToCompanies,
  mapEmployeesToCostCenters,
  generateCountryColorMap,
  generateCompanyColorMap,
  generateCostCenterColorMap,
  buildSunburstData
} from './utils/hierarchyUtils'
