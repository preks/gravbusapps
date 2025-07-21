"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { DataContainer } from '@/components/layout/dataContainer';
import { useTaskListData } from './hooks/useTaskListData';
import { useTaskFilters } from './hooks/useTaskFilters';
import { TaskTable } from './components/TaskTable';
import TaskStatistics from './components/TaskStatistics';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { startProcess } from '@/common/utils/start-process';
import { Task } from './types/TaskTypes';
import { mockStatistics } from './utils/mockData';

export interface TaskManagementProps extends BusinessAppContextProps {
  sourceApp?: string;
}

/**
 * Task Management page component. Renders the task management module with a table view.
 * @returns {JSX.Element}
 */
export const TaskManagement: React.FC<TaskManagementProps> = (props: TaskManagementProps) => {
  const { accessToken, sourceApp } = props;
  const { t } = useTranslation();

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
      sortOrder: urlParams.get('sortOrder') || 'DESC'
    };
  });

  const [currentPage, setCurrentPage] = useState(initialParams.page);
  const [pageSize, setPageSize] = useState(initialParams.pageSize);
  const [sortField, setSortField] = useState(initialParams.sortField);
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>(initialParams.sortOrder as 'ASC' | 'DESC');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const initialLoadDone = useRef(false);

  // Initialize search from URL if not already set - ONLY ONCE
  useEffect(() => {
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

    const newURL = `${window.location.pathname}?${newSearchParams.toString()}`;
    window.history.replaceState({}, '', newURL);
  }, []);

  // Handle adding a new task
  const handleAddTask = useCallback(() => {
    // TODO: Implement task creation process
    console.log('Add task clicked');
    /*
    startProcess({
      domain: 'task-management',
      processName: 'createTask',
      builderType: 'NATIVE_SCREEN',
      payload: {}
    });
    */
  }, []);

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
    ...getFilters(),
    sortField,
    sortOrder,
    accessToken,
    sourceApp
  });

  // Trigger initial data loading when component mounts
  useEffect(() => {
    if (!initialLoadDone.current && accessToken) {
      initialLoadDone.current = true;
      loadPage(currentPage, pageSize);
    }
  }, [accessToken, currentPage, pageSize]);

  // Trigger search when search term changes
  useEffect(() => {
    if (initialLoadDone.current) {
      setCurrentPage(1);
      updateURLParams({ search, page: 1 });
      loadPage(1, pageSize); // Reset to first page when search changes
    }
  }, [search, pageSize]);

  // Trigger reload when filters change
  useEffect(() => {
    if (initialLoadDone.current) {
      setCurrentPage(1);
      loadPage(1, pageSize);
    }
  }, [JSON.stringify(selectedFilters), filterCreatedAfter, filterCreatedBefore, pageSize]);

  // Handle task selection
  const handleSelectTask = useCallback((task: Task) => {
    setSelectedTask(task);
  }, []);

  // Handle closing the details panel
  const handleCloseDetails = useCallback(() => {
    setSelectedTask(null);
  }, []);

  // Handle search change
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, [setSearch]);

  // Handle pagination change
  const handlePaginationChange = useCallback((page: number, newPageSize?: number) => {
    const targetPageSize = newPageSize || pageSize;
    setCurrentPage(page);
    setPageSize(targetPageSize);
    updateURLParams({ page, pageSize: targetPageSize });
    loadPage(page, targetPageSize);
  }, [pageSize, updateURLParams, loadPage]);

  // Handle sorting change
  const handleSortingChange = useCallback((field: string, order: 'ASC' | 'DESC' | '') => {
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
    <div data-testid="task-management-content">
      {/* Header */}
      <div 
        className="gba:mb-6"
        data-testid="task-management-header"
      >
        <div data-testid="task-management-title-section">
          <h1 
            className="gba:text-3xl gba:font-bold gba:text-gray-900 gba:mb-2"
            data-testid="task-management-title"
          >
            Task Management
          </h1>
          <p 
            className="gba:text-gray-600"
            data-testid="task-management-subtitle"
          >
            Manage and track your team's tasks and deadlines
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="gba:mb-6" data-testid="task-statistics-section">
        <TaskStatistics
          statistics={mockStatistics}
          isLoading={loading}
          error={error}
          onRetry={retry}
        />
      </div>

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
                <span>Tasks</span>
                <span className="gba:text-gray-500">({total})</span>
              </div>
            </div>
          ),
          addButton: {
            onClick: handleAddTask,
            label: 'Add',
            'data-testid': 'add-task-button'
          },
        }}
        dataFilterProps={{
          filterGroups,
          onFilterChange: handleFilterChange
        }}
        dataBody={
          <div data-testid="task-table-container">
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
    </div>
  );
 };

export default TaskManagement; 