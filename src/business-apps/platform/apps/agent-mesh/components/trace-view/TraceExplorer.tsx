import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Spinner } from '@newwork/nw-design-system'
import type { ExecutionTrace, ExecutionListItem } from '../../types/agentMesh'
import { useAgentMeshClient } from '../../hooks/useAgentMeshClient'
import { TraceDetail } from './TraceDetail'

interface TraceExplorerProps {
  accessToken: string
}

export const TraceExplorer = ({ accessToken }: TraceExplorerProps) => {
  const client = useAgentMeshClient(accessToken)
  const [executions, setExecutions] = useState<ExecutionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTrace, setSelectedTrace] = useState<ExecutionTrace | null>(null)
  const [loadingTrace, setLoadingTrace] = useState(false)
  const [agentFilter, setAgentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  const loadExecutions = useCallback(async () => {
    try {
      setLoading(true)
      const params: Record<string, string | number> = { limit: 100 }
      if (statusFilter) params.status = statusFilter
      if (dateRange.start) params.since = new Date(dateRange.start).toISOString()
      if (dateRange.end) params.until = new Date(dateRange.end).toISOString()
      const data = await client.getExecutions(params)
      setExecutions(data)
    } catch (err) {
      console.error('Failed to load executions:', err)
    } finally {
      setLoading(false)
    }
  }, [client, statusFilter, dateRange])

  useEffect(() => {
    loadExecutions()
  }, [loadExecutions])

  const handleSelectExecution = async (exec: ExecutionListItem) => {
    if (!exec.correlation_id) return
    try {
      setLoadingTrace(true)
      const trace = await client.getExecutionTrace(exec.correlation_id)
      setSelectedTrace(trace)
    } catch (err) {
      console.error('Failed to load trace:', err)
    } finally {
      setLoadingTrace(false)
    }
  }

  const getStatusBadgeVariant = (status: string): 'success' | 'destructive' | 'warning' => {
    switch (status) {
      case 'success':
        return 'success'
      case 'error':
        return 'destructive'
      default:
        return 'warning'
    }
  }

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const filteredExecutions = executions.filter(exec => {
    if (agentFilter && !exec.prompt_name.toLowerCase().includes(agentFilter.toLowerCase())) {
      return false
    }
    return true
  })

  return (
    <div className="gba:flex gba:h-full gba:gap-4 gba:p-4" data-testid="trace-explorer">
      {/* Left Panel - Trace List */}
      <div className="gba:w-1/3 gba:flex gba:flex-col gba:gap-4">
        <Card data-testid="trace-explorer-filters">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-4">
            <div>
              <label
                className="gba:text-sm gba:font-medium gba:text-foreground"
                data-testid="trace-explorer-agent-filter-label"
              >
                Agent
              </label>
              <Input
                placeholder="Filter by agent..."
                value={agentFilter}
                onChange={e => setAgentFilter(e.target.value)}
                data-testid="trace-explorer-agent-filter-input"
                className="gba:mt-1"
              />
            </div>
            <div>
              <label
                className="gba:text-sm gba:font-medium gba:text-foreground"
                data-testid="trace-explorer-status-filter-label"
              >
                Status
              </label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                data-testid="trace-explorer-status-filter-select"
                className="gba:w-full gba:mt-1 gba:px-3 gba:py-2 gba:border gba:border-border gba:rounded-md gba:bg-background gba:text-foreground"
              >
                <option value="">All</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
                <option value="timeout">Timeout</option>
              </select>
            </div>
            <div>
              <label
                className="gba:text-sm gba:font-medium gba:text-foreground"
                data-testid="trace-explorer-date-start-label"
              >
                Start Date
              </label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                data-testid="trace-explorer-date-start-input"
                className="gba:mt-1"
              />
            </div>
            <div>
              <label
                className="gba:text-sm gba:font-medium gba:text-foreground"
                data-testid="trace-explorer-date-end-label"
              >
                End Date
              </label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                data-testid="trace-explorer-date-end-input"
                className="gba:mt-1"
              />
            </div>
            <Button variant="outline" size="sm" onClick={loadExecutions} data-testid="trace-explorer-apply-filters">
              Apply Filters
            </Button>
          </CardContent>
        </Card>

        <Card className="gba:flex-1 gba:overflow-hidden gba:flex gba:flex-col" data-testid="trace-explorer-list">
          <CardHeader>
            <CardTitle>Recent Executions ({filteredExecutions.length})</CardTitle>
          </CardHeader>
          <CardContent className="gba:flex-1 gba:overflow-y-auto">
            {loading ? (
              <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
                <Spinner />
              </div>
            ) : (
              <div className="gba:space-y-2">
                {filteredExecutions.length === 0 ? (
                  <div
                    className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-8"
                    data-testid="trace-explorer-empty"
                  >
                    No executions found
                  </div>
                ) : (
                  filteredExecutions.map(exec => (
                    <Card
                      key={exec.execution_id}
                      className={`gba:cursor-pointer gba:transition-colors gba:hover:bg-accent ${
                        selectedTrace?.correlation_id === exec.correlation_id ? 'gba:bg-accent' : ''
                      }`}
                      onClick={() => handleSelectExecution(exec)}
                      data-testid={`trace-explorer-item-${exec.execution_id}`}
                    >
                      <CardContent className="gba:p-3">
                        <div className="gba:space-y-2">
                          <div className="gba:flex gba:items-center gba:justify-between">
                            <span
                              className="gba:text-xs gba:text-muted-foreground"
                              data-testid={`trace-explorer-item-${exec.execution_id}-timestamp`}
                            >
                              {new Date(exec.created_at).toLocaleString()}
                            </span>
                            <Badge
                              variant={getStatusBadgeVariant(exec.status)}
                              data-testid={`trace-explorer-item-${exec.execution_id}-status`}
                            >
                              {exec.status}
                            </Badge>
                          </div>
                          <div
                            className="gba:text-sm gba:font-medium gba:text-foreground"
                            data-testid={`trace-explorer-item-${exec.execution_id}-agent`}
                          >
                            {exec.prompt_name}
                          </div>
                          {exec.input_preview && (
                            <div className="gba:text-xs gba:text-muted-foreground gba:truncate">
                              {exec.input_preview}
                            </div>
                          )}
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <span className="gba:text-xs gba:text-muted-foreground">
                              {formatDuration(exec.duration_ms)} · {exec.tool_calls_count} tools
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Trace Detail */}
      <div className="gba:flex-1">
        {loadingTrace ? (
          <Card className="gba:h-full">
            <CardContent className="gba:flex gba:items-center gba:justify-center gba:h-full">
              <Spinner />
            </CardContent>
          </Card>
        ) : (
          <TraceDetail trace={selectedTrace} />
        )}
      </div>
    </div>
  )
}
