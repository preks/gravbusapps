import { memo, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Badge, Button, Spinner } from '@newwork/nw-design-system'
import { X, Zap, BookOpen } from 'lucide-react'
import type { AgentRegistryEntry } from '../../types/agentMesh'

export interface AgentNodeData {
  agent: AgentRegistryEntry
  status: 'online' | 'offline' | 'busy'
  activeQueries: number
  onRemove?: (agentId: string) => Promise<void>
}

const NODE_WIDTH = 220

const STATUS_CONFIG: Record<string, { dot: string; badge: 'success' | 'warning' | 'offline'; label: string }> = {
  online: { dot: 'gba:bg-success', badge: 'success', label: 'Online' },
  busy: { dot: 'gba:bg-warning', badge: 'warning', label: 'Busy' },
  offline: { dot: 'gba:bg-muted-foreground/40', badge: 'offline', label: 'Offline' }
}

export const AgentNode = memo(({ data, selected }: NodeProps<AgentNodeData>) => {
  const { agent, status, activeQueries, onRemove } = data
  const [isRemoving, setIsRemoving] = useState(false)

  const initials =
    agent.name.split(' ').length >= 2
      ? `${agent.name.split(' ')[0][0]}${agent.name.split(' ')[1][0]}`.toUpperCase()
      : agent.name.substring(0, 2).toUpperCase()

  const avatarColor = agent.color || '#6366f1'
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.offline

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
      style={{ width: NODE_WIDTH }}
      className={`gba:relative gba:group gba:bg-card gba:rounded-xl gba:border gba:transition-shadow ${
        selected ? 'gba:border-primary gba:shadow-md' : 'gba:border-border gba:shadow-sm gba:hover:shadow-md'
      }`}
      data-testid={`agent-node-${agent.id}`}
    >
      {/* Remove button */}
      {onRemove && (
        <Button
          variant="ghost"
          size="sm"
          className="gba:absolute gba:-top-2 gba:-right-2 gba:w-5 gba:h-5 gba:p-0 gba:rounded-full gba:bg-destructive gba:text-destructive-foreground gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity gba:z-10"
          onClick={handleRemove}
          disabled={isRemoving}
          data-testid={`agent-node-${agent.id}-remove`}
        >
          {isRemoving ? <Spinner size="sm" /> : <X className="gba:w-3 gba:h-3" />}
        </Button>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="gba:w-2.5 gba:h-2.5 gba:bg-primary gba:border-2 gba:border-background"
        data-testid={`agent-node-${agent.id}-source-handle`}
      />
      <Handle
        type="target"
        position={Position.Left}
        className="gba:w-2.5 gba:h-2.5 gba:bg-primary gba:border-2 gba:border-background"
        data-testid={`agent-node-${agent.id}-target-handle`}
      />

      {/* Content */}
      <div className="gba:p-3.5">
        {/* Top: Avatar + Name + Status dot */}
        <div className="gba:flex gba:items-center gba:gap-2.5">
          <div className="gba:relative gba:shrink-0">
            <div
              className="gba:w-9 gba:h-9 gba:rounded-lg gba:flex gba:items-center gba:justify-center gba:text-white gba:font-semibold gba:text-[11px]"
              style={{ backgroundColor: avatarColor }}
              data-testid={`agent-node-${agent.id}-avatar`}
            >
              {initials}
            </div>
            <div
              className={`gba:absolute gba:-bottom-0.5 gba:-right-0.5 gba:w-3 gba:h-3 gba:rounded-full gba:border-2 gba:border-card ${cfg.dot}`}
              data-testid={`agent-node-${agent.id}-status-indicator`}
            />
          </div>
          <div className="gba:flex-1 gba:min-w-0">
            <div
              className="gba:text-[13px] gba:font-semibold gba:text-foreground gba:truncate gba:leading-tight"
              data-testid={`agent-node-${agent.id}-name`}
            >
              {agent.name}
            </div>
            {agent.specialty && (
              <div
                className="gba:text-[10px] gba:text-muted-foreground gba:truncate gba:mt-0.5 gba:leading-tight"
                data-testid={`agent-node-${agent.id}-specialty`}
              >
                {agent.specialty}
              </div>
            )}
          </div>
        </div>

        {/* Bottom row: badges + counts */}
        <div className="gba:flex gba:items-center gba:justify-between gba:mt-2.5 gba:pt-2 gba:border-t gba:border-border">
          <div className="gba:flex gba:items-center gba:gap-1.5">
            <Badge
              variant={cfg.badge}
              className="gba:text-[9px] gba:px-1.5 gba:py-0 gba:leading-relaxed"
              data-testid={`agent-node-${agent.id}-status-badge`}
            >
              {cfg.label}
            </Badge>
            {agent.agent_type && (
              <Badge variant="outline" className="gba:text-[9px] gba:px-1.5 gba:py-0 gba:leading-relaxed">
                {agent.agent_type}
              </Badge>
            )}
          </div>
          <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-[10px] gba:text-muted-foreground">
            {agent.tools_count > 0 && (
              <span className="gba:flex gba:items-center gba:gap-0.5" title="Tools">
                <Zap className="gba:w-2.5 gba:h-2.5" />
                {agent.tools_count}
              </span>
            )}
            {agent.knowledge_sources_count > 0 && (
              <span className="gba:flex gba:items-center gba:gap-0.5" title="Knowledge sources">
                <BookOpen className="gba:w-2.5 gba:h-2.5" />
                {agent.knowledge_sources_count}
              </span>
            )}
            {activeQueries > 0 && (
              <span
                className="gba:bg-primary gba:text-primary-foreground gba:rounded-full gba:px-1.5 gba:text-[9px] gba:font-semibold gba:min-w-[16px] gba:text-center"
                data-testid={`agent-node-${agent.id}-query-count`}
              >
                {activeQueries}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})

AgentNode.displayName = 'AgentNode'
