"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, DataDisplay, DataTable, Button } from '@newwork/nw-design-system';

import { useTaskData } from './hooks/useTaskData';
import { useTaskStatisticsNew } from './hooks/useTaskStatistics';
import { TaskDetails, TaskStatistics } from './components';
import { createTaskColumns, createTaskSortableColumns } from './config/taskColumns';
import { taskFilterConfig } from './config/taskFilters';
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu';
import { AppAction } from '@/components/app-action/AppAction';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { PlusSquareIcon } from '@phosphor-icons/react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Task } from './types/TaskTypes';

export interface TaskManagementProps extends BusinessAppContextProps {
  sourceApp?: string;
}

export const TaskManagement: React.FC<TaskManagementProps> = (props: TaskManagementProps) => {
  const { accessToken, userInfo } = props;

  // Section state
  const [currentSection, setCurrentSection] = useState('my');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

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

  // Statistics hook - truly decoupled from table data and sections
  const {
    myTasksStatistics,
    teamTasksStatistics,
    isLoading: statisticsLoading,
    error: statisticsError,
    refetch: refetchStatistics
  } = useTaskStatisticsNew({
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

  // Process completion event handling
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        if (event.detail?.resolution === 'success' || event.detail?.response?.detail?.resolution === 'success') {
          // Refresh statistics
          refetchStatistics();
        }
      } catch (err) {
        console.error('Error handling process completion:', err);
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
      <div className="gba:mb-6 gba:pb-6 gba:border-b gba:border-gray-200" data-testid="task-statistics-section">
        <TaskStatistics 
          myTasksStatistics={myTasksStatistics}
          teamTasksStatistics={teamTasksStatistics}
          isLoading={statisticsLoading} 
          error={statisticsError} 
          onRetry={refetchStatistics} 
        />
      </div>


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
                  <PlusSquareIcon className="gba:w-4 gba:h-4" />
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
            filterConfiguration={taskFilterConfig}
            onFilterChange={current.setFilters}
            
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
            availableColumns={createTaskColumns().map(col => ({
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
          columns={createTaskColumns().filter(col => 
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
                  <button
                    type="button"
                    className="gba:flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:rounded gba:border gba:border-gray-300 gba:bg-white gba:hover:bg-gray-50 gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-blue-500 gba:focus:ring-offset-2"
                    aria-label="Task actions"
                    data-testid={`task-actions-trigger-${row.original.id}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg className="gba:w-4 gba:h-4 gba:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
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
        <SheetContent className="gba:w-[450px] gba:sm:w-[600px] gba:max-w-[90vw] gba:p-0 gba:flex gba:flex-col">
          <SheetHeader className="gba:px-6 gba:py-6 gba:border-b gba:border-border gba:shrink-0">
            <SheetTitle className="gba:text-xl gba:font-semibold gba:text-left">
              {selectedTask?.name || 'Task Details'}
            </SheetTitle>
          </SheetHeader>
              <div className="gba:flex-1 gba:overflow-hidden gba:px-6">
                {selectedTask ? (
                  <TaskDetails task={selectedTask} accessToken={accessToken} />
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


