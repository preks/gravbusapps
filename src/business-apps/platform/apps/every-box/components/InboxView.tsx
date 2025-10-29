/**
 * InboxView Component
 * Displays inbox tasks with search, filters, and grouping
 */

import React, { useState, useMemo } from 'react';
import { Input, Button, Alert, AlertTitle, AlertDescription } from '@newwork/nw-design-system';
import { Search, RefreshCw } from 'lucide-react';
import { UnifiedTask } from '../types';
import { TaskCard } from './TaskCard';
import { TaskDetailDialog } from './TaskDetailDialog';
import { EmptyState } from './EmptyState';
import { LoadingSkeleton } from './LoadingSkeleton';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { sortTasksByPriority, filterTasksBySearch } from '../utils/taskGrouping';
import { useEmployeeAvatarsBatch } from '../hooks/useEmployeeAvatarsBatch';

interface InboxViewProps extends BusinessAppContextProps {
  tasks: UnifiedTask[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export const InboxView: React.FC<InboxViewProps> = ({
  tasks,
  isLoading,
  error,
  onRefresh,
  ...context
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<UnifiedTask | null>(null);

  // Extract all unique user IDs from tasks for batch avatar fetching
  const userIds = useMemo(() => {
    const ids = tasks
      .map(task => 
        task.sourceMetadata?.creatorUserId || 
        task.sourceMetadata?.createdBy ||
        task.sourceMetadata?.initiatedBy
      )
      .filter((id): id is string => !!id);
    return [...new Set(ids)]; // Remove duplicates
  }, [tasks]);

  // Batch fetch all employee avatars in one request
  const { employeeMap } = useEmployeeAvatarsBatch(context.accessToken || '', userIds);

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Apply search filter
    if (searchQuery.trim()) {
      result = filterTasksBySearch(result, searchQuery);
    }

    // Sort by priority
    result = sortTasksByPriority(result);

    return result;
  }, [tasks, searchQuery]);

  if (isLoading && tasks.length === 0) {
    return <LoadingSkeleton count={5} type="task" />;
  }

  return (
    <div className="gba:space-y-4" data-testid="inbox-view">
      {/* Search and Actions */}
      <div className="gba:flex gba:items-center gba:gap-4">
        <div className="gba:relative gba:flex-1">
          <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="gba:pl-10"
            data-testid="inbox-search-input"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={isLoading}
          data-testid="inbox-refresh-button"
        >
          <RefreshCw className={`gba:h-4 gba:w-4 ${isLoading ? 'gba:animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error Loading Tasks</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          type="inbox"
          message={
            searchQuery.trim()
              ? `No tasks found matching "${searchQuery}"`
              : 'No tasks assigned to you at the moment'
          }
        />
      ) : (
        <div className="gba:space-y-3" data-testid="inbox-task-list">
          {filteredTasks.map((task) => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onView={setSelectedTask} 
              employeeMap={employeeMap}
            />
          ))}
        </div>
      )}

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        {...context}
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onTaskUpdated={onRefresh}
      />
    </div>
  );
};

