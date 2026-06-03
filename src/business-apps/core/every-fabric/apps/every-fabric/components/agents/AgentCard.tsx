// Agent card for the Every Fabric agents screen.

import React from 'react'
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@newwork/nw-design-system'
import { PlayIcon, WrenchIcon, LightbulbIcon } from '@phosphor-icons/react'
import { getSourceDisplay } from './agentSourceUtils'
import type { FabricAgent } from './agentTypes'

interface AgentCardProps {
  agent: FabricAgent
  onRunTask: (agent: FabricAgent) => void
  onConfigure?: (agent: FabricAgent) => void
  onArchive?: (agent: FabricAgent) => void
  isArchiving?: boolean
}

function resolveInitial(name: string): string {
  const parts = name.replace(/_/g, ' ').split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function formatAgentName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  onRunTask,
  onConfigure,
  onArchive,
  isArchiving = false
}) => {
  const displayName = formatAgentName(agent.name)
  const bgColor = agent.color ?? '#6366f1'
  const sourceDisplay = getSourceDisplay(agent.source)
  const canArchive = agent.source === 'prompt_odm' || agent.source === 'autonomous_agent'

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
              {agent.isWorkforce && (
                <span
                  className="gba:shrink-0 gba:rounded-full gba:bg-indigo-100 gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium gba:text-indigo-700"
                  data-testid={`agent-workforce-badge-${agent.id}`}
                >
                  Workforce
                </span>
              )}
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

      {/* Skills (full width). Each shows its tool count; hover reveals the attached tools. */}
      {agent.skill_ids && agent.skill_ids.length > 0 && (
        <TooltipProvider>
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-1.5 gba:px-4 gba:pb-3">
            {agent.skill_ids.map(sid => {
              const tools = agent.skill_tools_by_id?.[sid] ?? []
              const chip = (
                <span className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:bg-amber-50 gba:px-2.5 gba:py-0.5 gba:text-[11px] gba:font-medium gba:text-amber-700">
                  <LightbulbIcon className="gba:h-3 gba:w-3 gba:shrink-0" />
                  {sid}
                  {tools.length > 0 && (
                    <span className="gba:ml-0.5 gba:inline-flex gba:items-center gba:gap-0.5 gba:rounded-full gba:bg-amber-100 gba:px-1.5 gba:text-[10px] gba:text-amber-800">
                      <WrenchIcon className="gba:h-2.5 gba:w-2.5 gba:shrink-0" />
                      {tools.length}
                    </span>
                  )}
                </span>
              )
              if (tools.length === 0) return <span key={sid}>{chip}</span>
              return (
                <Tooltip key={sid}>
                  <TooltipTrigger asChild>
                    <button type="button" className="gba:cursor-default gba:border-none gba:bg-transparent gba:p-0">
                      {chip}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="gba:flex gba:max-w-xs gba:flex-col gba:gap-0.5">
                      {tools.map(tool => (
                        <span key={tool} className="gba:flex gba:items-center gba:gap-1 gba:text-xs">
                          <WrenchIcon className="gba:h-3 gba:w-3 gba:shrink-0" />
                          {tool}
                        </span>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </TooltipProvider>
      )}

      {/* Action buttons */}
      <div className="gba:mt-auto gba:grid gba:grid-cols-3 gba:items-center gba:gap-2 gba:border-t gba:border-border/50 gba:px-4 gba:py-3">
        <Button
          variant="outline"
          size="sm"
          className="gba:w-full"
          onClick={() => onConfigure?.(agent)}
          data-testid={`agent-configure-${agent.id}`}
        >
          Configure
        </Button>
        <Button size="sm" className="gba:w-full" onClick={() => onRunTask(agent)} data-testid={`agent-run-${agent.id}`}>
          <PlayIcon className="gba:mr-1.5 gba:h-3.5 gba:w-3.5" />
          Run task
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gba:w-full gba:border-destructive/30 gba:text-destructive gba:hover:bg-destructive/10"
          disabled={!canArchive || isArchiving}
          onClick={() => onArchive?.(agent)}
          data-testid={`agent-archive-${agent.id}`}
        >
          {isArchiving ? 'Archiving...' : 'Archive'}
        </Button>
      </div>
    </div>
  )
}
