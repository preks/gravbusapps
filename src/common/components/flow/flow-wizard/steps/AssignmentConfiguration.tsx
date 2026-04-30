import React, { useCallback, useState } from 'react'
import { Button, Input, Popover, Select, Tag } from 'antd'
import { Building2, ChevronDown, DollarSign, FileCheck, Plus, Search, Settings, UserCircle, Users } from 'lucide-react'
import { useMockData } from '@/business-apps/flow/providers/MockDataProvider'
import { AssignmentMode, TaskAssignment } from '@/common/data/flow/types/flowTemplate'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface AssignmentTriggerProps {
  step: any
  testId: string
  onUpdateStep: (updates: any) => void
}

interface AssignmentContentProps {
  step: any
  testId: string
  onUpdateStep: (updates: any) => void
}

interface SimpleAssignmentSelectorProps {
  value: TaskAssignment
  onChange: (assignment: TaskAssignment) => void
  'data-testid'?: string
}

const ASSIGNMENT_TYPES = [
  {
    key: 'users',
    label: 'Specific Users',
    icon: UserCircle,
    field: 'users',
    dataSource: 'users'
  },
  {
    key: 'departments',
    label: 'Departments',
    icon: Users,
    field: 'organizationalUnits',
    dataSource: 'departments'
  },
  {
    key: 'teams',
    label: 'Matrix Teams',
    icon: Users,
    field: 'matrixTeams',
    dataSource: 'matrixTeams'
  },
  {
    key: 'companies',
    label: 'Companies',
    icon: Building2,
    field: 'companies',
    dataSource: 'companies'
  },
  {
    key: 'costCenters',
    label: 'Cost Centers',
    icon: DollarSign,
    field: 'costCenters',
    dataSource: 'costCenters'
  },
  {
    key: 'capabilities',
    label: 'Capabilities',
    icon: FileCheck,
    field: 'capabilities',
    dataSource: 'capabilities'
  }
] as const

