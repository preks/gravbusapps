import React, { useState, useCallback, useEffect, useRef } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { 
  Button,
  Alert,
  AlertDescription,
  Badge,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@newwork/nw-design-system';
import { 
  PiPlus, 
  PiFunnel, 
  PiArrowClockwise, 
  PiPencil,
  PiFloppyDisk, 
  PiX, 
  PiDotsSixVertical,
  PiWarning,
  PiMagnifyingGlass
} from 'react-icons/pi';
import { ContextMenu, createEditAction, createDeleteAction } from '../ContextMenu';
import { AssignmentForm } from '../../forms/assignment-form';
import { expenseSettingsClient } from '../../utils/ExpenseSettingsClient';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  EnhancedExpenseRuleAssignment, 
  ExpenseRule,
  SaveExpenseRuleAssignmentInput,
  RuleValidationResult,
  ExpenseRuleAssignmentFilters
} from '../../types/ExpenseRuleTypes';

import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import dayjs from 'dayjs';

// Simple toast implementation until design system provides one
const toast = ({ title, description, variant }: { title: string; description: string; variant?: string }) => {
  const style = variant === 'destructive' ? 'color: red' : 'color: green';
  console.log(`%c${title}: ${description}`, style);
  // TODO: Replace with proper toast implementation when available in design system
};

export interface CalculationRuleAssignmentListProps extends BusinessAppContextProps {
  assignments: EnhancedExpenseRuleAssignment[];
  rules: ExpenseRule[];
  isLoading: boolean;
  onCreate: (data: SaveExpenseRuleAssignmentInput) => Promise<any>;
  onUpdate: (id: string, data: SaveExpenseRuleAssignmentInput) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
  onValidate: (data: SaveExpenseRuleAssignmentInput) => Promise<RuleValidationResult>;
  onSearch: (params: { search?: string; filters?: ExpenseRuleAssignmentFilters }) => Promise<void>;
  onRefresh: () => void;
  onNavigateToRule?: (ruleId: string, page?: string) => void;
}

// Batch change tracking interfaces
interface PendingAssignmentChange {
  id?: string; // undefined for new assignments
  assignmentOrder: number;
  assignmentData: SaveExpenseRuleAssignmentInput;
  changeType: 'update' | 'create';
  originalOrder?: number;
}

// Sortable row component for drag and drop
interface SortableRowProps {
  id: string;
  children: React.ReactNode;
  isEditMode: boolean;
}

const SortableRow: React.FC<SortableRowProps> = ({ id, children, isEditMode }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow 
      ref={setNodeRef} 
      style={style}
      className="gba:h-12"
      {...(isEditMode ? { ...attributes, ...listeners } : {})}
    >
      {children}
    </TableRow>
  );
};

// Hover Add Row component for table integration
interface HoverAddRowProps {
  afterOrder: number;
  onAdd: (afterOrder: number) => void;
  isEditMode: boolean;
}

