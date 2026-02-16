import { Badge } from '@newwork/nw-design-system'
import { Zap, BookOpen } from 'lucide-react'
import type { AgentRegistryEntry } from '../../types/agentMesh'

interface AgentCardItemProps {
  agent: AgentRegistryEntry
  onClick: () => void
}

export const AgentCardItem = ({ agent, onClick }: AgentCardItemProps) => {
  const getInitials = (name: string): string => {
    const parts = name.split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.substring(0, 2).toUpperCase()
  }

  const initials = getInitials(agent.name)
  const avatarColor = agent.color || '#6366f1'

  return (
    <div
      className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:rounded-lg gba:border gba:border-border gba:bg-card gba:cursor-pointer gba:transition-colors gba:hover:bg-accent/50"
      onClick={onClick}
      data-testid={`agent-card-${agent.id}`}
    >
      {/* Avatar */}
      <div
        className="gba:w-9 gba:h-9 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-white gba:font-semibold gba:text-xs gba:flex-shrink-0"
        style={{ backgroundColor: avatarColor }}
        data-testid={`agent-card-${agent.id}-avatar`}
      >
        {initials}
      </div>

      {/* Content */}
      <div className="gba:flex-1 gba:min-w-0">
        <div className="gba:flex gba:items-center gba:gap-2">
          <span
            className="gba:font-medium gba:text-sm gba:text-foreground gba:truncate"
            data-testid={`agent-card-${agent.id}-name`}
          >
            {agent.name}
          </span>
          {agent.agent_type && (
            <Badge
              variant="outline"
              className="gba:text-[10px] gba:px-1.5 gba:py-0"
              data-testid={`agent-card-${agent.id}-type`}
            >
              {agent.agent_type}
            </Badge>
          )}
        </div>
        {agent.specialty && (
          <p
            className="gba:text-xs gba:text-muted-foreground gba:truncate gba:mt-0.5"
            data-testid={`agent-card-${agent.id}-specialty`}
          >
            {agent.specialty}
          </p>
        )}
      </div>

      {/* Counts */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:text-[10px] gba:text-muted-foreground gba:flex-shrink-0">
        {agent.tools_count > 0 && (
          <span className="gba:flex gba:items-center gba:gap-0.5" data-testid={`agent-card-${agent.id}-tools-count`}>
            <Zap className="gba:w-3 gba:h-3" /> {agent.tools_count}
          </span>
        )}
        {agent.knowledge_sources_count > 0 && (
          <span
            className="gba:flex gba:items-center gba:gap-0.5"
            data-testid={`agent-card-${agent.id}-knowledge-count`}
          >
            <BookOpen className="gba:w-3 gba:h-3" /> {agent.knowledge_sources_count}
          </span>
        )}
      </div>
    </div>
  )
}
