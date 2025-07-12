import React, { useState, useEffect, useMemo } from 'react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { TaskAssignment, AssignmentTarget, AssignmentMode } from '../../types/flowTemplate';
import { Button, Popover, PopoverTrigger, PopoverContent, Input, Badge, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@newwork/nw-design-system';
import { X, Plus, Search, UserCircle, Users, Building2, MapPin, FileCheck, Crown, Info } from 'lucide-react';

interface AssignmentSelectorProps {
  value?: TaskAssignment;
  onChange: (assignment: TaskAssignment) => void;
  'data-testid'?: string;
}

type EntityType = 'user' | 'department' | 'capability' | 'role';

interface EntityTypeConfig {
  value: EntityType;
  label: string;
  color: string;
  icon: React.ReactNode;
  searchPlaceholder: string;
}

interface EntityItem {
  id: string;
  name: string;
}

// Constants
const entityTypeConfigs: EntityTypeConfig[] = [
  { 
    value: 'user', 
    label: getTranslationFromI18nKeyAndLabel('flow.creator.user', 'User'), 
    color: 'gba:!bg-blue-100 gba:!text-blue-800 gba:!border-blue-300',
    icon: <UserCircle className="gba:w-4 gba:h-4" />,
    searchPlaceholder: getTranslationFromI18nKeyAndLabel('flow.creator.searchUsers', 'Search users...') 
  },
  { 
    value: 'department', 
    label: getTranslationFromI18nKeyAndLabel('flow.creator.department', 'Department'), 
    color: 'gba:!bg-green-100 gba:!text-green-800 gba:!border-green-300',
    icon: <Users className="gba:w-4 gba:h-4" />,
    searchPlaceholder: getTranslationFromI18nKeyAndLabel('flow.creator.searchDepartments', 'Search departments...') 
  },
  { 
    value: 'capability', 
    label: getTranslationFromI18nKeyAndLabel('flow.creator.capability', 'Capability'), 
    color: 'gba:!bg-rose-100 gba:!text-rose-800 gba:!border-rose-300',
    icon: <FileCheck className="gba:w-4 gba:h-4" />,
    searchPlaceholder: getTranslationFromI18nKeyAndLabel('flow.creator.searchCapabilities', 'Search capabilities...') 
  },
  { 
    value: 'role', 
    label: getTranslationFromI18nKeyAndLabel('flow.creator.role', 'Role'), 
    color: 'gba:!bg-amber-100 gba:!text-amber-800 gba:!border-amber-300',
    icon: <Crown className="gba:w-4 gba:h-4" />,
    searchPlaceholder: getTranslationFromI18nKeyAndLabel('flow.creator.searchRoles', 'Search roles...') 
  }
];

// Mock entity data - cross-functional organization matching backend exactly
const mockEntities: Record<EntityType, EntityItem[]> = {
  user: [
    { id: 'user-001', name: 'Alice Johnson (HR Manager)' },
    { id: 'user-002', name: 'Bob Smith (Finance Manager)' },
    { id: 'user-007', name: 'Grace Lee (Senior Software Engineer)' },
    { id: 'user-008', name: 'Henry Taylor (Sales Manager)' },
    { id: 'user-009', name: 'Ivy Chen (Marketing Manager)' },
  ],
  department: [
    { id: 'dept-001', name: 'Human Resources' },
    { id: 'dept-002', name: 'Finance' },
    { id: 'dept-003', name: 'Engineering' },
    { id: 'dept-004', name: 'Sales' },
    { id: 'dept-005', name: 'Marketing' },
  ],
  capability: [
    { id: 'cap-001', name: 'Employee Relations' },
    { id: 'cap-002', name: 'Recruitment' },
    { id: 'cap-003', name: 'Financial Analysis' },
    { id: 'cap-004', name: 'Budget Management' },
    { id: 'cap-005', name: 'Software Development' },
    { id: 'cap-006', name: 'System Architecture' },
    { id: 'cap-007', name: 'Sales Strategy' },
    { id: 'cap-008', name: 'Contract Negotiation' },
    { id: 'cap-009', name: 'Digital Marketing' },
    { id: 'cap-010', name: 'Brand Management' },
    { id: 'cap-011', name: 'Compliance Management' },
    { id: 'cap-012', name: 'Risk Assessment' },
    { id: 'cap-013', name: 'Project Management' },
    { id: 'cap-014', name: 'Customer Relations' },
    { id: 'cap-015', name: 'Content Creation' },
  ],
  role: [
    { id: 'role-001', name: 'HR Manager' },
    { id: 'role-003', name: 'Finance Manager' },
    { id: 'role-005', name: 'Senior Software Engineer' },
    { id: 'role-007', name: 'Sales Manager' },
    { id: 'role-009', name: 'Marketing Manager' },
  ],
};

/**
 * Component for displaying assignment target badges
 */
interface AssignmentBadgesProps {
  targets: AssignmentTarget[];
  onRemove: (index: number) => void;
  'data-testid'?: string;
}

const AssignmentBadges: React.FC<AssignmentBadgesProps> = ({
  targets, 
  onRemove,
  'data-testid': testId = 'assignment-badges'
}) => {
  if (targets.length === 0) {
    return (
      <div className="gba:text-sm gba:text-gray-500 gba:text-center gba:py-2" data-testid={`${testId}-empty`}>
        {getTranslationFromI18nKeyAndLabel('flow.creator.noAssignees', 'No user or group selected')}
      </div>
    );
  }

  return (
    <div className="gba:flex gba:flex-wrap gba:gap-2" data-testid={testId}>
      {targets.map((target, index) => {
        const config = entityTypeConfigs.find(c => c.value === target.entity);
        const entity = mockEntities[target.entity]?.find(e => e.id === target.id);
        
        return (
          <Badge
            key={`${target.entity}-${target.id}`}
            variant="outline"
            className={`gba:flex gba:items-center gba:gap-1 gba:pr-1 ${config?.color || 'gba:!bg-gray-100 gba:!text-gray-800 gba:!border-gray-300'}`}
            data-testid={`${testId}-badge-${index}`}
          >
            {config?.icon}
            <span className="gba:text-xs">{entity?.name || target.id}</span>
            <button
              onClick={() => onRemove(index)}
              className="gba:ml-1 gba:text-gray-500 hover:gba:text-red-500 gba:transition-colors"
              data-testid={`${testId}-remove-${index}`}
            >
              <X className="gba:w-3 gba:h-3" />
            </button>
          </Badge>
        );
      })}
    </div>
  );
};

/**
 * Component for searching and selecting entities
 */
interface EntitySearchListProps {
  entityType: EntityType;
  searchQuery: string;
  onSearch: (query: string) => void;
  onSelect: (target: AssignmentTarget) => void;
  selectedTargets: AssignmentTarget[];
  'data-testid'?: string;
}

const EntitySearchList: React.FC<EntitySearchListProps> = ({
  entityType,
  searchQuery,
  onSearch,
  onSelect,
  selectedTargets,
  'data-testid': testId = 'entity-search-list'
}) => {
  const config = entityTypeConfigs.find(c => c.value === entityType) || entityTypeConfigs[0];
  
  // Filter entities based on search query
  const filteredEntities = useMemo(() => {
    return searchQuery.trim() === '' 
      ? mockEntities[entityType]
      : mockEntities[entityType].filter((entity: EntityItem) => 
          entity.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
  }, [entityType, searchQuery]);
  
  // Check if an entity is already selected
  const selectedIds = new Set(
    selectedTargets
      .filter(t => t.entity === entityType)
      .map(t => t.id)
  );
  
  return (
    <div className="gba:w-full gba:space-y-2 gba:border gba:rounded">
      <div className="gba:flex gba:items-center gba:px-3 gba:py-2">
        <Search className="gba:w-4 gba:h-4 gba:mr-2 gba:text-gray-400" />
        <Input
          type="text"
          placeholder={config.searchPlaceholder}
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearch(e.target.value)}
          className="gba:border-0 gba:p-0 gba:shadow-none gba:flex-1 gba:focus-visible:ring-0"
          data-testid={`${testId}-search-input`}
        />
      </div>
      
      <div className="gba:max-h-[200px] gba:overflow-y-auto gba:space-y-1 gba:py-1">
        {filteredEntities.map(entity => (
          <button
            key={entity.id}
            onClick={() => onSelect({ entity: entityType, id: entity.id })}
            className={`
              w-full gba:flex gba:items-center gba:gap-2 gba:w-full gba:px-3 gba:py-2 gba:rounded-md 
              gba:hover:bg-gray-100 gba:transition-colors gba:text-left
              ${selectedIds.has(entity.id) ? 'gba:bg-gray-100' : ''}
            `}
            data-testid={`${testId}-entity-${entity.id}`}
            disabled={selectedIds.has(entity.id)}
          >
            {config.icon && <span className="gba:opacity-70">{config.icon}</span>}
            <span>{entity.name}</span>
            {selectedIds.has(entity.id) && (
              <span className="gba:ml-auto gba:text-sm gba:text-gray-500">
                {getTranslationFromI18nKeyAndLabel('flow.creator.selected', 'Selected')}
              </span>
            )}
          </button>
        ))}
        
        {filteredEntities.length === 0 && (
          <div className="gba:p-2 gba:text-center gba:text-sm gba:text-gray-500" data-testid={`${testId}-no-results`}>
            {getTranslationFromI18nKeyAndLabel('flow.creator.noResults', 'No results found')}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Main assignment selector component
 */
export const AssignmentSelector: React.FC<AssignmentSelectorProps> = ({ 
  value, 
  onChange,
  'data-testid': testId = 'assignment-selector'
}) => {
  // State for popover and search
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType>('user');

  // Initialize assignment if not provided
  const assignment = value || {
    targets: [],
    assignmentMode: AssignmentMode.ASSIGN,
    allowReassignment: true
  };

  // Ensure default assignment is set if none provided
  useEffect(() => {
    if (!value) {
      onChange({
        targets: [],
        assignmentMode: AssignmentMode.ASSIGN,
        allowReassignment: true
      });
    }
  }, [value?.targets, value?.assignmentMode, value?.allowReassignment, onChange]);

  // Handle adding a new target
  const handleAddTarget = (target: AssignmentTarget) => {
    // Check if target already exists
    const exists = assignment.targets.some(t => 
      t.entity === target.entity && t.id === target.id
    );
    
    if (exists) return;
    
    const newAssignment: TaskAssignment = {
      ...assignment,
      targets: [...assignment.targets, target]
    };
    
    onChange(newAssignment);
    setIsPopoverOpen(false);
    setSearchQuery('');
  };
  
  // Handle removing a target
  const handleRemoveTarget = (index: number) => {
    const newAssignment: TaskAssignment = {
      ...assignment,
      targets: assignment.targets.filter((_, i) => i !== index)
    };
    
    onChange(newAssignment);
  };

  // Handle assignment mode change
  const handleAssignmentModeChange = (mode: AssignmentMode) => {
    onChange({
      ...assignment,
      assignmentMode: mode
    });
  };

  // Handle reassignment toggle
  const handleReassignmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...assignment,
      allowReassignment: e.target.checked
    });
  };

  return (
    <div className="gba:space-y-4 gba:relative" style={{ isolation: 'isolate' }} data-testid={testId}>
      {/* Assignment Mode */}
      <div className="gba:space-y-3" data-testid={`${testId}-assignment-mode`}>
        <TooltipProvider>
          <div className="gba:flex gba:gap-6" data-testid={`${testId}-assignment-mode-options`}>
            <div className="gba:flex gba:items-center gba:gap-2">
              <label className="gba:flex gba:items-center gba:gap-2" data-testid={`${testId}-assign-mode`}>
                <input
                  type="radio"
                  name={`assignment-mode-${testId}`}
                  checked={assignment.assignmentMode === AssignmentMode.ASSIGN}
                  onChange={() => handleAssignmentModeChange(AssignmentMode.ASSIGN)}
                  data-testid={`${testId}-assign-mode-radio`}
                />
                {getTranslationFromI18nKeyAndLabel('flow.creator.assignedToAll', 'Assigned to all of selection')}
              </label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="gba:h-4 gba:w-4 gba:text-gray-400 gba:cursor-help" data-testid={`${testId}-assign-mode-info`} />
                </TooltipTrigger>
                <TooltipContent style={{ zIndex: 10000 }}>
                  <p className="gba:max-w-[200px] gba:text-sm">
                    {getTranslationFromI18nKeyAndLabel('flow.creator.assignModeDescription', 'Create separate tasks for each selected user. All must complete their individual tasks.')}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            <div className="gba:flex gba:items-center gba:gap-2">
              <label className="gba:flex gba:items-center gba:gap-2" data-testid={`${testId}-claim-mode`}>
                <input
                  type="radio"
                  name={`assignment-mode-${testId}`}
                  checked={assignment.assignmentMode === AssignmentMode.CLAIM}
                  onChange={() => handleAssignmentModeChange(AssignmentMode.CLAIM)}
                  data-testid={`${testId}-claim-mode-radio`}
                />
                {getTranslationFromI18nKeyAndLabel('flow.creator.claimableByOne', 'Claimable by one of selection')}
              </label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="gba:h-4 gba:w-4 gba:text-gray-400 gba:cursor-help" data-testid={`${testId}-claim-mode-info`} />
                </TooltipTrigger>
                <TooltipContent style={{ zIndex: 10000 }}>
                  <p className="gba:max-w-[200px] gba:text-sm">
                    {getTranslationFromI18nKeyAndLabel('flow.creator.claimModeDescription', 'Create one shared task. Any selected user can claim and complete the task.')}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>
      </div>

      {/* Select Assignees Button and Popover */}
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger>
          <div className="gba:inline-flex">
            <Button 
              variant="outline" 
              className="gba:flex gba:items-center gba:gap-2" 
              data-testid={`${testId}-select-button`}
              onClick={() => setIsPopoverOpen(true)}
              type="button"
            >
              <Plus className="gba:w-4 gba:h-4" />
              {getTranslationFromI18nKeyAndLabel('flow.creator.selectAssignees', 'Select')}
            </Button>
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className="gba:w-[350px] gba:p-4" 
          data-testid={`${testId}-popover`}
          sideOffset={5}
          side="bottom"
          align="start"
          avoidCollisions
          style={{ zIndex: 10000 }}
        >
          <div className="gba:space-y-4">
            {/* Entity Type Select */}
            <Select 
              value={selectedEntityType} 
              onValueChange={(value) => {
                setSelectedEntityType(value as EntityType);
                setSearchQuery('');
              }}
              data-testid={`${testId}-entity-type-select`}
            >
              <SelectTrigger className="gba:w-full w-full gba:font-normal">
                <SelectValue placeholder={getTranslationFromI18nKeyAndLabel('flow.creator.selectEntityType', 'Select entity type')} />
              </SelectTrigger>
              <SelectContent style={{ zIndex: 10001 }}>
                {entityTypeConfigs.map((config) => (
                  <SelectItem key={config.value} value={config.value} data-testid={`${testId}-entity-type-${config.value}`}>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      {config.icon}
                      <span>{config.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Entity Search */}
            <EntitySearchList
              entityType={selectedEntityType}
              searchQuery={searchQuery}
              onSearch={setSearchQuery}
              onSelect={handleAddTarget}
              selectedTargets={assignment.targets}
              data-testid={`${testId}-search-list`}
            />
          </div>
        </PopoverContent>
      </Popover>
      
      {/* Assignment Badges */}
      <AssignmentBadges
        targets={assignment.targets}
        onRemove={handleRemoveTarget}
        data-testid={`${testId}-badges`}
      />

      {/* Allow Reassignment Option */}
      <div className="gba:flex gba:items-center gba:gap-2" data-testid={`${testId}-reassignment-option`}>
        <input
          type="checkbox"
          id={`${testId}-allow-reassignment`}
          checked={assignment.allowReassignment || false}
          onChange={handleReassignmentChange}
          data-testid={`${testId}-allow-reassignment-checkbox`}
        />
        <label htmlFor={`${testId}-allow-reassignment`} className="gba:text-sm gba:text-gray-700">
          {getTranslationFromI18nKeyAndLabel('flow.creator.allowReassignment', 'Allow reassignment')}
        </label>
      </div>
    </div>
  );
};
