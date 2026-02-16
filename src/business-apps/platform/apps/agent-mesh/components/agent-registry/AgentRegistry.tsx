import { useState, useMemo } from 'react'
import {
  Card,
  CardContent,
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { Grid3x3, Table2, Search } from 'lucide-react'
import type { AgentRegistryEntry } from '../../types/agentMesh'
import { AgentCardItem } from './AgentCardItem'

interface AgentRegistryProps {
  agents: AgentRegistryEntry[]
  onAgentClick: (id: string) => void
}

type ViewMode = 'grid' | 'table'

export const AgentRegistry = ({ agents, onAgentClick }: AgentRegistryProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [agentTypeFilter, setAgentTypeFilter] = useState<string>('all')
  const [divisionFilter, setDivisionFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Get unique filter options
  const agentTypes = useMemo(() => {
    const types = new Set<string>()
    agents.forEach(agent => {
      if (agent.agent_type) types.add(agent.agent_type)
    })
    return Array.from(types).sort()
  }, [agents])

  const divisions = useMemo(() => {
    const divs = new Set<string>()
    agents.forEach(agent => {
      if (agent.agent_card?.division) divs.add(agent.agent_card.division)
    })
    return Array.from(divs).sort()
  }, [agents])

  // Filter agents
  const filteredAgents = useMemo(() => {
    return agents.filter(agent => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          agent.name.toLowerCase().includes(query) ||
          agent.description?.toLowerCase().includes(query) ||
          agent.specialty?.toLowerCase().includes(query) ||
          agent.tags.some(tag => tag.toLowerCase().includes(query))
        if (!matchesSearch) return false
      }

      // Agent type filter
      if (agentTypeFilter !== 'all' && agent.agent_type !== agentTypeFilter) {
        return false
      }

      // Division filter
      if (divisionFilter !== 'all' && agent.agent_card?.division !== divisionFilter) {
        return false
      }

      // Status filter
      if (statusFilter !== 'all') {
        const isPublic = agent.is_public === true
        if (statusFilter === 'public' && !isPublic) return false
        if (statusFilter === 'private' && isPublic) return false
      }

      return true
    })
  }, [agents, searchQuery, agentTypeFilter, divisionFilter, statusFilter])

  // Get initials for table view
  const getInitials = (name: string): string => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid="agent-registry">
      {/* Filters and controls */}
      <div
        className="gba:flex gba:items-center gba:gap-3 gba:p-4 gba:border-b gba:border-border"
        data-testid="agent-registry-controls"
      >
        {/* Search */}
        <div className="gba:relative gba:flex-1 gba:max-w-md">
          <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="gba:pl-9"
            data-testid="agent-registry-search"
          />
        </div>

        {/* Filters */}
        <Select value={agentTypeFilter} onValueChange={setAgentTypeFilter} data-testid="agent-registry-type-filter">
          <SelectTrigger className="gba:w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {agentTypes.map(type => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={divisionFilter} onValueChange={setDivisionFilter} data-testid="agent-registry-division-filter">
          <SelectTrigger className="gba:w-[150px]">
            <SelectValue placeholder="Division" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Divisions</SelectItem>
            {divisions.map(div => (
              <SelectItem key={div} value={div}>
                {div}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter} data-testid="agent-registry-status-filter">
          <SelectTrigger className="gba:w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="public">Public</SelectItem>
            <SelectItem value="private">Private</SelectItem>
          </SelectContent>
        </Select>

        {/* View toggle */}
        <div
          className="gba:flex gba:gap-1 gba:border gba:border-border gba:rounded-md"
          data-testid="agent-registry-view-toggle"
        >
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            className="gba:rounded-r-none"
            onClick={() => setViewMode('grid')}
            data-testid="agent-registry-view-grid"
          >
            <Grid3x3 className="gba:w-4 gba:h-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            className="gba:rounded-l-none"
            onClick={() => setViewMode('table')}
            data-testid="agent-registry-view-table"
          >
            <Table2 className="gba:w-4 gba:h-4" />
          </Button>
        </div>
      </div>

      {/* Results count */}
      <div
        className="gba:px-4 gba:py-2 gba:border-b gba:border-border gba:text-sm gba:text-muted-foreground"
        data-testid="agent-registry-count"
      >
        {filteredAgents.length} {filteredAgents.length === 1 ? 'agent' : 'agents'}
      </div>

      {/* Content */}
      <div className="gba:flex-1 gba:overflow-y-auto gba:p-4">
        {filteredAgents.length === 0 ? (
          <div className="gba:text-center gba:py-12 gba:text-muted-foreground" data-testid="agent-registry-empty">
            No agents found
          </div>
        ) : viewMode === 'grid' ? (
          <div
            className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 xl:gba:grid-cols-4 gba:gap-2"
            data-testid="agent-registry-grid"
          >
            {filteredAgents.map(agent => (
              <AgentCardItem key={agent.id} agent={agent} onClick={() => onAgentClick(agent.id)} />
            ))}
          </div>
        ) : (
          <div className="gba:space-y-2" data-testid="agent-registry-table">
            {filteredAgents.map(agent => {
              const initials = getInitials(agent.name)
              const avatarColor = agent.color || '#6366f1'
              return (
                <Card
                  key={agent.id}
                  className="gba:cursor-pointer gba:transition-all gba:hover:bg-accent"
                  onClick={() => onAgentClick(agent.id)}
                  data-testid={`agent-table-row-${agent.id}`}
                >
                  <CardContent className="gba:p-4">
                    <div className="gba:flex gba:items-center gba:gap-4">
                      {/* Avatar */}
                      <div
                        className="gba:w-10 gba:h-10 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-white gba:font-semibold gba:text-sm gba:flex-shrink-0"
                        style={{ backgroundColor: avatarColor }}
                        data-testid={`agent-table-row-${agent.id}-avatar`}
                      >
                        {initials}
                      </div>

                      {/* Name and specialty */}
                      <div className="gba:flex-1 gba:min-w-0">
                        <div
                          className="gba:font-semibold gba:text-base gba:text-foreground gba:truncate"
                          data-testid={`agent-table-row-${agent.id}-name`}
                        >
                          {agent.name}
                        </div>
                        {agent.specialty && (
                          <div
                            className="gba:text-sm gba:text-muted-foreground gba:truncate"
                            data-testid={`agent-table-row-${agent.id}-specialty`}
                          >
                            {agent.specialty}
                          </div>
                        )}
                      </div>

                      {/* Type and status */}
                      <div className="gba:flex gba:items-center gba:gap-2">
                        {agent.agent_type && (
                          <Badge
                            variant="outline"
                            className="gba:text-xs"
                            data-testid={`agent-table-row-${agent.id}-type`}
                          >
                            {agent.agent_type}
                          </Badge>
                        )}
                        {agent.is_public !== null && (
                          <Badge
                            variant={agent.is_public ? 'success' : 'secondary'}
                            className="gba:text-xs"
                            data-testid={`agent-table-row-${agent.id}-status`}
                          >
                            {agent.is_public ? 'Public' : 'Private'}
                          </Badge>
                        )}
                      </div>

                      {/* Counts */}
                      <div className="gba:text-sm gba:text-muted-foreground gba:flex gba:gap-4">
                        <div data-testid={`agent-table-row-${agent.id}-tools-count`}>{agent.tools_count} tools</div>
                        <div data-testid={`agent-table-row-${agent.id}-knowledge-count`}>
                          {agent.knowledge_sources_count} knowledge
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
