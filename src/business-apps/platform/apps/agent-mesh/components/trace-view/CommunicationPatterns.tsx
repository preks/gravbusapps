import { Card, CardContent, CardHeader, CardTitle, Badge } from '@newwork/nw-design-system'
import type { ExecutionAnalytics } from '../../types/agentMesh'

interface CommunicationPatternsProps {
  analytics: ExecutionAnalytics | null
}

export const CommunicationPatterns = ({ analytics }: CommunicationPatternsProps) => {
  if (!analytics) {
    return (
      <div className="gba:text-center gba:text-muted-foreground gba:py-8" data-testid="communication-patterns-empty">
        No analytics data available
      </div>
    )
  }

  const formatNumber = (num: number): string => {
    return num.toLocaleString()
  }

  const formatPercentage = (num: number): string => {
    return `${(num * 100).toFixed(1)}%`
  }

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  return (
    <div className="gba:space-y-4" data-testid="communication-patterns">
      {/* Summary KPI Cards */}
      <div className="gba:grid gba:grid-cols-3 gba:gap-4" data-testid="communication-patterns-kpis">
        <Card data-testid="communication-patterns-kpi-total-calls">
          <CardHeader>
            <CardTitle className="gba:text-sm gba:font-medium gba:text-muted-foreground">Total Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="gba:text-2xl gba:font-bold gba:text-foreground"
              data-testid="communication-patterns-kpi-total-calls-value"
            >
              {formatNumber(analytics.total_calls)}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="communication-patterns-kpi-avg-per-day">
          <CardHeader>
            <CardTitle className="gba:text-sm gba:font-medium gba:text-muted-foreground">Avg per Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="gba:text-2xl gba:font-bold gba:text-foreground"
              data-testid="communication-patterns-kpi-avg-per-day-value"
            >
              {formatNumber(analytics.avg_per_day)}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="communication-patterns-kpi-error-rate">
          <CardHeader>
            <CardTitle className="gba:text-sm gba:font-medium gba:text-muted-foreground">Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:flex gba:items-center gba:gap-2">
              <div
                className="gba:text-2xl gba:font-bold gba:text-foreground"
                data-testid="communication-patterns-kpi-error-rate-value"
              >
                {formatPercentage(analytics.error_rate)}
              </div>
              <Badge
                variant={
                  analytics.error_rate > 0.1 ? 'destructive' : analytics.error_rate > 0.05 ? 'warning' : 'success'
                }
                className="gba:text-xs"
                data-testid="communication-patterns-kpi-error-rate-badge"
              >
                {analytics.error_rate > 0.1 ? 'High' : analytics.error_rate > 0.05 ? 'Medium' : 'Low'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Communication Pairs */}
      <Card data-testid="communication-patterns-pairs">
        <CardHeader>
          <CardTitle>Top Communication Pairs</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.top_pairs.length === 0 ? (
            <div
              className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-4"
              data-testid="communication-patterns-pairs-empty"
            >
              No communication pairs found
            </div>
          ) : (
            <div className="gba:overflow-x-auto">
              <table className="gba:w-full" data-testid="communication-patterns-pairs-table">
                <thead>
                  <tr className="gba:border-b gba:border-border">
                    <th
                      className="gba:text-left gba:py-2 gba:px-4 gba:text-sm gba:font-medium gba:text-foreground"
                      data-testid="communication-patterns-pairs-header-pair"
                    >
                      Pair
                    </th>
                    <th
                      className="gba:text-right gba:py-2 gba:px-4 gba:text-sm gba:font-medium gba:text-foreground"
                      data-testid="communication-patterns-pairs-header-count"
                    >
                      Count
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.top_pairs.map((pair, idx) => (
                    <tr
                      key={idx}
                      className="gba:border-b gba:border-border gba:hover:bg-accent"
                      data-testid={`communication-patterns-pairs-row-${idx}`}
                    >
                      <td
                        className="gba:py-2 gba:px-4 gba:text-sm gba:text-foreground"
                        data-testid={`communication-patterns-pairs-row-${idx}-pair`}
                      >
                        {pair.pair}
                      </td>
                      <td
                        className="gba:py-2 gba:px-4 gba:text-sm gba:text-foreground gba:text-right"
                        data-testid={`communication-patterns-pairs-row-${idx}-count`}
                      >
                        {formatNumber(pair.count)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Stats */}
      <Card data-testid="communication-patterns-stats">
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div data-testid="communication-patterns-stats-avg-duration">
              <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">Average Duration</div>
              <div className="gba:text-lg gba:font-semibold gba:text-foreground gba:mt-1">
                {formatDuration(analytics.avg_duration_ms)}
              </div>
            </div>
            <div data-testid="communication-patterns-stats-p50">
              <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">P50 Duration</div>
              <div className="gba:text-lg gba:font-semibold gba:text-foreground gba:mt-1">
                {formatDuration(analytics.p50_ms)}
              </div>
            </div>
            <div data-testid="communication-patterns-stats-p95">
              <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">P95 Duration</div>
              <div className="gba:text-lg gba:font-semibold gba:text-foreground gba:mt-1">
                {formatDuration(analytics.p95_ms)}
              </div>
            </div>
            <div data-testid="communication-patterns-stats-p99">
              <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">P99 Duration</div>
              <div className="gba:text-lg gba:font-semibold gba:text-foreground gba:mt-1">
                {formatDuration(analytics.p99_ms)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder for Charts */}
      <Card data-testid="communication-patterns-charts">
        <CardHeader>
          <CardTitle>Charts</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-8"
            data-testid="communication-patterns-charts-placeholder"
          >
            Chart visualizations will be implemented here
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