const SimpleAssignmentSelector: React.FC<SimpleAssignmentSelectorProps> = ({
  value,
  onChange,
  'data-testid': testId = 'simple-assignment-selector'
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const { users, departments, capabilities, companies, costCenters, matrixTeams } = useMockData()

  const currentTarget = value.targets || {}

  const getDataSource = (dataSource: string) => {
    switch (dataSource) {
      case 'users':
        return users || []
      case 'departments':
        return departments || []
      case 'capabilities':
        return capabilities || []
      case 'companies':
        return companies || []
      case 'costCenters':
        return costCenters || []
      case 'matrixTeams':
        return matrixTeams || []
      default:
        return []
    }
  }

  const getAllSelectedEntities = () => {
    const allSelected: Array<{ id: string; name: string; type: string; config: any }> = []

    ASSIGNMENT_TYPES.forEach(type => {
      const fieldValues = currentTarget[type.field as keyof typeof currentTarget] || []
      fieldValues.forEach((entityId: string) => {
        const entityName =
          entityId === 'ANY'
            ? 'Anyone'
            : getDataSource(type.dataSource).find(entity => entity.id === entityId)?.name || entityId

        allSelected.push({
          id: entityId,
          name: entityName,
          type: type.key,
          config: type
        })
      })
    })

    return allSelected
  }

  const handleAddEntity = useCallback(
    (typeKey: string, entityId: string) => {
      const typeConfig = ASSIGNMENT_TYPES.find(type => type.key === typeKey)
      if (!typeConfig) return

      const fieldKey = typeConfig.field as keyof typeof currentTarget
      const currentValues = currentTarget[fieldKey] || []

      if (!currentValues.includes(entityId)) {
        const newTarget = {
          ...currentTarget,
          [fieldKey]: [...currentValues, entityId]
        }

        onChange({
          ...value,
          targets: newTarget,
          allowReassignment: true
        })
      }

      setSearchQuery('')
      setSelectedCategory(null)
      setIsPopoverOpen(false)
    },
    [currentTarget, onChange, value]
  )

  const handleRemoveEntity = useCallback(
    (typeKey: string, entityId: string) => {
      const typeConfig = ASSIGNMENT_TYPES.find(type => type.key === typeKey)
      if (!typeConfig) return

      const fieldKey = typeConfig.field as keyof typeof currentTarget
      const currentValues = currentTarget[fieldKey] || []
      const newValues = currentValues.filter((value: string) => value !== entityId)

      const newTarget = {
        ...currentTarget,
        [fieldKey]: newValues
      }

      onChange({
        ...value,
        targets: newTarget
      })
    },
    [currentTarget, onChange, value]
  )

  const getFilteredEntitiesForCategory = (categoryKey: string) => {
    const categoryConfig = ASSIGNMENT_TYPES.find(type => type.key === categoryKey)
    if (!categoryConfig) return []

    const entities = getDataSource(categoryConfig.dataSource)
    const currentValues = currentTarget[categoryConfig.field as keyof typeof currentTarget] || []

    return searchQuery.trim() === ''
      ? entities.slice(0, 8).filter(entity => !currentValues.includes(entity.id))
      : entities
          .filter(
            entity =>
              entity.name.toLowerCase().includes(searchQuery.toLowerCase()) && !currentValues.includes(entity.id)
          )
          .slice(0, 10)
  }

  const popoverContent = (
    <div className="gba:w-72 gba:max-h-80 gba:overflow-hidden gba:bg-white gba:rounded-lg gba:shadow-lg">
      {selectedCategory && (
        <div className="gba:p-3 gba:border-b gba:border-gray-100">
          <Input
            placeholder={`Search ${ASSIGNMENT_TYPES.find(type => type.key === selectedCategory)?.label.toLowerCase()}...`}
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            prefix={<Search className="gba:w-4 gba:h-4 gba:text-gray-400" />}
            size="small"
            data-testid={`${testId}-search-input`}
          />
        </div>
      )}

      <div className="gba:max-h-64 gba:overflow-y-auto">
        {!selectedCategory ? (
          <div className="gba:p-1">
            <div className="gba:px-3 gba:py-2 gba:text-xs gba:font-medium gba:text-gray-500 gba:uppercase gba:tracking-wide">
              Assignment Types
            </div>
            {ASSIGNMENT_TYPES.map(type => {
              const IconComponent = type.icon
              return (
                <div
                  key={type.key}
                  className="gba:flex gba:items-center gba:gap-3 gba:mx-1 gba:px-3 gba:py-2.5 gba:rounded-md gba:cursor-pointer hover:gba:bg-blue-50 hover:gba:text-blue-700 gba:transition-colors"
                  onClick={() => setSelectedCategory(type.key)}
                  data-testid={`${testId}-category-${type.key}`}
                >
                  <span className="gba:text-blue-600">
                    <IconComponent className="gba:w-4 gba:h-4" />
                  </span>
                  <span className="gba:text-sm gba:font-medium gba:flex-1">{type.label}</span>
                  <ChevronDown className="gba:w-4 gba:h-4 gba:text-gray-400" />
                </div>
              )
            })}
          </div>
        ) : (
          <div className="gba:p-1">
            <div
              className="gba:flex gba:items-center gba:gap-2 gba:mx-1 gba:px-3 gba:py-2 gba:rounded-md gba:cursor-pointer gba:text-sm gba:text-blue-600 hover:gba:bg-blue-50 gba:transition-colors gba:border-b gba:border-gray-100 gba:mb-1"
              onClick={() => {
                setSelectedCategory(null)
                setSearchQuery('')
              }}
            >
              ← Back to categories
            </div>

            {getFilteredEntitiesForCategory(selectedCategory).map(entity => (
              <div
                key={entity.id}
                className="gba:flex gba:items-center gba:justify-between gba:mx-1 gba:px-3 gba:py-2.5 gba:rounded-md gba:cursor-pointer hover:gba:bg-green-50 hover:gba:text-green-700 gba:transition-colors"
                onClick={() => handleAddEntity(selectedCategory, entity.id)}
                data-testid={`${testId}-entity-${entity.id}`}
              >
                <span className="gba:text-sm gba:font-medium">{entity.name}</span>
                <Plus className="gba:w-4 gba:h-4 gba:text-green-600" />
              </div>
            ))}

            {getFilteredEntitiesForCategory(selectedCategory).length === 0 && (
              <div className="gba:p-4 gba:text-center">
                <div className="gba:text-sm gba:text-gray-500 gba:mb-1">
                  {searchQuery ? 'No matching entities found' : 'All entities selected'}
                </div>
                <div className="gba:text-xs gba:text-gray-400">
                  {searchQuery ? 'Try a different search term' : 'Choose a different category'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="gba:space-y-3" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:gap-4">
        <span className="gba:text-sm gba:font-medium gba:text-gray-700">
          {getTranslationFromI18nKeyAndLabel('flow.creator.assignmentMode', 'Assignment Mode')}:
        </span>
        <Select
          value={value.assignmentMode || AssignmentMode.CLAIM}
          onChange={mode => onChange({ ...value, assignmentMode: mode })}
          size="small"
          style={{ width: '160px' }}
          data-testid={`${testId}-mode-select`}
        >
          <Select.Option value={AssignmentMode.CLAIM}>
            {getTranslationFromI18nKeyAndLabel('flow.creator.claimMode', 'Claim')}
          </Select.Option>
          <Select.Option value={AssignmentMode.ASSIGN}>
            {getTranslationFromI18nKeyAndLabel('flow.creator.assignMode', 'Assign')}
          </Select.Option>
          <Select.Option value={AssignmentMode.ASSIGN_DEFERRED}>
            {getTranslationFromI18nKeyAndLabel('flow.creator.assignDeferredMode', 'Assign Deferred')}
          </Select.Option>
        </Select>
      </div>

      <div className="gba:flex gba:items-center gba:justify-between">
        <div className="gba:text-sm gba:text-gray-600">
          {getAllSelectedEntities().length === 0
            ? getTranslationFromI18nKeyAndLabel('flow.creator.noAssignments', 'No assignments configured')
            : `${getAllSelectedEntities().length} assignment${getAllSelectedEntities().length === 1 ? '' : 's'} configured`}
        </div>

        <Popover
          content={popoverContent}
          title={getTranslationFromI18nKeyAndLabel('flow.creator.selectAssignment', 'Add Assignment')}
          trigger="click"
          open={isPopoverOpen}
          onOpenChange={setIsPopoverOpen}
          placement="bottomLeft"
        >
          <Button
            type="dashed"
            size="small"
            icon={<Plus className="gba:w-4 gba:h-4" />}
            data-testid={`${testId}-add-button`}
          >
            {getTranslationFromI18nKeyAndLabel('flow.creator.add', 'Add')}
          </Button>
        </Popover>
      </div>

      {getAllSelectedEntities().length > 0 && (
        <div className="gba:flex gba:flex-wrap gba:gap-2 gba:p-3 gba:bg-gray-50 gba:rounded gba:border gba:border-gray-200">
          {getAllSelectedEntities().map(({ id, name, type, config }) => {
            const IconComponent = config.icon
            return (
              <Tag
                key={`${type}-${id}`}
                closable
                onClose={() => handleRemoveEntity(type, id)}
                className="gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-1 gba:bg-white gba:border gba:shadow-sm"
                data-testid={`${testId}-pill-${type}-${id}`}
              >
                <span className="gba:text-gray-400">
                  <IconComponent className="gba:w-3 gba:h-3" />
                </span>
                <span className="gba:text-sm gba:font-medium">{name}</span>
              </Tag>
            )
          })}
        </div>
      )}
    </div>
  )
}

export const AssignmentTrigger: React.FC<AssignmentTriggerProps> = ({ step }) => {
  return (
    <div className="gba:flex gba:items-center gba:justify-between gba:w-full gba:pr-4">
      <div className="gba:flex gba:items-center gba:gap-2">
        <Settings className="gba:h-4 gba:w-4 gba:text-gray-500" />
        {getTranslationFromI18nKeyAndLabel('flow.creator.assignment', 'Assignment')}
      </div>
      <div className="gba:flex gba:items-center gba:gap-2">
        {step.assignment && (
          <span className="gba:text-xs gba:bg-green-100 gba:text-green-800 gba:px-2 gba:py-1 gba:rounded">
            {getTranslationFromI18nKeyAndLabel('flow.creator.configured', 'Configured')}
          </span>
        )}
      </div>
    </div>
  )
}

export const AssignmentContent: React.FC<AssignmentContentProps> = ({ step, testId, onUpdateStep }) => {
  const assignment = step.assignment || {
    targets: null,
    assignmentMode: AssignmentMode.CLAIM,
    allowReassignment: true
  }

  return (
    <div className="gba:pt-2">
      <SimpleAssignmentSelector
        value={assignment}
        onChange={(assignment: TaskAssignment) => onUpdateStep({ assignment })}
        data-testid={`${testId}-assignment-selector`}
      />
    </div>
  )
}
