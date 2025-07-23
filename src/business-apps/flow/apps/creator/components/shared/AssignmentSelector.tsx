import React, { useState, useEffect, useMemo } from 'react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { TaskAssignment, AssignmentTarget, AssignmentMode, ANY_SELECTOR } from '../../types/flowTemplate';
import { transformAssignmentTargetForUI, validateClaimAssignmentForUI, getAssignmentFieldLabel, createDefaultAssignmentTarget } from '../../utils/assignmentUtils';
import { Button, Input, Badge, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Alert, Card, CardHeader, CardContent } from '@newwork/nw-design-system';
import { X, Plus, UserCircle, Users, Building2, MapPin, DollarSign, FileCheck, AlertTriangle } from 'lucide-react';
import { useMockData } from '../../../../providers/MockDataProvider';

interface AssignmentSelectorProps {
  value?: TaskAssignment;
  onChange: (assignment: TaskAssignment) => void;
  assignmentMode: AssignmentMode;
  'data-testid'?: string;
}

type AssignmentField = keyof AssignmentTarget;

interface FieldConfig {
  field: AssignmentField;
  label: string;
  icon: React.ReactNode;
  color: string;
  placeholder: string;
  dataSource: string;
}

// Field configurations for different assignment target types
const fieldConfigs: FieldConfig[] = [
  {
    field: 'userIds',
    label: 'Users',
    icon: <UserCircle className="gba:w-4 gba:h-4" />,
    color: 'gba:!bg-blue-100 gba:!text-blue-800 gba:!border-blue-300',
    placeholder: 'Search users...',
    dataSource: 'users'
  },
  {
    field: 'organizationalUnits',
    label: 'Organizational Units',
    icon: <Users className="gba:w-4 gba:h-4" />,
    color: 'gba:!bg-green-100 gba:!text-green-800 gba:!border-green-300',
    placeholder: 'Search departments...',
    dataSource: 'departments'
  },
  {
    field: 'matrixTeams',
    label: 'Matrix Teams',
    icon: <Users className="gba:w-4 gba:h-4" />,
    color: 'gba:!bg-purple-100 gba:!text-purple-800 gba:!border-purple-300',
    placeholder: 'Search matrix teams...',
    dataSource: 'matrixTeams'
  },
  {
    field: 'companies',
    label: 'Companies',
    icon: <Building2 className="gba:w-4 gba:h-4" />,
    color: 'gba:!bg-indigo-100 gba:!text-indigo-800 gba:!border-indigo-300',
    placeholder: 'Search companies...',
    dataSource: 'companies'
  },
  {
    field: 'siteLocations',
    label: 'Site Locations',
    icon: <MapPin className="gba:w-4 gba:h-4" />,
    color: 'gba:!bg-teal-100 gba:!text-teal-800 gba:!border-teal-300',
    placeholder: 'Search locations...',
    dataSource: 'locations'
  },
  {
    field: 'costCenters',
    label: 'Cost Centers',
    icon: <DollarSign className="gba:w-4 gba:h-4" />,
    color: 'gba:!bg-yellow-100 gba:!text-yellow-800 gba:!border-yellow-300',
    placeholder: 'Search cost centers...',
    dataSource: 'costCenters'
  },
  {
    field: 'capabilities',
    label: 'Capabilities',
    icon: <FileCheck className="gba:w-4 gba:h-4" />,
    color: 'gba:!bg-rose-100 gba:!text-rose-800 gba:!border-rose-300',
    placeholder: 'Search capabilities...',
    dataSource: 'capabilities'
  }
];

interface EntityItem {
  id: string;
  name: string;
}

/**
 * Component for displaying assignment field values as badges
 */
interface FieldBadgesProps {
  field: AssignmentField;
  values: string[];
  config: FieldConfig;
  onRemove: (field: AssignmentField, value: string) => void;
  'data-testid'?: string;
}

const FieldBadges: React.FC<FieldBadgesProps> = ({
  field,
  values,
  config,
  onRemove,
  'data-testid': testId = 'field-badges'
}) => {
  const { resolveEntityName } = useMockData();

  if (!values || values.length === 0) {
    return null;
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
          <span>{value === ANY_SELECTOR ? 'Any' : resolveEntityName(config.dataSource as any, value)}</span>
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
  );
};

/**
 * Component for selecting values for a specific assignment field
 */
interface FieldSelectorProps {
  field: AssignmentField;
  config: FieldConfig;
  selectedValues: string[];
  onAdd: (field: AssignmentField, value: string) => void;
  assignmentMode: AssignmentMode;
  'data-testid'?: string;
}

