// Agent card for the Every Fabric agents screen.

import { Button } from '@newwork/nw-design-system'
import { PlayIcon, WrenchIcon, LightbulbIcon } from '@phosphor-icons/react'
import { getSourceDisplay } from './agentSourceUtils'
import type { FabricAgent } from './agentTypes'

interface AgentCardProps {
  agent: FabricAgent
  onRunTask: (agent: FabricAgent) => void
  onConfigure?: (agent: FabricAgent) => void
}

function resolveInitial(name: string): string {
  const parts = name.replace(/_/g, ' ').split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function formatAgentName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent, onRunTask, onConfigure }) => {
  const displayName = formatAgentName(agent.name)
  const bgColor = agent.color ?? '#6366f1'
  const sourceDisplay = getSourceDisplay(agent.source)

  return (
    <div
      className="gba:flex gba:flex-col gba:rounded-xl gba:border gba:border-border gba:bg-card gba:shadow-sm gba:transition-shadow gba:hover:shadow-md"
      data-testid={`agent-card-${agent.id}`}
    >
      {/* Header: avatar, name, badges, description */}
      <div className="gba:p-4 gba:pb-3">
        <div className="gba:flex gba:items-start gba:gap-3">
          <div
            className="gba:flex gba:h-10 gba:w-10 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-lg gba:text-sm gba:font-bold gba:text-white"
            style={{ backgroundColor: bgColor }}
          >
            {resolveInitial(agent.name)}
          </div>
          <div className="gba:flex-1 gba:min-w-0">
            <div className="gba:flex gba:items-center gba:gap-1.5">
              <h3 className="gba:truncate gba:text-sm gba:font-semibold gba:text-foreground">{displayName}</h3>
              <span
                className={`gba:shrink-0 gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium ${sourceDisplay.badgeClass}`}
              >
                {sourceDisplay.label}
              </span>
              <span className="gba:ml-auto gba:shrink-0 gba:rounded-full gba:bg-emerald-100 gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium gba:text-emerald-700">
                active
              </span>
            </div>
            <p className="gba:mt-1 gba:line-clamp-2 gba:text-xs gba:leading-relaxed gba:text-muted-foreground">
              {agent.description || 'No description available.'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats row: value above label */}
      <div className="gba:flex gba:items-end gba:gap-6 gba:px-4 gba:py-3">
        <div>
          <p className="gba:text-lg gba:font-bold gba:text-foreground gba:leading-none">--</p>
          <p className="gba:mt-0.5 gba:text-[10px] gba:font-medium gba:uppercase gba:tracking-wider gba:text-muted-foreground">
            Runs this wk
          </p>
        </div>
        <div>
          <p className="gba:text-lg gba:font-bold gba:text-foreground gba:leading-none">--</p>
          <p className="gba:mt-0.5 gba:text-[10px] gba:font-medium gba:uppercase gba:tracking-wider gba:text-muted-foreground">
            Approved
          </p>
        </div>
        <div>
          <p className="gba:text-lg gba:font-bold gba:text-foreground gba:leading-none">{agent.tools_count}</p>
          <p className="gba:mt-0.5 gba:text-[10px] gba:font-medium gba:uppercase gba:tracking-wider gba:text-muted-foreground">
            Tools
          </p>
        </div>
        <div>
          <p className="gba:text-lg gba:font-bold gba:text-foreground gba:leading-none">{agent.skills_count ?? 0}</p>
          <p className="gba:mt-0.5 gba:text-[10px] gba:font-medium gba:uppercase gba:tracking-wider gba:text-muted-foreground">
            Skills
          </p>
        </div>
      </div>

      {/* Skill chips */}
      {agent.skill_ids && agent.skill_ids.length > 0 && (
        <div className="gba:flex gba:flex-wrap gba:gap-1.5 gba:px-4 gba:pb-2">
          {agent.skill_ids.slice(0, 3).map(sid => (
            <span
              key={sid}
              className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:bg-amber-50 gba:px-2.5 gba:py-0.5 gba:text-[11px] gba:font-medium gba:text-amber-700"
            >
              <LightbulbIcon className="gba:h-3 gba:w-3" />
              {sid}
            </span>
          ))}
          {agent.skill_ids.length > 3 && (
            <span className="gba:text-[11px] gba:text-muted-foreground">+{agent.skill_ids.length - 3} more</span>
          )}
        </div>
      )}

      {/* Tags */}
      <div className="gba:flex gba:flex-wrap gba:gap-1.5 gba:px-4 gba:pb-3">
        {agent.tags.length > 0 ? (
          agent.tags.slice(0, 4).map(tag => (
            <span
              key={tag}
              className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:bg-muted/60 gba:px-2.5 gba:py-0.5 gba:text-[11px] gba:text-muted-foreground"
            >
              <WrenchIcon className="gba:h-3 gba:w-3" />
              {tag}
            </span>
          ))
        ) : (
          <span className="gba:text-[11px] gba:text-muted-foreground/50 gba:italic">No tags</span>
        )}
      </div>

      {/* Action buttons */}
      <div className="gba:mt-auto gba:flex gba:items-center gba:gap-2 gba:border-t gba:border-border/50 gba:px-4 gba:py-3">
        <Button
          variant="outline"
          size="sm"
          className="gba:flex-1"
          onClick={() => onConfigure?.(agent)}
          data-testid={`agent-configure-${agent.id}`}
        >
          Configure
        </Button>
        <Button size="sm" className="gba:flex-1" onClick={() => onRunTask(agent)} data-testid={`agent-run-${agent.id}`}>
          <PlayIcon className="gba:mr-1.5 gba:h-3.5 gba:w-3.5" />
          Run task
        </Button>
      </div>
    </div>
  )
}
