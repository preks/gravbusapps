import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@newwork/nw-design-system'
import type { ExecutionTrace, ExecutionTraceNode } from '../../types/agentMesh'

interface TraceDetailProps {
  trace: ExecutionTrace | null
}

export const TraceDetail = ({ trace }: TraceDetailProps) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  const toggleNode = (executionId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(executionId)) {
      newExpanded.delete(executionId)
    } else {
      newExpanded.add(executionId)
    }
    setExpandedNodes(newExpanded)
  }

  const getStatusBadgeVariant = (status: string): 'success' | 'destructive' | 'warning' => {
    switch (status.toLowerCase()) {
      case 'success':
        return 'success'
      case 'error':
        return 'destructive'
      case 'timeout':
        return 'warning'
      default:
        return 'warning'
    }
  }

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const renderNode = (node: ExecutionTraceNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.execution_id)
    const hasChildren = node.children && node.children.length > 0

    return (
      <div key={node.execution_id} className="gba:mb-2" data-testid={`trace-detail-node-${node.execution_id}`}>
        <div
          className={`gba:flex gba:items-start gba:gap-2 gba:p-2 gba:rounded-md gba:hover:bg-accent gba:transition-colors ${
            hasChildren ? 'gba:cursor-pointer' : ''
          }`}
          style={{ paddingLeft: `${level * 24 + 8}px` }}
          onClick={() => hasChildren && toggleNode(node.execution_id)}
          data-testid={`trace-detail-node-${node.execution_id}-header`}
        >
          {hasChildren && (
            <span
              className="gba:text-muted-foreground gba:select-none"
              data-testid={`trace-detail-node-${node.execution_id}-expand-icon`}
            >
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
          {!hasChildren && <span className="gba:w-4" />}
          <div className="gba:flex-1 gba:min-w-0">
            <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
              <span
                className="gba:font-medium gba:text-foreground"
                data-testid={`trace-detail-node-${node.execution_id}-name`}
              >
                {node.prompt_name}
              </span>
              <Badge
                variant={getStatusBadgeVariant(node.status)}
                className="gba:text-xs"
                data-testid={`trace-detail-node-${node.execution_id}-status`}
              >
                {node.status}
              </Badge>
              <span
                className="gba:text-xs gba:text-muted-foreground"
                data-testid={`trace-detail-node-${node.execution_id}-duration`}
              >
                {formatDuration(node.duration_ms)}
              </span>
            </div>
            {isExpanded && (
              <div className="gba:mt-2 gba:space-y-2" data-testid={`trace-detail-node-${node.execution_id}-details`}>
                {node.input_preview && (
                  <div className="gba:text-xs" data-testid={`trace-detail-node-${node.execution_id}-input`}>
                    <span className="gba:font-medium gba:text-muted-foreground">Input: </span>
                    <span className="gba:text-foreground">{node.input_preview}</span>
                  </div>
                )}
                {node.output_preview && (
                  <div className="gba:text-xs" data-testid={`trace-detail-node-${node.execution_id}-output`}>
                    <span className="gba:font-medium gba:text-muted-foreground">Output: </span>
                    <span className="gba:text-foreground">{node.output_preview}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {isExpanded && hasChildren && (
          <div className="gba:ml-4" data-testid={`trace-detail-node-${node.execution_id}-children`}>
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (!trace) {
    return (
      <Card className="gba:h-full" data-testid="trace-detail-empty">
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:h-full">
          <div className="gba:text-center gba:text-muted-foreground">
            <p className="gba:text-lg gba:font-medium" data-testid="trace-detail-empty-title">
              No trace selected
            </p>
            <p className="gba:text-sm gba:mt-2" data-testid="trace-detail-empty-description">
              Select a trace from the list to view details
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="gba:h-full gba:flex gba:flex-col" data-testid="trace-detail">
      <CardHeader>
        <div className="gba:space-y-2">
          <CardTitle data-testid="trace-detail-title">Trace Details</CardTitle>
          <div className="gba:flex gba:items-center gba:gap-4 gba:flex-wrap">
            <div className="gba:text-sm" data-testid="trace-detail-correlation-id">
              <span className="gba:font-medium gba:text-muted-foreground">Correlation ID: </span>
              <span className="gba:text-foreground">{trace.correlation_id}</span>
            </div>
            <div className="gba:text-sm" data-testid="trace-detail-duration">
              <span className="gba:font-medium gba:text-muted-foreground">Duration: </span>
              <span className="gba:text-foreground">{formatDuration(trace.total_duration_ms)}</span>
            </div>
            <div className="gba:text-sm" data-testid="trace-detail-tokens">
              <span className="gba:font-medium gba:text-muted-foreground">Tokens: </span>
              <span className="gba:text-foreground">{trace.total_tokens.toLocaleString()}</span>
            </div>
            <div className="gba:text-sm" data-testid="trace-detail-agent-count">
              <span className="gba:font-medium gba:text-muted-foreground">Agents: </span>
              <span className="gba:text-foreground">{trace.agent_count}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="gba:flex-1 gba:overflow-auto">
        <div className="gba:space-y-1" data-testid="trace-detail-tree">
          {renderNode(trace.tree)}
        </div>
      </CardContent>
    </Card>
  )
}
