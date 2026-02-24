import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Alert } from '@newwork/nw-design-system'
import {
  Settings,
  Activity,
  Download,
  Clock,
  AlertCircle,
  Play,
  CheckCircle,
  X,
  RefreshCw,
  UserPlus,
  UserMinus,
  Check,
  MessageSquare
} from 'lucide-react'

// Real history data interfaces (from inbox implementation)
interface HistoryEvent {
  type: 'step' | 'assignment' | 'comment' | 'flow' | 'status'
  timestamp: string
  stepIndex: number
  stepTitle: string
  eventTitle: string
  description: string
  action?: string
  userId?: string
  userName?: string
  comment?: string
  metadata?: any
}

interface HistorySummary {
  totalSteps: number
  completedSteps: number
  totalAssignmentEvents: number
  totalComments: number
  participants: string[]
}

interface AuditTabProps {
  flowId: string
  historyEvents: HistoryEvent[]
  historySummary: HistorySummary | null
  historyLoading: boolean
  historyError: string | null
  activeFilters: Set<string>
  filteredEvents: HistoryEvent[]
  toggleFilter: (filterType: string) => void
  clearAllFilters: () => void
  loadHistoryData: () => void
}

function getEventIcon(event: HistoryEvent): React.ReactNode {
  switch (event.type) {
    case 'flow':
      if (event.action === 'FLOW_COMPLETED') return <CheckCircle className="gba:h-4 gba:w-4" />
      if (event.action === 'FLOW_TERMINATED') return <X className="gba:h-4 gba:w-4" />
      return <Play className="gba:h-4 gba:w-4" />
    case 'step':
      return <CheckCircle className="gba:h-4 gba:w-4" />
    case 'status':
      return <RefreshCw className="gba:h-4 gba:w-4" />
    case 'assignment':
      switch (event.action) {
        case 'CLAIM':
          return <UserPlus className="gba:h-4 gba:w-4" />
        case 'UNCLAIM':
          return <UserMinus className="gba:h-4 gba:w-4" />
        case 'REASSIGN':
          return <RefreshCw className="gba:h-4 gba:w-4" />
        case 'COMPLETE':
          return <Check className="gba:h-4 gba:w-4" />
        case 'REJECT':
          return <X className="gba:h-4 gba:w-4" />
        default:
          return <Play className="gba:h-4 gba:w-4" />
      }
    case 'comment':
      return <MessageSquare className="gba:h-4 gba:w-4" />
    default:
      return <Clock className="gba:h-4 gba:w-4" />
  }
}

function getEventColor(event: HistoryEvent): string {
  switch (event.type) {
    case 'flow':
      if (event.action === 'FLOW_COMPLETED') return '#10b981'
      if (event.action === 'FLOW_TERMINATED') return '#ef4444'
      return '#3b82f6'
    case 'step':
      return '#10b981'
    case 'status':
      return '#8b5cf6'
    case 'assignment':
      switch (event.action) {
        case 'CLAIM':
          return '#3b82f6'
        case 'UNCLAIM':
          return '#f59e0b'
        case 'REASSIGN':
          return '#8b5cf6'
        case 'COMPLETE':
          return '#10b981'
        case 'REJECT':
          return '#ef4444'
        default:
          return '#3b82f6'
      }
    case 'comment':
      return '#06b6d4'
    default:
      return '#6b7280'
  }
}

function getEventBgColor(event: HistoryEvent): string {
  switch (event.type) {
    case 'flow':
      if (event.action === 'FLOW_COMPLETED') return 'gba:bg-green-50'
      if (event.action === 'FLOW_TERMINATED') return 'gba:bg-red-50'
      return 'gba:bg-blue-50'
    case 'step':
      return 'gba:bg-green-50'
    case 'status':
      return 'gba:bg-purple-50'
    case 'assignment':
      switch (event.action) {
        case 'CLAIM':
          return 'gba:bg-blue-50'
        case 'UNCLAIM':
          return 'gba:bg-orange-50'
        case 'REASSIGN':
          return 'gba:bg-purple-50'
        case 'COMPLETE':
          return 'gba:bg-green-50'
        case 'REJECT':
          return 'gba:bg-red-50'
        default:
          return 'gba:bg-blue-50'
      }
    case 'comment':
      return 'gba:bg-cyan-50'
    default:
      return 'gba:bg-gray-50'
  }
}

