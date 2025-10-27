import React, { useState, useEffect, useMemo } from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { TaskAssignment, AssignmentTarget, AssignmentMode } from '@/common/network/flows/FlowTemplateClient'
import { validateClaimAssignmentForUI, createDefaultAssignmentTarget } from '../../utils/assignmentUtils'
import {
  Button,
  Input,
  Badge,
  Alert,
  Card,
  CardHeader,
  CardContent,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@newwork/nw-design-system'
import { X, UserCircle, Users, Building2, MapPin, DollarSign, FileCheck, AlertTriangle } from 'lucide-react'
import { useMockData } from '../../../../providers/MockDataProvider'
import { useOrgDirectory } from '@/common/network/org-directory'

// TODO: Remove mock data completely once all phases are implemented and tested
// Set to false to use real GraphQL API, true for mock data during development
const USE_MOCK_DATA = false

interface AssignmentSelectorProps {
  value?: TaskAssignment
  onChange: (assignment: TaskAssignment) => void
  assignmentMode: AssignmentMode
  accessToken: string
  userInfo?: any
  'data-testid'?: string
}

type AssignmentField = keyof AssignmentTarget

interface FieldConfig {
  field: AssignmentField
  label: string
  icon: React.ReactNode
  color: string
  placeholder: string
  dataSource: string
}

// Define ANY_SELECTOR constant
const ANY_SELECTOR = 'ANY' as const

// Field configurations grouped by logical categories for better UX
const fieldConfigGroups = {
  people: [
    {
      field: 'users' as const,
      label: 'Users',
      icon: <UserCircle className="gba:w-4 gba:h-4" />,
      color: 'gba:!bg-blue-100 gba:!text-blue-800 gba:!border-blue-300',
      placeholder: 'Search users...',
      dataSource: 'users'
    }
  ],
  structure: [
    {
      field: 'organizationalUnits' as const,
      label: 'Organizational Units',
      icon: <Users className="gba:w-4 gba:h-4" />,
      color: 'gba:!bg-green-100 gba:!text-green-800 gba:!border-green-300',
      placeholder: 'Search departments...',
      dataSource: 'departments'
    },
    {
      field: 'matrixTeams' as const,
      label: 'Matrix Teams',
      icon: <Users className="gba:w-4 gba:h-4" />,
      color: 'gba:!bg-purple-100 gba:!text-purple-800 gba:!border-purple-300',
      placeholder: 'Search matrix teams...',
      dataSource: 'matrixTeams'
    }
  ],
  business: [
    {
      field: 'companies' as const,
      label: 'Companies',
      icon: <Building2 className="gba:w-4 gba:h-4" />,
      color: 'gba:!bg-indigo-100 gba:!text-indigo-800 gba:!border-indigo-300',
      placeholder: 'Search companies...',
      dataSource: 'companies'
    },
    {
      field: 'costCenters' as const,
      label: 'Cost Centers',
      icon: <DollarSign className="gba:w-4 gba:h-4" />,
      color: 'gba:!bg-yellow-100 gba:!text-yellow-800 gba:!border-yellow-300',
      placeholder: 'Search cost centers...',
      dataSource: 'costCenters'
    }
  ],
  location: [
    {
      field: 'siteLocations' as const,
      label: 'Site Locations',
      icon: <MapPin className="gba:w-4 gba:h-4" />,
      color: 'gba:!bg-teal-100 gba:!text-teal-800 gba:!border-teal-300',
      placeholder: 'Search locations...',
      dataSource: 'locations'
    }
  ],
  skills: [
    {
      field: 'capabilities' as const,
      label: 'Capabilities',
      icon: <FileCheck className="gba:w-4 gba:h-4" />,
      color: 'gba:!bg-rose-100 gba:!text-rose-800 gba:!border-rose-300',
      placeholder: 'Search capabilities...',
      dataSource: 'capabilities'
    }
  ]
}

interface EntityItem {
  id: string
  name: string
  // Additional fields from teammates data
  organizationalUnitId?: string
  organizationalUnitName?: string
  costCenterId?: string
  costCenterName?: string
  matrixUnitId?: string
  matrixUnitName?: string
  companyId?: string
  companyName?: string
  siteLocationId?: string
  siteLocationName?: string
}

/**
 * Component for displaying assignment field values as badges
 */
interface FieldBadgesProps {
  field: AssignmentField
  values: string[]
  config: FieldConfig
  onRemove: (field: AssignmentField, value: string) => void
  'data-testid'?: string
}

interface FieldBadgesProps {
  field: AssignmentField
  values: string[]
  config: FieldConfig
  onRemove: (field: AssignmentField, value: string) => void
  teammates: EntityItem[]
  organizationalUnits?: Array<{ id: string; name: string; type: string }>
  matrixTeams?: Array<{ id: string; name: string }>
  companies?: Array<{ id: string; name: string }>
  costCenters?: Array<{ id: string; name: string }>
  siteLocations?: Array<{ id: string; name: string }>
  capabilities?: Array<{ id: string; name: string }>
  'data-testid'?: string
}

const FieldBadges: React.FC<FieldBadgesProps> = ({
  field,
  values,
  config,
  onRemove,
  teammates,
  organizationalUnits = [],
  matrixTeams = [],
  companies = [],
  costCenters = [],
  siteLocations = [],
  capabilities = [],
  'data-testid': testId = 'field-badges'
}) => {
  // Resolve entity name from real data or teammates
  const resolveEntityName = (dataSource: string, entityId: string): string => {
    if (entityId === ANY_SELECTOR) return 'Any'

    switch (dataSource) {
      case 'users':
        const user = teammates.find(t => t.id === entityId)
        return user ? user.name : entityId
      case 'departments':
        // Use real organizational units data
        if (organizationalUnits.length > 0) {
          const ou = organizationalUnits.find(ou => ou.id === entityId)
          return ou ? ou.name : entityId
        }
        // Fallback: extract from teammates
        const dept = teammates.find(t => t.organizationalUnitId === entityId)
        return dept ? dept.organizationalUnitName || entityId : entityId
      case 'matrixTeams':
        // Use real matrix teams data
        if (matrixTeams.length > 0) {
          const team = matrixTeams.find(t => t.id === entityId)
          return team ? team.name : entityId
        }
        // Fallback: extract from teammates
        const matrixTeam = teammates.find(t => t.matrixUnitId === entityId)
        return matrixTeam ? matrixTeam.matrixUnitName || entityId : entityId
      case 'companies': {
        // Use real companies data
        if (companies.length > 0) {
          const company = companies.find(c => c.id === entityId)
          return company ? company.name : entityId
        }
        // Fallback: extract from teammates
        const companyFromTeam = teammates.find(t => t.companyId === entityId)
        return companyFromTeam ? companyFromTeam.companyName || entityId : entityId
      }
      case 'costCenters': {
        // Use real cost centers data
        if (costCenters.length > 0) {
          const costCenter = costCenters.find(cc => cc.id === entityId)
          return costCenter ? costCenter.name : entityId
        }
        // Fallback: extract from teammates
        const ccFromTeam = teammates.find(t => t.costCenterId === entityId)
        return ccFromTeam ? ccFromTeam.costCenterName || entityId : entityId
      }
      case 'locations': {
        // Use real site locations data
        if (siteLocations.length > 0) {
          const location = siteLocations.find(loc => loc.id === entityId)
          return location ? location.name : entityId
        }
        // Fallback: extract from teammates
        const locationFromTeam = teammates.find(t => t.siteLocationId === entityId)
        return locationFromTeam ? locationFromTeam.siteLocationName || entityId : entityId
      }
      case 'capabilities': {
        // Use real capabilities data
        if (capabilities.length > 0) {
          const capability = capabilities.find(cap => cap.id === entityId)
          return capability ? capability.name : entityId
        }
        // No fallback for capabilities - they don't exist in teammates data
        return entityId
      }
      default:
        return entityId
    }
  }

  if (!values || values.length === 0) {
    return null
  }

  return (
    <div className="gba:flex gba:flex-wrap gba:gap-1 gba:mt-2" data-testid={testId}>
      {values.map((value, index) => (
        <Badge
          key={`${field}-${value}`}
          variant="outline"
          className={`gba:flex gba:items-center gba:gap-1 gba:pr-1 gba:text-xs ${config.color}`}
          data-testid={`${testId}-badge-${index}`}
        >
          {config.icon}
          <span>{resolveEntityName(config.dataSource, value)}</span>
          <button
            onClick={() => onRemove(field, value)}
            className="gba:ml-1 gba:text-gray-500 hover:gba:text-red-500 gba:transition-colors"
            data-testid={`${testId}-remove-${index}`}
          >
            <X className="gba:w-3 gba:h-3" />
          </button>
        </Badge>
      ))}
    </div>
  )
}

/**
 * Component for selecting values for a specific assignment field
 */
interface FieldSelectorProps {
  field: AssignmentField
  config: FieldConfig
  selectedValues: string[]
  onAdd: (field: AssignmentField, value: string) => void
  assignmentMode: AssignmentMode
  teammates: EntityItem[]
  organizationalUnits?: Array<{ id: string; name: string; type: string }>
  matrixTeams?: Array<{ id: string; name: string }>
  companies?: Array<{ id: string; name: string }>
  costCenters?: Array<{ id: string; name: string }>
  siteLocations?: Array<{ id: string; name: string }>
  capabilities?: Array<{ id: string; name: string }>
  mockData?: any
  'data-testid'?: string
}

const FieldSelector: React.FC<FieldSelectorProps> = ({
  field,
  config,
  selectedValues,
  onAdd,
  assignmentMode,
  teammates,
  organizationalUnits = [],
  matrixTeams = [],
  companies = [],
  costCenters = [],
  siteLocations = [],
  capabilities = [],
  mockData,
  'data-testid': testId = 'field-selector'
}) => {
  const [searchQuery, setSearchQuery] = useState('')

  // Get data source for the field from real data or teammates
  const getDataSource = (): EntityItem[] => {
    switch (config.dataSource) {
      case 'users':
        return teammates.map(t => ({ id: t.id, name: t.name }))
      case 'departments':
        // Use real organizational units data (filtered to departments only)
        if (organizationalUnits.length > 0) {
          return organizationalUnits
            .filter(ou => ou.type === 'DEPARTMENT' || !ou.type) // Include units without type
            .map(ou => ({ id: ou.id, name: ou.name }))
        }
        // Fallback: extract from teammates data
        const deptMap = new Map<string, EntityItem>()
        teammates.forEach(t => {
          if (t.organizationalUnitId && t.organizationalUnitName) {
            deptMap.set(t.organizationalUnitId, {
              id: t.organizationalUnitId,
              name: t.organizationalUnitName
            })
          }
        })
        return Array.from(deptMap.values())
      case 'matrixTeams':
        // Use real matrix teams data
        if (matrixTeams.length > 0) {
          return matrixTeams.map(team => ({ id: team.id, name: team.name }))
        }
        // Fallback: extract from teammates data
        const matrixMap = new Map<string, EntityItem>()
        teammates.forEach(t => {
          if (t.matrixUnitId && t.matrixUnitName) {
            matrixMap.set(t.matrixUnitId, {
              id: t.matrixUnitId,
              name: t.matrixUnitName
            })
          }
        })
        return Array.from(matrixMap.values())
      case 'companies':
        // Use real companies data
        if (companies.length > 0) {
          return companies.map(company => ({ id: company.id, name: company.name }))
        }
        // Fallback: extract from teammates
        const companyMap = new Map<string, EntityItem>()
        teammates.forEach(t => {
          if (t.companyId && t.companyName) {
            companyMap.set(t.companyId, {
              id: t.companyId,
              name: t.companyName
            })
          }
        })
        return Array.from(companyMap.values())
      case 'costCenters':
        // Use real cost centers data
        if (costCenters.length > 0) {
          return costCenters.map(cc => ({ id: cc.id, name: cc.name }))
        }
        // Fallback: extract from teammates
        const costCenterMap = new Map<string, EntityItem>()
        teammates.forEach(t => {
          if (t.costCenterId && t.costCenterName) {
            costCenterMap.set(t.costCenterId, {
              id: t.costCenterId,
              name: t.costCenterName
            })
          }
        })
        return Array.from(costCenterMap.values())
      case 'locations': {
        // Use real site locations data
        if (siteLocations.length > 0) {
          return siteLocations.map(loc => ({ id: loc.id, name: loc.name }))
        }
        // Fallback: extract from teammates
        const locationMap = new Map<string, EntityItem>()
        teammates.forEach(t => {
          if (t.siteLocationId && t.siteLocationName) {
            locationMap.set(t.siteLocationId, {
              id: t.siteLocationId,
              name: t.siteLocationName
            })
          }
        })
        return Array.from(locationMap.values())
      }
      case 'capabilities':
        // Use real capabilities data
        if (capabilities.length > 0) {
          return capabilities.map(cap => ({ id: cap.id, name: cap.name }))
        }
        // Fallback: use mock capabilities if available
        if (mockData) {
          return mockData.capabilities.map((cap: any) => ({ id: cap.id, name: cap.name }))
        }
        return []
      default:
        return []
    }
  }

  // Filter entities based on search query
  const filteredEntities = useMemo(() => {
    const entities = getDataSource()
    return searchQuery.trim() === ''
      ? entities.slice(0, 10) // Limit initial display
      : entities.filter(entity => entity.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 20) // Limit search results
  }, [searchQuery, config.dataSource])

  // Check if entity is already selected
  const selectedIds = new Set(selectedValues)

  const handleAdd = (value: string) => {
    onAdd(field, value)
    setSearchQuery('')
  }

  // Show validation warnings for CLAIM mode
  const showClaimWarning =
    assignmentMode === AssignmentMode.CLAIM &&
    field === 'users' &&
    selectedValues.length > 0 &&
    !selectedValues.every(v => v === ANY_SELECTOR)

  const showSingleValueWarning =
    assignmentMode === AssignmentMode.CLAIM &&
    field !== 'capabilities' &&
    selectedValues.length > 1 &&
    !selectedValues.every(v => v === ANY_SELECTOR)

  return (
    <div className="gba:space-y-2" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:gap-2">
        {config.icon}
        <span className="gba:font-medium gba:text-sm">{config.label}</span>
        {assignmentMode === AssignmentMode.CLAIM && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAdd(ANY_SELECTOR)}
            disabled={selectedIds.has(ANY_SELECTOR)}
            data-testid={`${testId}-add-any`}
            type="button"
          >
            Add "Any"
          </Button>
        )}
      </div>

      {/* Warnings for CLAIM mode */}
      {showClaimWarning && (
        <Alert variant="destructive" className="gba:text-xs">
          <AlertTriangle className="gba:w-3 gba:h-3" />
          Direct user assignment is not allowed in CLAIM mode
        </Alert>
      )}

      {showSingleValueWarning && (
        <Alert variant="destructive" className="gba:text-xs">
          <AlertTriangle className="gba:w-3 gba:h-3" />
          Only one value allowed in CLAIM mode (except capabilities)
        </Alert>
      )}

      {/* Search input */}
      <Input
        type="text"
        placeholder={config.placeholder}
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        className="gba:text-sm"
        data-testid={`${testId}-search-input`}
      />

      {/* Entity list */}
      {searchQuery && (
        <div className="gba:max-h-32 gba:overflow-y-auto gba:border gba:rounded gba:bg-white">
          {filteredEntities.map(entity => (
            <button
              key={entity.id}
              onClick={() => handleAdd(entity.id)}
              className={`
                gba:w-full gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:text-left gba:text-sm
                gba:hover:bg-gray-100 gba:transition-colors
                ${selectedIds.has(entity.id) ? 'gba:bg-gray-100 gba:text-gray-500' : ''}
              `}
              data-testid={`${testId}-entity-${entity.id}`}
              disabled={selectedIds.has(entity.id)}
            >
              <span>{entity.name}</span>
              {selectedIds.has(entity.id) && (
                <span className="gba:ml-auto gba:text-xs gba:text-gray-500">Selected</span>
              )}
            </button>
          ))}

          {filteredEntities.length === 0 && (
            <div className="gba:p-2 gba:text-center gba:text-sm gba:text-gray-500">No results found</div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Main assignment selector component
 */
export const AssignmentSelector: React.FC<AssignmentSelectorProps> = ({
  value,
  onChange,
  assignmentMode,
  accessToken,
  'data-testid': testId = 'assignment-selector'
}) => {
  // Tab state for organized assignment interface
  const [activeTab, setActiveTab] = useState<'people' | 'structure' | 'business' | 'location' | 'skills'>('people')

  // Check if we should use mock data (controlled by constant at top of file)
  let mockData = null
  if (USE_MOCK_DATA) {
    try {
      mockData = useMockData()
    } catch {
      // MockDataProvider not available, continue with real API
      mockData = null
    }
  }

  // Fetch ALL organizational data in a single efficient API call
  const {
    data: orgData,
    loading: orgLoading,
    error: orgError
  } = useOrgDirectory(
    mockData ? '' : accessToken // Skip API call if we have mock data
  )

  // Extract individual data sets from the consolidated response
  const directoryUsers = orgData?.users || []
  const organizationalUnits = orgData?.organizationalUnits || []
  const matrixTeams = orgData?.matrixTeams || []
  const companies = orgData?.companies || []
  const costCenters = orgData?.costCenters || []
  const siteLocations = orgData?.siteLocations || []
  const capabilities = orgData?.capabilities || []

  // Convert user data to EntityItem format, using mock data if available
  const teammates: EntityItem[] = useMemo(() => {
    if (mockData) {
      // Use mock data - create synthetic teammates from mock entities
      const mockTeammates: EntityItem[] = []

      // Create teammates from users with additional organizational data
      mockData.users.forEach((user: any, index: number) => {
        const deptIndex = index % mockData.departments.length
        const companyIndex = index % mockData.companies.length
        const locationIndex = index % mockData.locations.length
        const costCenterIndex = index % mockData.costCenters.length
        const matrixTeamIndex = index % mockData.matrixTeams.length

        mockTeammates.push({
          id: user.id,
          name: user.name,
          organizationalUnitId: mockData.departments[deptIndex].id,
          organizationalUnitName: mockData.departments[deptIndex].name,
          costCenterId: mockData.costCenters[costCenterIndex].id,
          costCenterName: mockData.costCenters[costCenterIndex].name,
          matrixUnitId: mockData.matrixTeams[matrixTeamIndex].id,
          matrixUnitName: mockData.matrixTeams[matrixTeamIndex].name,
          companyId: mockData.companies[companyIndex].id,
          companyName: mockData.companies[companyIndex].name,
          siteLocationId: mockData.locations[locationIndex].id,
          siteLocationName: mockData.locations[locationIndex].name
        })
      })

      return mockTeammates
    }

    // Use real GraphQL data from Employee Directory
    // This uses the SAME queries as custom-flow-engine for consistency
    return directoryUsers.map(user => {
      // Extract first organizational unit, matrix team, company, location, cost center
      const orgUnit = user.organizationalUnits?.[0]
      const matrixTeam = user.matrixTeams?.[0]
      const company = user.companies?.[0]
      const location = user.siteLocations?.[0]
      const costCenter = user.costCenters?.[0]

      return {
        id: user.id,
        name: user.name,
        organizationalUnitId: orgUnit,
        organizationalUnitName: orgUnit, // Will be resolved separately
        costCenterId: costCenter,
        costCenterName: costCenter, // Will be resolved separately
        matrixUnitId: matrixTeam,
        matrixUnitName: matrixTeam, // Will be resolved separately
        companyId: company,
        companyName: company, // Will be resolved separately
        siteLocationId: location,
        siteLocationName: location // Will be resolved separately
      }
    })
  }, [directoryUsers, mockData])
  // Initialize assignment
  const assignment = value || {
    targets: null, // Set targets to null when no assignment is configured
    assignmentMode: assignmentMode,
    allowReassignment: true
  }

  // Get the current target (single object, not array)
  const currentTarget = assignment.targets || createDefaultAssignmentTarget(assignmentMode)

  // Validate assignment for CLAIM mode
  const validation = useMemo(() => {
    if (assignmentMode === AssignmentMode.CLAIM) {
      return validateClaimAssignmentForUI(currentTarget)
    }
    return { valid: true, errors: [] }
  }, [currentTarget, assignmentMode])

  // Initialize assignment properly when component is first used
  useEffect(() => {
    if (!value) {
      onChange({
        targets: null, // Start with null targets - no assignment configured
        assignmentMode: assignmentMode,
        allowReassignment: true
      })
    }
  }, [value, assignmentMode, onChange])

  // Handle adding a value to a field
  const handleAddValue = (field: AssignmentField, value: string) => {
    // Use current target or create default
    const actualTarget = assignment.targets || createDefaultAssignmentTarget(assignmentMode)
    const currentValues = actualTarget[field] || []

    // Check if value already exists
    if (currentValues.includes(value)) return

    // For CLAIM mode, enforce single value constraint (except capabilities)
    let newValues: string[]
    if (assignmentMode === AssignmentMode.CLAIM && field !== 'capabilities') {
      // Replace existing value with new one for non-capability fields in CLAIM mode
      newValues = [value]
    } else {
      // Add to existing values
      newValues = [...currentValues, value]
    }

    const newTarget: AssignmentTarget = {
      ...actualTarget,
      [field]: newValues
    }

    const newAssignment: TaskAssignment = {
      ...assignment,
      targets: newTarget // Single target, not array
    }

    onChange(newAssignment)
  }

  // Handle removing a value from a field
  const handleRemoveValue = (field: AssignmentField, value: string) => {
    const actualTarget = assignment.targets || createDefaultAssignmentTarget(assignmentMode)
    const currentValues = actualTarget[field] || []
    const newValues = currentValues.filter((v: string) => v !== value)

    const newTarget: AssignmentTarget = {
      ...actualTarget,
      [field]: newValues.length > 0 ? newValues : null // Set to null when no values selected
    }

    // Check if all fields in the target are null/empty
    const hasAnyValues = Object.values(newTarget).some(
      fieldValue => fieldValue && Array.isArray(fieldValue) && fieldValue.length > 0
    )

    const newAssignment: TaskAssignment = {
      ...assignment,
      targets: hasAnyValues ? newTarget : null // Set entire targets to null if no values exist
    }

    onChange(newAssignment)
  }

  // Handle reassignment toggle
  const handleReassignmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...assignment,
      assignmentMode: assignment.assignmentMode || assignmentMode,
      allowReassignment: e.target.checked
    })
  }

  // Show loading state while data is being fetched (only for real API calls)
  if (!mockData && orgLoading) {
    return (
      <div className="gba:space-y-4" data-testid={testId}>
        <Card>
          <CardContent className="gba:p-6 gba:text-center">
            <div className="gba:flex gba:items-center gba:justify-center gba:gap-2">
              <div className="gba:animate-spin gba:w-4 gba:h-4 gba:border-2 gba:border-blue-500 gba:border-t-transparent gba:rounded-full"></div>
              <span className="gba:text-sm gba:text-gray-600">Loading organizational data...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show error state if data failed to load (only for real API calls)
  if (!mockData && orgError) {
    return (
      <div className="gba:space-y-4" data-testid={testId}>
        <Card>
          <CardContent className="gba:p-6">
            <Alert variant="destructive">
              <AlertTriangle className="gba:w-4 gba:h-4" />
              <div>
                <div className="gba:text-sm gba:font-medium">Failed to load organizational data</div>
                <div className="gba:text-xs gba:mt-1">{orgError.message}</div>
              </div>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      {/* Assignment Mode Info */}
      <Card>
        <CardHeader className="gba:pb-2">
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:font-medium">Assignment Mode: {assignmentMode}</span>
            {assignmentMode === AssignmentMode.CLAIM && (
              <Badge variant="outline" className="gba:text-xs">
                AND Logic (All conditions must match)
              </Badge>
            )}
            {assignmentMode === AssignmentMode.ASSIGN && (
              <Badge variant="outline" className="gba:text-xs">
                OR Logic (Any condition can match)
              </Badge>
            )}
          </div>
          {teammates.length > 0 && (
            <div className="gba:text-xs gba:text-gray-500">
              Using {mockData ? 'mock' : 'real'} data from {teammates.length} team members
            </div>
          )}
        </CardHeader>
        <CardContent>
          {/* Validation Errors */}
          {!validation.valid && (
            <Alert variant="destructive" className="gba:mb-4">
              <AlertTriangle className="gba:w-4 gba:h-4" />
              <div>
                {validation.errors.map((error, index) => (
                  <div key={index} className="gba:text-sm">
                    {error}
                  </div>
                ))}
              </div>
            </Alert>
          )}

          {/* Tabbed Assignment Fields */}
          <Tabs value={activeTab} onValueChange={value => setActiveTab(value as any)} className="gba:w-full">
            <TabsList className="gba:w-full gba:grid gba:grid-cols-5 gba:h-auto gba:p-1">
              <TabsTrigger value="people" className="gba:py-2.5 gba:px-2 gba:h-auto">
                <div className="gba:flex gba:flex-col gba:items-center gba:gap-1.5">
                  <UserCircle className="gba:w-5 gba:h-5 gba:flex-shrink-0" />
                  <span className="gba:text-xs gba:leading-tight gba:font-medium">People</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="structure" className="gba:py-2.5 gba:px-2 gba:h-auto">
                <div className="gba:flex gba:flex-col gba:items-center gba:gap-1.5">
                  <Users className="gba:w-5 gba:h-5 gba:flex-shrink-0" />
                  <span className="gba:text-xs gba:leading-tight gba:font-medium">Structure</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="business" className="gba:py-2.5 gba:px-2 gba:h-auto">
                <div className="gba:flex gba:flex-col gba:items-center gba:gap-1.5">
                  <Building2 className="gba:w-5 gba:h-5 gba:flex-shrink-0" />
                  <span className="gba:text-xs gba:leading-tight gba:font-medium">Business</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="location" className="gba:py-2.5 gba:px-2 gba:h-auto">
                <div className="gba:flex gba:flex-col gba:items-center gba:gap-1.5">
                  <MapPin className="gba:w-5 gba:h-5 gba:flex-shrink-0" />
                  <span className="gba:text-xs gba:leading-tight gba:font-medium">Location</span>
                </div>
              </TabsTrigger>
              <TabsTrigger value="skills" className="gba:py-2.5 gba:px-2 gba:h-auto">
                <div className="gba:flex gba:flex-col gba:items-center gba:gap-1.5">
                  <FileCheck className="gba:w-5 gba:h-5 gba:flex-shrink-0" />
                  <span className="gba:text-xs gba:leading-tight gba:font-medium">Skills</span>
                </div>
              </TabsTrigger>
            </TabsList>

            {Object.entries(fieldConfigGroups).map(([groupKey, configs]) => (
              <TabsContent key={groupKey} value={groupKey} className="gba:space-y-4 gba:mt-4">
                {configs.map(config => {
                  const fieldValues = currentTarget[config.field] || []

                  return (
                    <div key={config.field} className="gba:space-y-2">
                      <FieldSelector
                        field={config.field}
                        config={config}
                        selectedValues={fieldValues}
                        onAdd={handleAddValue}
                        assignmentMode={assignmentMode}
                        teammates={teammates}
                        organizationalUnits={organizationalUnits}
                        matrixTeams={matrixTeams}
                        companies={companies}
                        costCenters={costCenters}
                        siteLocations={siteLocations}
                        capabilities={capabilities}
                        mockData={mockData}
                        data-testid={`${testId}-selector-${config.field}`}
                      />

                      <FieldBadges
                        field={config.field}
                        values={fieldValues}
                        config={config}
                        onRemove={handleRemoveValue}
                        teammates={teammates}
                        organizationalUnits={organizationalUnits}
                        matrixTeams={matrixTeams}
                        companies={companies}
                        costCenters={costCenters}
                        siteLocations={siteLocations}
                        capabilities={capabilities}
                        data-testid={`${testId}-badges-${config.field}`}
                      />
                    </div>
                  )
                })}
              </TabsContent>
            ))}
          </Tabs>

          {/* Reassignment Settings */}
          <div className="gba:mt-6 gba:pt-4 gba:border-t">
            <div className="gba:flex gba:items-center gba:gap-2">
              <input
                type="checkbox"
                id={`reassignment-${testId}`}
                checked={assignment.allowReassignment || false}
                onChange={handleReassignmentChange}
                data-testid={`${testId}-reassignment-checkbox`}
              />
              <label htmlFor={`reassignment-${testId}`} className="gba:text-sm">
                {getTranslationFromI18nKeyAndLabel('flow.creator.allowReassignment', 'Allow reassignment')}
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
