import { useState, useMemo } from 'react'
import {
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { Search, X } from 'lucide-react'
import type { AgentRegistryEntry } from '../../types/agentMesh'
import { AgentCardItem } from './AgentCardItem'

interface WorkspaceOption {
  _id?: string
  name: string
}

interface AgentRegistryProps {
  agents: AgentRegistryEntry[]
  onAgentClick: (id: string) => void
  meshAgentIds?: Set<string>
  onAddToMesh?: (agentId: string) => void
  onRemoveFromMesh?: (agentId: string) => void
  workspaces?: WorkspaceOption[]
  selectedWorkspace?: string
  onWorkspaceChange?: (value: string) => void
}

export const AgentRegistry = ({
  agents,
  onAgentClick,
  meshAgentIds,
  onAddToMesh,
  onRemoveFromMesh,
  workspaces = [],
  selectedWorkspace = 'all',
  onWorkspaceChange
}: AgentRegistryProps) => {
  const [activeTab, setActiveTab] = useState<'mesh' | 'discover'>('mesh')
  const [searchQuery, setSearchQuery] = useState('')
  const [agentTypeFilter, setAgentTypeFilter] = useState<string>('all')

  const workspaceMap = useMemo(() => {
    const map: Record<string, string> = {}
    workspaces.forEach(ws => {
      if (ws._id) map[ws._id] = ws.name
    })
    return map
  }, [workspaces])

  const agentTypes = useMemo(() => {
    const types = new Set<string>()
    agents.forEach(a => {
      if (a.agent_type) types.add(a.agent_type)
    })
    return Array.from(types).sort()
  }, [agents])

  const meshAgents = useMemo(() => agents.filter(a => meshAgentIds?.has(a.id)), [agents, meshAgentIds])

  const discoverableAgents = useMemo(() => {
    return agents
      .filter(a => !meshAgentIds?.has(a.id))
      .filter(a => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          const match =
            a.name.toLowerCase().includes(q) ||
            a.description?.toLowerCase().includes(q) ||
            a.specialty?.toLowerCase().includes(q) ||
            a.tags.some(t => t.toLowerCase().includes(q))
          if (!match) return false
        }
        if (agentTypeFilter !== 'all' && a.agent_type !== agentTypeFilter) return false
        return true
      })
  }, [agents, meshAgentIds, searchQuery, agentTypeFilter])

  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid="agent-registry">
      {/* 2nd-level pill nav */}
      <div
        className="gba:flex gba:items-center gba:gap-1 gba:px-4 gba:py-2 gba:bg-muted/40 gba:border-b gba:border-border gba:shrink-0 gba:overflow-x-auto"
        data-testid="agent-registry-tabs"
      >
        <button
          onClick={() => setActiveTab('mesh')}
          className={`gba:px-3 gba:py-1 gba:rounded-full gba:text-[11px] gba:font-medium gba:whitespace-nowrap gba:transition-colors ${
            activeTab === 'mesh'
              ? 'gba:bg-background gba:text-foreground gba:shadow-sm gba:border gba:border-border'
              : 'gba:text-muted-foreground gba:hover:text-foreground'
          }`}
          data-testid="agent-registry-tab-mesh"
        >
          In Mesh
          <Badge variant="secondary" className="gba:ml-1.5 gba:text-[9px] gba:px-1.5 gba:py-0">
            {meshAgents.length}
          </Badge>
        </button>
        <button
          onClick={() => setActiveTab('discover')}
          className={`gba:px-3 gba:py-1 gba:rounded-full gba:text-[11px] gba:font-medium gba:whitespace-nowrap gba:transition-colors ${
            activeTab === 'discover'
              ? 'gba:bg-background gba:text-foreground gba:shadow-sm gba:border gba:border-border'
              : 'gba:text-muted-foreground gba:hover:text-foreground'
          }`}
          data-testid="agent-registry-tab-discover"
        >
          Discover
          <Badge variant="outline" className="gba:ml-1.5 gba:text-[9px] gba:px-1.5 gba:py-0">
            {discoverableAgents.length}
          </Badge>
        </button>
      </div>

      {/* Mesh agents */}
      {activeTab === 'mesh' && (
        <div className="gba:flex-1 gba:overflow-y-auto gba:p-4">
          {meshAgents.length === 0 ? (
            <div
              className="gba:text-sm gba:text-muted-foreground gba:py-8 gba:text-center gba:border gba:border-dashed gba:border-border gba:rounded-lg"
              data-testid="agent-registry-mesh-empty"
            >
              No agents in your mesh yet. Switch to &quot;Discover&quot; to add some.
            </div>
          ) : (
            <div className="gba:space-y-1.5" data-testid="agent-registry-mesh-list">
              {meshAgents.map(agent => (
                <MeshAgentRow
                  key={agent.id}
                  agent={agent}
                  onClick={() => onAgentClick(agent.id)}
                  onRemove={onRemoveFromMesh ? () => onRemoveFromMesh(agent.id) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Discover agents */}
      {activeTab === 'discover' && (
        <div className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0">
          <div
            className="gba:flex gba:flex-wrap gba:items-center gba:gap-2 gba:p-4 gba:pb-3"
            data-testid="agent-registry-controls"
          >
            <div className="gba:relative gba:flex-1 gba:min-w-[200px]">
              <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="gba:pl-9 gba:h-9"
                data-testid="agent-registry-search"
              />
            </div>
            <Select value={agentTypeFilter} onValueChange={setAgentTypeFilter}>
              <SelectTrigger className="gba:w-[140px] gba:h-9" data-testid="agent-registry-type-filter">
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
            {workspaces.length > 0 && onWorkspaceChange && (
              <Select value={selectedWorkspace} onValueChange={onWorkspaceChange}>
                <SelectTrigger className="gba:w-[160px] gba:h-9" data-testid="agent-registry-workspace-filter">
                  <SelectValue placeholder="Workspace" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Workspaces</SelectItem>
                  {workspaces.map(ws => (
                    <SelectItem key={ws._id} value={ws._id || ''}>
                      {ws.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="gba:flex-1 gba:overflow-y-auto gba:px-4 gba:pb-4">
            {discoverableAgents.length === 0 ? (
              <div
                className="gba:text-center gba:py-8 gba:text-muted-foreground gba:text-sm"
                data-testid="agent-registry-empty"
              >
                {searchQuery || agentTypeFilter !== 'all' || selectedWorkspace !== 'all'
                  ? 'No agents match your filters'
                  : 'All available agents are already in your mesh'}
              </div>
            ) : (
              <div
                className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:xl:grid-cols-4 gba:gap-2"
                data-testid="agent-registry-grid"
              >
                {discoverableAgents.map(agent => (
                  <AgentCardItem
                    key={agent.id}
                    agent={agent}
                    onClick={() => onAgentClick(agent.id)}
                    onAddToMesh={onAddToMesh ? () => onAddToMesh(agent.id) : undefined}
                    workspaceName={workspaceMap[agent.workspace_id || agent.workspaceId || '']}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Compact row for an agent already in the mesh */
function MeshAgentRow({
  agent,
  onClick,
  onRemove
}: {
  agent: AgentRegistryEntry
  onClick: () => void
  onRemove?: () => void
}) {
  const initials =
    agent.name.split(' ').length >= 2
      ? `${agent.name.split(' ')[0][0]}${agent.name.split(' ')[1][0]}`.toUpperCase()
      : agent.name.substring(0, 2).toUpperCase()
  const avatarColor = agent.color || '#6366f1'

  return (
    <div
      className="gba:group gba:flex gba:items-center gba:gap-3 gba:p-2.5 gba:rounded-lg gba:border gba:border-border gba:bg-card gba:cursor-pointer gba:transition-colors gba:hover:bg-accent/50"
      onClick={onClick}
      data-testid={`mesh-agent-row-${agent.id}`}
    >
      <div
        className="gba:w-8 gba:h-8 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-white gba:font-semibold gba:text-[10px] gba:shrink-0"
        style={{ backgroundColor: avatarColor }}
      >
        {initials}
      </div>
      <div className="gba:flex-1 gba:min-w-0">
        <div className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{agent.name}</div>
        {agent.specialty && (
          <div className="gba:text-[10px] gba:text-muted-foreground gba:truncate">{agent.specialty}</div>
        )}
      </div>
      {agent.agent_type && (
        <Badge variant="outline" className="gba:text-[10px] gba:shrink-0">
          {agent.agent_type}
        </Badge>
      )}
      {onRemove && (
        <Button
          variant="ghost"
          size="sm"
          className="gba:w-7 gba:h-7 gba:p-0 gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity gba:text-muted-foreground gba:hover:text-destructive"
          onClick={e => {
            e.stopPropagation()
            onRemove()
          }}
          data-testid={`mesh-agent-row-${agent.id}-remove`}
        >
          <X className="gba:w-3.5 gba:h-3.5" />
        </Button>
      )}
    </div>
  )
}
