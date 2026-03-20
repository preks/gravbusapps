import { Card, CardContent, Badge, Button } from '@newwork/nw-design-system'
import { X, Loader2 } from 'lucide-react'
import type { AgentRegistryEntry } from '../../types/agentMesh'

interface AgentTableRowProps {
  agent: AgentRegistryEntry
  onClick: () => void
  onRemove: () => void
  isRemoving: boolean
}

export const AgentTableRow = ({ agent, onClick, onRemove, isRemoving }: AgentTableRowProps) => {
  const getInitials = (name: string): string => {
    const parts = name.split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.substring(0, 2).toUpperCase()
  }

  const initials = getInitials(agent.name)
  const avatarColor = agent.color || '#6366f1'

  return (
    <Card
      className="gba:group gba:cursor-pointer gba:transition-all gba:hover:bg-accent"
      onClick={onClick}
      data-testid={`agent-table-row-${agent.id}`}
    >
      <CardContent className="gba:p-4">
        <div className="gba:flex gba:items-center gba:gap-4">
          <div
            className="gba:w-10 gba:h-10 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-white gba:font-semibold gba:text-sm gba:flex-shrink-0"
            style={{ backgroundColor: avatarColor }}
          >
            {initials}
          </div>

          <div className="gba:flex-1 gba:min-w-0">
            <div className="gba:font-semibold gba:text-base gba:text-foreground gba:truncate">{agent.name}</div>
            {agent.specialty && (
              <div className="gba:text-sm gba:text-muted-foreground gba:truncate">{agent.specialty}</div>
            )}
          </div>

          <div className="gba:flex gba:items-center gba:gap-2">
            {agent.agent_card?.division && <Badge variant="secondary" className="gba:text-xs">{agent.agent_card.division}</Badge>}
            {agent.agent_type && <Badge variant="outline" className="gba:text-xs">{agent.agent_type}</Badge>}
          </div>

          <div className="gba:text-sm gba:text-muted-foreground gba:flex gba:gap-4">
            <div>{agent.tools_count} tools</div>
            <div>{agent.knowledge_sources_count} knowledge</div>
          </div>

          <Button
            size="sm"
            variant="ghost"
            className="gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity gba:text-destructive"
            onClick={e => { e.stopPropagation(); onRemove() }}
            disabled={isRemoving}
            data-testid={`agent-table-row-${agent.id}-remove`}
          >
            {isRemoving ? <Loader2 className="gba:w-3 gba:h-3 gba:animate-spin" /> : <X className="gba:w-4 gba:h-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
