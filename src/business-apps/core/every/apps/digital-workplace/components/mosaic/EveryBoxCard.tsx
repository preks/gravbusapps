/**
 * EveryBoxCard Component
 * Shows real EveryBox component when expanded
 * Compact preview when collapsed
 */

import React from 'react'
import { Inbox, Maximize2, Minimize2 } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import EveryBox from '@/business-apps/platform/apps/every-box'
import { useInboxTasks } from '../../hooks/useInboxTasks'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

interface EveryBoxCardProps extends BusinessAppContextProps {
  onExpand?: () => void
  isExpanded?: boolean
  onCollapse?: () => void
}

export const EveryBoxCard: React.FC<EveryBoxCardProps> = ({ onExpand, isExpanded, onCollapse, ...context }) => {
  const { userInfo, accessToken } = context
  const userId = userInfo?.id || userInfo?.employeeDetails?.employeeId || ''

  // For preview only - use simple inbox tasks hook
  const { tasks, loading: isLoading } = useInboxTasks({
    accessToken: accessToken || '',
    userId,
    limit: 5
  })

  // Show full EveryBox when expanded (this will handle its own data fetching)
  if (isExpanded) {
    return (
      <div className="gba:h-full gba:flex gba:flex-col gba:overflow-hidden gba:rounded-xl gba:shadow-xl gba:bg-white">
        {/* Premium Indigo Header - Perfect full-bleed! */}
        <div className="gba:bg-gradient-to-r gba:from-indigo-600 gba:via-indigo-700 gba:to-indigo-800 gba:px-6 gba:py-4 gba:flex gba:items-center gba:justify-between gba:flex-shrink-0 gba:rounded-t-xl">
          <div className="gba:flex gba:items-center gba:gap-3">
            <Inbox className="gba:h-6 gba:w-6 gba:text-white" />
            <h2 className="gba:text-xl gba:font-bold gba:text-white">EveryBox</h2>
          </div>
          <button
            onClick={e => {
              e.stopPropagation()
              onCollapse?.()
            }}
            className="gba:p-2 gba:rounded-lg gba:bg-white/10 hover:gba:bg-white/20 gba:transition-colors"
            data-testid="everybox-collapse-button"
          >
            <Minimize2 className="gba:h-5 gba:w-5 gba:text-white" />
          </button>
        </div>

        {/* Real EveryBox Component */}
        <div className="gba:flex-1 gba:overflow-hidden">
          <EveryBox {...context} />
        </div>
      </div>
    )
  }

  // Preview mode - Compact card showing first 5 tasks
  const totalCount = tasks.length
  const formatRelativeTime = (dateStr: string | undefined): string => {
    if (!dateStr) return ''
    try {
      return dayjs(dateStr).fromNow()
    } catch {
      return ''
    }
  }

  return (
    <div className="gba:h-full gba:flex gba:flex-col gba:overflow-hidden gba:rounded-xl gba:shadow-lg hover:gba:shadow-xl gba:transition-all gba:duration-300 gba:cursor-pointer gba:group gba:bg-white">
      {/* Premium Indigo Header - Perfect full-bleed! */}
      <div
        className="gba:bg-gradient-to-r gba:from-indigo-600 gba:via-indigo-700 gba:to-indigo-800 gba:px-4 gba:py-3 gba:flex gba:items-center gba:justify-between gba:rounded-t-xl"
        onClick={onExpand}
      >
        <div className="gba:flex gba:items-center gba:gap-2">
          <Inbox className="gba:h-5 gba:w-5 gba:text-white" />
          <div>
            <h2 className="gba:text-base gba:font-bold gba:text-white">EveryBox</h2>
            {totalCount > 0 && <p className="gba:text-xs gba:text-white/80">{totalCount} tasks</p>}
          </div>
        </div>
        <Maximize2 className="gba:h-4 gba:w-4 gba:text-white/70 group-hover:gba:text-white gba:transition-colors" />
      </div>

      {/* Preview Content - REAL DATA ONLY! */}
      <div className="gba:p-4 gba:flex-1 gba:overflow-hidden">
        {isLoading ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
            <div className="gba:animate-spin gba:h-6 gba:w-6 gba:border-2 gba:border-slate-600 gba:border-t-transparent gba:rounded-full" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="gba:text-center gba:py-8">
            <Inbox className="gba:h-10 gba:w-10 gba:text-slate-300 gba:mx-auto gba:mb-2" />
            <p className="gba:text-sm gba:text-slate-500">No tasks</p>
          </div>
        ) : (
          <div className="gba:space-y-2">
            {tasks.slice(0, 5).map(task => {
              const taskTitle = task.referenceName || task.name || 'Untitled'
              const dueDate = task.dueDate || task.createdAt
              return (
                <div
                  key={task.id}
                  className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:p-2.5 gba:rounded-lg gba:bg-slate-50 hover:gba:bg-slate-100 gba:transition-colors"
                >
                  <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
                    <div className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-slate-600 gba:flex-shrink-0" />
                    <span className="gba:text-sm gba:text-slate-900 gba:font-medium gba:truncate">{taskTitle}</span>
                  </div>
                  {dueDate && (
                    <span className="gba:text-xs gba:text-slate-500 gba:flex-shrink-0">
                      {formatRelativeTime(dueDate)}
                    </span>
                  )}
                </div>
              )
            })}
            {totalCount > 5 && (
              <div className="gba:text-center gba:pt-2 gba:text-xs gba:text-slate-500 gba:font-medium">
                +{totalCount - 5} more
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
