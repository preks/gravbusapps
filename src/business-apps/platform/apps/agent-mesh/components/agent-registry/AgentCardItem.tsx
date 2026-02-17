import { Badge, Button } from '@newwork/nw-design-system'
import { Zap, BookOpen, Plus } from 'lucide-react'
import type { AgentRegistryEntry } from '../../types/agentMesh'

interface AgentCardItemProps {
  agent: AgentRegistryEntry
  onClick: () => void
  onAddToMesh?: () => void
  workspaceName?: string
}

export const AgentCardItem = ({ agent, onClick, onAddToMesh, workspaceName }: AgentCardItemProps) => {
  const getInitials = (name: string): string => {
    const parts = name.split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.substring(0, 2).toUpperCase()
  }

  const initials = getInitials(agent.name)
  const avatarColor = agent.color || '#6366f1'

  return (
    <div
      className="gba:flex gba:flex-col gba:gap-3 gba:p-3 gba:rounded-lg gba:border gba:border-border gba:bg-card gba:cursor-pointer gba:transition-colors gba:hover:bg-accent/50"
      onClick={onClick}
      data-testid={`agent-card-${agent.id}`}
    >
      {/* Top row: Avatar + Name */}
      <div className="gba:flex gba:items-center gba:gap-2.5">
        <div
          className="gba:w-9 gba:h-9 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-white gba:font-semibold gba:text-xs gba:flex-shrink-0"
          style={{ backgroundColor: avatarColor }}
          data-testid={`agent-card-${agent.id}-avatar`}
        >
          {initials}
        </div>
        <div className="gba:flex-1 gba:min-w-0">
          <div className="gba:flex gba:items-center gba:gap-1.5">
            <span
              className="gba:font-medium gba:text-sm gba:text-foreground gba:truncate"
              data-testid={`agent-card-${agent.id}-name`}
            >
              {agent.name}
            </span>
          </div>
          {agent.specialty && (
            <p
              className="gba:text-[11px] gba:text-muted-foreground gba:truncate gba:mt-0.5"
              data-testid={`agent-card-${agent.id}-specialty`}
            >
              {agent.specialty}
            </p>
          )}
        </div>
      </div>

      {/* Meta row: Type + Division + Counts */}
      <div className="gba:flex gba:items-center gba:gap-1.5 gba:flex-wrap">
        {agent.agent_type && (
          <Badge
            variant="outline"
            className="gba:text-[10px] gba:px-1.5 gba:py-0"
            data-testid={`agent-card-${agent.id}-type`}
          >
            {agent.agent_type}
          </Badge>
        )}
        {workspaceName && (
          <Badge
            variant="secondary"
            className="gba:text-[10px] gba:px-1.5 gba:py-0"
            data-testid={`agent-card-${agent.id}-workspace`}
          >
            {workspaceName}
          </Badge>
        )}
        <div className="gba:flex gba:items-center gba:gap-2 gba:ml-auto gba:text-[10px] gba:text-muted-foreground">
          {agent.tools_count > 0 && (
            <span className="gba:flex gba:items-center gba:gap-0.5">
              <Zap className="gba:w-3 gba:h-3" /> {agent.tools_count}
            </span>
          )}
          {agent.knowledge_sources_count > 0 && (
            <span className="gba:flex gba:items-center gba:gap-0.5">
              <BookOpen className="gba:w-3 gba:h-3" /> {agent.knowledge_sources_count}
            </span>
          )}
        </div>
      </div>

      {/* Add to Mesh button */}
      {onAddToMesh && (
        <Button
          variant="outline"
          size="sm"
          className="gba:w-full"
          onClick={e => {
            e.stopPropagation()
            onAddToMesh()
          }}
          data-testid={`agent-card-${agent.id}-add-mesh`}
        >
          <Plus className="gba:w-3 gba:h-3 gba:mr-1" /> Add to Mesh
        </Button>
      )}
    </div>
  )
}
