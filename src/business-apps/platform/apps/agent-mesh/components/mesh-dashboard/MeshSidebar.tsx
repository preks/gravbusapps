import { Card, CardContent, Badge } from '@newwork/nw-design-system'
import type { AgentRegistryEntry, ActiveAlert, ExecutionAnalytics } from '../../types/agentMesh'

interface MeshSidebarProps {
  agents: AgentRegistryEntry[]
  alerts: ActiveAlert[]
  analytics: ExecutionAnalytics | null
}

export const MeshSidebar = ({ agents, alerts, analytics }: MeshSidebarProps) => {
  const activeAgentsCount = agents.length
  const onlineCount = agents.filter(() => true).length // TODO: Filter by actual online status when available

  const queries24h = analytics?.total_calls || 0
  const avgResponseTime = analytics?.avg_duration_ms ? `${Math.round(analytics.avg_duration_ms)}ms` : 'N/A'
  const errorRate = analytics?.error_rate ? `${(analytics.error_rate * 100).toFixed(1)}%` : '0%'

  const KpiCard = ({ title, value, testId }: { title: string; value: string | number; testId: string }) => (
    <Card className="gba:p-4" data-testid={testId}>
      <CardContent className="gba:p-0">
        <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">{title}</div>
        <div className="gba:text-2xl gba:font-semibold gba:text-foreground">{value}</div>
      </CardContent>
    </Card>
  )

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid="mesh-sidebar">
      {/* KPI Cards */}
      <div className="gba:space-y-3">
        <h3 className="gba:text-sm gba:font-medium gba:text-foreground" data-testid="mesh-sidebar-kpi-title">
          Key Metrics
        </h3>
        <div className="gba:grid gba:grid-cols-1 gba:gap-3">
          <KpiCard title="Active Agents" value={activeAgentsCount} testId="mesh-sidebar-kpi-active-agents" />
          <KpiCard title="Online" value={onlineCount} testId="mesh-sidebar-kpi-online" />
          <KpiCard title="Queries / 24h" value={queries24h} testId="mesh-sidebar-kpi-queries-24h" />
          <KpiCard title="Avg Response" value={avgResponseTime} testId="mesh-sidebar-kpi-avg-response" />
          <KpiCard title="Error Rate" value={errorRate} testId="mesh-sidebar-kpi-error-rate" />
        </div>
      </div>

      {/* Active Alerts */}
      <div className="gba:flex-1">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
          <h3 className="gba:text-sm gba:font-medium gba:text-foreground" data-testid="mesh-sidebar-alerts-title">
            Active Alerts
          </h3>
          {alerts.length > 0 && (
            <Badge variant="destructive" className="gba:text-xs" data-testid="mesh-sidebar-alerts-count">
              {alerts.length}
            </Badge>
          )}
        </div>

        {alerts.length === 0 ? (
          <div className="gba:text-sm gba:text-muted-foreground gba:py-4" data-testid="mesh-sidebar-alerts-empty">
            No active alerts
          </div>
        ) : (
          <div className="gba:space-y-2">
            {alerts.map(alert => (
              <Card key={alert.rule_id} className="gba:p-3" data-testid={`mesh-sidebar-alert-${alert.rule_id}`}>
                <CardContent className="gba:p-0">
                  <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
                    <div className="gba:flex-1 gba:min-w-0">
                      <div
                        className="gba:font-medium gba:text-sm gba:text-foreground gba:mb-1"
                        data-testid={`mesh-sidebar-alert-${alert.rule_id}-name`}
                      >
                        {alert.name}
                      </div>
                      <div className="gba:text-xs gba:text-muted-foreground">
                        {alert.metric}: {alert.current_value} {alert.operator} {alert.threshold}
                      </div>
                    </div>
                    <Badge
                      variant="destructive"
                      className="gba:text-xs gba:shrink-0"
                      data-testid={`mesh-sidebar-alert-${alert.rule_id}-badge`}
                    >
                      Alert
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
