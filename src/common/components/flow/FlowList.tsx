import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Alert, Badge } from '@newwork/nw-design-system'
import { Workflow, Calendar, Clock, AlertCircle, ArrowRight, CheckCircle } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import { useFlowList } from '@/common/data/flow/hooks/useFlowList'

export interface FlowListProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  title?: string
  filterType?: 'all' | 'initiated' | 'participated'
  hideFilters?: boolean
  onFlowSelect?: (flowId: string) => void
  userId?: string
}

export const FlowList: React.FC<FlowListProps> = ({
  prefixDataTestId = 'flow-list',
  title = 'Recent Flows',
  filterType = 'all',
  hideFilters = false,
  onFlowSelect,
  accessToken,
  userId
}) => {
  const [flowsSearch, setFlowsSearch] = useState('')
  const [flowsStatus, setFlowsStatus] = useState<string>('')

  const {
    flows,
    loading: flowsLoading,
    error: flowsError
  } = useFlowList(filterType === 'all' ? 'monitoring' : (filterType ?? 'monitoring'), userId || '', accessToken, {
    searchTerm: flowsSearch,
    status: flowsStatus as any,
    limit: 10,
    offset: 0
  })

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatLastActivity = (flow: any): { label: string; time: string } => {
    // Use lastActivityTime if it's more recent than updateTime, otherwise fall back to updateTime or startTime
    const lastActivity = flow.lastActivityTime || flow.updateTime || flow.startTime
    const isRecentActivity =
      flow.lastActivityTime && (!flow.updateTime || new Date(flow.lastActivityTime) > new Date(flow.updateTime))

    // Debug logging
    console.debug('formatLastActivity for', flow.flowId, {
      lastActivityTime: flow.lastActivityTime,
      updateTime: flow.updateTime,
      startTime: flow.startTime,
      isRecentActivity,
      label: isRecentActivity ? 'Last activity' : 'Started'
    })

    return {
      label: isRecentActivity ? 'Last activity' : 'Started',
      time: formatDateTime(lastActivity)
    }
  }

  const formatDuration = (minutesDuration: number): string => {
    if (minutesDuration < 60) {
      const roundedMinutes = Math.round(minutesDuration)
      return `${roundedMinutes} minute${roundedMinutes === 1 ? '' : 's'}`
    }
    if (minutesDuration < 1440) {
      const hours = Math.floor(minutesDuration / 60)
      const remainingMinutes = Math.round(minutesDuration % 60)
      return remainingMinutes === 0 ? `${hours} hour${hours === 1 ? '' : 's'}` : `${hours}h ${remainingMinutes}m`
    }
    const days = Math.floor(minutesDuration / 1440)
    const remainingHours = Math.floor((minutesDuration % 1440) / 60)
    return remainingHours === 0 ? `${days} day${days === 1 ? '' : 's'}` : `${days}d ${remainingHours}h`
  }

  const formatFlowDuration = (flow: any): { label: string; duration: string } => {
    if (!flow.durationMinutes) {
      return { label: '', duration: '' }
    }

    const isCompleted = flow.status === 'COMPLETED' || flow.endTime
    const duration = formatDuration(flow.durationMinutes)

    return {
      label: isCompleted ? 'Completed in' : 'Running',
      duration: duration
    }
  }

  return (
    <Card data-testid={prefixDataTestId}>
      <CardHeader>
        <div className="gba:flex gba:justify-between gba:items-start">
          <div>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <Workflow className="gba:h-5 gba:w-5 gba:text-blue-600" />
              {title}
            </CardTitle>
          </div>
        </div>

        {!hideFilters && (
          <div className="gba:flex gba:gap-4 gba:mt-4">
            <div className="gba:flex-1">
              <DebouncedInput
                placeholder="Search flows..."
                value={flowsSearch}
                onChange={setFlowsSearch}
                className="gba:w-full"
                data-testid={`${prefixDataTestId}-flows-search`}
              />
            </div>
            <select
              value={flowsStatus}
              onChange={e => setFlowsStatus(e.target.value)}
              className="gba:px-3 gba:py-2 gba:border gba:rounded-md gba:text-sm gba:bg-white"
              data-testid={`${prefixDataTestId}-flows-status-filter`}
            >
              <option value="">All Status</option>
              <option value="RUNNING">Running</option>
              <option value="COMPLETED">Completed</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="FAILED">Failed</option>
              <option value="TIMED_OUT">Timed Out</option>
            </select>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {(() => {
          if (flowsLoading)
            return (
              <div className="gba:space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={`skeleton-${i}`}
                    className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:border gba:rounded-lg"
                  >
                    <div className="gba:w-10 gba:h-10 gba:bg-gray-200 gba:rounded gba:animate-pulse" />
                    <div className="gba:flex-1 gba:space-y-2">
                      <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:animate-pulse gba:w-2/3" />
                      <div className="gba:h-3 gba:bg-gray-200 gba:rounded gba:animate-pulse gba:w-1/2" />
                    </div>
                    <div className="gba:w-16 gba:h-6 gba:bg-gray-200 gba:rounded gba:animate-pulse" />
                  </div>
                ))}
              </div>
            )
          if (flowsError)
            return (
              <Alert variant="destructive">
                <AlertCircle className="gba:h-4 gba:w-4" />
                <div>
                  <h4 className="gba:font-semibold">Error Loading Flows</h4>
                  <p className="gba:text-sm gba:mt-1">{flowsError ?? 'Failed to load flows'}</p>
                </div>
              </Alert>
            )
          if (!flows?.length)
            return (
              <div className="gba:text-center gba:py-8 gba:text-gray-500">
                <Workflow className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-3 gba:text-gray-300" />
                <p>No flows found</p>
                {(flowsSearch || flowsStatus) && (
                  <p className="gba:text-xs gba:mt-1">Try adjusting your search or filters</p>
                )}
              </div>
            )
          return (
            <div className="gba:space-y-3">
              {flows.map((flow, index) => {
                const badgeVariant =
                  flow.status === 'COMPLETED'
                    ? 'success'
                    : flow.status === 'RUNNING'
                      ? 'info'
                      : flow.status === 'TIMED_OUT'
                        ? 'warning'
                        : flow.status === 'FAILED'
                          ? 'destructive'
                          : 'outline'
                const badgeLabel = flow.status === 'TIMED_OUT' ? 'TIMED OUT' : flow.status
                return (
                  <div
                    key={flow.flowId}
                    role="button"
                    tabIndex={0}
                    className="gba:flex gba:items-center gba:gap-4 gba:p-4 gba:border gba:border-gray-200 gba:rounded-xl gba:hover:bg-gray-50 gba:hover:shadow-md gba:transition-all gba:duration-200 gba:cursor-pointer gba:bg-white"
                    data-testid={`${prefixDataTestId}-flow-${index}`}
                    onClick={() => onFlowSelect?.(flow.flowId)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') onFlowSelect?.(flow.flowId)
                    }}
                  >
                    <div className="gba:flex gba:items-center gba:justify-center gba:w-12 gba:h-12 gba:bg-gradient-to-br gba:from-blue-50 gba:to-blue-100 gba:rounded-lg gba:flex-shrink-0 gba:shadow-sm">
                      <Workflow className="gba:h-6 gba:w-6 gba:text-blue-600" />
                    </div>

                    <div className="gba:flex-1 gba:min-w-0">
                      <div className="gba:flex gba:items-center gba:gap-3 gba:mb-2">
                        <h4 className="gba:font-semibold gba:text-base gba:truncate gba:text-gray-900">
                          {flow.flowName || `Flow ${flow.flowId.slice(-8)}`}
                        </h4>
                        <Badge variant={badgeVariant} className="gba:text-xs gba:font-medium gba:px-3 gba:py-1">
                          {badgeLabel}
                        </Badge>
                      </div>

                      <div className="gba:flex gba:items-center gba:gap-4 gba:text-xs gba:text-gray-500 gba:mb-2">
                        <span className="gba:flex gba:items-center gba:gap-1">
                          <Calendar className="gba:h-3 gba:w-3" />
                          {formatLastActivity(flow).label}: {formatLastActivity(flow).time}
                        </span>
                        {flow.durationMinutes &&
                          (() => {
                            const flowDuration = formatFlowDuration(flow)
                            return (
                              <span className="gba:flex gba:items-center gba:gap-1">
                                <Clock className="gba:h-3 gba:w-3" />
                                {flowDuration.label} {flowDuration.duration}
                              </span>
                            )
                          })()}
                        {/* Show end date for completed flows */}
                        {['COMPLETED', 'TIMED_OUT', 'TERMINATED', 'FAILED'].includes(flow.status) && flow.endTime && (
                          <span className="gba:flex gba:items-center gba:gap-1 gba:text-gray-500">
                            <CheckCircle className="gba:h-3 gba:w-3" />
                            Ended:{' '}
                            {new Date(flow.endTime).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        )}
                        {flow.initiatedBy && <span className="gba:text-blue-600">by {flow.initiatedBy}</span>}
                      </div>

                      <div className="gba:text-xs gba:text-gray-600">
                        Progress: {flow.currentStep}/{flow.totalSteps} steps
                        {flow.progressPercentage !== undefined && (
                          <span className="gba:ml-2 gba:font-medium">({flow.progressPercentage}%)</span>
                        )}
                      </div>
                    </div>

                    <div className="gba:flex gba:items-center">
                      <ArrowRight className="gba:h-4 gba:w-4 gba:text-gray-400" />
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}
      </CardContent>
    </Card>
  )
}
