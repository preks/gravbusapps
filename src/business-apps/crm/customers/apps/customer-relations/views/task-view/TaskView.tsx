"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, Tabs, TabsList, TabsTrigger, TabsContent } from '@newwork/nw-design-system';
import { UserOutlined, TeamOutlined } from '@ant-design/icons';

import { DataContainer } from '@/components/layout/dataContainer';
import { useTaskListData } from './hooks/useTaskListData';
import { useTaskFilters } from './hooks/useTaskFilters';
import { useTaskStatistics } from './hooks/useTaskStatistics';
import { TaskTable } from './components/TaskTable';
import { TaskDetails } from './components/TaskDetails';
import TaskStatistics from './components/TaskStatistics';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Task } from './types/TaskTypes';
import { AppAction } from '@/components/app-action/AppAction';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { PlusSquareIcon } from '@phosphor-icons/react';

export interface TaskViewProps extends BusinessAppContextProps {
  sourceApp?: string;
}

/**
 * Task Management page component. Renders the task management module with a table view.
 * @returns {JSX.Element}
 */
export const TaskView: React.FC<TaskViewProps> = (props: TaskViewProps) => {
  const { accessToken, sourceApp, userInfo } = props;

  // Tab state management
  const [activeTab, setActiveTab] = useState('my');

  // Use the centralized task filters hook
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
  } = useTaskFilters(props);

  // Get initial values from URL parameters using standard web APIs - ONLY ONCE
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

  // Initialize tab and search from URL if not already set - ONLY ONCE
  useEffect(() => {
    if (initialParams.tab && activeTab === 'my') {
      setActiveTab(initialParams.tab);
    }
    if (initialParams.search && !search) {
      setSearch(initialParams.search);
    }
  }, []); // Remove dependencies to prevent re-running

  // Update URL parameters using standard web APIs
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
      if (params.search) {
        newSearchParams.set('search', params.search);
      } else {
        newSearchParams.delete('search');
      }
    }
    
    if (params.page !== undefined) {
      if (params.page > 1) {
        newSearchParams.set('page', params.page.toString());
      } else {
        newSearchParams.delete('page');
      }
    }
    
    if (params.pageSize !== undefined) {
      if (params.pageSize !== 20) {
        newSearchParams.set('pageSize', params.pageSize.toString());
      } else {
        newSearchParams.delete('pageSize');
      }
    }
    
    if (params.sortField !== undefined) {
      if (params.sortField !== 'createdAt' && params.sortField !== '') {
        newSearchParams.set('sortField', params.sortField);
      } else {
        newSearchParams.delete('sortField');
      }
    }
    
    if (params.sortOrder !== undefined) {
      if (params.sortOrder !== 'DESC') {
        newSearchParams.set('sortOrder', params.sortOrder);
      } else {
        newSearchParams.delete('sortOrder');
      }
    }

    if (params.tab !== undefined) {
      if (params.tab !== 'my') {
        newSearchParams.set('tab', params.tab);
      } else {
        newSearchParams.delete('tab');
      }
    }

    const newURL = `${window.location.pathname}?${newSearchParams.toString()}`;
    window.history.replaceState({}, '', newURL);
  }, []);

  // Handle tab change
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1); // Reset to first page when switching tabs
    updateURLParams({ tab, page: 1 });
  }, [updateURLParams]);

  // Get filters based on active tab
  const getTabFilters = useCallback(() => {
    const baseFilters = getFilters();
    
    if (activeTab === 'my') {
      // For "My Tasks", filter by current user's employee ID
      const currentUserEmployeeId = userInfo?.employeeDetails?.employeeId;
      console.log('🔍 My Tasks Filter Debug:', {
        userInfo,
        employeeDetails: userInfo?.employeeDetails,
        currentUserEmployeeId,
        alternativeId: userInfo?.id,
        alternativeEmployeeId: (userInfo as any)?.employeeId
      });
      
      if (currentUserEmployeeId) {
        console.log('✅ Using employeeDetails.employeeId:', currentUserEmployeeId);
        return {
          ...baseFilters,
          assignedEmployeeIds: [currentUserEmployeeId]
        };
      } else if ((userInfo as any)?.employeeId) {
        // Fallback to direct employeeId if employeeDetails.employeeId is not available
        console.log('⚠️ Fallback to userInfo.employeeId:', (userInfo as any).employeeId);
        return {
          ...baseFilters,
          assignedEmployeeIds: [(userInfo as any).employeeId]
        };
      } else if (userInfo?.id) {
        // Last fallback to user ID
        console.log('⚠️ Fallback to userInfo.id:', userInfo.id);
        return {
          ...baseFilters,
          assignedEmployeeIds: [userInfo.id]
        };
      } else {
        console.warn('❌ No user ID found for My Tasks filter. User info:', userInfo);
      }
    }
    
    return baseFilters;
  }, [getFilters, activeTab, userInfo]);



  // Adapter function for DataFilter component
  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    selected ? addFilter(filterId) : removeFilter(filterId);
  }, [addFilter, removeFilter]);

  // Function for DataController setFilter requirement
  const handleSetFilter = useCallback((filters: string[]) => {
    // This is called by DataController's "Clear all filters" button or individual filter removal
    if (filters.length === 0) {
      // Clear all filters
      resetFilters();
    } else {
      // Handle individual filter removal - find which filters were removed and remove them
      const removedFilters = selectedFilters.filter(f => !filters.includes(f));
      removedFilters.forEach(filterId => removeFilter(filterId));
    }
  }, [resetFilters, selectedFilters, removeFilter]);

  // Get task data with search, sorting, and filters
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
    ...getTabFilters(),
    sortField,
    sortOrder,
    accessToken,
    sourceApp
  });

  // Get task statistics with tab-specific filters
  const {
    statistics, 
    loading: statisticsLoading, 
    error: statisticsError, 
    refetch: refetchStatistics
  } = useTaskStatistics({
    ...getTabFilters(), 
    accessToken
  });



  // Listen for process completion events to refresh tasks (following established CRM pattern)
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        console.log('TaskView - Process completion event:', event.type, event.detail);
        
        if (event.detail?.resolution === 'success') {
          console.log('TaskView - Process success, refreshing tasks...');
          loadPage(currentPage, pageSize);
          refetchStatistics();
          return;
        }
        
        // Also check for different event structure
        const response = event.detail?.response;
        if (response?.detail?.resolution === 'success') {
          console.log('TaskView - Response success, refreshing tasks...');
          loadPage(currentPage, pageSize);
          refetchStatistics();
        }
      } catch (err) {
        console.error('Error handling process completion:', err);
      }
    };

    // Universal event listener to capture all events (like other CRM components)
    const handleAllEvents = (event: any) => {
      if (event.type && (event.type.includes('process') || event.type.includes('task'))) {
        console.log('TaskView - Detected process/task event:', event.type, event);
        handleProcessCompletion(event);
      }
    };

    // Comprehensive event list (same as other CRM TasksSections)
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

    // Add universal listener for debugging (like other CRM components)
    const originalDispatchEvent = window.dispatchEvent;
    window.dispatchEvent = function(event: Event) {
      if (event.type && (event.type.includes('process') || event.type.includes('task'))) {
        console.log('TaskView - Custom Event dispatched:', event.type, event);
        handleAllEvents(event);
      }
      return originalDispatchEvent.call(this, event);
    };

    return () => {
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessCompletion as EventListener);
      });
      window.dispatchEvent = originalDispatchEvent;
    };
  }, [currentPage, pageSize, loadPage, refetchStatistics]);

  // REMOVED: Excessive focus/visibility event listeners
  // These were causing too many requests when users click around

  // Trigger initial data loading when component mounts - ONLY ONCE
  useEffect(() => {
    if (!initialLoadDone.current && accessToken) {
      initialLoadDone.current = true;
      loadPage(currentPage, pageSize);
    }
  }, [accessToken]); // FIXED: Remove currentPage and pageSize to prevent re-runs

  // Debounced data loading to prevent excessive requests
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const debouncedLoadData = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      if (initialLoadDone.current) {
        setCurrentPage(1);
        updateURLParams({ search, page: 1 });
        loadPage(1, pageSize);
      }
    }, 300); // 300ms debounce
  }, [search, pageSize, updateURLParams, loadPage]);

  // Trigger search when search term changes (DEBOUNCED) - SKIP INITIAL LOAD
  useEffect(() => {
    if (initialLoadDone.current) { // Only after initial load is done
      debouncedLoadData();
    }
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [search]);

  // Trigger reload when filters change (OPTIMIZED) - SKIP INITIAL LOAD
  useEffect(() => {
    if (initialLoadDone.current) {
      setCurrentPage(1);
      loadPage(1, pageSize);
    }
  }, [selectedFilters.length, filterCreatedAfter, filterCreatedBefore]); // FIXED: Don't stringify entire array

  // Trigger reload when tab changes - SKIP INITIAL LOAD
  useEffect(() => {
    if (initialLoadDone.current) {
      setCurrentPage(1);
      loadPage(1, pageSize);
      refetchStatistics();
    }
  }, [activeTab]);

  // Handle task selection
  const handleSelectTask = useCallback((task: Task) => {
    console.log('🔍 TaskView handleSelectTask called:', {
      taskId: task.id,
      taskName: task.name,
      currentSelectedTask: selectedTask?.id
    });
    setSelectedTask(task);
  }, [selectedTask]);





  // Throttled pagination to prevent rapid requests
  const lastPaginationTime = useRef(0);
  const PAGINATION_THROTTLE_MS = 500; // 500ms throttle for pagination

  // Handle pagination change (THROTTLED)
  const handlePaginationChange = useCallback((page: number, newPageSize?: number) => {
    const now = Date.now();
    if (now - lastPaginationTime.current < PAGINATION_THROTTLE_MS) {
      return; // Skip if too recent
    }
    lastPaginationTime.current = now;

    const targetPageSize = newPageSize || pageSize;
    setCurrentPage(page);
    setPageSize(targetPageSize);
    updateURLParams({ page, pageSize: targetPageSize });
    loadPage(page, targetPageSize);
  }, [pageSize, updateURLParams, loadPage]);

  // Handle sorting change (THROTTLED)
  const handleSortingChange = useCallback((field: string, order: 'ASC' | 'DESC' | '') => {
    const now = Date.now();
    if (now - lastPaginationTime.current < PAGINATION_THROTTLE_MS) {
      return; // Use same throttle for sorting
    }
    lastPaginationTime.current = now;

    // When order is empty, clear sorting completely
    if (order === '') {
      setSortField('');
      setSortOrder('DESC'); // Keep DESC as default for state type, but field will be empty
      setCurrentPage(1);
      updateURLParams({ 
        sortField: '', 
        sortOrder: 'DESC',
        page: 1 
      });
    } else {
      setSortField(field);
      setSortOrder(order);
      setCurrentPage(1);
      updateURLParams({ 
        sortField: field, 
        sortOrder: order,
        page: 1 
      });
    }
    
    loadPage(1, pageSize);
  }, [pageSize, updateURLParams, loadPage]);

  return (
    <div className="gba:p-6" data-testid="task-management-content">
      {/* Header */}
      <div 
        className="gba:mb-8"
        data-testid="task-management-header"
      >
        <div data-testid="task-management-title-section">
          <h1 
            className="gba:text-4xl gba:font-bold gba:text-black gba:mb-3 gba:tracking-tight"
            data-testid="task-management-title"
          >
            Task Management
          </h1>
          <p 
            className="gba:text-lg gba:text-gray-500 gba:font-normal gba:leading-relaxed"
            data-testid="task-management-subtitle"
          >
            Manage and track your team's tasks and deadlines
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="gba:mb-6 gba:pb-6 gba:border-b gba:border-gray-200" data-testid="task-statistics-section">
        <TaskStatistics
          statistics={statistics}
          isLoading={statisticsLoading}
          error={statisticsError}
          onRetry={refetchStatistics}
        />
      </div>

      {/* Main content with tabs */}
      <div className="gba:task-management-content" data-testid="task-management-tabs">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="gba:w-full">
          <TabsList className="gba:bg-white gba:border gba:mb-6">
            <TabsTrigger value="my" data-testid="my-tasks-tab">
              <UserOutlined className="gba:mr-2" />
              My Tasks
            </TabsTrigger>
            <TabsTrigger value="team" data-testid="team-tasks-tab">
              <TeamOutlined className="gba:mr-2" />
              Team Tasks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my" data-testid="my-tasks-content">
            <DataContainer
              dataControllerProps={{
                search,
                setSearch,
                debounceDelay: 500,
                filter: selectedFilters,
                setFilter: handleSetFilter,
                filterLabelMap,
                dateRange: {
                  createdAfter: filterCreatedAfter,
                  createdBefore: filterCreatedBefore,
                  onClear: () => filterHandleDateRangeChange(undefined, undefined)
                },
                listTitle: (
                  <div className="gba:flex gba:items-center gba:gap-4">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <span>My Tasks</span>
                      <span className="gba:text-gray-500">({total})</span>
                    </div>
                  </div>
                ),
                actions: (
                  <AppAction
                    contextsArray={[FlowContextName.createCustomerTask]}
                    accessToken={accessToken}
                    data-testid="add-task-action"
                    emptyStateBehavior="hide"
                  >
                    <div
                      className="gba:flex gba:flex-row gba:justify-center gba:items-center gba:rounded gba:gap-1 gba:cursor-pointer"
                      data-testid="add-task-trigger"
                    >
                      <PlusSquareIcon />
                      Add
                    </div>
                  </AppAction>
                ),
              }}
              dataFilterProps={{
                filterGroups,
                onFilterChange: handleFilterChange
              }}
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
                debounceDelay: 500,
                filter: selectedFilters,
                setFilter: handleSetFilter,
                filterLabelMap,
                dateRange: {
                  createdAfter: filterCreatedAfter,
                  createdBefore: filterCreatedBefore,
                  onClear: () => filterHandleDateRangeChange(undefined, undefined)
                },
                listTitle: (
                  <div className="gba:flex gba:items-center gba:gap-4">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <span>Team Tasks</span>
                      <span className="gba:text-gray-500">({total})</span>
                    </div>
                  </div>
                ),
                actions: (
                  <AppAction
                    contextsArray={[FlowContextName.createCustomerTask]}
                    accessToken={accessToken}
                    data-testid="add-task-action"
                    emptyStateBehavior="hide"
                  >
                    <div
                      className="gba:flex gba:flex-row gba:justify-center gba:items-center gba:rounded gba:gap-1 gba:cursor-pointer"
                      data-testid="add-task-trigger"
                    >
                      <PlusSquareIcon />
                      Add
                    </div>
                  </AppAction>
                ),
              }}
              dataFilterProps={{
                filterGroups,
                onFilterChange: handleFilterChange
              }}
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
                  />
                </div>
              }
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Task Details Sheet */}
      <Sheet 
        open={!!selectedTask} 
        onOpenChange={(open) => {
          console.log('🔍 Sheet onOpenChange:', { open, selectedTask: !!selectedTask });
          if (!open) setSelectedTask(null);
        }}
      >
        <SheetContent className="gba:w-[450px] gba:sm:w-[600px] gba:max-w-[90vw] gba:p-0 gba:flex gba:flex-col">
          <SheetHeader className="gba:px-6 gba:py-6 gba:border-b gba:border-border gba:shrink-0">
            <SheetTitle className="gba:text-xl gba:font-semibold gba:text-left">
              {selectedTask?.name || 'Task Details'}
            </SheetTitle>
          </SheetHeader>
          <div className="gba:flex-1 gba:overflow-hidden gba:px-6">
            {selectedTask ? (
              <TaskDetails
                task={selectedTask}
                sourceApp={sourceApp}
                onClose={() => setSelectedTask(null)}
              />
            ) : (
              <div className="gba:p-4 gba:text-center gba:text-muted-foreground">
                No task selected
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      
    </div>
  );
};

export default TaskView; 