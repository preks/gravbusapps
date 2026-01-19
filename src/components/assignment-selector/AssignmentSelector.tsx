import React, { useState, useEffect, useMemo } from 'react'
// import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { TaskAssignment, AssignmentTarget, AssignmentMode } from '@/common/network/flows/FlowTemplateClient'
import {
  validateClaimAssignmentForUI,
  createDefaultAssignmentTarget
} from '@/business-apps/flow/apps/creator/utils/assignmentUtils'
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
import { mockUsers } from '@/business-apps/flow/data/mockUsers'

export interface AssignmentSelectorProps {
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
  'data-testid'?: string
}

const FieldBadges: React.FC<FieldBadgesProps> = ({
  field,
  values,
  config,
  onRemove,
  teammates,
  'data-testid': testId = 'field-badges'
}) => {
  // Resolve entity name from teammates data
  const resolveEntityName = (dataSource: string, entityId: string): string => {
    if (entityId === ANY_SELECTOR) return 'Any'

    switch (dataSource) {
      case 'users':
        const user = teammates.find(t => t.id === entityId)
        return user ? user.name : entityId
      case 'departments':
        const dept = teammates.find(t => t.organizationalUnitId === entityId)
        return dept ? dept.organizationalUnitName || entityId : entityId
      case 'companies':
        const company = teammates.find(t => t.companyId === entityId)
        return company ? company.companyName || entityId : entityId
      case 'costCenters':
        const costCenter = teammates.find(t => t.costCenterId === entityId)
        return costCenter ? costCenter.costCenterName || entityId : entityId
      case 'matrixTeams':
        const matrixTeam = teammates.find(t => t.matrixUnitId === entityId)
        return matrixTeam ? matrixTeam.matrixUnitName || entityId : entityId
      case 'locations':
        const location = teammates.find(t => t.siteLocationId === entityId)
        return location ? location.siteLocationName || entityId : entityId
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
  'data-testid'?: string
}

const FieldSelector: React.FC<FieldSelectorProps> = ({
  field,
  config,
  selectedValues,
  onAdd,
  assignmentMode,
  teammates,
  'data-testid': testId = 'field-selector'
}) => {
  const [searchQuery, setSearchQuery] = useState('')

  // Get data source for the field from teammates data
  const getDataSource = (): EntityItem[] => {
    switch (config.dataSource) {
      case 'users':
        return teammates.map(t => ({ id: t.id, name: t.name }))
      case 'departments':
        // Extract unique organizational units from teammates
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
        // Extract unique matrix teams from teammates
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
        // Extract unique companies from teammates
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
      case 'locations':
        // Extract unique locations from teammates
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
      case 'costCenters':
        // Extract unique cost centers from teammates
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
      case 'capabilities':
        // For now, return empty array as capabilities might need different data source
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
  accessToken: _accessToken,
  userInfo: _userInfo,
  'data-testid': testId = 'assignment-selector'
}) => {
  // Tab state for organized assignment interface
  const [activeTab, setActiveTab] = useState<'people' | 'structure' | 'business' | 'location' | 'skills'>('people')

  // Use mock users data instead of teammates API
  const teammatesLoading = false

  // Convert mock users data to EntityItem format
  const teammates: EntityItem[] = useMemo(() => {
    // Map departments to proper IDs from backend mockOrganizationalData
    const departmentMap: Record<string, string> = {
      'Human Resources': 'dept-001',
      'IT Department': 'dept-002',
      Engineering: 'dept-003',
      Finance: 'dept-004'
    }

    const matrixMap: Record<string, string> = {
      'Human Resources': 'matrix-001',
      'IT Department': 'matrix-002',
      Engineering: 'matrix-003',
      Finance: 'matrix-004'
    }

    const costCenterMap: Record<string, string> = {
      'Human Resources': 'cc-001',
      'IT Department': 'cc-002',
      Engineering: 'cc-003',
      Finance: 'cc-004'
    }

    return mockUsers.map(user => ({
      id: user.id,
      name: user.name,
      // Use proper organizational IDs from backend mockOrganizationalData
      organizationalUnitId: departmentMap[user.department] || 'dept-001',
      organizationalUnitName: user.department,
      costCenterId: costCenterMap[user.department] || 'cc-001',
      costCenterName: `${user.department} Cost Center`,
      matrixUnitId: matrixMap[user.department] || 'matrix-001',
      matrixUnitName: `${user.department} Matrix Unit`,
      companyId: 'le-001', // Legal entity ID from backend
      companyName: 'NEWWORK SE',
      siteLocationId: 'loc-001', // Location ID from backend
      siteLocationName: 'Berlin Office'
    }))
  }, [])
  // Initialize assignment
  const assignment = value || {
    targets: null, // Set targets to null when no assignment is configured
    assignmentMode: assignmentMode,
    allowReassignment: false
  }

  // Get the current target (single object, not array)
  const currentTarget: AssignmentTarget = assignment.targets || createDefaultAssignmentTarget(assignmentMode)

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
        allowReassignment: false
      })
    }
  }, [value, assignmentMode, onChange])

  // Handle adding a value to a field
  const handleAddValue = (field: AssignmentField, value: string) => {
    // Use current target or create default
    const actualTarget: AssignmentTarget = assignment.targets || createDefaultAssignmentTarget(assignmentMode)
    const currentValues = (actualTarget as any)[field] || []

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
    const actualTarget: AssignmentTarget = assignment.targets || createDefaultAssignmentTarget(assignmentMode)
    const currentValues = (actualTarget as any)[field] || []
    const newValues = currentValues.filter((v: string) => v !== value)

    const newTarget: AssignmentTarget = {
      ...actualTarget,
      [field]: newValues.length > 0 ? newValues : null // Set to null when no values selected
    }

    // Check if all fields in the target are null/empty
    const hasAnyValues = Object.values(newTarget as any).some(
      (fieldValue: any) => fieldValue && Array.isArray(fieldValue) && fieldValue.length > 0
    )

    const newAssignment: TaskAssignment = {
      ...assignment,
      targets: hasAnyValues ? newTarget : null // Set entire targets to null if no values exist
    }

    onChange(newAssignment)
  }

  // Handle reassignment toggle
  // Reassignment setting is hidden and fixed to false

  // Show loading state while teammates are being fetched
  if (teammatesLoading) {
    return (
      <div className="gba:space-y-4" data-testid={testId}>
        <Card>
          <CardContent className="gba:p-6 gba:text-center">
            <div className="gba:flex gba:items-center gba:justify-center gba:gap-2">
              <div className="gba:animate-spin gba:w-4 gba:h-4 gba:border-2 gba:border-blue-500 gba:border-t-transparent gba:rounded-full"></div>
              <span className="gba:text-sm gba:text-gray-600">Loading user data...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Mock data doesn't have errors - removed error handling

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
            <div className="gba:text-xs gba:text-gray-500">Using data from {teammates.length} team members</div>
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
            <TabsList className="gba:grid gba:w-full gba:grid-cols-5">
              <TabsTrigger value="people" className="gba:flex gba:items-center gba:gap-1">
                <UserCircle className="gba:w-3 gba:h-3" />
                People
              </TabsTrigger>
              <TabsTrigger value="structure" className="gba:flex gba:items-center gba:gap-1">
                <Users className="gba:w-3 gba:h-3" />
                Structure
              </TabsTrigger>
              <TabsTrigger value="business" className="gba:flex gba:items-center gba:gap-1">
                <Building2 className="gba:w-3 gba:h-3" />
                Business
              </TabsTrigger>
              <TabsTrigger value="location" className="gba:flex gba:items-center gba:gap-1">
                <MapPin className="gba:w-3 gba:h-3" />
                Location
              </TabsTrigger>
              <TabsTrigger value="skills" className="gba:flex gba:items-center gba:gap-1">
                <FileCheck className="gba:w-3 gba:h-3" />
                Skills
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
                        data-testid={`${testId}-selector-${config.field}`}
                      />

                      <FieldBadges
                        field={config.field}
                        values={fieldValues}
                        config={config}
                        onRemove={handleRemoveValue}
                        teammates={teammates}
                        data-testid={`${testId}-badges-${config.field}`}
                      />
                    </div>
                  )
                })}
              </TabsContent>
            ))}
          </Tabs>

          {/* Reassignment Settings - hidden per requirements; defaults to false */}
        </CardContent>
      </Card>
    </div>
  )
}
