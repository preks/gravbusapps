import { useEffect, useState } from 'react'
import { ArrowsClockwise, Brain, ChartPieSlice, CurrencyDollar, MagnifyingGlass, Users } from '@phosphor-icons/react'
import type { SpecialistAgent } from '../../types/enterpriseAgent'
import { useEnterpriseAgentClient } from '../../hooks/useEnterpriseAgentClient'

// ─── Icon resolution ──────────────────────────────────────────────────────────

function getDomainIcon(domain: string, tags: string[]) {
  const combined = `${domain} ${tags.join(' ')}`.toLowerCase()
  if (/financ|revenue|budget|accounting|cost/.test(combined)) return CurrencyDollar
  if (/hr|human.resource|people|employee|leave|benefit/.test(combined)) return Users
  if (/strateg|analys|insight|synthesiz|intelligence/.test(combined)) return ChartPieSlice
  if (/workflow|automat|operations|process|orchestrat/.test(combined)) return ArrowsClockwise
  if (/market|research|competit|discover/.test(combined)) return MagnifyingGlass
  return Brain
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SkillSkeleton = () => (
  <div className="gba:h-[90px] gba:rounded-2xl gba:border gba:border-border gba:bg-muted/20 gba:animate-pulse" />
)

// ─── Agent card ───────────────────────────────────────────────────────────────

interface AgentCardProps {
  agent: SpecialistAgent
  isSelected: boolean
  onSelect: () => void
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, isSelected, onSelect }) => {
  const Icon = getDomainIcon(agent.domain, agent.tags)

  return (
    <button
      onClick={onSelect}
      data-testid={`fabric-skill-${agent.name}`}
      className={[
        'gba:text-left gba:rounded-2xl gba:border gba:p-4 gba:transition-all gba:group gba:flex gba:flex-col gba:gap-2',
        isSelected
          ? 'gba:border-primary gba:bg-primary/5 gba:ring-1 gba:ring-primary/40'
          : 'gba:border-border gba:bg-card gba:hover:border-primary/40 gba:hover:bg-primary/3 gba:hover:shadow-sm'
      ].join(' ')}
    >
      <div
        className={[
          'gba:flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:rounded-xl gba:transition-colors',
          isSelected
            ? 'gba:bg-primary/15 gba:text-primary'
            : 'gba:bg-muted gba:text-muted-foreground gba:group-hover:bg-primary/10 gba:group-hover:text-primary'
        ].join(' ')}
      >
        <Icon className="gba:h-3.5 gba:w-3.5" weight="duotone" />
      </div>

      <div className="gba:flex-1 gba:min-w-0">
        <p
          className={[
            'gba:text-xs gba:font-semibold gba:leading-tight gba:mb-0.5 gba:truncate',
            isSelected ? 'gba:text-primary' : 'gba:text-foreground'
          ].join(' ')}
        >
          {agent.display_name}
        </p>
        <p className="gba:text-[11px] gba:text-muted-foreground gba:leading-snug gba:line-clamp-2">
          {agent.description}
        </p>
      </div>
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SkillsGridProps {
  accessToken: string
  selectedAgent: SpecialistAgent | undefined
  onSelectAgent: (agent: SpecialistAgent | undefined) => void
}

export const SkillsGrid: React.FC<SkillsGridProps> = ({ accessToken, selectedAgent, onSelectAgent }) => {
  const client = useEnterpriseAgentClient(accessToken)
  const [agents, setAgents] = useState<SpecialistAgent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    client
      .listSpecialistAgents()
      .then(data => setAgents((data ?? []).filter(a => a.is_active !== false)))
      .catch(() => setAgents([]))
      .finally(() => setLoading(false))
  }, [client])

  const handleSelect = (agent: SpecialistAgent) => {
    onSelectAgent(selectedAgent?.name === agent.name ? undefined : agent)
  }

  if (loading) {
    return (
      <div className="gba:w-full" data-testid="fabric-skills-loading">
        <div className="gba:grid gba:grid-cols-2 gba:sm:grid-cols-3 gba:lg:grid-cols-4 gba:gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkillSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (agents.length === 0) {
    return null
  }

  return (
    <div className="gba:w-full" data-testid="fabric-skills-grid">
      <div className="gba:grid gba:grid-cols-2 gba:sm:grid-cols-3 gba:lg:grid-cols-4 gba:gap-3">
        {agents.map(agent => (
          <AgentCard
            key={agent.name}
            agent={agent}
            isSelected={selectedAgent?.name === agent.name}
            onSelect={() => handleSelect(agent)}
          />
        ))}
      </div>
      {selectedAgent && (
        <p className="gba:text-xs gba:text-center gba:text-muted-foreground gba:mt-3">
          Working with <span className="gba:font-semibold gba:text-primary">{selectedAgent.display_name}</span>
          {' — '}
          <button
            className="gba:underline gba:hover:text-foreground gba:transition-colors"
            onClick={() => onSelectAgent(undefined)}
          >
            clear
          </button>
        </p>
      )}
    </div>
  )
}
