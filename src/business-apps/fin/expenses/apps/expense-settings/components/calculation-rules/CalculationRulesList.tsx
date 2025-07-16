import React, { useState, useCallback, useEffect, useRef } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { 
  Badge
} from '@newwork/nw-design-system';
import { 
  Table, 
  Button,
  Input, 
  Typography, 
  Tag, 
  Space, 
  Tooltip, 
  Form, 
  Select, 
  DatePicker, 
  Switch,
  Alert,
  message,
  Modal
} from 'antd';
import { ColumnsType } from 'antd/es/table';
import { 
  PiPlus, 
  PiMagnifyingGlass, 
  PiFunnel, 
  PiArrowClockwise, 
  PiPencil, 
  PiFloppyDisk, 
  PiX, 
  PiDotsSixVertical 
} from 'react-icons/pi';
import { CalculationRuleForm, CalculationRuleFormData } from '../../forms/calculation-rule-form';
import { AssignmentForm } from '../../forms/assignment-form';
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

const { Title } = Typography;
const { Search } = Input;
const { Option } = Select;

export interface CalculationRulesListProps extends BusinessAppContextProps {
  assignments: EnhancedExpenseRuleAssignment[];
  rules: ExpenseRule[];
  isLoading: boolean;
  onCreate: (data: SaveExpenseRuleAssignmentInput) => Promise<any>;
  onUpdate: (id: string, data: SaveExpenseRuleAssignmentInput) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
  onValidate: (data: SaveExpenseRuleAssignmentInput) => Promise<RuleValidationResult>;
  onSearch: (params: { search?: string; filters?: ExpenseRuleAssignmentFilters }) => Promise<void>;
  onRefresh: () => void;
  showRules: boolean;
  onNavigateToRule?: (ruleId: string, page?: string) => void;
}

// Hover Add Button Component - appears between rows on hover
interface HoverAddButtonProps {
  afterOrder: number;
  onAdd: (afterOrder: number) => void;
}

interface HoverAddButtonProps {
  afterOrder: number;
  onAdd: (afterOrder: number) => void;
  isEditMode: boolean;
}

const HoverAddButton: React.FC<HoverAddButtonProps> = ({ afterOrder, onAdd, isEditMode }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Calculate column span based on edit mode (drag handle + order + actions + 4 content columns)
  const colSpan = isEditMode ? 7 : 6;

  return (
    <tr 
      className="gba:hover-add-row"
      style={{
        height: '20px', // Increased height for better hover target
        position: 'relative',
        transition: 'all 0.2s ease-in-out',
        backgroundColor: isHovered ? '#f0f9ff' : 'transparent',
        borderTop: isHovered ? '2px dashed #3b82f6' : '1px solid transparent',
        borderBottom: isHovered ? '2px dashed #3b82f6' : '1px solid transparent',
        cursor: 'pointer'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <td 
        colSpan={colSpan} 
        style={{ 
          padding: '4px 0',
          position: 'relative',
          textAlign: 'center',
          height: '20px'
        }}
      >
        {isHovered && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onAdd(afterOrder);
            }}
            className="gba:flex gba:items-center gba:gap-1"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
              minWidth: '100px',
              height: '28px',
              fontSize: '12px',
              borderRadius: '14px',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
              animation: 'fadeInScale 0.2s ease-out forwards'
            }}
            title={`Add assignment after position ${afterOrder}`}
          >
            <PiPlus className="gba:w-4 gba:h-4" />
            Add Here
          </Button>
        )}
      </td>
    </tr>
  );
};

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
    <tr 
      ref={setNodeRef} 
      style={style}
      {...(isEditMode ? { ...attributes, ...listeners } : {})}
    >
      {children}
    </tr>
  );
};

// Inline creation form component
interface InlineCreationFormProps {
  rules: ExpenseRule[];
  onSave: (data: SaveExpenseRuleAssignmentInput) => Promise<void>;
  onCancel: () => void;
  insertAfterOrder: number;
}

