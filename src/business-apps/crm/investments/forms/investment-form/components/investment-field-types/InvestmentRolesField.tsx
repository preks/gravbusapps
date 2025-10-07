import React, { useState, useCallback, useEffect } from 'react';
import { Controller, Control, FieldValues } from 'react-hook-form';
import { 
  Combobox, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormMessage,
  Badge
} from '@newwork/nw-design-system';
import { X } from 'lucide-react';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { DynamicFormFieldDefinition } from '@/components/dynamic-form';
import { CatalogEntry } from '@/common/data/catalog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface InvestmentRolesFieldProps {
  field: DynamicFormFieldDefinition;
  fieldName: string;
  control: Control<FieldValues>;
  businessAppContext: BusinessAppContextProps;
  testIdPrefix?: string;
}

interface InvestmentRoleItem {
  id?: string;
  version?: number;
  investmentRole: CatalogEntry;
  displayOrder: number;
  isDeleted?: boolean;
}

interface SortableRoleItemProps {
  role: InvestmentRoleItem;
  index: number;
  onRemove: (roleId: string) => void;
  testIdPrefix: string;
}

const SortableRoleItem: React.FC<SortableRoleItemProps> = ({ role, index, onRemove, testIdPrefix }) => {
  const roleId = role.investmentRole?.id || `role-${index}`;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: roleId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`gba:flex gba:items-center gba:gap-2 gba:p-2 gba:border gba:rounded gba:bg-card ${
        isDragging ? 'gba:opacity-50 gba:shadow-lg' : ''
      }`}
      data-testid={formatDataTestId(testIdPrefix, `RoleItem-${index}`)}
    >
      <div
        {...attributes}
        {...listeners}
        className="gba:cursor-move gba:flex-shrink-0 gba:text-muted-foreground"
        data-testid={formatDataTestId(testIdPrefix, `RoleDragHandle-${index}`)}
      >
        ⋮⋮
      </div>
      <Badge variant="secondary" className="gba:flex-1">
        {role.investmentRole?.value || role.investmentRole?.code || 'Unknown Role'}
      </Badge>
      <button
        type="button"
        onClick={() => onRemove(roleId)}
        className="gba:flex-shrink-0 gba:text-destructive hover:gba:text-destructive/80"
        data-testid={formatDataTestId(testIdPrefix, `RoleRemove-${index}`)}
        aria-label="Remove role"
      >
        <X className="gba:h-4 gba:w-4" />
      </button>
    </div>
  );
};

export const InvestmentRolesField: React.FC<InvestmentRolesFieldProps> = ({
  field,
  fieldName,
  control,
  businessAppContext,
  testIdPrefix = 'InvestmentForm',
}) => {
  const [catalogOptions, setCatalogOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [catalogEntries, setCatalogEntries] = useState<Map<string, CatalogEntry>>(new Map());
  const [loading, setLoading] = useState(false);
  const catalogClient = useCatalogManagerClient(businessAppContext.accessToken);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load InvestmentRole catalog
  const loadCatalog = useCallback(async (search: string = '') => {
    if (!businessAppContext.accessToken) return;
    
    setLoading(true);
    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: 'InvestmentRole',
          version: 'v1',
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: false,
          includeChildCatalogEntries: true,
          ...(search && { searchCriteria: search }),
        }
      );

      const entries = response.data || [];
      const entriesMap = new Map<string, CatalogEntry>();
      const options = entries.map((entry: any) => {
        entriesMap.set(entry.id, entry as CatalogEntry);
        return {
          value: entry.id || '',
          label: entry.value || entry.code || entry.id || '',
        };
      });

      setCatalogEntries(entriesMap);
      setCatalogOptions(options);
    } catch (error) {
      console.error('Error loading InvestmentRole catalog:', error);
      setCatalogEntries(new Map());
      setCatalogOptions([]);
    } finally {
      setLoading(false);
    }
  }, [businessAppContext.accessToken, catalogClient]);

  // Initial load
  useEffect(() => {
    if (businessAppContext.accessToken) {
      loadCatalog('');
    }
  }, [businessAppContext.accessToken, loadCatalog]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    loadCatalog(query);
  }, [loadCatalog]);

  return (
    <Controller
      name={fieldName as any}
      control={control}
      render={({ field: formField, fieldState }) => {
        // Normalize single object to array format on mount or when value changes
        useEffect(() => {
          if (formField.value && typeof formField.value === 'object' && !Array.isArray(formField.value)) {
            const normalizedRoles: InvestmentRoleItem[] = [{
              investmentRole: formField.value as CatalogEntry,
              displayOrder: 0,
            }];
            formField.onChange(normalizedRoles);
          }
        }, [formField.value, formField.onChange]);

        // Normalize to array format (handles both single object from opportunity and array from investment)
        let currentRoles: InvestmentRoleItem[] = [];
        if (Array.isArray(formField.value)) {
          currentRoles = formField.value;
        } else if (formField.value && typeof formField.value === 'object') {
          // During render, just use the single object wrapped in array for display
          currentRoles = [{
            investmentRole: formField.value as CatalogEntry,
            displayOrder: 0,
          }];
        }
        
        // Filter out deleted roles for display
        const activeRoles = currentRoles.filter(role => !role.isDeleted);
        
        // Get IDs of already selected roles to filter them out from options
        const selectedRoleIds = new Set(activeRoles.map(role => role.investmentRole?.id).filter(Boolean));
        const availableOptions = catalogOptions.filter(opt => !selectedRoleIds.has(opt.value));

        const handleAddRole = (roleId: string) => {
          if (!roleId) return;
          
          const selectedCatalogEntry = catalogEntries.get(roleId);
          if (!selectedCatalogEntry) return;

          const newRole: InvestmentRoleItem = {
            investmentRole: selectedCatalogEntry,
            displayOrder: currentRoles.length,
          };

          formField.onChange([...currentRoles, newRole]);
        };

        const handleRemoveRole = (roleId: string) => {
          const updatedRoles = currentRoles.map((role, idx) => {
            const currentRoleId = role.investmentRole?.id || `role-${idx}`;
            if (currentRoleId === roleId) {
              // If role has an ID (exists in DB), mark as deleted instead of removing
              if (role.id) {
                return { ...role, isDeleted: true };
              }
              // Mark for removal (will be filtered out below)
              return null;
            }
            return role;
          }).filter((role): role is InvestmentRoleItem => role !== null);
          
          formField.onChange(updatedRoles);
        };

        const handleDragEnd = (event: DragEndEvent) => {
          const { active, over } = event;
          
          if (!over || active.id === over.id) return;

          const activeIndex = activeRoles.findIndex(role => 
            (role.investmentRole?.id || `role-${currentRoles.indexOf(role)}`) === active.id
          );
          const overIndex = activeRoles.findIndex(role => 
            (role.investmentRole?.id || `role-${currentRoles.indexOf(role)}`) === over.id
          );

          if (activeIndex !== -1 && overIndex !== -1) {
            // Create a mapping of active indices to original indices
            const activeIndexToOriginal = activeRoles.map(role => currentRoles.indexOf(role));
            
            // Reorder active roles
            const reorderedActive = arrayMove(activeRoles, activeIndex, overIndex);
            
            // Update display orders
            const updatedRoles = [...currentRoles];
            reorderedActive.forEach((role, newIndex) => {
              const originalIndex = activeIndexToOriginal[activeIndex === newIndex ? activeIndex : 
                (activeIndex < overIndex ? 
                  (newIndex <= overIndex ? activeIndexToOriginal.findIndex(idx => currentRoles[idx] === role) : activeIndexToOriginal[newIndex]) :
                  (newIndex >= overIndex ? activeIndexToOriginal.findIndex(idx => currentRoles[idx] === role) : activeIndexToOriginal[newIndex])
                )
              ];
              if (originalIndex !== -1) {
                updatedRoles[currentRoles.indexOf(role)] = { ...role, displayOrder: newIndex };
              }
            });
            
            formField.onChange(updatedRoles);
          }
        };

        return (
          <FormItem>
            <FormLabel>
              {field.label}
              {field.required && <span className="gba:text-destructive"> *</span>}
            </FormLabel>
            <FormControl>
              <div className="gba:space-y-3">
                {/* Multi-select combobox */}
                <Combobox
                  value=""
                  onValueChange={handleAddRole}
                  options={availableOptions}
                  placeholder={getTranslationFromI18nKeyAndLabel('investment.form.addRole', 'Add investment role...')}
                  searchPlaceholder="Search roles..."
                  emptyText={loading ? 'Loading...' : 'No roles found'}
                  disabled={loading}
                  loading={loading}
                  onSearch={handleSearch}
                  data-testid={formatDataTestId(testIdPrefix, `${fieldName}Combobox`)}
                />

                {/* Selected roles with drag-and-drop */}
                {activeRoles.length > 0 && (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={activeRoles.map((role) => {
                        const originalIndex = currentRoles.indexOf(role);
                        return role.investmentRole?.id || `role-${originalIndex}`;
                      })}
                      strategy={verticalListSortingStrategy}
                    >
                      <div 
                        className="gba:space-y-2"
                        data-testid={formatDataTestId(testIdPrefix, `${fieldName}List`)}
                      >
                        {activeRoles.map((role) => {
                          const originalIndex = currentRoles.indexOf(role);
                          return (
                            <SortableRoleItem
                              key={role.investmentRole?.id || `role-${originalIndex}`}
                              role={role}
                              index={originalIndex}
                              onRemove={handleRemoveRole}
                              testIdPrefix={testIdPrefix}
                            />
                          );
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </FormControl>
            <FormMessage>{fieldState.error?.message}</FormMessage>
          </FormItem>
        );
      }}
    />
  );
};

