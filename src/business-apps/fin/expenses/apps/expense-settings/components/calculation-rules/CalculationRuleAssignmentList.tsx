import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { 
  Button,
  Badge,
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
  Card,
  CardContent,
  Spinner,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@newwork/nw-design-system';
import { 
  PiPlus, 
  PiPencil,
  PiTrash
} from 'react-icons/pi';
import {
  ListBulletsIcon,
  SortAscendingIcon,
  SortDescendingIcon,
  CaretLeftIcon,
  CaretRightIcon
} from '@phosphor-icons/react';
import { DataContainer } from '@/components/layout/dataContainer/DataContainer';
import { DataFilterGroup } from '@/components/data-filter/DataFilter';
import { DataControllerProps } from '@/components/dataController/DataController';
import { AssignmentForm } from '../../forms/assignment-form';
import { expenseSettingsClient } from '../../utils/ExpenseSettingsClient';
import { 
  EnhancedExpenseRuleAssignment, 
  ExpenseRule,
  SaveExpenseRuleAssignmentInput
} from '../../types/ExpenseRuleTypes';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { ICONS } from '@/business-apps/fin/expenses/utils/icons';
import { env } from '@/common/env/EnvUtils';
import dayjs from 'dayjs';

// Import filter components
import RuleFilter from './filters/RuleFilter';
import TargetTypeFilter from './filters/TargetTypeFilter';
import CascadingFilter from './filters/CascadingFilter';
import EffectivePeriodFilter from './filters/EffectivePeriodFilter';

export interface CalculationRuleAssignmentListProps extends BusinessAppContextProps {
  assignments: EnhancedExpenseRuleAssignment[];
  rules: ExpenseRule[];
  isLoading: boolean;
  onCreate: (data: SaveExpenseRuleAssignmentInput) => Promise<any>;
  onUpdate: (id: string, data: SaveExpenseRuleAssignmentInput) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
  onSearch: (params: { search?: string }) => Promise<void>;
  onRefresh: () => void;
}

const PREFIX = 'calculation-rule-assignments';

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
  // State management
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC' | ''>('');
  
  // Filter states
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>([]);
  const [targetTypeFilter, setTargetTypeFilter] = useState({ employee: false, company: false, orgUnit: false, general: false });
  const [cascadingFilter, setCascadingFilter] = useState({ true: false, false: false });
  const [effectivePeriodFrom, setEffectivePeriodFrom] = useState<string | null>(null);
  const [effectivePeriodTo, setEffectivePeriodTo] = useState<string | null>(null);
  
  // Modal states
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<EnhancedExpenseRuleAssignment | null>(null);
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<EnhancedExpenseRuleAssignment | null>(null);

  // Filter and sort assignments
  const filteredAndSortedAssignments = useMemo(() => {
    let filtered = [...assignments];

    // Apply rule filter
    if (selectedRuleIds.length > 0) {
      filtered = filtered.filter(a => selectedRuleIds.includes(a.expenseRuleId));
    }

    // Apply target type filter
    const hasTargetFilter = Object.values(targetTypeFilter).some(v => v);
    if (hasTargetFilter) {
      filtered = filtered.filter(a => {
        if (targetTypeFilter.employee && a.employeeId) return true;
        if (targetTypeFilter.company && a.companyId && !a.employeeId && !a.organizationalUnitId) return true;
        if (targetTypeFilter.orgUnit && a.organizationalUnitId) return true;
        if (targetTypeFilter.general && !a.employeeId && !a.companyId && !a.organizationalUnitId) return true;
        return false;
      });
    }

    // Apply cascading filter
    if (cascadingFilter.true && !cascadingFilter.false) {
      filtered = filtered.filter(a => a.cascading === true);
    } else if (!cascadingFilter.true && cascadingFilter.false) {
      filtered = filtered.filter(a => a.cascading === false);
    }

    // Apply effective period filter
    if (effectivePeriodFrom || effectivePeriodTo) {
      filtered = filtered.filter(a => {
        const fromDate = effectivePeriodFrom ? new Date(effectivePeriodFrom) : null;
        const toDate = effectivePeriodTo ? new Date(effectivePeriodTo) : null;
        const activeFrom = new Date(a.activeFrom);
        const activeTo = new Date(a.activeTo);

        if (fromDate && toDate) {
          return activeFrom >= fromDate && activeTo <= toDate;
        } else if (fromDate) {
          return activeFrom >= fromDate;
        } else if (toDate) {
          return activeTo <= toDate;
        }
        return true;
      });
    }

    // Apply sorting
    if (sortField && sortOrder) {
      filtered.sort((a, b) => {
        let aVal: any, bVal: any;

        switch (sortField) {
          case 'assignmentOrder':
            aVal = a.assignmentOrder;
            bVal = b.assignmentOrder;
            break;
          case 'rule':
            aVal = a.ruleCode || '';
            bVal = b.ruleCode || '';
            break;
          case 'standard':
            aVal = a.expenseRule?.standard ? 1 : 0;
            bVal = b.expenseRule?.standard ? 1 : 0;
            break;
          case 'targets':
            // Sort by target type priority: employee > company > orgUnit > general
            const getTargetPriority = (assignment: EnhancedExpenseRuleAssignment) => {
              if (assignment.employeeName) return `1-${assignment.employeeName}`;
              if (assignment.companyName && !assignment.orgUnitName) return `2-${assignment.companyName}`;
              if (assignment.orgUnitName) return `3-${assignment.orgUnitName}`;
              return '4-general';
            };
            aVal = getTargetPriority(a);
            bVal = getTargetPriority(b);
            break;
          case 'activeFrom':
            aVal = a.activeFrom;
            bVal = b.activeFrom;
            break;
          case 'activeTo':
            aVal = a.activeTo;
            bVal = b.activeTo;
            break;
          case 'cascading':
            aVal = a.cascading ? 1 : 0;
            bVal = b.cascading ? 1 : 0;
            break;
          default:
            return 0;
        }

        if (typeof aVal === 'string') {
          return sortOrder === 'ASC' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        } else {
          return sortOrder === 'ASC' ? (aVal > bVal ? 1 : -1) : (bVal > aVal ? 1 : -1);
        }
      });
    }

    return filtered;
  }, [assignments, selectedRuleIds, targetTypeFilter, cascadingFilter, effectivePeriodFrom, effectivePeriodTo, sortField, sortOrder]);

  // Pagination
  const paginatedAssignments = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedAssignments.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedAssignments, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndSortedAssignments.length / pageSize);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search) {
        onSearch({ search });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search, onSearch]);

  // Flow icon URL
  const flowIconUrl = useMemo(() => {
    const base = env('NEXT_PUBLIC_BASE_URL') || '';
    return `${base}/_next/static/media/lowcoder-icons/newwork/flow_min_20x20.svg`;
  }, []);

  // Handlers
  const handleSort = useCallback((field: string) => {
    let next: 'ASC' | 'DESC' | '' = 'ASC';
    if (sortField === field) {
      if (sortOrder === 'ASC') next = 'DESC';
      else if (sortOrder === 'DESC') next = '';
      else next = 'ASC';
    }
    setSortField(field);
    setSortOrder(next);
  }, [sortField, sortOrder]);

  const handleCreateSubmit = async (formData: SaveExpenseRuleAssignmentInput) => {
    try {
      await onCreate(formData);
      setIsCreateModalVisible(false);
      onRefresh();
    } catch (error) {
      console.error('Error creating assignment:', error);
    }
  };

  const handleEditSubmit = async (formData: SaveExpenseRuleAssignmentInput) => {
    try {
      if (editingAssignment?.id) {
        await onUpdate(editingAssignment.id, formData);
        setIsEditModalVisible(false);
        setEditingAssignment(null);
        onRefresh();
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!assignmentToDelete) return;
    
    try {
      await expenseSettingsClient.setAccessToken(accessToken);
      await expenseSettingsClient.deleteExpenseRuleAssignment(
        assignmentToDelete.id, 
        assignmentToDelete.version
      );
      
      setIsDeleteConfirmVisible(false);
      setAssignmentToDelete(null);
      onRefresh();
    } catch (error) {
      console.error('Error deleting assignment:', error);
    }
  };

  const resetFilters = () => {
    setSelectedRuleIds([]);
    setTargetTypeFilter({ employee: false, company: false, orgUnit: false, general: false });
    setCascadingFilter({ true: false, false: false });
    setEffectivePeriodFrom(null);
    setEffectivePeriodTo(null);
  };

  // Render assignment targets
  const renderAssignmentTargets = (record: EnhancedExpenseRuleAssignment) => {
    if (record.employeeName) {
      return <Badge variant="secondary">Employee: {record.employeeName}</Badge>;
    }
    if (record.companyName && !record.orgUnitName) {
      return <Badge variant="default">Company: {record.companyName}</Badge>;
    }
    if (record.orgUnitName) {
      return <Badge variant="outline">Org Unit: {record.orgUnitName}</Badge>;
    }
    return <Badge variant="secondary">General</Badge>;
  };

  // Columns definition
  const columns = useMemo(
    () => [
      { key: 'actions', title: '', width: '60px' },
      { key: 'assignmentOrder', title: '#' },
      { key: 'rule', title: getTranslationFromI18nKeyAndLabel('expenseSettings.table.rule', 'Rule') },
      { key: 'standard', title: getTranslationFromI18nKeyAndLabel('expenseSettings.table.standard', 'Standard') },
      { key: 'targets', title: getTranslationFromI18nKeyAndLabel('expenseSettings.table.targets', 'Assignment Targets') },
      { key: 'effectivePeriod', title: getTranslationFromI18nKeyAndLabel('expenseSettings.table.effectivePeriod', 'Effective Period') },
      { key: 'cascading', title: getTranslationFromI18nKeyAndLabel('expenseSettings.table.cascading', 'Cascading') }
    ],
    []
  );

  // Filter groups
  const filterGroups: DataFilterGroup[] = useMemo(() => {
    return [
      {
        id: 'rule',
        title: getTranslationFromI18nKeyAndLabel('expenseSettings.filters.rule', 'Filter by Rule'),
        customComponent: (
          <RuleFilter
            rules={rules}
            selectedRuleIds={selectedRuleIds}
            onChange={setSelectedRuleIds}
            data-testid={`${PREFIX}-rule-filter`}
          />
        )
      },
      {
        id: 'targetType',
        title: getTranslationFromI18nKeyAndLabel('expenseSettings.filters.targetType', 'Filter by Target Type'),
        customComponent: (
          <TargetTypeFilter
            value={targetTypeFilter}
            onChange={setTargetTypeFilter}
            data-testid={`${PREFIX}-target-type-filter`}
          />
        )
      },
      {
        id: 'cascading',
        title: getTranslationFromI18nKeyAndLabel('expenseSettings.filters.cascading', 'Filter by Cascading'),
        customComponent: (
          <CascadingFilter
            value={cascadingFilter}
            onChange={setCascadingFilter}
            data-testid={`${PREFIX}-cascading-filter`}
          />
        )
      },
      {
        id: 'effectivePeriod',
        title: getTranslationFromI18nKeyAndLabel('expenseSettings.filters.effectivePeriod', 'Filter by Effective Period'),
        customComponent: (
          <EffectivePeriodFilter
            from={effectivePeriodFrom}
            to={effectivePeriodTo}
            onChange={(from, to) => {
              setEffectivePeriodFrom(from);
              setEffectivePeriodTo(to);
            }}
            data-testid={`${PREFIX}-effective-period-filter`}
          />
        )
      }
    ];
  }, [rules, selectedRuleIds, targetTypeFilter, cascadingFilter, effectivePeriodFrom, effectivePeriodTo]);

  // Data controller props
  const dataControllerProps: DataControllerProps = {
    listTitle: getTranslationFromI18nKeyAndLabel('expenseSettings.assignments.title', 'Rule Assignments'),
    listAmount: filteredAndSortedAssignments.length,
    search,
    setSearch,
    debounceDelay: 500,
    filter: [],
    setFilter: () => {},
    filterLabelMap: {},
    actions: (
      <Button onClick={() => setIsCreateModalVisible(true)} data-testid={`${PREFIX}-create-button`}>
        <PiPlus className="gba:mr-2 gba:h-4 gba:w-4" />
        {getTranslationFromI18nKeyAndLabel('expenseSettings.actions.createAssignment', 'Create Assignment')}
      </Button>
    )
  } as any;

  return (
    <div data-testid={`${PREFIX}-app`} className="gba:p-6">
      <DataContainer
        dataControllerProps={dataControllerProps}
        dataFilterProps={{
          filterGroups,
          children: (
            <div className="gba:w-[100%] gba:mt-auto gba:pb-3" data-testid={`${PREFIX}-reset-filters-container`}>
              <button
                type="button"
                className="gba:flex gba:items-center gba:gap-2 gba:w-[100%] gba:px-3 gba:py-2 gba:border gba:rounded gba:text-sm"
                onClick={resetFilters}
                data-testid={`${PREFIX}-reset-filters-button`}
              >
                <img src={ICONS.DELETE_CIRCLE_ICON} alt="reset" className="gba:w-4 gba:h-4" />
                {getTranslationFromI18nKeyAndLabel('common.resetFilters', 'Reset Filters')}
              </button>
            </div>
          )
        }}
        dataBody={
          <div className="gba:pr-6 gba:overflow-hidden" data-testid={`${PREFIX}-body`}>
            <Card>
              <CardContent className="gba:p-0">
                {isLoading && (
                  <div className="gba:flex gba:justify-center gba:p-4">
                    <Spinner data-testid={`${PREFIX}-loading`} />
                  </div>
                )}
                {!isLoading && filteredAndSortedAssignments.length === 0 && (
                  <div className="gba:p-8 gba:text-center">
                    <div className="gba:text-gray-500" data-testid={`${PREFIX}-empty`}>
                      {getTranslationFromI18nKeyAndLabel('common.noDataFound', 'No data found')}
                    </div>
                  </div>
                )}
                {!isLoading && filteredAndSortedAssignments.length > 0 && (
                  <>
                    <div className="gba:overflow-x-auto gba:mt-4 gba:max-w-[100%]">
                      <Table data-testid={`${PREFIX}-table`} className="gba:min-w-[1100px] gba:w-[100%]">
                        <TableHeader>
                          <TableRow className="gba:border-b gba:bg-gray-50">
                            {columns.map(col => (
                              <TableHead
                                key={col.key}
                                className={`gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 ${col.key === 'actions' ? 'gba:w-[60px]' : ''}`}
                                data-testid={`${PREFIX}-header-${col.key}`}
                              >
                                <div className="gba:flex gba:items-center gba:gap-2">
                                  <span className="gba:whitespace-nowrap">{col.title}</span>
                                  {col.key !== 'actions' && col.key !== 'effectivePeriod' && (
                                    <button
                                      type="button"
                                      className={`gba:flex gba:items-center gba:justify-center gba:w-5 gba:h-5 ${sortField === col.key ? 'gba:text-black' : 'gba:text-gray-400'} gba:cursor-pointer hover:gba:text-black`}
                                      onClick={() => handleSort(col.key)}
                                      data-testid={`${PREFIX}-sort-${col.key}`}
                                      title="Sort"
                                    >
                                      {sortField === col.key ? (
                                        sortOrder === 'ASC' ? (
                                          <SortAscendingIcon size={16} />
                                        ) : sortOrder === 'DESC' ? (
                                          <SortDescendingIcon size={16} />
                                        ) : (
                                          <ListBulletsIcon size={16} />
                                        )
                                      ) : (
                                        <ListBulletsIcon size={16} />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedAssignments.map((assignment, index) => (
                            <TableRow
                              key={assignment.id}
                              data-testid={`${PREFIX}-row-${index}`}
                              className="gba:border-b hover:gba:bg-gray-50"
                            >
                              <TableCell className="gba:py-3 gba:px-3" data-testid={`${PREFIX}-cell-actions-${index}`}>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="gba:w-8 gba:h-8 gba:rounded"
                                      data-testid={`${PREFIX}-actions-button-${index}`}
                                    >
                                      <img src={flowIconUrl} alt="Actions" className="gba:w-5 gba:h-5" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent align="start" className="gba:p-0 gba:w-auto">
                                    <div className="gba:flex gba:flex-col">
                                      <Button
                                        variant="ghost"
                                        className="gba:px-4 gba:py-2 gba:text-left gba:justify-start gba:text-[14px]"
                                        data-testid={`${PREFIX}-action-edit-${index}`}
                                        onClick={() => {
                                          setEditingAssignment(assignment);
                                          setIsEditModalVisible(true);
                                        }}
                                      >
                                        <PiPencil className="gba:mr-2 gba:h-4 gba:w-4" />
                                        {getTranslationFromI18nKeyAndLabel('common.edit', 'Edit')}
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        className="gba:px-4 gba:py-2 gba:text-left gba:justify-start gba:text-[14px] gba:text-red-600 hover:gba:text-red-700"
                                        data-testid={`${PREFIX}-action-delete-${index}`}
                                        onClick={() => {
                                          setAssignmentToDelete(assignment);
                                          setIsDeleteConfirmVisible(true);
                                        }}
                                      >
                                        <PiTrash className="gba:mr-2 gba:h-4 gba:w-4" />
                                        {getTranslationFromI18nKeyAndLabel('common.delete', 'Delete')}
                                      </Button>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </TableCell>
                              <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-order-${index}`}>
                                {assignment.assignmentOrder}.
                              </TableCell>
                              <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-rule-${index}`}>
                                <div>
                                  <div className="gba:font-medium">{assignment.ruleCode}</div>
                                  {assignment.ruleName && (
                                    <div className="gba:text-xs gba:text-gray-500">{assignment.ruleName}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-standard-${index}`}>
                                <Badge variant={assignment.expenseRule?.standard ? 'default' : 'secondary'}>
                                  {assignment.expenseRule?.standard ? 'Yes' : 'No'}
                                </Badge>
                              </TableCell>
                              <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-targets-${index}`}>
                                {renderAssignmentTargets(assignment)}
                              </TableCell>
                              <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-period-${index}`}>
                                {(() => {
                                  const now = new Date();
                                  const activeFrom = new Date(assignment.activeFrom);
                                  const activeTo = new Date(assignment.activeTo);
                                  const isActive = activeFrom <= now && activeTo >= now;
                                  const timeFrame = `${dayjs(assignment.activeFrom).format('DD/MM/YYYY')} - ${assignment.activeTo ? dayjs(assignment.activeTo).format('DD/MM/YYYY') : 'Ongoing'}`;
                                  
                                  return (
                                    <div 
                                      className={`gba:px-2 gba:py-1 gba:rounded gba:text-xs gba:font-medium gba:text-center ${
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
                              <TableCell className="gba:py-3 gba:px-6" data-testid={`${PREFIX}-cell-cascading-${index}`}>
                                <Badge variant={assignment.cascading ? 'default' : 'secondary'}>
                                  {assignment.cascading ? 'Yes' : 'No'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
                {/* Pagination */}
                {filteredAndSortedAssignments.length > 0 && (
                  <div
                    className="gba:flex gba:justify-between gba:items-center gba:mt-4 gba:px-4"
                    data-testid={`${PREFIX}-pagination`}
                  >
                    <div className="gba:text-sm gba:text-gray-600" data-testid={`${PREFIX}-pagination-info`}>
                      {(() => {
                        const start = (currentPage - 1) * pageSize + 1;
                        const end = Math.min(currentPage * pageSize, filteredAndSortedAssignments.length);
                        return getTranslationFromI18nKeyAndLabel(
                          'lowcoder:absence_hub.pagination',
                          `${start}-${end} of ${filteredAndSortedAssignments.length}`,
                          {
                            range0: start,
                            range1: end,
                            total: filteredAndSortedAssignments.length,
                            interpolation: {
                              escapeValue: false
                            }
                          }
                        );
                      })()}
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-4 gba:w-[100%]">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationLink
                              aria-label="Go to previous page"
                              size="default"
                              className={`gba:gap-1 gba:pl-2.5 ${currentPage <= 1 ? 'gba:pointer-events-none gba:opacity-50' : 'gba:cursor-pointer'}`}
                              onClick={() => setCurrentPage(currentPage - 1)}
                              data-testid={`${PREFIX}-pagination-prev`}
                            >
                              <CaretLeftIcon className="gba:h-4 gba:w-4" />
                              <span>
                                {getTranslationFromI18nKeyAndLabel(
                                  'lowcoder:acknowledge_sick_leave.previous',
                                  'Previous'
                                )}
                              </span>
                            </PaginationLink>
                          </PaginationItem>
                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(
                              page =>
                                page === 1 ||
                                page === totalPages ||
                                Math.abs(page - currentPage) <= 1
                            )
                            .map((page, index, array) => (
                              <React.Fragment key={page}>
                                {index > 0 && array[index - 1] !== page - 1 && (
                                  <PaginationItem>
                                    <span className="gba:px-2">...</span>
                                  </PaginationItem>
                                )}
                                <PaginationItem>
                                  <PaginationLink
                                    onClick={() => setCurrentPage(page)}
                                    className={
                                      page === currentPage ? 'gba:bg-blue-500 gba:text-white' : 'gba:cursor-pointer'
                                    }
                                    data-testid={`${PREFIX}-pagination-page-${page}`}
                                  >
                                    {page}
                                  </PaginationLink>
                                </PaginationItem>
                              </React.Fragment>
                            ))}
                          <PaginationItem>
                            <PaginationLink
                              aria-label="Go to next page"
                              size="default"
                              className={`gba:gap-1 gba:pr-2.5 ${currentPage >= totalPages ? 'gba:pointer-events-none gba:opacity-50' : 'gba:cursor-pointer'}`}
                              onClick={() => setCurrentPage(currentPage + 1)}
                              data-testid={`${PREFIX}-pagination-next`}
                            >
                              <span>
                                {getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.submit_button', 'Next')}
                              </span>
                              <CaretRightIcon className="gba:h-4 gba:w-4" />
                            </PaginationLink>
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                      <div className="gba:flex gba:items-center gba:gap-2" data-testid={`${PREFIX}-page-size-selector`}>
                        <span className="gba:text-sm gba:text-gray-600">
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:expense_config_calculation_rule_list.expense_calculation_rule_filter.items_per_page',
                            'Items per page'
                          )}
                        </span>
                        <Select
                          value={String(pageSize)}
                          onValueChange={val => {
                            setPageSize(Number(val));
                            setCurrentPage(1);
                          }}
                        >
                          <SelectTrigger className="gba:w-[80px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[10, 20, 50].map(size => (
                              <SelectItem key={size} value={String(size)} data-testid={`${PREFIX}-page-size-${size}`}>
                                {size}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        }
      />

      {/* Create Assignment Dialog */}
      <Dialog open={isCreateModalVisible} onOpenChange={setIsCreateModalVisible}>
        <DialogContent className="gba:max-w-4xl gba:max-h-[90vh] gba:overflow-y-auto" data-testid={`${PREFIX}-create-dialog`}>
          <DialogHeader>
            <DialogTitle>{getTranslationFromI18nKeyAndLabel('expenseSettings.modals.createAssignment.title', 'Create Rule Assignment')}</DialogTitle>
          </DialogHeader>
          <AssignmentForm
            accessToken={accessToken}
            availableRules={rules}
            onSave={handleCreateSubmit}
            onCancel={() => setIsCreateModalVisible(false)}
            isEditing={false}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Assignment Dialog */}
      <Dialog open={isEditModalVisible} onOpenChange={setIsEditModalVisible}>
        <DialogContent className="gba:max-w-4xl gba:max-h-[90vh] gba:overflow-y-auto" data-testid={`${PREFIX}-edit-dialog`}>
          <DialogHeader>
            <DialogTitle>{getTranslationFromI18nKeyAndLabel('expenseSettings.modals.editAssignment.title', 'Edit Rule Assignment')}</DialogTitle>
          </DialogHeader>
          {editingAssignment && (
            <AssignmentForm
              accessToken={accessToken}
              availableRules={rules}
              initialData={editingAssignment}
              onSave={handleEditSubmit}
              onCancel={() => {
                setIsEditModalVisible(false);
                setEditingAssignment(null);
              }}
              isEditing={true}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Assignment Confirmation Dialog */}
      <Dialog open={isDeleteConfirmVisible} onOpenChange={setIsDeleteConfirmVisible}>
        <DialogContent className="gba:max-w-md" data-testid={`${PREFIX}-delete-dialog`}>
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
                onClick={() => {
                  setIsDeleteConfirmVisible(false);
                  setAssignmentToDelete(null);
                }}
                data-testid={`${PREFIX}-delete-cancel-button`}
              >
                {getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                data-testid={`${PREFIX}-delete-confirm-button`}
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