const HoverAddRow: React.FC<HoverAddRowProps> = ({ afterOrder, onAdd, isEditMode }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Calculate column span based on edit mode
  const colSpan = isEditMode ? 8 : 7; // All columns

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAdd(afterOrder);
  };

  return (
    <TableRow 
      className="gba:h-3 gba:cursor-pointer gba:group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`hover-add-row-${afterOrder}`}
    >
      <TableCell 
        colSpan={colSpan}
        className="gba:p-0 gba:relative gba:h-3"
      >
        {/* Hover line */}
        <div 
          className={`gba:absolute gba:top-1/2 gba:left-0 gba:right-0 gba:h-px gba:bg-blue-400 gba:transition-opacity gba:duration-200 ${
            isHovered ? 'gba:opacity-100' : 'gba:opacity-0'
          }`}
        />
        
        {/* Add button */}
        <div 
          className={`gba:absolute gba:top-1/2 gba:left-1/2 gba:transform gba:-translate-x-1/2 gba:-translate-y-1/2 gba:transition-all gba:duration-200 gba:z-20 ${
            isHovered 
              ? 'gba:opacity-100 gba:scale-100' 
              : 'gba:opacity-0 gba:scale-75'
          }`}
        >
          <Button
            variant="default"
            size="sm"
            onClick={handleClick}
            className="gba:w-6 gba:h-6 gba:rounded-full gba:p-0 gba:shadow-md gba:border-2 gba:border-white gba:bg-blue-500 gba:text-white hover:gba:bg-blue-600 gba:flex gba:items-center gba:justify-center"
            title={`Add assignment after position ${afterOrder}`}
          >
            <PiPlus className="gba:text-xs" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

const CalculationRuleAssignmentList: React.FC<CalculationRuleAssignmentListProps> = ({
  accessToken,
  assignments,
  rules,
  isLoading,
  onCreate,
  onUpdate,
  onSearch,
  onRefresh
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [displayedAssignments, setDisplayedAssignments] = useState<EnhancedExpenseRuleAssignment[]>([]);
  const [sortedAssignments, setSortedAssignments] = useState<EnhancedExpenseRuleAssignment[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  
  // Batch changes state
  const [pendingChanges, setPendingChanges] = useState<PendingAssignmentChange[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Modal state management
  const [isCreateAssignmentModalVisible, setIsCreateAssignmentModalVisible] = useState(false);
  const [isEditAssignmentModalVisible, setIsEditAssignmentModalVisible] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<EnhancedExpenseRuleAssignment | null>(null);
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<EnhancedExpenseRuleAssignment | null>(null);
  
  const ITEMS_PER_PAGE = 20;

  const handleCreateAssignment = () => {
    setIsCreateAssignmentModalVisible(true);
  };

  const handleAddAssignmentAtPosition = (afterOrder: number) => {
    // TODO: Implement positional assignment creation
    // This would open a modal with pre-filled order position
    console.log(`Add assignment after position ${afterOrder}`);
    setIsCreateAssignmentModalVisible(true);
  };

  const handleEditAssignment = (assignment: EnhancedExpenseRuleAssignment) => {
    setEditingAssignment(assignment);
    setIsEditAssignmentModalVisible(true);
  };

  const handleCreateAssignmentSubmit = async (formData: SaveExpenseRuleAssignmentInput) => {
    try {
      await onCreate(formData);
      toast({
        title: "Success",
        description: "Assignment created successfully"
      });
      setIsCreateAssignmentModalVisible(false);
      onRefresh();
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast({
        title: "Error",
        description: "Failed to create assignment",
        variant: "destructive"
      });
    }
  };

  const handleEditAssignmentSubmit = async (formData: SaveExpenseRuleAssignmentInput) => {
    try {
      if (editingAssignment?.id) {
        await onUpdate(editingAssignment.id, formData);
        toast({
          title: "Success",
          description: "Assignment updated successfully"
        });
        setIsEditAssignmentModalVisible(false);
        setEditingAssignment(null);
        onRefresh();
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast({
        title: "Error",
        description: "Failed to update assignment",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAssignment = (assignment: EnhancedExpenseRuleAssignment) => {
    setAssignmentToDelete(assignment);
    setIsDeleteConfirmVisible(true);
  };

  const handleDeleteConfirm = async () => {
    if (!assignmentToDelete) return;
    
    try {
      // Call the individual save endpoint with DELETE changeMode
      await expenseSettingsClient.setAccessToken(accessToken);
      await expenseSettingsClient.deleteExpenseRuleAssignment(
        assignmentToDelete.id, 
        assignmentToDelete.version
      );
      
      toast({
        title: "Success",
        description: "Assignment deleted successfully"
      });
      
      setIsDeleteConfirmVisible(false);
      setAssignmentToDelete(null);
      onRefresh();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast({
        title: "Error",
        description: "Failed to delete assignment",
        variant: "destructive"
      });
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteConfirmVisible(false);
    setAssignmentToDelete(null);
  };

  const handleModalCancel = () => {
    setIsCreateAssignmentModalVisible(false);
    setIsEditAssignmentModalVisible(false);
    setEditingAssignment(null);
  };

  // Initialize sorted assignments on assignments change
  useEffect(() => {
    const sorted = [...assignments].sort((a, b) => a.assignmentOrder - b.assignmentOrder);
    setSortedAssignments(sorted);
    setDisplayedAssignments(sorted.slice(0, ITEMS_PER_PAGE));
    setHasMore(sorted.length > ITEMS_PER_PAGE);
  }, [assignments]);

  // Infinite scroll implementation
  const loadMoreItems = useCallback(() => {
    if (loadingMore || !hasMore || isEditMode) return;
    
    setLoadingMore(true);
    
    setTimeout(() => {
      const currentLength = displayedAssignments.length;
      const nextItems = sortedAssignments.slice(currentLength, currentLength + ITEMS_PER_PAGE);
      
      setDisplayedAssignments(prev => [...prev, ...nextItems]);
      setHasMore(currentLength + nextItems.length < sortedAssignments.length);
      setLoadingMore(false);
    }, 500); // Simulate loading delay
  }, [displayedAssignments.length, sortedAssignments, hasMore, loadingMore, isEditMode]);

  // Intersection observer for infinite scroll (avoids nested scrollbars)
  useEffect(() => {
    if (!sentinelRef.current || isEditMode) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          loadMoreItems();
        }
      },
      { root: null, rootMargin: '0px', threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadMoreItems, isEditMode]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleSearch = (value: string) => {
    if (isEditMode) return; // Disable search in edit mode
    onSearch({ search: value });
  };

  const handleEditMode = () => {
    if (isEditMode) {
      // Exit edit mode - refresh data
      onRefresh();
    }
    setIsEditMode(!isEditMode);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = displayedAssignments.findIndex(item => item.id === active.id);
    const newIndex = displayedAssignments.findIndex(item => item.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder the displayed assignments
    const newOrder = arrayMove(displayedAssignments, oldIndex, newIndex);
    setDisplayedAssignments(newOrder);

    // Track changes for batch update
    const newPendingChanges = newOrder.map((assignment, index) => {
      const originalAssignment = assignments.find(a => a.id === assignment.id);
      const newAssignmentOrder = index + 1;
      
      // Only track if order actually changed
      if (originalAssignment && originalAssignment.assignmentOrder !== newAssignmentOrder) {
        return {
          id: assignment.id,
          assignmentOrder: newAssignmentOrder,
          originalOrder: originalAssignment.assignmentOrder,
          changeType: 'update' as const,
          assignmentData: {
            expenseRuleAssignment: {
              id: assignment.id,
              assignmentOrder: newAssignmentOrder,
              cascading: originalAssignment.cascading,
              applicants: originalAssignment.applicants || false,
              activeFrom: originalAssignment.activeFrom,
              activeTo: originalAssignment.activeTo,
              expenseRule: originalAssignment.expenseRuleId,
              company: originalAssignment.companyId,
              organizationalUnit: originalAssignment.organizationalUnitId,
              siteLocation: originalAssignment.siteLocationId,
              employee: originalAssignment.employeeId,
              employmentTypeRef: originalAssignment.employmentType?.id,
              contractTypeRef: originalAssignment.contractType?.id,
              ...(originalAssignment.version !== undefined && { version: originalAssignment.version })
            },
            changeMode: 'UPDATE'
          }
        };
      }
      return null;
    }).filter(Boolean) as PendingAssignmentChange[];

    // Merge with existing pending changes
    setPendingChanges(prev => {
      const merged = [...prev];
      newPendingChanges.forEach(newChange => {
        const existingIndex = merged.findIndex(existing => existing.id === newChange.id);
        if (existingIndex >= 0) {
          merged[existingIndex] = newChange;
        } else {
          merged.push(newChange);
        }
      });
      return merged;
    });
  };

  // Batch save functionality
  const handleSaveBatchChanges = async () => {
    if (pendingChanges.length === 0) {
      toast({
        title: "Warning",
        description: "No changes to save",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      // Prepare assignments for bulk API
      const assignmentsToSave = pendingChanges.map(change => change.assignmentData);
      
      // Set access token on client
      expenseSettingsClient.setAccessToken(accessToken);
      
      // Call bulk save endpoint (now using individual calls internally)
      const result = await expenseSettingsClient.saveBulkExpenseRuleAssignment(assignmentsToSave);
      
      toast({
        title: "Success",
        description: `Successfully saved ${result.successful}/${result.totalProcessed} assignment changes`
      });
      
      // Clear pending changes
      setPendingChanges([]);
      
      // Exit edit mode and refresh data
      setIsEditMode(false);
      onRefresh();
      
    } catch (error: any) {
      console.error('Failed to save batch changes:', error);
      
      // Handle partial failures with detailed error info
      if (error.details) {
        const { successful, failed, totalProcessed } = error.details;
        toast({
          title: "Partial Success",
          description: `Saved ${successful}/${totalProcessed} assignments. ${failed} failed to save.`,
          variant: "destructive"
        });
        
        // Still refresh to show what was saved
        onRefresh();
        
        // Only clear successful changes from pending list
        if (successful > 0) {
          setPendingChanges([]);
          setIsEditMode(false);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to save changes. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelChanges = () => {
    // Revert to original assignments
    const sorted = [...assignments].sort((a, b) => a.assignmentOrder - b.assignmentOrder);
    setDisplayedAssignments(sorted.slice(0, ITEMS_PER_PAGE));
    
    // Clear pending changes
    setPendingChanges([]);
    
    // Exit edit mode
    setIsEditMode(false);
  };

  const renderAssignmentTargets = (record: EnhancedExpenseRuleAssignment) => {
    const targets = [];
    
    if (record.employeeName) {
      targets.push(
        <Badge key="employee" variant="secondary" className="gba:mb-1">
          Employee: {record.employeeName}
        </Badge>
      );
    }
    
    if (record.companyName) {
      targets.push(
        <Badge key="company" variant="default" className="gba:mb-1">
          Company: {record.companyName}
        </Badge>
      );
    }
    
    if (record.orgUnitName) {
      targets.push(
        <Badge key="orgUnit" variant="outline" className="gba:mb-1">
          Org Unit: {record.orgUnitName}
        </Badge>
      );
    }
    
    if (targets.length === 0) {
      return <Badge variant="secondary">General</Badge>;
    }
    
    return <div className="gba:flex gba:flex-wrap gba:gap-1">{targets}</div>;
  };

  // Helper function to get assignment targets as plain text for tooltip
  const renderAssignmentTargetsAsText = (record: EnhancedExpenseRuleAssignment): string => {
    const targets = [];
    
    if (record.employeeName) {
      targets.push(`Employee: ${record.employeeName}`);
    }
    
    if (record.companyName) {
      targets.push(`Company: ${record.companyName}`);
    }
    
    if (record.orgUnitName) {
      targets.push(`Org Unit: ${record.orgUnitName}`);
    }
    
    if (targets.length === 0) {
      return 'General';
    }
    
    return targets.join(', ');
  };

  return (
    <div
      data-testid="calculation-rule-assignments-container"
      style={{ 
        background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)',
        minHeight: '100%',
        padding: '24px',
        borderRadius: '8px'
      }}
    >
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900 gba:m-0">
            {getTranslationFromI18nKeyAndLabel('expenseSettings.calculationRules.assignments.title', 'Rule Assignments')}
          </h2>
          <Badge variant="secondary">{assignments.length} items</Badge>
          {isEditMode && (
            <Badge variant="destructive">
              {getTranslationFromI18nKeyAndLabel('common.edit_mode', 'Edit Mode')}
            </Badge>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {!isEditMode && (
            <Button 
              variant="outline"
              onClick={handleEditMode}
              data-testid="calculation-rules-edit-mode-button"
            >
              <PiPencil className="gba:mr-2 gba:h-4 gba:w-4" />
              {getTranslationFromI18nKeyAndLabel('common.edit_order', 'Edit Order')}
            </Button>
          )}
          
          {isEditMode && (
            <>
              <Button 
                onClick={handleSaveBatchChanges}
                disabled={pendingChanges.length === 0 || isSaving}
                data-testid="calculation-rules-save-changes-button"
              >
                <PiFloppyDisk className="gba:mr-2 gba:h-4 gba:w-4" />
                {getTranslationFromI18nKeyAndLabel('common.save_changes', 'Save Changes')}
                {pendingChanges.length > 0 && ` (${pendingChanges.length})`}
              </Button>
              <Button 
                variant="outline"
                onClick={handleCancelChanges}
                disabled={isSaving}
                data-testid="calculation-rules-cancel-changes-button"
              >
                <PiX className="gba:mr-2 gba:h-4 gba:w-4" />
                {getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
              </Button>
            </>
          )}
          
          {!isEditMode && (
            <Button 
              onClick={handleCreateAssignment}
              data-testid="calculation-rules-create-assignment-button"
            >
              <PiPlus className="gba:mr-2 gba:h-4 gba:w-4" />
              {getTranslationFromI18nKeyAndLabel('expenseSettings.actions.createAssignment', 'Create Assignment')}
            </Button>
          )}
          
          <Button 
            onClick={onRefresh}
            disabled={isEditMode}
            data-testid="calculation-rules-refresh-assignments-button"
          >
            <PiArrowClockwise className="gba:mr-2 gba:h-4 gba:w-4" />
            {getTranslationFromI18nKeyAndLabel('common.refresh', 'Refresh')}
          </Button>
        </div>
      </div>

      {/* Search and filters */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div className="gba:relative gba:max-w-sm">
          <PiMagnifyingGlass className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:text-gray-400 gba:h-4 gba:w-4" />
          <Input
            placeholder={getTranslationFromI18nKeyAndLabel('expenseSettings.search.assignments.placeholder', 'Search assignments by rule, target, type...')}
            className="gba:pl-10"
            onChange={(e) => handleSearch(e.target.value)}
            disabled={isEditMode}
            data-testid="calculation-rules-search-assignments-input"
          />
        </div>
        <Button 
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          disabled={isEditMode}
          data-testid="calculation-rules-filter-assignments-button"
        >
          <PiFunnel className="gba:mr-2 gba:h-4 gba:w-4" />
          {getTranslationFromI18nKeyAndLabel('common.filters', 'Filters')}
        </Button>
      </div>

      {/* Pending Changes Warning */}
      {isEditMode && pendingChanges.length > 0 && (
        <Alert className="gba:mb-4" data-testid="calculation-rules-pending-changes-alert">
          <PiWarning className="gba:h-4 gba:w-4" />
          <AlertDescription>
            <strong>{getTranslationFromI18nKeyAndLabel('expenseSettings.pendingChanges.title', 'Pending Changes')}</strong>
            <br />
            {getTranslationFromI18nKeyAndLabel(
              'expenseSettings.pendingChanges.description', 
              `You have ${pendingChanges.length} unsaved change${pendingChanges.length !== 1 ? 's' : ''}. Click "Save Changes" to apply them or "Cancel" to discard.`
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Description */}
      <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
          {isEditMode
            ? getTranslationFromI18nKeyAndLabel('expenseSettings.calculationRules.assignments.editDescription', 'Drag and drop to reorder assignments. Changes are saved in batch when you click "Save Changes".')
            : getTranslationFromI18nKeyAndLabel('expenseSettings.calculationRules.assignments.description', 'Manage rule assignments that determine which rules apply to specific employees, companies, or organizational units.')
          }
        </p>
      </div>

      {/* Table */}
      <div 
        className="gba:border gba:rounded-md"
      >
        {isLoading ? (
          <div className="gba:flex gba:justify-center gba:items-center gba:p-8">
            <div className="gba:animate-spin gba:rounded-full gba:h-8 gba:w-8 gba:border-b-2 gba:border-blue-600"></div>
          </div>
        ) : (
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={displayedAssignments.map(item => item.id)}
              strategy={verticalListSortingStrategy}
              disabled={!isEditMode}
            >
              <div className="gba:w-full gba:overflow-x-auto">
                <Table className="gba:min-w-[1000px] gba:table-fixed gba:text-sm">
                  <TableHeader>
                    <TableRow className="gba:h-10">
                      {isEditMode && <TableHead className="gba:w-[50px] gba:py-2 gba:px-2 gba:text-xs">DRAG</TableHead>}
                      <TableHead className="gba:w-[40px] gba:py-2 gba:px-2 gba:text-xs">#</TableHead>
                      <TableHead className="gba:w-[180px] gba:py-2 gba:px-3 gba:text-xs">RULE</TableHead>
                      <TableHead className="gba:w-[70px] gba:py-2 gba:px-2 gba:text-xs">STANDARD</TableHead>
                      <TableHead className="gba:w-[280px] gba:py-2 gba:px-3 gba:text-xs">ASSIGNMENT TARGETS</TableHead>
                      <TableHead className="gba:w-[170px] gba:py-2 gba:px-3 gba:text-xs">EFFECTIVE PERIOD</TableHead>
                      <TableHead className="gba:w-[80px] gba:py-2 gba:px-2 gba:text-xs">CASCADING</TableHead>
                      <TableHead className="gba:w-[60px] gba:py-2 gba:px-2 gba:text-xs">ACTIONS</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {/* Hover add zone before first assignment */}
                  {!isEditMode && displayedAssignments.length > 0 && (
                    <HoverAddRow
                      key="hover-before-0"
                      afterOrder={0}
                      onAdd={handleAddAssignmentAtPosition}
                      isEditMode={isEditMode}
                    />
                  )}
                  
                  {displayedAssignments.map((assignment) => (
                    <React.Fragment key={assignment.id}>
                      <SortableRow 
                        id={assignment.id} 
                        isEditMode={isEditMode}
                      >
                      {isEditMode && (
                        <TableCell className="gba:py-2 gba:px-2 gba:w-[50px]">
                          <div className="gba:cursor-grab gba:text-center gba:p-1">
                            <PiDotsSixVertical className="gba:h-3 gba:w-3" />
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="gba:py-2 gba:px-2 gba:w-[40px]">
                        <span className="gba:font-normal gba:text-sm">{assignment.assignmentOrder}.</span>
                      </TableCell>
                      <TableCell className="gba:py-2 gba:px-3 gba:w-[180px]">
                        <div>
                          <div className="gba:font-medium gba:text-gray-900 gba:text-sm gba:truncate gba:leading-tight" title={assignment.ruleCode}>
                            {assignment.ruleCode}
                          </div>
                          {assignment.ruleName && (
                            <div className="gba:text-xs gba:text-gray-500 gba:truncate gba:leading-tight" title={assignment.ruleName}>
                              {assignment.ruleName}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="gba:py-2 gba:px-2 gba:w-[70px]">
                        <Badge variant={assignment.expenseRule?.standard ? 'default' : 'secondary'} className="gba:text-xs gba:px-2 gba:py-0.5">
                          {assignment.expenseRule?.standard ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell className="gba:py-2 gba:px-3 gba:w-[280px]">
                        <div className="gba:truncate" title={renderAssignmentTargetsAsText(assignment)}>
                          {renderAssignmentTargets(assignment)}
                        </div>
                      </TableCell>
                      <TableCell className="gba:py-2 gba:px-3 gba:w-[170px]">
                        {(() => {
                          const now = new Date();
                          const activeFrom = new Date(assignment.activeFrom);
                          const activeTo = new Date(assignment.activeTo);
                          const isActive = activeFrom <= now && activeTo >= now;
                          const timeFrame = `${dayjs(assignment.activeFrom).format('DD/MM/YYYY')} - ${assignment.activeTo ? dayjs(assignment.activeTo).format('DD/MM/YYYY') : 'Ongoing'}`;
                          
                          return (
                            <div 
                              className={`gba:px-2 gba:py-1 gba:rounded gba:text-xs gba:font-medium gba:text-center gba:truncate ${
                                isActive 
                                  ? 'gba:bg-green-100 gba:text-green-800 gba:border gba:border-green-200' 
                                  : 'gba:bg-gray-100 gba:text-gray-600 gba:border gba:border-gray-200'
                              }`}
                              title={`${timeFrame} (${isActive ? 'Active' : 'Inactive'})`}
                            >
                              {timeFrame}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="gba:py-2 gba:px-2 gba:w-[80px]">
                        <Badge variant={assignment.cascading ? 'default' : 'secondary'} className="gba:text-xs gba:px-2 gba:py-0.5">
                          {assignment.cascading ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell className="gba:py-2 gba:px-2 gba:w-[60px]">
                        <div className="gba:flex gba:justify-center">
                          <ContextMenu
                            actions={[
                              createEditAction(() => handleEditAssignment(assignment)),
                              createDeleteAction(() => handleDeleteAssignment(assignment))
                            ]}
                            triggerTestId={`calculation-rules-assignment-actions-${assignment.id}`}
                          />
                        </div>
                      </TableCell>
                    </SortableRow>
                    
                    {/* Hover add zone after each assignment (except in edit mode) */}
                    {!isEditMode && (
                      <HoverAddRow
                        key={`hover-after-${assignment.assignmentOrder}`}
                        afterOrder={assignment.assignmentOrder}
                        onAdd={handleAddAssignmentAtPosition}
                        isEditMode={isEditMode}
                      />
                    )}
                  </React.Fragment>
                  ))}
                </TableBody>
                </Table>
              </div>
            </SortableContext>
          </DndContext>
        )}
        
        {/* Infinite scroll sentinel */}
        {!isEditMode && (
          <div ref={sentinelRef} style={{ height: 1 }} />
        )}

        {/* Infinite scroll loading indicator */}
        {!isEditMode && hasMore && (
          <div style={{ textAlign: 'center', padding: '16px' }}>
            {loadingMore ? (
              <span>Loading more...</span>
            ) : (
              <Button onClick={loadMoreItems}>Load More</Button>
            )}
          </div>
        )}
      </div>

      {/* Create Assignment Dialog */}
      <Dialog open={isCreateAssignmentModalVisible} onOpenChange={setIsCreateAssignmentModalVisible}>
        <DialogContent className="gba:max-w-4xl gba:max-h-[90vh] gba:overflow-y-auto" data-testid="calculation-rules-create-assignment-dialog">
          <DialogHeader>
            <DialogTitle>{getTranslationFromI18nKeyAndLabel('expenseSettings.modals.createAssignment.title', 'Create Rule Assignment')}</DialogTitle>
          </DialogHeader>
          <AssignmentForm
            accessToken={accessToken}
            availableRules={rules}
            onSave={handleCreateAssignmentSubmit}
            onCancel={handleModalCancel}
            isEditing={false}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Assignment Dialog */}
      <Dialog open={isEditAssignmentModalVisible} onOpenChange={setIsEditAssignmentModalVisible}>
        <DialogContent className="gba:max-w-4xl gba:max-h-[90vh] gba:overflow-y-auto" data-testid="calculation-rules-edit-assignment-dialog">
          <DialogHeader>
            <DialogTitle>{getTranslationFromI18nKeyAndLabel('expenseSettings.modals.editAssignment.title', 'Edit Rule Assignment')}</DialogTitle>
          </DialogHeader>
          {editingAssignment && (
            <AssignmentForm
              accessToken={accessToken}
              availableRules={rules}
              initialData={editingAssignment}
              onSave={handleEditAssignmentSubmit}
              onCancel={handleModalCancel}
              isEditing={true}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Assignment Confirmation Dialog */}
      <Dialog open={isDeleteConfirmVisible} onOpenChange={setIsDeleteConfirmVisible}>
        <DialogContent className="gba:max-w-md" data-testid="calculation-rules-delete-assignment-dialog">
          <DialogHeader>
            <DialogTitle>{getTranslationFromI18nKeyAndLabel('expenseSettings.modals.deleteAssignment.title', 'Delete Rule Assignment')}</DialogTitle>
          </DialogHeader>
          <div className="gba:space-y-4">
            <p className="gba:text-sm gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel('expenseSettings.modals.deleteAssignment.message', 
                'Are you sure you want to delete this rule assignment? This action cannot be undone.')}
            </p>
            
            {assignmentToDelete && (
              <div className="gba:bg-gray-50 gba:p-3 gba:rounded-md">
                <p className="gba:text-sm gba:font-medium">
                  Rule: {assignmentToDelete.ruleCode}
                </p>
                {assignmentToDelete.ruleName && (
                  <p className="gba:text-sm gba:text-gray-600">
                    {assignmentToDelete.ruleName}
                  </p>
                )}
                <p className="gba:text-sm gba:text-gray-600">
                  Order: {assignmentToDelete.assignmentOrder}
                </p>
              </div>
            )}
            
            <div className="gba:flex gba:justify-end gba:space-x-2">
              <Button
                variant="outline"
                onClick={handleDeleteCancel}
                data-testid="calculation-rules-delete-assignment-cancel-button"
              >
                {getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                data-testid="calculation-rules-delete-assignment-confirm-button"
              >
                {getTranslationFromI18nKeyAndLabel('common.delete', 'Delete')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalculationRuleAssignmentList;