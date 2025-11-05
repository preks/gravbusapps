/**
 * Every Box - Unified Task Inbox
 *
 * Displays tasks from both custom-flow-engine and Kogito in a single inbox
 */

import React, { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { fetchAllUserTasks, fetchTaskStatistics, UnifiedTask, TaskStatistics, TaskFilters } from '../every-api'
import {
  Card,
  CardContent,
  Button,
  Spinner,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { Inbox, Filter, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

interface EveryBoxProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const EveryBox: React.FC<EveryBoxProps> = ({ userInfo, accessToken }) => {
  const [tasks, setTasks] = useState<UnifiedTask[]>([])
  const [statistics, setStatistics] = useState<TaskStatistics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [errorDetails, setErrorDetails] = useState<Array<{ source: string; message: string; details?: any }>>([])
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set())

  // Filters
  const [sourceFilter, setSourceFilter] = useState<'all' | 'cflow' | 'kogito'>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const loadTasks = async () => {
    if (!userInfo?.id) {
      setError('User ID not available. Please ensure you are logged in.')
      return
    }

    setLoading(true)
    setError(null)
    setWarnings([])
    setErrorDetails([])

    try {
      console.log('Fetching tasks for user:', userInfo.id)

      const filters: Partial<TaskFilters> = {
        source: sourceFilter,
        limit: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      }

      if (statusFilter !== 'all') {
        filters.status = statusFilter as any
      }

      const result = await fetchAllUserTasks(userInfo.id, accessToken, filters)

      console.log('Fetch result:', {
        taskCount: result.tasks.length,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
        errors: result.errors
      })

      setTasks(result.tasks)

      if (result.warnings.length > 0) {
        setWarnings(result.warnings)
      }

      if (result.errors.length > 0) {
        setErrorDetails(result.errors)

        if (result.tasks.length === 0) {
          const errorMessages = result.errors.map(e => `${e.source}: ${e.message} (${e.details})`).join('; ')
          setError(`Failed to fetch tasks from all sources. ${errorMessages}`)
        } else {
          setWarnings([...result.warnings, `Some sources failed: ${result.errors.map(e => e.source).join(', ')}`])
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch tasks'
      console.error('Error loading tasks:', err)
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const loadStatistics = async () => {
    if (!userInfo?.id) return

    try {
      const result = await fetchTaskStatistics(userInfo.id, accessToken)
      setStatistics(result.statistics)
    } catch (err) {
      console.error('Failed to load statistics:', err)
    }
  }

  useEffect(() => {
    loadTasks()
    loadStatistics()
  }, [userInfo?.id, sourceFilter, statusFilter])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'gba:bg-blue-100 gba:text-blue-800'
      case 'IN_PROGRESS':
        return 'gba:bg-yellow-100 gba:text-yellow-800'
      case 'COMPLETED':
        return 'gba:bg-green-100 gba:text-green-800'
      case 'FAILED':
        return 'gba:bg-red-100 gba:text-red-800'
      default:
        return 'gba:bg-gray-100 gba:text-gray-800'
    }
  }

  const getSourceBadge = (source: 'cflow' | 'kogito') => {
    return source === 'cflow' ? (
      <Badge className="gba:bg-purple-100 gba:text-purple-800">Custom Flow</Badge>
    ) : (
      <Badge className="gba:bg-indigo-100 gba:text-indigo-800">Kogito</Badge>
    )
  }

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTaskIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
      }
      return newSet
    })
  }

  return (
    <div className="gba:p-6 gba:max-w-7xl gba:mx-auto">
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
        <div className="gba:flex gba:items-center gba:gap-3">
          <Inbox className="gba:w-8 gba:h-8 gba:text-blue-600" />
          <div>
            <h1 className="gba:text-3xl gba:font-bold gba:text-gray-900">Every Box</h1>
            <p className="gba:text-sm gba:text-gray-600">Unified task inbox from all sources</p>
          </div>
        </div>

        <Button
          onClick={() => {
            loadTasks()
            loadStatistics()
          }}
          disabled={loading}
          className="gba:flex gba:items-center gba:gap-2"
        >
          <RefreshCw className={`gba:w-4 gba:h-4 ${loading ? 'gba:animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="gba:mb-4 gba:bg-yellow-50 gba:border gba:border-yellow-200 gba:rounded-lg gba:p-4">
          <div className="gba:text-yellow-800">
            <strong>Partial Results:</strong> {warnings.join(', ')}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="gba:mb-4 gba:bg-red-50 gba:border gba:border-red-200 gba:rounded-lg gba:p-4">
          <div className="gba:text-red-800">
            <strong>Error:</strong> {error}
            {errorDetails.length > 0 && (
              <div className="gba:mt-2 gba:space-y-1">
                {errorDetails.map((detail, idx) => (
                  <div key={idx} className="gba:text-sm gba:pl-4">
                    <strong>{detail.source}:</strong> {detail.message}
                    {detail.details && <span className="gba:text-red-600"> - {detail.details}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statistics Summary */}
      {statistics && (
        <div className="gba:grid gba:grid-cols-4 gba:gap-4 gba:mb-6">
          <Card>
            <CardContent className="gba:p-4">
              <div className="gba:text-2xl gba:font-bold">{statistics.total}</div>
              <div className="gba:text-sm gba:text-gray-600">Total Tasks</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="gba:p-4">
              <div className="gba:text-2xl gba:font-bold gba:text-yellow-600">{statistics.byStatus.inProgress}</div>
              <div className="gba:text-sm gba:text-gray-600">In Progress</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="gba:p-4">
              <div className="gba:text-2xl gba:font-bold gba:text-purple-600">{statistics.bySource.cflow}</div>
              <div className="gba:text-sm gba:text-gray-600">Custom Flow</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="gba:p-4">
              <div className="gba:text-2xl gba:font-bold gba:text-indigo-600">{statistics.bySource.kogito}</div>
              <div className="gba:text-sm gba:text-gray-600">Kogito</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="gba:mb-6">
        <CardContent className="gba:p-4">
          <div className="gba:flex gba:items-center gba:gap-4">
            <Filter className="gba:w-5 gba:h-5 gba:text-gray-600" />

            <div className="gba:flex-1">
              <label className="gba:text-sm gba:font-medium gba:text-gray-700 gba:block gba:mb-1">Source</label>
              <Select value={sourceFilter} onValueChange={(value: any) => setSourceFilter(value)}>
                <SelectTrigger className="gba:w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="cflow">Custom Flow Only</SelectItem>
                  <SelectItem value="kogito">Kogito Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="gba:flex-1">
              <label className="gba:text-sm gba:font-medium gba:text-gray-700 gba:block gba:mb-1">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="gba:w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task List */}
      {loading ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:py-12">
          <Spinner />
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="gba:p-12 gba:text-center">
            <Inbox className="gba:w-16 gba:h-16 gba:mx-auto gba:text-gray-400 gba:mb-4" />
            <h3 className="gba:text-lg gba:font-medium gba:text-gray-900 gba:mb-2">No tasks found</h3>
            <p className="gba:text-gray-600">Try adjusting your filters or check back later</p>
          </CardContent>
        </Card>
      ) : (
        <div className="gba:space-y-3">
          {tasks.map(task => {
            const isExpanded = expandedTaskIds.has(task.id)
            return (
              <Card key={task.id} className="gba:hover:shadow-md gba:transition-shadow">
                <CardContent className="gba:p-4">
                  <div className="gba:flex gba:items-start gba:justify-between">
                    <div className="gba:flex-1">
                      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                        <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900">{task.title || task.name}</h3>
                        {getSourceBadge(task.source)}
                        <Badge className={getStatusColor(task.status)}>{task.status.replace('_', ' ')}</Badge>
                        {task.priority && (
                          <Badge className="gba:bg-orange-100 gba:text-orange-800">Priority {task.priority}</Badge>
                        )}
                      </div>

                      <div className="gba:text-sm gba:text-gray-600 gba:space-y-1">
                        <div>Task ID: {task.id}</div>
                        {task.flowId && <div>Flow ID: {task.flowId}</div>}
                        {task.assignment?.assignedTo && <div>Assigned to: {task.assignment.assignedTo}</div>}
                        {task.dueDate && <div>Due: {new Date(task.dueDate).toLocaleDateString()}</div>}
                      </div>

                      {task.availableActions && (
                        <div className="gba:flex gba:gap-2 gba:mt-3">
                          {task.availableActions.canClaim && (
                            <Button size="sm" variant="outline">
                              Claim
                            </Button>
                          )}
                          {task.availableActions.canComplete && <Button size="sm">Complete</Button>}
                          {task.availableActions.canReassign && (
                            <Button size="sm" variant="outline">
                              Reassign
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Toggle JSON Button */}
                      <div className="gba:mt-3 gba:pt-3 gba:border-t gba:border-gray-200">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleTaskExpansion(task.id)}
                          className="gba:flex gba:items-center gba:gap-2"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="gba:w-4 gba:h-4" />
                              Hide Raw JSON
                            </>
                          ) : (
                            <>
                              <ChevronDown className="gba:w-4 gba:h-4" />
                              Show Raw JSON
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Collapsible JSON View */}
                      {isExpanded && (
                        <div className="gba:mt-3 gba:p-3 gba:bg-gray-50 gba:rounded gba:border gba:border-gray-200">
                          <div className="gba:text-xs gba:font-semibold gba:text-gray-700 gba:mb-2">
                            Raw Task Data ({task.source.toUpperCase()})
                          </div>
                          <pre className="gba:text-xs gba:overflow-x-auto gba:max-h-96 gba:overflow-y-auto">
                            {JSON.stringify(task, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <div className="gba:mt-6 gba:text-center gba:text-sm gba:text-gray-600">
        Showing {tasks.length} task{tasks.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}

export default EveryBox