const FieldSelector: React.FC<FieldSelectorProps> = ({
  field,
  config,
  selectedValues,
  onAdd,
  assignmentMode,
  'data-testid': testId = 'field-selector'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { users, departments, roles, capabilities, companies, locations, costCenters, matrixTeams } = useMockData();

  // Get data source for the field
  const getDataSource = (): EntityItem[] => {
    switch (config.dataSource) {
      case 'users': return users;
      case 'departments': return departments;
      case 'matrixTeams': return matrixTeams || [];
      case 'companies': return companies || [];
      case 'locations': return locations || [];
      case 'costCenters': return costCenters || [];
      case 'capabilities': return capabilities;
      default: return [];
    }
  };

  // Filter entities based on search query
  const filteredEntities = useMemo(() => {
    const entities = getDataSource();
    return searchQuery.trim() === '' 
      ? entities.slice(0, 10) // Limit initial display
      : entities.filter(entity => 
          entity.name.toLowerCase().includes(searchQuery.toLowerCase())
        ).slice(0, 20); // Limit search results
  }, [searchQuery, config.dataSource]);

  // Check if entity is already selected
  const selectedIds = new Set(selectedValues);

  const handleAdd = (value: string) => {
    onAdd(field, value);
    setSearchQuery('');
  };

  // Show validation warnings for CLAIM mode
  const showClaimWarning = assignmentMode === AssignmentMode.CLAIM && 
                          field === 'userIds' && 
                          selectedValues.length > 0 && 
                          !selectedValues.every(v => v === ANY_SELECTOR);

  const showSingleValueWarning = assignmentMode === AssignmentMode.CLAIM && 
                                field !== 'capabilities' && 
                                selectedValues.length > 1 && 
                                !selectedValues.every(v => v === ANY_SELECTOR);

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
        onChange={(e) => setSearchQuery(e.target.value)}
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
            <div className="gba:p-2 gba:text-center gba:text-sm gba:text-gray-500">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Main assignment selector component
 */
export const AssignmentSelector: React.FC<AssignmentSelectorProps> = ({ 
  value, 
  onChange,
  assignmentMode,
  'data-testid': testId = 'assignment-selector'
}) => {
  // Initialize assignment target
  const assignment = value || {
    target: createDefaultAssignmentTarget(assignmentMode),
    allowReassignment: true
  };

  // Validate assignment for CLAIM mode
  const validation = useMemo(() => {
    if (assignmentMode === AssignmentMode.CLAIM) {
      return validateClaimAssignmentForUI(assignment.target);
    }
    return { valid: true, errors: [] };
  }, [assignment.target, assignmentMode]);

  // Ensure default assignment is set if none provided
  useEffect(() => {
    if (!value) {
      onChange({
        target: createDefaultAssignmentTarget(assignmentMode),
        allowReassignment: true
      });
    }
  }, [value, assignmentMode, onChange]);

  // Handle adding a value to a field
  const handleAddValue = (field: AssignmentField, value: string) => {
    const currentValues = assignment.target[field] || [];
    
    // Check if value already exists
    if (currentValues.includes(value)) return;

    // For CLAIM mode, enforce single value constraint (except capabilities)
    let newValues: string[];
    if (assignmentMode === AssignmentMode.CLAIM && field !== 'capabilities') {
      // Replace existing value with new one for non-capability fields in CLAIM mode
      newValues = [value];
    } else {
      // Add to existing values
      newValues = [...currentValues, value];
    }

    const newAssignment: TaskAssignment = {
      ...assignment,
      target: {
        ...assignment.target,
        [field]: newValues
      }
    };

    onChange(newAssignment);
  };

  // Handle removing a value from a field
  const handleRemoveValue = (field: AssignmentField, value: string) => {
    const currentValues = assignment.target[field] || [];
    const newValues = currentValues.filter(v => v !== value);

    const newAssignment: TaskAssignment = {
      ...assignment,
      target: {
        ...assignment.target,
        [field]: newValues.length > 0 ? newValues : (assignmentMode === AssignmentMode.CLAIM ? [ANY_SELECTOR] : [])
      }
    };

    onChange(newAssignment);
  };

  // Handle reassignment toggle
  const handleReassignmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...assignment,
      allowReassignment: e.target.checked
    });
  };

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
        </CardHeader>
        <CardContent>
          {/* Validation Errors */}
          {!validation.valid && (
            <Alert variant="destructive" className="gba:mb-4">
              <AlertTriangle className="gba:w-4 gba:h-4" />
              <div>
                {validation.errors.map((error, index) => (
                  <div key={index} className="gba:text-sm">{error}</div>
                ))}
              </div>
            </Alert>
          )}

          {/* Assignment Fields */}
          <div className="gba:space-y-4">
            {fieldConfigs.map(config => {
              const fieldValues = assignment.target[config.field] || [];
              
              return (
                <div key={config.field} className="gba:space-y-2">
                  <FieldSelector
                    field={config.field}
                    config={config}
                    selectedValues={fieldValues}
                    onAdd={handleAddValue}
                    assignmentMode={assignmentMode}
                    data-testid={`${testId}-selector-${config.field}`}
                  />
                  
                  <FieldBadges
                    field={config.field}
                    values={fieldValues}
                    config={config}
                    onRemove={handleRemoveValue}
                    data-testid={`${testId}-badges-${config.field}`}
                  />
                </div>
              );
            })}
          </div>

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
  );
};