const InlineCreationForm: React.FC<InlineCreationFormProps> = ({ rules, onSave, onCancel, insertAfterOrder }) => {
  const [form] = Form.useForm();

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await onSave({
        expenseRuleAssignment: {
          assignmentOrder: insertAfterOrder + 1,
          cascading: values.cascading || false,
          applicants: false,
          activeFrom: values.activeFrom.toISOString(),
          activeTo: values.activeTo.toISOString(),
          expenseRule: values.expenseRuleId,
          company: values.companyId,
          organizationalUnit: values.organizationalUnitId,
          siteLocation: values.siteLocationId,
          employee: values.employeeId,
          employmentTypeRef: values.employmentTypeRef,
          contractTypeRef: values.contractTypeRef,
        },
        changeMode: 'INSERT'
      });
      form.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  return (
    <tr style={{ backgroundColor: '#f0f9ff' }}>
      <td colSpan={1}></td> {/* Drag handle column (if in edit mode) */}
      <td colSpan={1}></td> {/* Order column */}
      <td>
        <Form form={form} layout="inline" style={{ width: '100%' }}>
          <Form.Item 
            name="expenseRuleId" 
            rules={[{ required: true, message: 'Please select a rule' }]}
            style={{ minWidth: '150px' }}
          >
            <Select placeholder="Select rule">
              {rules.map(rule => (
                <Option key={rule.id} value={rule.id}>{rule.code}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </td>
      <td>
        <Form.Item 
          name="companyId"
          style={{ minWidth: '150px' }}
        >
          <Select placeholder="Select target" allowClear>
            <Option value="">General</Option>
            {/* TODO: Add actual company/org/employee options */}
          </Select>
        </Form.Item>
      </td>
      <td>
        <Space>
          <Form.Item name="activeFrom" rules={[{ required: true }]}>
            <DatePicker placeholder="Start date" />
          </Form.Item>
          <Form.Item name="activeTo" rules={[{ required: true }]}>
            <DatePicker placeholder="End date" />
          </Form.Item>
        </Space>
      </td>
      <td>
        <Form.Item name="cascading" valuePropName="checked">
          <Switch size="small" />
        </Form.Item>
      </td>
      <td>
        <Space>
          <Button type="primary" size="small" onClick={handleSave}>
            <PiFloppyDisk />
          </Button>
          <Button size="small" onClick={onCancel}>
            <PiX />
          </Button>
        </Space>
      </td>
    </tr>
  );
};

const CalculationRulesList: React.FC<CalculationRulesListProps> = ({
  accessToken,
  assignments,
  rules,
  isLoading,
  onCreate,
  onUpdate,
  onDelete,
  onValidate,
  onSearch,
  onRefresh,
  showRules,
  onNavigateToRule
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [displayedAssignments, setDisplayedAssignments] = useState<EnhancedExpenseRuleAssignment[]>([]);
  const [sortedAssignments, setSortedAssignments] = useState<EnhancedExpenseRuleAssignment[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [inlineCreationRow, setInlineCreationRow] = useState<number | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  
  // Modal state management
  const [isCreateRuleModalVisible, setIsCreateRuleModalVisible] = useState(false);
  const [isEditRuleModalVisible, setIsEditRuleModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<ExpenseRule | null>(null);
  const [isCreateAssignmentModalVisible, setIsCreateAssignmentModalVisible] = useState(false);
  const [isEditAssignmentModalVisible, setIsEditAssignmentModalVisible] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<EnhancedExpenseRuleAssignment | null>(null);
  
  const ITEMS_PER_PAGE = 20;

  // Modal handlers
  const handleCreateRule = () => {
    setIsCreateRuleModalVisible(true);
  };

  const handleEditRule = (rule: ExpenseRule) => {
    setEditingRule(rule);
    setIsEditRuleModalVisible(true);
  };

  const handleCreateRuleSubmit = async (formData: CalculationRuleFormData) => {
    try {
      // TODO: Implement actual create API call
      console.log('Creating rule:', formData);
      message.success('Rule created successfully');
      setIsCreateRuleModalVisible(false);
      onRefresh();
    } catch (error) {
      console.error('Error creating rule:', error);
      message.error('Failed to create rule');
    }
  };

  const handleEditRuleSubmit = async (formData: CalculationRuleFormData) => {
    try {
      // TODO: Implement actual update API call
      console.log('Updating rule:', formData);
      message.success('Rule updated successfully');
      setIsEditRuleModalVisible(false);
      setEditingRule(null);
      onRefresh();
    } catch (error) {
      console.error('Error updating rule:', error);
      message.error('Failed to update rule');
    }
  };

  const handleCreateAssignment = () => {
    setIsCreateAssignmentModalVisible(true);
  };

  const handleEditAssignment = (assignment: EnhancedExpenseRuleAssignment) => {
    setEditingAssignment(assignment);
    setIsEditAssignmentModalVisible(true);
  };

  const handleCreateAssignmentSubmit = async (formData: SaveExpenseRuleAssignmentInput) => {
    try {
      await onCreate(formData);
      message.success('Assignment created successfully');
      setIsCreateAssignmentModalVisible(false);
      onRefresh();
    } catch (error) {
      console.error('Error creating assignment:', error);
      message.error('Failed to create assignment');
    }
  };

  const handleEditAssignmentSubmit = async (formData: SaveExpenseRuleAssignmentInput) => {
    try {
      if (editingAssignment?.id) {
        await onUpdate(editingAssignment.id, formData);
        message.success('Assignment updated successfully');
        setIsEditAssignmentModalVisible(false);
        setEditingAssignment(null);
        onRefresh();
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      message.error('Failed to update assignment');
    }
  };

  const handleModalCancel = () => {
    setIsCreateRuleModalVisible(false);
    setIsEditRuleModalVisible(false);
    setEditingRule(null);
    setIsCreateAssignmentModalVisible(false);
    setIsEditAssignmentModalVisible(false);
    setEditingAssignment(null);
  };

  // Initialize sorted assignments on assignments change
  useEffect(() => {
    if (!showRules) {
      const sorted = [...assignments].sort((a, b) => a.assignmentOrder - b.assignmentOrder);
      setSortedAssignments(sorted);
      setDisplayedAssignments(sorted.slice(0, ITEMS_PER_PAGE));
      setHasMore(sorted.length > ITEMS_PER_PAGE);
    }
  }, [assignments, showRules]);

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

  // Scroll event handler for infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!tableRef.current || isEditMode) return;
      
      const { scrollTop, scrollHeight, clientHeight } = tableRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        loadMoreItems();
      }
    };

    const tableElement = tableRef.current;
    if (tableElement) {
      tableElement.addEventListener('scroll', handleScroll);
      return () => tableElement.removeEventListener('scroll', handleScroll);
    }
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
    setSearchTerm(value);
    onSearch({ search: value });
  };

  const handleRowClick = (record: EnhancedExpenseRuleAssignment | ExpenseRule) => {
    if (isEditMode) return; // Disable row click in edit mode
    
    // Navigate to rule record if it's a rule and navigation function is provided
    if (showRules && onNavigateToRule && 'code' in record) {
      const currentPage = showRules ? 'Rules' : 'Assignments';
      onNavigateToRule(record.id, currentPage);
    } else {
      console.log('Row clicked:', record);
    }
  };

  const handleEditMode = () => {
    if (isEditMode) {
      // Exit edit mode - refresh data
      onRefresh();
    }
    setIsEditMode(!isEditMode);
    setInlineCreationRow(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = displayedAssignments.findIndex(item => item.id === active.id);
    const newIndex = displayedAssignments.findIndex(item => item.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder the displayed assignments
    const newOrder = arrayMove(displayedAssignments, oldIndex, newIndex);
    setDisplayedAssignments(newOrder);

    // Update assignment orders
    try {
      const updates = newOrder.map((assignment, index) => ({
        id: assignment.id,
        assignmentOrder: index + 1
      }));

      // TODO: Implement batch update API call
      for (const update of updates) {
        const originalAssignment = assignments.find(a => a.id === update.id)!;
        await onUpdate(update.id, {
          expenseRuleAssignment: {
            id: update.id,
            assignmentOrder: update.assignmentOrder,
            cascading: originalAssignment.cascading,
            applicants: originalAssignment.applicants || false,
            activeFrom: originalAssignment.activeFrom,
            activeTo: originalAssignment.activeTo,
            expenseRule: originalAssignment.expenseRuleId,
            company: originalAssignment.companyId,
            organizationalUnit: originalAssignment.organizationalUnitId,
            siteLocation: originalAssignment.siteLocationId,
            employee: originalAssignment.employeeId,
            employmentTypeRef: originalAssignment.employmentTypeName,
            contractTypeRef: originalAssignment.contractTypeName,
          },
          changeMode: 'UPDATE'
        });
      }

      // Refresh after all updates
      setTimeout(() => {
        onRefresh();
      }, 1000);
    } catch (error) {
      console.error('Failed to update assignment orders:', error);
      // Revert on error
      setDisplayedAssignments(displayedAssignments);
    }
  };

  const handleInlineCreate = (afterOrder: number) => {
    setInlineCreationRow(afterOrder);
  };

  const handleInlineSave = async (data: SaveExpenseRuleAssignmentInput) => {
    try {
      await onCreate(data);
      setInlineCreationRow(null);
      // Refresh to get updated order
      setTimeout(() => {
        onRefresh();
      }, 500);
    } catch (error) {
      console.error('Failed to create assignment:', error);
    }
  };

  const handleInlineCancel = () => {
    setInlineCreationRow(null);
  };

  const renderAssignmentTargets = (record: EnhancedExpenseRuleAssignment) => {
    const targets = [];
    
    if (record.employeeName) {
      targets.push(
        <div key="employee" className="gba:mb-1">
          <Tag color="blue">Employee</Tag>
          <span className="gba:ml-1">{record.employeeName}</span>
        </div>
      );
    }
    
    if (record.companyName) {
      targets.push(
        <div key="company" className="gba:mb-1">
          <Tag color="green">Company</Tag>
          <span className="gba:ml-1">{record.companyName}</span>
        </div>
      );
    }
    
    if (record.orgUnitName) {
      targets.push(
        <div key="orgUnit" className="gba:mb-1">
          <Tag color="orange">Org Unit</Tag>
          <span className="gba:ml-1">{record.orgUnitName}</span>
        </div>
      );
    }
    
    if (record.locationName) {
      targets.push(
        <div key="location" className="gba:mb-1">
          <Tag color="purple">Location</Tag>
          <span className="gba:ml-1">{record.locationName}</span>
        </div>
      );
    }
    
    if (record.contractTypeName) {
      targets.push(
        <div key="contractType" className="gba:mb-1">
          <Tag color="cyan">Contract Type</Tag>
          <span className="gba:ml-1">{record.contractTypeName}</span>
        </div>
      );
    }
    
    if (record.employmentTypeName) {
      targets.push(
        <div key="employmentType" className="gba:mb-1">
          <Tag color="magenta">Employment Type</Tag>
          <span className="gba:ml-1">{record.employmentTypeName}</span>
        </div>
      );
    }
    
    if (targets.length === 0) {
      return <Tag color="default">General</Tag>;
    }
    
    if (targets.length > 2) {
      return (
        <div>
          {targets.slice(0, 2)}
          <Tooltip
            title={
              <div>
                <strong>All Assignment Targets:</strong>
                <div className="gba:mt-2">
                  {targets}
                </div>
              </div>
            }
          >
            <Tag color="gray">+{targets.length - 2} more</Tag>
          </Tooltip>
        </div>
      );
    }
    
    return <div>{targets}</div>;
  };

  // Create enhanced dataSource with hover zones for edit mode
  const createEnhancedDataSource = () => {
    if (!isEditMode) {
      return displayedAssignments;
    }

    const enhanced: (EnhancedExpenseRuleAssignment | { isHoverZone: true; afterOrder: number; id: string })[] = [];
    
    // Add hover zone before first item
    enhanced.push({
      isHoverZone: true,
      afterOrder: 0,
      id: 'hover-0'
    });

    // Add assignments with hover zones after each
    displayedAssignments.forEach((assignment) => {
      enhanced.push(assignment);
      
      // Add hover zone after this assignment
      enhanced.push({
        isHoverZone: true,
        afterOrder: assignment.assignmentOrder,
        id: `hover-${assignment.assignmentOrder}`
      });
    });

    return enhanced;
  };

  const enhancedDataSource = createEnhancedDataSource();

  // Define columns for assignments table
  const assignmentColumns: ColumnsType<any> = [
    // Drag handle column (only in edit mode)
    ...(isEditMode ? [{
      title: '',
      key: 'dragHandle',
      width: 40,
      fixed: 'left' as const,
      render: (_: any, record: any) => {
        if (record.isHoverZone) return null;
        return (
          <div 
            className="gba:drag-handle"
            style={{ 
              padding: '8px', 
              textAlign: 'center', 
              cursor: 'grab' 
            }}
          >
            <PiDotsSixVertical />
          </div>
        );
      },
    }] : []),
    {
      title: '#',
      key: 'order',
      width: 50,
      fixed: 'left',
      render: (_: any, record: any) => {
        if (record.isHoverZone) return null;
        const order = record.assignmentOrder || 1;
        return (
          <span style={{ fontWeight: 'normal' }}>{order}.</span>
        );
      },
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_: any, record: any) => {
        if (record.isHoverZone) return null;
        return (
          <div className="gba:flex gba:justify-start gba:gap-2">
            <Button
              type="text"
              size="small"
              icon={<PiPencil />}
              data-testid={`calculation-rules-edit-assignment-button-${record.id}`}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                handleEditAssignment(record);
              }}
              title="Edit Assignment"
            />
          </div>
        );
      },
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense_settings.table.rule_code', 'Rule Code'),
      dataIndex: 'ruleCode',
      key: 'ruleCode',
      sorter: !isEditMode,
      render: (text: string, record: any) => {
        if (record.isHoverZone) return null;
        return (
          <div>
            <strong>{text}</strong>
            <br />
            <span className="gba:text-sm gba:text-gray-500">{record.ruleName}</span>
          </div>
        );
      },
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense_settings.table.assignment_targets', 'Assignment Targets'),
      key: 'targets',
      render: (_: any, record: any) => {
        if (record.isHoverZone) return null;
        return renderAssignmentTargets(record);
      },
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense_settings.table.effective_period', 'Effective Period'),
      dataIndex: 'effectivePeriod',
      key: 'effectivePeriod',
      sorter: !isEditMode,
      render: (text: string, record: any) => {
        if (record.isHoverZone) return null;
        const now = new Date();
        const activeFrom = new Date(record.activeFrom);
        const activeTo = new Date(record.activeTo);
        const isActive = activeFrom <= now && activeTo >= now;
        
        return (
          <div>
            <div className="gba:text-sm">{text}</div>
            <Tag color={isActive ? 'green' : 'default'}>
              {isActive 
                ? getTranslationFromI18nKeyAndLabel('common.active', 'Active')
                : getTranslationFromI18nKeyAndLabel('common.inactive', 'Inactive')
              }
            </Tag>
          </div>
        );
      },
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense_settings.table.cascading', 'Cascading'),
      dataIndex: 'cascading',
      key: 'cascading',
      width: 100,
      render: (cascading: boolean, record: any) => {
        if (record.isHoverZone) return null;
        return (
          <Tag color={cascading ? 'green' : 'default'}>
            {cascading 
              ? getTranslationFromI18nKeyAndLabel('common.yes', 'Yes')
              : getTranslationFromI18nKeyAndLabel('common.no', 'No')
            }
          </Tag>
        );
      },
    },
  ];

  // Define columns for rules table (unchanged)
  const ruleColumns: ColumnsType<ExpenseRule> = [
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_: any, record: ExpenseRule) => (
        <div className="gba:flex gba:justify-start gba:gap-2">
          <Button
            type="text"
            size="small"
            icon={<PiPencil />}
            data-testid={`calculation-rules-edit-rule-button-${record.id}`}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              handleEditRule(record);
            }}
            title="Edit Rule"
          />
        </div>
      ),
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense_settings.table.rule_code', 'Rule Code'),
      dataIndex: 'code',
      key: 'code',
      sorter: true,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense_settings.table.calculation_type', 'Calculation Type'),
      key: 'calculationType',
      render: (_: any, record: ExpenseRule) => (
        <div>
          {record.calculationType?.value || 
           getTranslationFromI18nKeyAndLabel('common.not_specified', 'Not Specified')}
        </div>
      ),
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense_settings.table.country', 'Country'),
      key: 'country',
      render: (_: any, record: ExpenseRule) => (
        <div>
          {record.country?.value || 
           getTranslationFromI18nKeyAndLabel('common.all_countries', 'All Countries')}
        </div>
      ),
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense_settings.table.currency', 'Currency'),
      key: 'currency',
      render: (_: any, record: ExpenseRule) => (
        <div>
          {record.currency?.value || 
           getTranslationFromI18nKeyAndLabel('common.default_currency', 'Default Currency')}
        </div>
      ),
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense_settings.table.effective_period', 'Effective Period'),
      key: 'effectivePeriod',
      render: (_: any, record: ExpenseRule) => {
        const now = new Date();
        const activeFrom = new Date(record.activeFrom);
        const activeTo = record.activeTo ? new Date(record.activeTo) : null;
        const isActive = activeFrom <= now && (!activeTo || activeTo >= now);
        
        const formatDate = (date: string) => new Date(date).toLocaleDateString();
        
        return (
          <div>
            <div className="gba:text-sm">
              {formatDate(record.activeFrom)} - {record.activeTo ? formatDate(record.activeTo) : 'Ongoing'}
            </div>
            <Tag color={isActive ? 'green' : 'default'}>
              {isActive 
                ? getTranslationFromI18nKeyAndLabel('common.active', 'Active')
                : getTranslationFromI18nKeyAndLabel('common.inactive', 'Inactive')
              }
            </Tag>
          </div>
        );
      },
    },
    {
      title: getTranslationFromI18nKeyAndLabel('expense_settings.table.deduction_limit', 'Deduction Limit'),
      dataIndex: 'deductionLimit',
      key: 'deductionLimit',
      width: 120,
      render: (deductionLimit: boolean) => (
        <Tag color={deductionLimit ? 'orange' : 'default'}>
          {deductionLimit 
            ? getTranslationFromI18nKeyAndLabel('common.yes', 'Yes')
            : getTranslationFromI18nKeyAndLabel('common.no', 'No')
          }
        </Tag>
      ),
    },
  ];

  return (
    <div
      data-testid={`calculation-rules-${showRules ? 'rules' : 'assignments'}-container`}
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
          <Title level={4} style={{ margin: 0, color: '#1f2937' }}>
            {showRules 
              ? getTranslationFromI18nKeyAndLabel('expenseSettings.calculationRules.rules.title', 'Expense Rules')
              : getTranslationFromI18nKeyAndLabel('expenseSettings.calculationRules.assignments.title', 'Rule Assignments')
            }
          </Title>
          <Tag color="blue">{showRules ? rules.length : assignments.length} items</Tag>
          {isEditMode && (
            <Tag color="orange">
              {getTranslationFromI18nKeyAndLabel('common.edit_mode', 'Edit Mode')}
            </Tag>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {!showRules && (
            <Button 
              type={isEditMode ? "default" : "dashed"}
              icon={isEditMode ? <PiFloppyDisk /> : <PiPencil />}
              onClick={handleEditMode}
              data-testid="calculation-rules-edit-mode-button"
            >
              {isEditMode 
                ? getTranslationFromI18nKeyAndLabel('common.save_exit', 'Save & Exit')
                : getTranslationFromI18nKeyAndLabel('common.edit_order', 'Edit Order')
              }
            </Button>
          )}
          <Button 
            type="primary" 
            icon={<PiPlus />} 
            onClick={showRules ? handleCreateRule : handleCreateAssignment}
            data-testid={`calculation-rules-create-${showRules ? 'rule' : 'assignment'}-button`}
          >
            {showRules 
              ? getTranslationFromI18nKeyAndLabel('expenseSettings.actions.createRule', 'Create Rule')
              : getTranslationFromI18nKeyAndLabel('expenseSettings.actions.createAssignment', 'Create Assignment')
            }
          </Button>
          <Button 
            icon={<PiArrowClockwise />} 
            onClick={onRefresh}
            disabled={isEditMode}
            data-testid={`calculation-rules-refresh-${showRules ? 'rules' : 'assignments'}-button`}
          >
            {getTranslationFromI18nKeyAndLabel('common.refresh', 'Refresh')}
          </Button>
        </div>
      </div>

      {/* Search and filters */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Search
          placeholder={showRules 
            ? getTranslationFromI18nKeyAndLabel('expenseSettings.search.rules.placeholder', 'Search rules by code, type, country...')
            : getTranslationFromI18nKeyAndLabel('expenseSettings.search.assignments.placeholder', 'Search assignments by rule, target, type...')
          }
          allowClear
          style={{ maxWidth: '400px' }}
          onSearch={handleSearch}
          disabled={isEditMode}
          data-testid={`calculation-rules-search-${showRules ? 'rules' : 'assignments'}-input`}
        />
        <Button 
          icon={<PiFunnel />}
          onClick={() => setShowFilters(!showFilters)}
          disabled={isEditMode}
          data-testid={`calculation-rules-filter-${showRules ? 'rules' : 'assignments'}-button`}
        >
          {getTranslationFromI18nKeyAndLabel('common.filters', 'Filters')}
        </Button>
      </div>

      {/* Description */}
      <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
          {showRules 
            ? getTranslationFromI18nKeyAndLabel('expenseSettings.calculationRules.rules.description', 'Manage calculation rules that define how expenses are processed and validated.')
            : isEditMode
            ? getTranslationFromI18nKeyAndLabel('expenseSettings.calculationRules.assignments.editDescription', 'Drag and drop to reorder assignments. Click + to add assignments between existing ones. Sorting and filtering are disabled in edit mode.')
            : getTranslationFromI18nKeyAndLabel('expenseSettings.calculationRules.assignments.description', 'Manage rule assignments that determine which rules apply to specific employees, companies, or organizational units.')
          }
        </p>
      </div>

      {/* Table */}
      <div 
        ref={tableRef}
        style={{ 
          maxHeight: showRules || isEditMode ? 'none' : '600px', 
          overflowY: showRules || isEditMode ? 'visible' : 'auto'
        }}
      >
        {showRules ? (
          <Table<ExpenseRule>
            columns={ruleColumns}
            dataSource={rules}
            rowKey="id"
            loading={isLoading}
            onRow={(record) => ({
              onClick: () => handleRowClick(record),
              style: { cursor: 'pointer' }
            })}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} items`,
            }}
            scroll={{ x: 'max-content' }}
            data-testid="calculation-rules-rules-table"
          />
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
              <Table<any> // Changed type to any to accommodate hover zones
                columns={assignmentColumns}
                dataSource={enhancedDataSource}
                rowKey="id"
                loading={isLoading}
                pagination={isEditMode ? false : {
                  hideOnSinglePage: true,
                  showSizeChanger: false,
                  showQuickJumper: false,
                  position: ['bottomCenter'],
                  simple: true,
                  showTotal: () => `${displayedAssignments.length} of ${assignments.length} loaded`
                }}
                scroll={{ x: 'max-content' }}
                data-testid="calculation-rules-assignments-table"
                components={isEditMode ? {
                  body: {
                    row: ({ children, ...props }: { children: React.ReactNode; [key: string]: any }) => {
                      const record = enhancedDataSource.find(item => item.id === props['data-row-key']);
                      if (!record) return <tr {...props}>{children}</tr>;
                      
                      // Handle hover zone rows
                      if ('isHoverZone' in record && record.isHoverZone) {
                        return (
                          <HoverAddButton
                            afterOrder={record.afterOrder}
                            onAdd={handleInlineCreate}
                            isEditMode={isEditMode}
                          />
                        );
                      }
                      
                      // Handle regular assignment rows
                      const assignmentRecord = record as EnhancedExpenseRuleAssignment;
                      return (
                        <>
                          <SortableRow 
                            id={assignmentRecord.id} 
                            isEditMode={isEditMode}
                          >
                            {children}
                          </SortableRow>
                          {inlineCreationRow === assignmentRecord.assignmentOrder && (
                            <InlineCreationForm
                              rules={rules}
                              onSave={handleInlineSave}
                              onCancel={handleInlineCancel}
                              insertAfterOrder={assignmentRecord.assignmentOrder}
                            />
                          )}
                        </>
                      );
                    }
                  }
                } : undefined}
                onRow={(record) => ({
                  onClick: () => handleRowClick(record),
                  style: { cursor: isEditMode ? 'move' : 'pointer' },
                  'data-row-key': record.id
                })}
              />
            </SortableContext>
          </DndContext>
        )}
        
        {/* Infinite scroll loading indicator */}
        {!showRules && !isEditMode && hasMore && (
          <div style={{ textAlign: 'center', padding: '16px' }}>
            {loadingMore ? (
              <span>Loading more...</span>
            ) : (
              <Button onClick={loadMoreItems}>Load More</Button>
            )}
          </div>
        )}
      </div>

      {/* Create Rule Modal */}
      <Modal
        title={getTranslationFromI18nKeyAndLabel('expenseSettings.modals.createRule.title', 'Create Calculation Rule')}
        open={isCreateRuleModalVisible}
        onCancel={handleModalCancel}
        footer={null}
        width={800}
        destroyOnClose
        data-testid="calculation-rules-create-rule-modal"
      >
        <CalculationRuleForm
          accessToken={accessToken}
          onSave={handleCreateRuleSubmit}
          onCancel={handleModalCancel}
          isEditing={false}
        />
      </Modal>

      {/* Edit Rule Modal */}
      <Modal
        title={getTranslationFromI18nKeyAndLabel('expenseSettings.modals.editRule.title', 'Edit Calculation Rule')}
        open={isEditRuleModalVisible}
        onCancel={handleModalCancel}
        footer={null}
        width={800}
        destroyOnClose
        data-testid="calculation-rules-edit-rule-modal"
      >
        {editingRule && (
          <CalculationRuleForm
            accessToken={accessToken}
            onSave={handleEditRuleSubmit}
            onCancel={handleModalCancel}
            isEditing={true}
            initialData={editingRule}
          />
        )}
      </Modal>

      {/* Create Assignment Modal */}
      <Modal
        title={getTranslationFromI18nKeyAndLabel('expenseSettings.modals.createAssignment.title', 'Create Rule Assignment')}
        open={isCreateAssignmentModalVisible}
        onCancel={handleModalCancel}
        footer={null}
        width={900}
        destroyOnClose
        data-testid="calculation-rules-create-assignment-modal"
      >
        <AssignmentForm
          accessToken={accessToken}
          availableRules={rules}
          onSave={handleCreateAssignmentSubmit}
          onCancel={handleModalCancel}
          isEditing={false}
        />
      </Modal>

      {/* Edit Assignment Modal */}
      <Modal
        title={getTranslationFromI18nKeyAndLabel('expenseSettings.modals.editAssignment.title', 'Edit Rule Assignment')}
        open={isEditAssignmentModalVisible}
        onCancel={handleModalCancel}
        footer={null}
        width={900}
        destroyOnClose
        data-testid="calculation-rules-edit-assignment-modal"
      >
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
      </Modal>
    </div>
  );
};

export default CalculationRulesList; 