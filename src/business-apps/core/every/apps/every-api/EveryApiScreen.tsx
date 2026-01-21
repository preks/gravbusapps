/**
 * Every API Screen Component
 *
 * This component intercepts the screen rendering and returns raw JSON data instead.
 * When accessed as a "screen", it outputs JSON directly to the browser.
 */

import { useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { fetchAllUserTasks, fetchTaskStatistics, fetchTaskById } from './services/UnifiedTaskService'

interface EveryApiScreenProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const EveryApiScreen: React.FC<EveryApiScreenProps> = ({ userInfo, accessToken }) => {
  useEffect(() => {
    const handleApiRequest = async () => {
      const renderJson = (data: unknown) => {
        const pre = document.createElement('pre')
        pre.textContent = JSON.stringify(data, null, 2)
        pre.className = 'gba:font-mono gba:p-4'
        document.body.replaceChildren(pre)
      }

      try {
        if (!accessToken) {
          console.error('Access token missing')
          renderJson({ status: 'error', message: 'Access token missing' })
          return
        }

        // Parse the current URL to determine what API call to make
        const url = new URL(globalThis.location.href)
        const pathname = url.pathname
        const searchParams = url.searchParams

        let jsonData: any = null

        // Route: /tasks/user/:userId/stats
        if (pathname.includes('/stats')) {
          const userId = userInfo?.id || searchParams.get('userId') || ''
          const result = await fetchTaskStatistics(userId, accessToken)

          jsonData = {
            status: result.errors.length > 0 ? 'partial' : 'success',
            statistics: result.statistics,
            errors: result.errors,
            warnings: result.warnings
          }
        }
        // Route: /tasks/user/:userId
        else if (pathname.includes('/user/') || searchParams.has('userId')) {
          const userId = userInfo?.id || searchParams.get('userId') || ''

          const filters = {
            source: (searchParams.get('source') as any) || 'all',
            status: searchParams.get('status') as any,
            search: searchParams.get('search') || undefined,
            priority: searchParams.get('priority') ? Number.parseInt(searchParams.get('priority')!, 10) : undefined,
            limit: searchParams.get('limit') ? Number.parseInt(searchParams.get('limit')!, 10) : 20,
            offset: searchParams.get('offset') ? Number.parseInt(searchParams.get('offset')!, 10) : 0,
            sortBy: searchParams.get('sortBy') as any,
            sortOrder: searchParams.get('sortOrder') as any,
            claimableOnly: searchParams.get('claimableOnly') === 'true',
            assignedOnly: searchParams.get('assignedOnly') === 'true'
          }

          const result = await fetchAllUserTasks(userId, accessToken, filters)

          jsonData = {
            status: result.errors.length > 0 ? 'partial' : 'success',
            count: result.tasks.length,
            tasks: result.tasks,
            pagination: {
              limit: filters.limit,
              offset: filters.offset,
              total: result.tasks.length,
              hasMore: false
            },
            errors: result.errors,
            warnings: result.warnings
          }
        }
        // Route: /tasks/:taskId
        else if (searchParams.has('taskId')) {
          const taskId = searchParams.get('taskId')!
          const userId = userInfo?.id || searchParams.get('userId') || ''

          const task = await fetchTaskById(taskId, userId, accessToken)

          if (task) {
            jsonData = {
              status: 'success',
              task
            }
          } else {
            jsonData = {
              status: 'error',
              message: 'Task not found'
            }
          }
        } else {
          // API info / help
          jsonData = {
            status: 'ok',
            service: 'Every API',
            version: '1.0.0',
            message: 'Every API - Unified Task Management',
            usage: {
              getUserTasks: '?userId=USER_ID&source=all&limit=20',
              getStats: '?userId=USER_ID&stats=true',
              getTask: '?taskId=TASK_ID&userId=USER_ID'
            },
            endpoints: [
              'Add ?userId=USER_ID to get tasks',
              'Add &stats=true to get statistics',
              'Add ?taskId=TASK_ID&userId=USER_ID to get single task',
              'Add &source=cflow or &source=kogito to filter by source',
              'Add &status=IN_PROGRESS to filter by status',
              'Add &search=keyword to search tasks'
            ]
          }
        }

        renderJson(jsonData)
      } catch (error) {
        const errorData = {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: String(error)
        }

        renderJson(errorData)
      }
    }

    handleApiRequest()
  }, [userInfo, accessToken])

  // Return a loading state while the effect runs
  return (
    <div className="gba:p-4 gba:font-mono">
      <p className="gba:text-foreground">Loading Every API...</p>
    </div>
  )
}

export default EveryApiScreen
