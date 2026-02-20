import { Badge } from '@newwork/nw-design-system'
import type { AgentRegistryEntry } from '../../types/agentMesh'

interface AgentOverviewTabProps {
  agent: AgentRegistryEntry
}

export const AgentOverviewTab = ({ agent }: AgentOverviewTabProps) => {
  // Get initials from agent name
  const getInitials = (name: string): string => {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const initials = getInitials(agent.name)
  const avatarColor = agent.color || '#6366f1'
  const createdDate = agent.created_at ? new Date(agent.created_at).toLocaleDateString() : 'N/A'
  const agentCard = agent.agent_card

  // Get access policy badge variant
  const getAccessPolicyVariant = (policy: string): 'success' | 'secondary' | 'warning' => {
    switch (policy) {
      case 'public':
        return 'success'
      case 'division_only':
        return 'secondary'
      case 'steering_only':
        return 'warning'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6" data-testid="agent-overview-tab">
      {/* Left column */}
      <div className="gba:space-y-4" data-testid="agent-overview-left">
        {/* Avatar and name */}
        <div className="gba:flex gba:items-center gba:gap-4">
          <div
            className="gba:w-16 gba:h-16 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-white gba:font-semibold gba:text-xl gba:flex-shrink-0"
            style={{ backgroundColor: avatarColor }}
            data-testid="agent-overview-avatar"
          >
            {initials}
          </div>
          <div className="gba:flex-1 gba:min-w-0">
            <div className="gba:font-semibold gba:text-xl gba:text-foreground" data-testid="agent-overview-name">
              {agent.name}
            </div>
            {agent.specialty && (
              <div className="gba:text-sm gba:text-muted-foreground gba:mt-1" data-testid="agent-overview-specialty">
                {agent.specialty}
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        {agent.is_public !== null && (
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:text-muted-foreground">Status:</span>
            <Badge
              variant={agent.is_public ? 'success' : 'secondary'}
              className="gba:text-xs"
              data-testid="agent-overview-status"
            >
              {agent.is_public ? 'Public' : 'Private'}
            </Badge>
          </div>
        )}

        {/* Created date */}
        <div className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:text-sm gba:text-muted-foreground">Created:</span>
          <span className="gba:text-sm gba:text-foreground" data-testid="agent-overview-created">
            {createdDate}
          </span>
        </div>

        {/* Query count placeholder */}
        <div className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:text-sm gba:text-muted-foreground">Queries:</span>
          <span className="gba:text-sm gba:text-foreground" data-testid="agent-overview-query-count">
            N/A
          </span>
        </div>
      </div>

      {/* Right column - Agent Card metadata */}
      <div className="gba:space-y-4" data-testid="agent-overview-right">
        {agentCard ? (
          <>
            {/* Division */}
            {agentCard.division && (
              <div>
                <div
                  className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-2"
                  data-testid="agent-overview-division-label"
                >
                  Division
                </div>
                <div className="gba:text-sm gba:text-foreground" data-testid="agent-overview-division">
                  {agentCard.division}
                </div>
              </div>
            )}

            {/* Data domains */}
            {agentCard.data_domains && agentCard.data_domains.length > 0 && (
              <div>
                <div
                  className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-2"
                  data-testid="agent-overview-domains-label"
                >
                  Data Domains
                </div>
                <div className="gba:flex gba:flex-wrap gba:gap-2">
                  {agentCard.data_domains.map((domain, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="gba:text-xs"
                      data-testid={`agent-overview-domain-${index}`}
                    >
                      {domain}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Capabilities */}
            {agentCard.capabilities && agentCard.capabilities.length > 0 && (
              <div>
                <div
                  className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-2"
                  data-testid="agent-overview-capabilities-label"
                >
                  Capabilities
                </div>
                <ul className="gba:list-disc gba:list-inside gba:text-sm gba:text-foreground gba:space-y-1">
                  {agentCard.capabilities.map((capability, index) => (
                    <li key={index} data-testid={`agent-overview-capability-${index}`}>
                      {capability}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Access policy */}
            {agentCard.access_policy && (
              <div>
                <div
                  className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-2"
                  data-testid="agent-overview-policy-label"
                >
                  Access Policy
                </div>
                <Badge
                  variant={getAccessPolicyVariant(agentCard.access_policy)}
                  className="gba:text-xs"
                  data-testid="agent-overview-policy"
                >
                  {agentCard.access_policy.replace('_', ' ')}
                </Badge>
              </div>
            )}

            {/* Version */}
            {agentCard.version && (
              <div>
                <div
                  className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-2"
                  data-testid="agent-overview-version-label"
                >
                  Version
                </div>
                <div className="gba:text-sm gba:text-foreground" data-testid="agent-overview-version">
                  {agentCard.version}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="gba:text-sm gba:text-muted-foreground" data-testid="agent-overview-no-card">
            No agent card metadata available
          </div>
        )}
      </div>
    </div>
  )
}
