"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, DataDisplay, DataTable, Button } from '@newwork/nw-design-system';

import { useTaskData } from './hooks/useTaskData';
import { useTaskStatistics } from './hooks/useTaskStatistics';
import { TaskStatistics } from './components';
import { TaskDetailSheet } from '@/common/components/common-relations/detail-sheets/task-detail-sheet';
import { createTaskColumns, createTaskSortableColumns } from './config/taskColumns';
import { taskFilterConfig } from './config/taskFilters';
import { useTaskFilters } from './hooks/useTaskFilters';
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu';
import { AppAction } from '@/components/app-action/AppAction';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Task } from '@/common/components/common-relations/detail-sheets/task-detail-sheet';
import type { TaskReference } from '@/common/components/common-relations/detail-sheets/task-detail-sheet';
import { PlusIcon } from '@phosphor-icons/react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { buildPlatformUrl } from '@/common/utils/navigationUtils';

// Filter configuration types
export interface FilterOption {
  id: string;
  label: string;
}

export interface SelectFilterConfig {
  options: FilterOption[];
}

export interface TaskManagementProps extends BusinessAppContextProps {
  sourceApp?: string;
}

export const TaskManagement: React.FC<TaskManagementProps> = (props: TaskManagementProps) => {
  const { accessToken, userInfo } = props;

  // Section state
  const [currentSection, setCurrentSection] = useState('my');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Build reference URLs for IRM context
  const buildReferenceUrl = (reference: TaskReference): string => {
    switch (reference.type) {
      case 'lead': 
        return buildPlatformUrl('/platform/irm/lead-record', { leadId: reference.id });
      case 'account': 
        return buildPlatformUrl('/platform/irm/account-record', { accountId: reference.id });
      case 'contact': 
        return buildPlatformUrl('/platform/irm/contact-record', { contactId: reference.id });
      case 'opportunity': 
        return buildPlatformUrl('/platform/irm/opportunity-record', { opportunityId: reference.id });
      case 'investment':
        return buildPlatformUrl('/platform/irm/investment-record', { investmentId: reference.id });
      default: 
        return '';
    }
  };

  // Get dynamic filter data
  const { types, statuses, priorities } = useTaskFilters({ accessToken, userInfo });

  // Create dynamic filter configuration
  const dynamicFilterConfig = useMemo(() => {
    const config = { ...taskFilterConfig };
    
    // Update Status filter with dynamic data
    const statusGroup = config.groups.find(g => g.id === 'status-group');
    if (statusGroup && statuses.length > 0) {
      const statusFilter = statusGroup.filters.find(f => f.id === 'status');
      if (statusFilter && statusFilter.config && 'options' in statusFilter.config) {
        const cfg = statusFilter.config as SelectFilterConfig;
        cfg.options = statuses.map(status => ({
          id: status.id,
          label: status.value
        }));
      }
    }
    
    // Update Priority filter with dynamic data
    const priorityGroup = config.groups.find(g => g.id === 'priority-group');
    if (priorityGroup && priorities.length > 0) {
      const priorityFilter = priorityGroup.filters.find(f => f.id === 'priority');
      if (priorityFilter && priorityFilter.config && 'options' in priorityFilter.config) {
        const cfg = priorityFilter.config as SelectFilterConfig;
        cfg.options = priorities.map(priority => ({
          id: priority.id,
          label: priority.value
        }));
      }
    }
    
    // Update Task Type filter with dynamic data
    const typeGroup = config.groups.find(g => g.id === 'type-group');
    if (typeGroup && types.length > 0) {
      const typeFilter = typeGroup.filters.find(f => f.id === 'type');
      if (typeFilter && typeFilter.config && 'options' in typeFilter.config) {
        const cfg = typeFilter.config as SelectFilterConfig;
        cfg.options = types.map(type => ({
          id: type.id,
          label: type.value
        }));
      }
    }
    
    return config;
  }, [types, statuses, priorities]);

      // Data hooks for each section
      const myTasks = useTaskData({ 
        type: 'my', 
        userInfo, 
        accessToken
      });
      
      const teamTasks = useTaskData({ 
        type: 'team', 
        accessToken
      });

  // Get current section data
  const current = currentSection === 'my' ? myTasks : teamTasks;

  // Memoize filtered columns to avoid duplication and unnecessary recalculations
  const filteredColumns = useMemo(() => {
    return createTaskColumns().filter(
      col => currentSection === 'my' ? col.id !== 'assignedTo' : true
    );
  }, [currentSection]);

  // Statistics hook - truly decoupled from table data and sections
  const {
    myTasksStatistics,
    teamTasksStatistics,
    isLoading: statisticsLoading,
    error: statisticsError,
    refetch: refetchStatistics
  } = useTaskStatistics({
    accessToken,
    userInfo
    // Note: No filters or search - statistics should show overall counts, not filtered counts
  });

  // Handle section change
  const handleSectionChange = useCallback((section: string) => {
    setCurrentSection(section);
  }, []);

  // Handle task selection
  const handleSelectTask = useCallback((task: Task) => {
    setSelectedTask(task);
  }, []);

  // Debug log for creatorEmployees

  // Process completion event handling
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        console.log(
          "✅ Investment Task process event received:",
          event.type,
          event
        );

        // Check for successful completion from different event structures
        if (event.detail?.resolution === 'success') {
          console.log("✅ Success resolution detected, refreshing task data");
          // Refresh both task data and statistics
          current.refetch?.();
          refetchStatistics();
          return;
        }

        // Also check for different event structure
        const response = event.detail?.response;
        if (
          response?.detail?.resolution === 'success' ||
          response?.investmentTask ||
          response?.task
        ) {
          console.log("✅ Success in response or task detected, refreshing data");
          current.refetch?.();
          refetchStatistics();
          return;
        }

        // For continue events, check if payload contains successful data
        if (
          event.type === 'com.newwork.process.continue' &&
          event.detail?.payload
        ) {
          console.log("✅ Continue event with payload detected, refreshing task data");
          current.refetch?.();
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
  }, [refetchStatistics]);

  return (
    <div className="gba:p-6" data-testid="task-management-content">
      <div className="gba:mb-8" data-testid="task-management-header">
        <div className="gba:flex gba:justify-between gba:items-start" data-testid="task-management-title-section">
          <div>
            <h1 className="gba:text-4xl gba:font-bold gba:text-black gba:mb-3 gba:tracking-tight" data-testid="task-management-title">Tasks</h1>
            <p className="gba:text-lg gba:text-gray-500 gba:font-normal gba:leading-relaxed" data-testid="task-management-subtitle">Manage and track investment tasks</p>
          </div>
        </div>
      </div>

      {/* Statistics - decoupled from table data */}
        <TaskStatistics 
          myTasksStatistics={myTasksStatistics}
          teamTasksStatistics={teamTasksStatistics}
          isLoading={statisticsLoading} 
          error={statisticsError} 
          onRetry={refetchStatistics} 
        />
      
          {/* Data Display with DataTable */}
          <DataDisplay
            // Section tabs with badges showing total counts
            titleSections={[
              { 
                id: 'my', 
                label: 'My Tasks',
                metadata: {
                  count: myTasks.total,
                  subtitle: 'Assigned to me'
                }
              },
              { 
                id: 'team', 
                label: 'Team Tasks',
                metadata: {
                  count: teamTasks.total,
                  subtitle: 'All team tasks'
                }
              }
            ]}
            currentSection={currentSection}
            onSectionChange={handleSectionChange}
            
            // Primary action - Add Task
            primaryAction={
              <AppAction
                contextsArray={[FlowContextName.investmentTaskCreate]}
                externalContextData={{}}
                accessToken={accessToken}
                emptyStateBehavior="hide"
                deferMainContextRequestsUntilClick={false}
              >
                <Button variant="default">
                  <PlusIcon className="gba:w-4 gba:h-4" />
                  Add Task
                </Button>
              </AppAction>
            }
            
            // Search
            searchValue={current.search}
            searchPlaceholder="Search tasks..."
            onSearchChange={current.setSearch}
            
            // Filters
            filters={current.filters}
            filterConfiguration={dynamicFilterConfig}
            onFilterChange={(newFilters) => {
              current.setFilters(newFilters);
            }}            
            // Live filtering for real-time updates
            enableLiveFiltering={true}
            
            // Custom filter sheet labels
            filterSheetTitle="Filter Tasks"
            filterSheetDescription="Apply filters to narrow down the task list"
            
            // Toolbar density
            toolbarDensity="default"
            
            // Sorting
            sorting={current.sorting}
            sortableColumns={createTaskSortableColumns()}
            onSortingChange={current.setSorting}
            
            // Column visibility
            availableColumns={filteredColumns.map(col => ({
              id: col.id!,
              label: col.header as string
            }))}
            visibleColumns={current.visibleColumns}
            onVisibleColumnsChange={current.setVisibleColumns}
            
            // Selection & bulk actions
            selectedCount={current.selectedRows.length}
            bulkActions={[
              {
                id: 'export',
                label: 'Export Selected',
                onClick: () => console.log('Export selected tasks:', current.selectedRows)
              },
              {
                id: 'assign',
                label: 'Bulk Assign',
                onClick: () => console.log('Bulk assign tasks:', current.selectedRows)
              },
              {
                id: 'delete',
                label: 'Delete Selected',
                onClick: () => console.log('Delete selected tasks:', current.selectedRows)
              }
            ]}
            onClearSelection={() => current.setSelectedRows([])}
            
          >
        <DataTable<Task>
          // Data
          data={current.data}
          columns={filteredColumns.filter(col => 
            current.visibleColumns.includes(col.id!)
          )}
          loading={current.loading}
          error={current.error?.message}
          totalCount={current.total}
          
          // Controlled State
          sorting={current.sorting}
          onSortingChange={current.setSorting}
          pagination={current.pagination}
          onPaginationChange={current.setPagination}
          selectedRows={current.selectedRows}
          onSelectionChange={current.setSelectedRows}
          
          // Features
          enablePagination
          enableSorting
          enableSelection={false}
          enableColumnPinning
          enableResizing={false}
          
          // UI
          rowsPerPageOptions={[10, 20, 50, 100]}
          showPageNumbers
          maxVisiblePages={7}
          emptyMessage="No tasks found"
          
              // Row Actions - Using AppActionMenu for flow integration
              actions={(row) => (
                <AppActionMenu
                  data-testid={`task-actions-menu-${row.original.id}`}
                  contextsArray={[FlowContextName.investmentTaskEntity]}
                  externalContextData={{ taskId: row.original.id }}
                  prefixDataTestId="task-actions"
                  accessToken={accessToken}
                  emptyStateBehavior="enable"
                  deferMainContextRequestsUntilClick
                >
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Task actions"
                    data-testid={`task-actions-trigger-${row.original.id}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg className="gba:w-4 gba:h-4 gba:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </Button>
                </AppActionMenu>
              )}
          
          // Row Click
          onRowClick={(task) => handleSelectTask(task)}
        />
      </DataDisplay>

      {/* Task Details Sheet */}
      <Sheet 
        open={!!selectedTask} 
        onOpenChange={(open) => {
          if (!open) setSelectedTask(null);
        }}
        title="Task Details"
      >
        <SheetContent className="gba:!w-[500px] gba:sm:!w-[500px] gba:!max-w-[90vw] gba:p-0 gba:flex gba:flex-col">
          <SheetHeader className="gba:px-6 gba:py-6 gba:border-b gba:border-border gba:shrink-0">
            <SheetTitle className="gba:text-xl gba:font-semibold gba:text-left">
              {selectedTask?.name || getTranslationFromI18nKeyAndLabel('investment.tasks.taskDetails', 'Task Details')}
            </SheetTitle>
          </SheetHeader>
              <div className="gba:flex-1 gba:overflow-hidden gba:px-6">
                {selectedTask ? (
                  <TaskDetailSheet task={selectedTask} buildReferenceUrl={buildReferenceUrl} data-testid="task-detail-sheet" />
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

export default TaskManagement;


