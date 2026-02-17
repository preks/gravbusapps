import { memo, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Badge, Button, Spinner } from '@newwork/nw-design-system'
import { X } from 'lucide-react'
import type { AgentRegistryEntry } from '../../types/agentMesh'

export interface AgentNodeData {
  agent: AgentRegistryEntry
  status: 'online' | 'offline' | 'busy'
  activeQueries: number
  onRemove?: (agentId: string) => Promise<void>
}

export const AgentNode = memo(({ data, selected }: NodeProps<AgentNodeData>) => {
  const { agent, status, activeQueries, onRemove } = data
  const [isRemoving, setIsRemoving] = useState(false)

  // Get initials from agent name
  const getInitials = (name: string): string => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  // Get status color based on status
  const getStatusColor = (): string => {
    switch (status) {
      case 'online':
        return 'gba:bg-success'
      case 'busy':
        return 'gba:bg-warning'
      case 'offline':
      default:
        return 'gba:bg-muted'
    }
  }

  // Get status badge variant
  const getStatusBadgeVariant = (): 'success' | 'warning' | 'offline' => {
    switch (status) {
      case 'online':
        return 'success'
      case 'busy':
        return 'warning'
      case 'offline':
      default:
        return 'offline'
    }
  }

  const initials = getInitials(agent.name)
  const avatarColor = agent.color || '#6366f1'
  const statusColor = getStatusColor()
  const statusBadgeVariant = getStatusBadgeVariant()

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onRemove || isRemoving) return
    setIsRemoving(true)
    try {
      await onRemove(agent.id)
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <div
      className={`gba:relative gba:group gba:bg-card gba:border-2 gba:rounded-lg gba:shadow-md gba:p-4 gba:min-w-[200px] ${
        selected ? 'gba:border-primary' : 'gba:border-border'
      }`}
      data-testid={`agent-node-${agent.id}`}
    >
      {/* Remove button (visible in edit mode on hover) */}
      {onRemove && (
        <Button
          variant="ghost"
          size="sm"
          className="gba:absolute gba:-top-2 gba:-right-2 gba:w-6 gba:h-6 gba:p-0 gba:rounded-full gba:bg-destructive gba:text-destructive-foreground gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity gba:z-10"
          onClick={handleRemove}
          disabled={isRemoving}
          data-testid={`agent-node-${agent.id}-remove`}
        >
          {isRemoving ? <Spinner size="sm" /> : <X className="gba:w-3 gba:h-3" />}
        </Button>
      )}

      {/* Source handles for outgoing connections */}
      <Handle
        type="source"
        position={Position.Right}
        className="gba:w-3 gba:h-3 gba:bg-primary gba:border-2 gba:border-background"
        data-testid={`agent-node-${agent.id}-source-handle`}
      />

      {/* Target handles for incoming connections */}
      <Handle
        type="target"
        position={Position.Left}
        className="gba:w-3 gba:h-3 gba:bg-primary gba:border-2 gba:border-background"
        data-testid={`agent-node-${agent.id}-target-handle`}
      />

      <div className="gba:flex gba:flex-col gba:gap-3">
        {/* Avatar and status indicator */}
        <div className="gba:flex gba:items-center gba:gap-3">
          <div className="gba:relative">
            <div
              className="gba:w-12 gba:h-12 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-white gba:font-semibold gba:text-sm"
              style={{ backgroundColor: avatarColor }}
              data-testid={`agent-node-${agent.id}-avatar`}
            >
              {initials}
            </div>
            {/* Status indicator dot */}
            <div
              className={`gba:absolute gba:-bottom-1 gba:-right-1 gba:w-4 gba:h-4 gba:rounded-full gba:border-2 gba:border-background ${statusColor}`}
              data-testid={`agent-node-${agent.id}-status-indicator`}
            />
          </div>

          {/* Agent name and specialty */}
          <div className="gba:flex-1 gba:min-w-0">
            <div
              className="gba:font-semibold gba:text-sm gba:text-foreground gba:truncate"
              data-testid={`agent-node-${agent.id}-name`}
            >
              {agent.name}
            </div>
            {agent.specialty && (
              <Badge
                variant="secondary"
                className="gba:mt-1 gba:text-xs"
                data-testid={`agent-node-${agent.id}-specialty`}
              >
                {agent.specialty}
              </Badge>
            )}
          </div>
        </div>

        {/* Status badge and active queries */}
        <div className="gba:flex gba:items-center gba:justify-between">
          <Badge
            variant={statusBadgeVariant}
            className="gba:text-xs"
            data-testid={`agent-node-${agent.id}-status-badge`}
          >
            {status}
          </Badge>

          {activeQueries > 0 && (
            <div
              className="gba:bg-primary gba:text-primary-foreground gba:rounded-full gba:px-2 gba:py-1 gba:text-xs gba:font-semibold gba:min-w-[24px] gba:text-center"
              data-testid={`agent-node-${agent.id}-query-count`}
            >
              {activeQueries}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

AgentNode.displayName = 'AgentNode'
