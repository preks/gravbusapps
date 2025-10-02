"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, Tabs, TabsList, TabsTrigger, TabsContent, Button } from '@newwork/nw-design-system';
import { Plus, User, Users } from 'lucide-react';
import { debounce, DEFAULT_LOAD_DEBOUNCE_DELAY } from '@/common/data/investment';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

import { DataContainer } from '@/components/layout/dataContainer';
import { useTaskListData, useTaskFilters, useTaskStatistics } from './hooks';
import { TaskTable, TaskDetails, TaskStatistics } from './components';
import { AppAction } from '@/components/app-action/AppAction';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Task } from './types/TaskTypes';
import { ColumnConfig } from '@/components/dataController';

export interface TaskManagementProps extends BusinessAppContextProps {
  sourceApp?: string;
}

export const TaskManagement: React.FC<TaskManagementProps> = (props: TaskManagementProps) => {
  const { accessToken, userInfo } = props;

  const [activeTab, setActiveTab] = useState('my');

  const {
    search,
    setSearch,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    resetFilters,
    getFilters,
    createdAfter: filterCreatedAfter,
    createdBefore: filterCreatedBefore,
    handleDateRangeChange: filterHandleDateRangeChange
  } = useTaskFilters({ ...props, sourceApp: 'IRM' } as any);

  const [initialParams] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      search: urlParams.get('search') || '',
      page: parseInt(urlParams.get('page') || '1', 10),
      pageSize: parseInt(urlParams.get('pageSize') || '20', 10),
      sortField: urlParams.get('sortField') || '',
      sortOrder: urlParams.get('sortOrder') || 'DESC',
      tab: urlParams.get('tab') || 'my'
    };
  });

  const [currentPage, setCurrentPage] = useState(initialParams.page);
  const [pageSize, setPageSize] = useState(initialParams.pageSize);
  const [sortField, setSortField] = useState(initialParams.sortField);
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>(initialParams.sortOrder as 'ASC' | 'DESC');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const initialLoadDone = useRef(false);

  // Column visibility configuration
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(() => [
    { id: "actions", label: getTranslationFromI18nKeyAndLabel('investment.tasks.columns.actions', 'Actions'), visible: true, disabled: true },
    { id: "task", label: getTranslationFromI18nKeyAndLabel('investment.tasks.columns.task', 'Task'), visible: true },
    { id: "assignedTo", label: getTranslationFromI18nKeyAndLabel('investment.tasks.columns.assignedTo', 'Assigned To'), visible: true },
    { id: "type", label: getTranslationFromI18nKeyAndLabel('investment.tasks.columns.type', 'Type'), visible: true },
    { id: "priority", label: getTranslationFromI18nKeyAndLabel('investment.tasks.columns.priority', 'Priority'), visible: true },
    { id: "status", label: getTranslationFromI18nKeyAndLabel('investment.tasks.columns.status', 'Status'), visible: true },
    { id: "reference", label: getTranslationFromI18nKeyAndLabel('investment.tasks.columns.reference', 'Reference'), visible: true },
    { id: "schedule", label: getTranslationFromI18nKeyAndLabel('investment.tasks.columns.schedule', 'Schedule / Due Date'), visible: true },
    { id: "createdBy", label: getTranslationFromI18nKeyAndLabel('investment.tasks.columns.createdBy', 'Created By'), visible: true },
  ]);

  // Get visible columns for passing to table
  const visibleColumns = columnConfig
    .filter((col) => col.visible)
    .map((col) => col.id);

  // Handle column visibility change
  const handleColumnVisibilityChange = useCallback(
    (columnId: string, visible: boolean) => {
      setColumnConfig((prev) =>
        prev.map((col) => (col.id === columnId ? { ...col, visible } : col))
      );
    },
    []
  );

  useEffect(() => {
    if (initialParams.tab && activeTab === 'my') {
      setActiveTab(initialParams.tab);
    }
    if (initialParams.search && !search) {
      setSearch(initialParams.search);
    }
  }, []);

  const updateURLParams = useCallback((params: {
    search?: string;
    page?: number;
    pageSize?: number;
    sortField?: string;
    sortOrder?: 'ASC' | 'DESC';
    tab?: string;
  }) => {
    const newSearchParams = new URLSearchParams(window.location.search);
    if (params.search !== undefined) {
      if (params.search) newSearchParams.set('search', params.search);
      else newSearchParams.delete('search');
    }
    if (params.page !== undefined) {
      if (params.page > 1) newSearchParams.set('page', params.page.toString());
      else newSearchParams.delete('page');
    }
    if (params.pageSize !== undefined) {
      if (params.pageSize !== 20) newSearchParams.set('pageSize', params.pageSize.toString());
      else newSearchParams.delete('pageSize');
    }
    if (params.sortField !== undefined) {
      if (params.sortField !== 'createdAt' && params.sortField !== '') newSearchParams.set('sortField', params.sortField);
      else newSearchParams.delete('sortField');
    }
    if (params.sortOrder !== undefined) {
      if (params.sortOrder !== 'DESC') newSearchParams.set('sortOrder', params.sortOrder);
      else newSearchParams.delete('sortOrder');
    }
    if (params.tab !== undefined) {
      if (params.tab !== 'my') newSearchParams.set('tab', params.tab);
      else newSearchParams.delete('tab');
    }
    const newURL = `${window.location.pathname}?${newSearchParams.toString()}`;
    window.history.replaceState({}, '', newURL);
  }, []);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1);
    updateURLParams({ tab, page: 1 });
  }, [updateURLParams]);

  const getTabFilters = useCallback(() => {
    const baseFilters = getFilters();
    if (activeTab === 'my') {
      const currentUserEmployeeId = userInfo?.employeeDetails?.employeeId;
      
      if (currentUserEmployeeId) {
        return { ...baseFilters, assignedEmployeeIds: [currentUserEmployeeId] };
      } else if ((userInfo as any)?.employeeId) {
        // Fallback to direct employeeId if employeeDetails.employeeId is not available
        return { ...baseFilters, assignedEmployeeIds: [(userInfo as any).employeeId] };
      } else if (userInfo?.id) {
        // Last fallback to user ID
        return { ...baseFilters, assignedEmployeeIds: [userInfo.id] };
      }
    }
    return baseFilters;
  }, [getFilters, activeTab, userInfo]);

  

  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    selected ? addFilter(filterId) : removeFilter(filterId);
  }, [addFilter, removeFilter]);

  const handleSetFilter = useCallback((filters: string[]) => {
    if (filters.length === 0) {
      resetFilters();
    } else {
      const removedFilters = selectedFilters.filter(f => !filters.includes(f));
      removedFilters.forEach(filterId => removeFilter(filterId));
    }
  }, [resetFilters, selectedFilters, removeFilter]);

  const stableFilters = useMemo(() => getTabFilters(), [getTabFilters, selectedFilters.length, filterCreatedAfter, filterCreatedBefore, activeTab, userInfo]);

  const { 
    tasks, 
    total, 
    loading, 
    error, 
    hasMore, 
    loadMore, 
    loadPage,
    retry 
  } = useTaskListData({
    ...stableFilters,
    sortField,
    sortOrder,
    accessToken,
    sourceApp: 'IRM'
  });

  const {
    statistics, 
    loading: statisticsLoading, 
    error: statisticsError, 
    refetch: refetchStatistics
  } = useTaskStatistics({
    ...stableFilters,
    accessToken
  });

  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        if (event.detail?.resolution === 'success' || event.detail?.response?.detail?.resolution === 'success') {
          // Refresh current page without altering state that would retrigger this effect
          loadPage(currentPage, pageSize);
          refetchStatistics();
        }
      } catch (err) {
        // Silently handle errors in process completion
      }
    };

    const eventNames = [
      'com.newwork.process.taskCompletion',
      'com.newwork.process.completion',
      'com.newwork.process.continue',
      'com.newwork.process.processCompletion',
      'processCompletion',
      'taskCompletion',
      'taskCompleted',
      'processCompleted',
      'task-completion',
      'process-completion'
    ];

    eventNames.forEach(eventName => {
      window.addEventListener(eventName, handleProcessCompletion as EventListener);
    });

    return () => {
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessCompletion as EventListener);
      });
    };
  }, []);

  useEffect(() => {
    if (!initialLoadDone.current && accessToken) {
      initialLoadDone.current = true;
      loadPage(currentPage, pageSize);
    }
  }, [accessToken]);

  const debouncedLoadData = useCallback(
    debounce(() => {
      if (initialLoadDone.current) {
        setCurrentPage(1);
        updateURLParams({ search, page: 1 });
        loadPage(1, pageSize);
      }
    }, DEFAULT_LOAD_DEBOUNCE_DELAY),
    [search, pageSize, updateURLParams, loadPage]
  );

  useEffect(() => {
    if (initialLoadDone.current) {
      debouncedLoadData();
    }
  }, [search, debouncedLoadData]);

  useEffect(() => {
    if (initialLoadDone.current) {
      setCurrentPage(1);
      loadPage(1, pageSize);
    }
  }, [selectedFilters.length, filterCreatedAfter, filterCreatedBefore]);

  useEffect(() => {
    if (initialLoadDone.current) {
      setCurrentPage(1);
      loadPage(1, pageSize);
      refetchStatistics();
    }
  }, [activeTab]);

  const handleSelectTask = useCallback((task: Task) => {
    setSelectedTask(task);
  }, []);

  const lastPaginationTime = useRef(0);
  const PAGINATION_THROTTLE_MS = 500;

  const handlePaginationChange = useCallback((page: number, newPageSize?: number) => {
    const now = Date.now();
    if (now - lastPaginationTime.current < PAGINATION_THROTTLE_MS) {
      return;
    }
    lastPaginationTime.current = now;
    const targetPageSize = newPageSize || pageSize;
    setCurrentPage(page);
    setPageSize(targetPageSize);
    updateURLParams({ page, pageSize: targetPageSize });
    loadPage(page, targetPageSize);
  }, [pageSize, updateURLParams, loadPage]);

  const handleSortingChange = useCallback((field: string, order: 'ASC' | 'DESC' | '') => {
    const now = Date.now();
    if (now - lastPaginationTime.current < PAGINATION_THROTTLE_MS) {
      return;
    }
    lastPaginationTime.current = now;
    if (order === '') {
      setSortField('');
      setSortOrder('DESC');
      setCurrentPage(1);
      updateURLParams({ sortField: '', sortOrder: 'DESC', page: 1 });
    } else {
      setSortField(field);
      setSortOrder(order);
      setCurrentPage(1);
      updateURLParams({ sortField: field, sortOrder: order, page: 1 });
    }
    loadPage(1, pageSize);
  }, [pageSize, updateURLParams, loadPage]);

  return (
    <div data-testid="task-management-content">
      {/* Header */}
      <div className="gba:mb-6" data-testid="task-management-header">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-4" data-testid="task-management-title-section">
          <div>
            <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900" data-testid="task-management-title">{getTranslationFromI18nKeyAndLabel('investment.tasks.title', 'Tasks')}</h1>
            <p className="gba:text-gray-600" data-testid="task-management-subtitle">{getTranslationFromI18nKeyAndLabel('investment.tasks.subtitle', 'Manage and track investment tasks')}</p>
          </div>
        </div>

        {/* Statistics Cards (server-based, separate fetch) */}
        <TaskStatistics statistics={statistics} isLoading={statisticsLoading} error={statisticsError} onRetry={refetchStatistics} />
      </div>

      <div className="gba:task-management-content" data-testid="task-management-tabs">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="gba:w-full">
          <TabsList className="gba:mb-6">
            <TabsTrigger value="my" data-testid="my-tasks-tab">
              <User size={16} />
              {getTranslationFromI18nKeyAndLabel('investment.tasks.myTasks', 'My Tasks')}
            </TabsTrigger>
            <TabsTrigger value="team" data-testid="team-tasks-tab">
              <Users size={16} />
              {getTranslationFromI18nKeyAndLabel('investment.tasks.teamTasks', 'Team Tasks')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my" data-testid="my-tasks-content">
            <DataContainer
              dataControllerProps={{
                search,
                setSearch,
                debounceDelay: DEFAULT_LOAD_DEBOUNCE_DELAY,
                filter: selectedFilters,
                setFilter: handleSetFilter,
                filterLabelMap,
                dateRange: { createdAfter: filterCreatedAfter, createdBefore: filterCreatedBefore, onClear: () => filterHandleDateRangeChange(undefined, undefined) },
                listTitle: (
                  <div className="gba:flex gba:items-center gba:gap-4">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <span>{getTranslationFromI18nKeyAndLabel('investment.tasks.myTasks', 'My Tasks')}</span>
                      <span className="gba:text-gray-500">({total})</span>
                    </div>
                  </div>
                ),
                columnVisibility: {
                  columns: columnConfig,
                  onColumnVisibilityChange: handleColumnVisibilityChange,
                  'data-testid': 'my-tasks-column-visibility'
                },
                actions: (
                  <AppAction
                    contextsArray={[FlowContextName.investmentTaskCreate]}
                    accessToken={accessToken}
                    data-testid="add-task-action"
                    emptyStateBehavior="hide"
                  >
                    <Button
                      size="sm"
                      variant="default"
                      data-testid="add-task-trigger"
                      type="button"
                      style={{ gap: 'var(--nw-spacing-xs)' }}
                    >
                      <Plus size={16} />
                      {getTranslationFromI18nKeyAndLabel('crm:task.addTask', 'Add Task')}
                    </Button>
                  </AppAction>
                ),
              }}
              dataFilterProps={{ filterGroups, onFilterChange: handleFilterChange }}
              dataBody={
                <div data-testid="my-task-table-container">
                  <TaskTable
                    {...props}
                    tasks={tasks}
                    loading={loading}
                    error={error}
                    hasMore={hasMore}
                    loadMore={loadMore}
                    loadPage={loadPage}
                    retry={retry}
                    total={total}
                    pageSize={pageSize}
                    currentPage={currentPage}
                    sortField={sortField}
                    sortOrder={sortOrder}
                    onSelectTask={handleSelectTask}
                    onPaginationChange={handlePaginationChange}
                    onSortingChange={handleSortingChange}
                    selectedTaskId={selectedTask?.id}
                    hideAssignedTo={true}
                    visibleColumns={visibleColumns}
                    sourceApp="IRM"
                  />
                </div>
              }
            />
          </TabsContent>

          <TabsContent value="team" data-testid="team-tasks-content">
            <DataContainer
              dataControllerProps={{
                search,
                setSearch,
                debounceDelay: DEFAULT_LOAD_DEBOUNCE_DELAY,
                filter: selectedFilters,
                setFilter: handleSetFilter,
                filterLabelMap,
                dateRange: { createdAfter: filterCreatedAfter, createdBefore: filterCreatedBefore, onClear: () => filterHandleDateRangeChange(undefined, undefined) },
                listTitle: (
                  <div className="gba:flex gba:items-center gba:gap-4">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <span>{getTranslationFromI18nKeyAndLabel('investment.tasks.teamTasks', 'Team Tasks')}</span>
                      <span className="gba:text-gray-500">({total})</span>
                    </div>
                  </div>
                ),
                columnVisibility: {
                  columns: columnConfig,
                  onColumnVisibilityChange: handleColumnVisibilityChange,
                  'data-testid': 'team-tasks-column-visibility'
                },
                actions: (
                  <AppAction
                    contextsArray={[FlowContextName.investmentTaskCreate]}
                    accessToken={accessToken}
                    data-testid="add-task-action"
                    emptyStateBehavior="hide"
                  >
                    <Button
                      size="sm"
                      variant="default"
                      data-testid="add-task-trigger"
                      type="button"
                      style={{ gap: 'var(--nw-spacing-xs)' }}
                    >
                      <Plus size={16} />
                      {getTranslationFromI18nKeyAndLabel('crm:task.addTask', 'Add Task')}
                    </Button>
                  </AppAction>
                ),
              }}
              dataFilterProps={{ filterGroups, onFilterChange: handleFilterChange }}
              dataBody={
                <div data-testid="team-task-table-container">
                  <TaskTable
                    {...props}
                    tasks={tasks}
                    loading={loading}
                    error={error}
                    hasMore={hasMore}
                    loadMore={loadMore}
                    loadPage={loadPage}
                    retry={retry}
                    total={total}
                    pageSize={pageSize}
                    currentPage={currentPage}
                    sortField={sortField}
                    sortOrder={sortOrder}
                    onSelectTask={handleSelectTask}
                    onPaginationChange={handlePaginationChange}
                    onSortingChange={handleSortingChange}
                    selectedTaskId={selectedTask?.id}
                    visibleColumns={visibleColumns}
                    sourceApp="IRM"
                  />
                </div>
              }
            />
          </TabsContent>
        </Tabs>
      </div>

      <Sheet 
        open={!!selectedTask} 
        onOpenChange={(open) => {
          if (!open) setSelectedTask(null);
        }}
        title={getTranslationFromI18nKeyAndLabel('investment.tasks.taskDetails', 'Task Details')}
      >
        <SheetContent className="gba:w-[450px] gba:sm:w-[600px] gba:max-w-[90vw] gba:p-0 gba:flex gba:flex-col">
          <SheetHeader className="gba:px-6 gba:py-6 gba:border-b gba:border-border gba:shrink-0">
            <SheetTitle className="gba:text-xl gba:font-semibold gba:text-left">
              {selectedTask?.name || getTranslationFromI18nKeyAndLabel('investment.tasks.taskDetails', 'Task Details')}
            </SheetTitle>
          </SheetHeader>
          <div className="gba:flex-1 gba:overflow-hidden gba:px-6">
            {selectedTask ? (
              <TaskDetails task={selectedTask} sourceApp="IRM" accessToken={accessToken} />
            ) : (
              <div className="gba:p-4 gba:text-center gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('investment.tasks.noTaskSelected', 'No task selected')}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default TaskManagement;


