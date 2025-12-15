/**
 * CompletedView Component
 * Displays completed tasks with search, refresh, and pagination
 */

import React, { useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { UnifiedTask } from '@/business-apps/core/every/apps/every-api/types'
import {
  Input,
  Button,
  Alert,
  AlertTitle,
  AlertDescription,
  useTranslation,
  useLocale
} from '@newwork/nw-design-system'
import { Search, RefreshCw } from 'lucide-react'
import { TaskCard } from './TaskCard'
import { TaskDetailDialog } from './TaskDetailDialog'
import { EmptyState } from './EmptyState'
import { useEmployeeAvatarsBatch } from '../hooks/useEmployeeAvatarsBatch'
import translations from '../_i18n'

interface CompletedViewProps extends BusinessAppContextProps {
  tasks: UnifiedTask[]
  totalCount: number
  isLoading: boolean
  error: string | null
  onRefresh: () => void
  onLoadMore: () => void
  hasMore: boolean
}

export const CompletedView: React.FC<CompletedViewProps> = ({
  tasks,
  totalCount,
  isLoading,
  error,
  onRefresh,
  onLoadMore,
  hasMore,
  ...context
}) => {
  const { t } = useTranslation(translations)
  const { locale } = useLocale()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTask, setSelectedTask] = useState<UnifiedTask | null>(null)

  // Extract user IDs and employee IDs separately (same logic as InboxView)
  const { userIds, employeeIds } = useMemo(() => {
    const uIds: string[] = []
    const eIds: string[] = []

    tasks.forEach(task => {
      // Both Kogito and CFlow tasks have creatorUserId (user ID)
      if (task.sourceMetadata?.creatorUserId) {
        uIds.push(task.sourceMetadata.creatorUserId)
      }
      // Legacy: Some tasks might still have creatorEmployeeId (employee ID)
      if (task.sourceMetadata?.creatorEmployeeId) {
        eIds.push(task.sourceMetadata.creatorEmployeeId)
      }
    })

    return {
      userIds: [...new Set(uIds)], // Remove duplicates
      employeeIds: [...new Set(eIds)] // Remove duplicates
    }
  }, [tasks])

  // Batch fetch all employee avatars in one request (handles both userIds and employeeIds)
  const { employeeMap } = useEmployeeAvatarsBatch(context.accessToken || '', userIds, employeeIds)

  /**
   * Filter tasks by search query (title, flowId, source)
   */
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks

    const searchLower = searchQuery.toLowerCase()
    return tasks.filter(
      task =>
        task.title?.toLowerCase().includes(searchLower) ||
        task.flowId?.toLowerCase().includes(searchLower) ||
        task.source?.toLowerCase().includes(searchLower) ||
        task.id?.toLowerCase().includes(searchLower)
    )
  }, [tasks, searchQuery])

  return (
    <div className="gba:space-y-4" data-testid="completed-view">
      {/* Search and Actions */}
      <div className="gba:flex gba:items-center gba:gap-4">
        <div className="gba:relative gba:flex-1">
          <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-muted-foreground gba:pointer-events-none gba:z-10" />
          <Input
            placeholder={t('completed-search-placeholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="gba:pl-11"
            style={{ paddingLeft: '2.75rem' }}
            data-testid="completed-search-input"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={isLoading}
          data-testid="completed-refresh-button"
        >
          <RefreshCw className={`gba:h-4 gba:w-4 ${isLoading ? 'gba:animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>{t('completed-error-title')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          type="completed"
          message={
            searchQuery.trim() ? t('completed-empty-search', { query: searchQuery }) : t('completed-empty-default')
          }
        />
      ) : (
        <>
          <div className="gba:space-y-1.5" data-testid="completed-task-list">
            {filteredTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onView={setSelectedTask}
                employeeMap={employeeMap}
                t={t}
                locale={locale}
              />
            ))}
          </div>

          {/* Pagination Info and Load More */}
          {!searchQuery.trim() && (
            <div className="gba:flex gba:items-center gba:justify-between gba:pt-4 gba:border-t">
              <p className="gba:text-sm gba:text-muted-foreground">
                {t('completed-showing', { current: filteredTasks.length, total: totalCount })}
              </p>
              {hasMore && (
                <Button
                  variant="outline"
                  onClick={onLoadMore}
                  disabled={isLoading}
                  data-testid="completed-load-more-button"
                >
                  {t('completed-load-more')}
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onTaskUpdated={onRefresh}
        accessToken={context.accessToken}
        userId={context.userInfo?.id}
        userInfo={context.userInfo}
      />
    </div>
  )
}
