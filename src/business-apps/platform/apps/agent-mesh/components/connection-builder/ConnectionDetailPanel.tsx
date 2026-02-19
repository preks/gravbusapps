import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@newwork/nw-design-system'
import type { Connection } from '../../types/agentMesh'

interface ConnectionDetailPanelProps {
  connectionId: string
  accessToken: string
  onClose: () => void
}

interface RecentMessage {
  execution_id: string
  timestamp: string
  status: string
  duration_ms: number
}

export const ConnectionDetailPanel = ({ connectionId, accessToken, onClose }: ConnectionDetailPanelProps) => {
  const [connection, setConnection] = useState<Connection | null>(null)
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([])

  useEffect(() => {
    // TODO: Fetch connection details via API
    // Mock data for now
    setConnection(null)
    setRecentMessages([])
  }, [connectionId, accessToken])

  const getStatusBadgeVariant = (status: string): 'success' | 'destructive' | 'warning' => {
    switch (status) {
      case 'active':
        return 'success'
      case 'error':
        return 'destructive'
      case 'paused':
        return 'warning'
      default:
        return 'secondary'
    }
  }

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatPercentage = (num: number): string => {
    return `${(num * 100).toFixed(1)}%`
  }

  if (!connection) {
    return (
      <div
        className="gba:h-full gba:flex gba:items-center gba:justify-center"
        data-testid="connection-detail-panel-loading"
      >
        <div className="gba:text-muted-foreground" data-testid="connection-detail-panel-loading-text">
          Loading...
        </div>
      </div>
    )
  }

  const stats = connection.stats

  return (
    <div
      className="gba:h-full gba:flex gba:flex-col gba:bg-background gba:border-l gba:border-border"
      data-testid="connection-detail-panel"
    >
      {/* Header */}
      <Card className="gba:rounded-none gba:border-x-0 gba:border-t-0" data-testid="connection-detail-panel-header">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <div className="gba:flex-1">
              <CardTitle className="gba:text-lg" data-testid="connection-detail-panel-title">
                {connection.caller_name} → {connection.callee_name}
              </CardTitle>
              <div className="gba:mt-2">
                <Badge variant={getStatusBadgeVariant(connection.status)} data-testid="connection-detail-panel-status">
                  {connection.status}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="connection-detail-panel-close-button">
              ×
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Content */}
      <div className="gba:flex-1 gba:overflow-auto gba:p-4 gba:space-y-4">
        {/* Configuration Section */}
        <Card data-testid="connection-detail-panel-config">
          <CardHeader>
            <CardTitle className="gba:text-base">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-3">
            <div className="gba:flex gba:justify-between">
              <span
                className="gba:text-sm gba:text-muted-foreground"
                data-testid="connection-detail-panel-config-direction-label"
              >
                Direction:
              </span>
              <span
                className="gba:text-sm gba:text-foreground"
                data-testid="connection-detail-panel-config-direction-value"
              >
                {connection.config.direction === 'bidirectional' ? 'Bidirectional' : 'Caller → Callee'}
              </span>
            </div>
            <div className="gba:flex gba:justify-between">
              <span
                className="gba:text-sm gba:text-muted-foreground"
                data-testid="connection-detail-panel-config-domains-label"
              >
                Data Policy:
              </span>
              <span
                className="gba:text-sm gba:text-foreground"
                data-testid="connection-detail-panel-config-domains-value"
              >
                {connection.config.data_domains.length === 0 || connection.config.data_domains.includes('*')
                  ? 'All domains'
                  : connection.config.data_domains.join(', ')}
              </span>
            </div>
            <div className="gba:flex gba:justify-between">
              <span
                className="gba:text-sm gba:text-muted-foreground"
                data-testid="connection-detail-panel-config-timeout-label"
              >
                Timeout:
              </span>
              <span
                className="gba:text-sm gba:text-foreground"
                data-testid="connection-detail-panel-config-timeout-value"
              >
                {connection.config.timeout_seconds}s
              </span>
            </div>
            <div className="gba:flex gba:justify-between">
              <span
                className="gba:text-sm gba:text-muted-foreground"
                data-testid="connection-detail-panel-config-rate-limit-label"
              >
                Rate Limit:
              </span>
              <span
                className="gba:text-sm gba:text-foreground"
                data-testid="connection-detail-panel-config-rate-limit-value"
              >
                {connection.config.rate_limit_per_hour}/hour
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Section */}
        {stats && (
          <Card data-testid="connection-detail-panel-analytics">
            <CardHeader>
              <CardTitle className="gba:text-base">Analytics</CardTitle>
            </CardHeader>
            <CardContent className="gba:space-y-3">
              <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                <div data-testid="connection-detail-panel-analytics-total-calls">
                  <div className="gba:text-xs gba:text-muted-foreground">Total Calls</div>
                  <div className="gba:text-lg gba:font-semibold gba:text-foreground gba:mt-1">
                    {stats.total_calls.toLocaleString()}
                  </div>
                </div>
                <div data-testid="connection-detail-panel-analytics-success-rate">
                  <div className="gba:text-xs gba:text-muted-foreground">Success Rate</div>
                  <div className="gba:text-lg gba:font-semibold gba:text-foreground gba:mt-1">
                    {formatPercentage(stats.success_rate)}
                  </div>
                </div>
                <div data-testid="connection-detail-panel-analytics-avg-duration">
                  <div className="gba:text-xs gba:text-muted-foreground">Avg Duration</div>
                  <div className="gba:text-lg gba:font-semibold gba:text-foreground gba:mt-1">
                    {formatDuration(stats.avg_duration_ms)}
                  </div>
                </div>
                <div data-testid="connection-detail-panel-analytics-p95-duration">
                  <div className="gba:text-xs gba:text-muted-foreground">P95 Duration</div>
                  <div className="gba:text-lg gba:font-semibold gba:text-foreground gba:mt-1">
                    {formatDuration(stats.p95_duration_ms)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Messages */}
        <Card data-testid="connection-detail-panel-messages">
          <CardHeader>
            <div className="gba:flex gba:items-center gba:justify-between">
              <CardTitle className="gba:text-base">Recent Messages</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // TODO: Navigate to traces view filtered by connection
                }}
                data-testid="connection-detail-panel-view-all-button"
              >
                View all traces
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentMessages.length === 0 ? (
              <div
                className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-4"
                data-testid="connection-detail-panel-messages-empty"
              >
                No recent messages
              </div>
            ) : (
              <div className="gba:space-y-2">
                {recentMessages.slice(0, 5).map(msg => (
                  <div
                    key={msg.execution_id}
                    className="gba:flex gba:items-center gba:justify-between gba:p-2 gba:rounded-md gba:hover:bg-accent"
                    data-testid={`connection-detail-panel-message-${msg.execution_id}`}
                  >
                    <div className="gba:flex-1 gba:min-w-0">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Badge
                          variant={
                            msg.status === 'success' ? 'success' : msg.status === 'error' ? 'destructive' : 'warning'
                          }
                          className="gba:text-xs"
                          data-testid={`connection-detail-panel-message-${msg.execution_id}-status`}
                        >
                          {msg.status}
                        </Badge>
                        <span
                          className="gba:text-xs gba:text-muted-foreground"
                          data-testid={`connection-detail-panel-message-${msg.execution_id}-timestamp`}
                        >
                          {new Date(msg.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div
                        className="gba:text-xs gba:text-muted-foreground gba:mt-1"
                        data-testid={`connection-detail-panel-message-${msg.execution_id}-duration`}
                      >
                        {formatDuration(msg.duration_ms)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="gba:flex gba:gap-2">
          <Button
            variant="outline"
            className="gba:flex-1"
            onClick={() => {
              // TODO: Open edit form
            }}
            data-testid="connection-detail-panel-edit-button"
          >
            Edit Connection
          </Button>
        </div>
      </div>
    </div>
  )
}