export const AuditTab: React.FC<AuditTabProps> = ({
  flowId,
  historyEvents,
  historySummary,
  historyLoading,
  historyError,
  activeFilters,
  filteredEvents,
  toggleFilter,
  clearAllFilters,
  loadHistoryData
}) => {
  return (
    <div className="gba:mt-0 gba:space-y-6">
      {/* Real Audit Summary from API */}
      {historySummary && (
        <Card>
          <CardHeader>
            <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
              <Settings className="gba:h-5 gba:w-5" />
              Audit Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Summary Cards in One Row */}
            <div className="gba:grid gba:grid-cols-4 gba:gap-4">
              <Card className="gba:bg-blue-50">
                <CardContent className="gba:p-4 gba:text-center">
                  <div className="gba:text-2xl gba:font-bold gba:text-blue-600">{historyEvents.length}</div>
                  <div className="gba:text-sm gba:text-gray-600">Total Events</div>
                </CardContent>
              </Card>

              <Card className="gba:bg-green-50">
                <CardContent className="gba:p-4 gba:text-center">
                  <div className="gba:text-2xl gba:font-bold gba:text-green-600">{historySummary.completedSteps}</div>
                  <div className="gba:text-sm gba:text-gray-600">Step Actions</div>
                </CardContent>
              </Card>

              <Card className="gba:bg-purple-50">
                <CardContent className="gba:p-4 gba:text-center">
                  <div className="gba:text-2xl gba:font-bold gba:text-purple-600">
                    {historySummary.totalAssignmentEvents}
                  </div>
                  <div className="gba:text-sm gba:text-gray-600">Assignments</div>
                </CardContent>
              </Card>

              <Card className="gba:bg-amber-50">
                <CardContent className="gba:p-4 gba:text-center">
                  <div className="gba:text-2xl gba:font-bold gba:text-amber-600">{historySummary.totalComments}</div>
                  <div className="gba:text-sm gba:text-gray-600">Comments</div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Real Audit Trail from API */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
            <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
              <Activity className="gba:h-5 gba:w-5" />
              Audit Trail
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="gba:flex gba:items-center gba:gap-2 gba:flex-shrink-0"
              onClick={() => {
                // Export real history events
                const csvContent = [
                  ['Timestamp', 'Type', 'Action', 'Step', 'User', 'Description'].join(','),
                  ...historyEvents.map(event =>
                    [
                      new Date(event.timestamp).toISOString(),
                      event.type,
                      event.action || '',
                      `"${event.stepTitle}"`,
                      event.userName || event.userId || '',
                      `"${event.description}"`
                    ].join(',')
                  )
                ].join('\n')

                const blob = new Blob([csvContent], { type: 'text/csv' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `flow-${flowId}-audit-trail.csv`
                a.click()
                URL.revokeObjectURL(url)
              }}
            >
              <Download className="gba:h-4 gba:w-4" />
              Export Audit Trail
            </Button>
          </div>

          {/* Filter Controls moved into audit trail card */}
          {historySummary && (
            <div className="gba:mt-4 gba:p-4 gba:bg-gray-50 gba:rounded-lg gba:border">
              <div className="gba:flex gba:items-center gba:gap-3 gba:flex-wrap">
                <span className="gba:text-sm gba:font-medium gba:text-gray-600">Filter by:</span>

                <Button
                  variant={activeFilters.has('steps') ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleFilter('steps')}
                  className="gba:text-xs"
                >
                  {historySummary.totalSteps} Steps
                </Button>

                <Button
                  variant={activeFilters.has('assignmentEvents') ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleFilter('assignmentEvents')}
                  className="gba:text-xs"
                  style={{
                    backgroundColor: activeFilters.has('assignmentEvents') ? '#8b5cf6' : undefined,
                    borderColor: activeFilters.has('assignmentEvents') ? '#8b5cf6' : undefined
                  }}
                >
                  {historySummary.totalAssignmentEvents} Assignments
                </Button>

                <Button
                  variant={activeFilters.has('statusChanges') ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleFilter('statusChanges')}
                  className="gba:text-xs"
                  style={{
                    backgroundColor: activeFilters.has('statusChanges') ? '#8b5cf6' : undefined,
                    borderColor: activeFilters.has('statusChanges') ? '#8b5cf6' : undefined
                  }}
                >
                  Status Changes
                </Button>

                <Button
                  variant={activeFilters.has('comments') ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleFilter('comments')}
                  className="gba:text-xs"
                  style={{
                    backgroundColor: activeFilters.has('comments') ? '#06b6d4' : undefined,
                    borderColor: activeFilters.has('comments') ? '#06b6d4' : undefined
                  }}
                >
                  {historySummary.totalComments} Comments
                </Button>

                <Button
                  variant={activeFilters.has('flowEvents') ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleFilter('flowEvents')}
                  className="gba:text-xs"
                  style={{
                    backgroundColor: activeFilters.has('flowEvents') ? '#3b82f6' : undefined,
                    borderColor: activeFilters.has('flowEvents') ? '#3b82f6' : undefined
                  }}
                >
                  Flow Events
                </Button>

                {activeFilters.size > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gba:text-xs gba:text-gray-600">
                    Clear All ({filteredEvents.length}/{historyEvents.length})
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {(() => {
            if (historyLoading) {
              return (
                <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
                  <div className="gba:text-center">
                    <div className="gba:animate-spin gba:rounded-full gba:h-8 gba:w-8 gba:border-b-2 gba:border-blue-600 gba:mx-auto gba:mb-4"></div>
                    <p className="gba:text-gray-600">Loading audit trail...</p>
                  </div>
                </div>
              )
            }
            if (historyError != null) {
              return (
                <Alert variant="destructive">
                  <AlertCircle className="gba:h-4 gba:w-4" />
                  <div>
                    <h4 className="gba:font-semibold">Error Loading Audit Trail</h4>
                    <p className="gba:text-sm gba:mt-1">{historyError}</p>
                    <Button variant="outline" size="sm" onClick={loadHistoryData} className="gba:mt-2">
                      Retry
                    </Button>
                  </div>
                </Alert>
              )
            }
            if (filteredEvents.length === 0) {
              return (
                <div className="gba:text-center gba:py-12 gba:text-gray-500">
                  <Clock className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-4 gba:text-gray-300" />
                  <p>No audit events found{activeFilters.size > 0 ? ' matching the selected filters' : ''}</p>
                </div>
              )
            }
            return (
              <div className="gba:space-y-4">
                {filteredEvents.map((event, index) => (
                  <div
                    key={`${event.type}-${event.stepIndex}-${index}`}
                    className={`gba:flex gba:items-start gba:gap-4 gba:p-4 gba:border gba:rounded-lg ${getEventBgColor(event)}`}
                  >
                    <div
                      className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-full gba:bg-white gba:shadow-sm"
                      style={{
                        backgroundColor: getEventColor(event) + '20',
                        color: getEventColor(event)
                      }}
                    >
                      {getEventIcon(event)}
                    </div>
                    <div className="gba:flex-1">
                      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                        <span className="gba:font-medium gba:text-sm">{event.eventTitle}</span>
                        <Badge
                          variant="outline"
                          className="gba:text-xs gba:border-0"
                          style={{
                            backgroundColor: getEventColor(event) + '20',
                            color: getEventColor(event)
                          }}
                        >
                          {event.type ? event.type.toUpperCase() : 'UNKNOWN'}
                        </Badge>
                        {event.action && (
                          <Badge variant="outline" className="gba:text-xs">
                            {event.action}
                          </Badge>
                        )}
                      </div>
                      <div className="gba:text-sm gba:text-gray-600 gba:mb-2">{event.description}</div>
                      <div className="gba:text-xs gba:text-gray-500">
                        {new Date(event.timestamp).toLocaleString()} • {event.stepTitle}
                        {event.userName && ` • ${event.userName}`}
                      </div>

                      {/* Show comment if this is a comment event */}
                      {event.type === 'comment' && event.comment && (
                        <div className="gba:mt-3 gba:p-3 gba:bg-green-50 gba:border gba:border-green-200 gba:rounded-md">
                          <div className="gba:flex gba:items-start gba:gap-2">
                            <MessageSquare className="gba:h-4 gba:w-4 gba:text-green-600 gba:mt-0.5 gba:flex-shrink-0" />
                            <p className="gba:text-sm gba:italic gba:text-green-800">"{event.comment}"</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </CardContent>
      </Card>
    </div>
  )
}
