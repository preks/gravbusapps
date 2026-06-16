// Agent card for the Every Fabric agents screen.

import React from 'react'
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@newwork/nw-design-system'
import { IdentificationCardIcon, LightbulbIcon, WarningCircleIcon, WrenchIcon } from '@phosphor-icons/react'
import { evaluateAgentReadiness } from './agentStandard'
import type { FabricAgent } from './agentTypes'
import { agentDisplayLabel, hasWorkforceDeployment } from './agentTypes'
import { isImageAvatar, resolveAgentInitial } from './agentAvatarUtils'

interface AgentCardProps {
  agent: FabricAgent
  onConfigure?: (agent: FabricAgent) => void
  onArchive?: (agent: FabricAgent) => void
  isArchiving?: boolean
  /** When true, render a selection checkbox for bulk actions. */
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: (agent: FabricAgent) => void
}

function workerToneClass(isWorker: boolean, workerClass: string, standardClass: string): string {
  return isWorker ? workerClass : standardClass
}

const AgentCardSelectCheckbox: React.FC<{
  agent: FabricAgent
  displayName: string
  selected: boolean
  isWorker: boolean
  onToggleSelect?: (agent: FabricAgent) => void
}> = ({ agent, displayName, selected, isWorker, onToggleSelect }) => (
  <input
    type="checkbox"
    checked={selected}
    onChange={() => onToggleSelect?.(agent)}
    className={
      isWorker
        ? 'gba:mt-1 gba:h-4 gba:w-4 gba:shrink-0 gba:rounded gba:border-slate-400 gba:bg-white/70 gba:text-slate-700 gba:focus:ring-slate-400'
        : 'gba:mt-1 gba:h-4 gba:w-4 gba:shrink-0 gba:rounded gba:border-border gba:text-primary gba:focus:ring-primary'
    }
    aria-label={`Select ${displayName}`}
    data-testid={`agent-select-${agent.id}`}
  />
)

const AgentCardSkillsStats: React.FC<{
  skillsCount: number
  toolsInSkillsCount: number
  className: string
}> = ({ skillsCount, toolsInSkillsCount, className }) => (
  <div className={className}>
    <span>{skillsCount} skills</span>
    <span>{toolsInSkillsCount} tools in skills</span>
  </div>
)

const AgentCardTooltipLines: React.FC<{
  lines: string[]
  lineClassName?: string
  renderLine?: (line: string) => React.ReactNode
}> = ({ lines, lineClassName = 'gba:text-xs', renderLine }) => (
  <div className="gba:flex gba:max-w-xs gba:flex-col gba:gap-0.5">
    {lines.map(line => (
      <span key={line} className={lineClassName}>
        {renderLine ? renderLine(line) : line}
      </span>
    ))}
  </div>
)

const WORKER_CARD_CLASS =
  'gba:border-slate-500/70 gba:bg-linear-to-br gba:from-slate-100 gba:via-slate-300 gba:to-slate-500 gba:text-slate-950 gba:ring-1 gba:ring-white/70 gba:shadow-[0_18px_44px_-24px_rgba(15,23,42,0.75),inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(15,23,42,0.18),inset_1px_0_0_rgba(255,255,255,0.55),inset_-1px_0_0_rgba(15,23,42,0.16)]'

function resolveCardClass(isWorker: boolean, ready: boolean): string {
  if (isWorker) return WORKER_CARD_CLASS
  if (ready) return 'gba:border-border gba:bg-card'
  return 'gba:border-red-200 gba:bg-gradient-to-br gba:from-red-50/40 gba:via-card gba:to-card'
}

function resolveAvatarClass(ready: boolean, isWorker: boolean): string {
  if (ready) {
    if (isWorker) return 'gba:border-indigo-200 gba:bg-indigo-100 gba:text-indigo-700'
    return 'gba:border-sky-200 gba:bg-sky-50 gba:text-sky-700'
  }
  return 'gba:border-red-200 gba:bg-red-50 gba:text-red-700'
}

function resolvePrimaryActionLabel(ready: boolean, isWorker: boolean): string {
  if (ready) return isWorker ? 'Open Studio' : 'Configure'
  return 'Continue setup'
}

function resolveConfigureButtonClass(isWorker: boolean, ready: boolean): string {
  if (isWorker) {
    return 'gba:border-slate-300 gba:bg-slate-950 gba:text-white gba:shadow-[0_8px_18px_-14px_rgba(15,23,42,0.9)] gba:hover:bg-slate-800'
  }
  if (ready) return 'gba:border-sky-200 gba:text-sky-700 gba:hover:bg-sky-50'
  return 'gba:border-red-200 gba:text-red-700 gba:hover:bg-red-50'
}

const AgentNotReadyBadge: React.FC<{ agentId: string; setupLabel: string; reasons: string[] }> = ({
  agentId,
  setupLabel,
  reasons
}) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="gba:inline-flex gba:shrink-0 gba:cursor-default gba:items-center gba:gap-1 gba:rounded-full gba:bg-red-100 gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-semibold gba:text-red-700"
          data-testid={`agent-not-ready-badge-${agentId}`}
        >
          <WarningCircleIcon className="gba:h-3 gba:w-3 gba:shrink-0" weight="fill" />
          {setupLabel}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <AgentCardTooltipLines lines={reasons} renderLine={reason => reason} />
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
)

const AvatarFrame: React.FC<{
  avatar: string | null | undefined
  displayName: string
  className: string
  imageClassName: string
}> = ({ avatar, displayName, className, imageClassName }) => {
  if (isImageAvatar(avatar)) {
    return (
      <div className={className}>
        <img src={avatar} alt={`${displayName} avatar`} className={imageClassName} loading="lazy" />
      </div>
    )
  }
  return <div className={className}>{resolveAgentInitial(displayName)}</div>
}

function countDistinctSkillTools(agent: FabricAgent): number {
  const distinctSkillTools = new Set<string>()
  for (const refs of Object.values(agent.skill_tools_by_id ?? {})) {
    for (const ref of refs) distinctSkillTools.add(ref)
  }
  return distinctSkillTools.size
}

const AgentCardWorkerDecorations: React.FC = () => (
  <>
    <div className="gba:pointer-events-none gba:absolute gba:inset-0 gba:bg-linear-to-br gba:from-white/60 gba:via-white/20 gba:to-slate-500/20" />
    <div className="gba:pointer-events-none gba:absolute -gba:right-16 -gba:top-20 gba:h-44 gba:w-44 gba:rotate-45 gba:bg-white/40 gba:blur-2xl" />
    <div className="gba:pointer-events-none gba:absolute gba:inset-x-0 gba:top-0 gba:h-px gba:bg-white/95" />
    <div className="gba:pointer-events-none gba:absolute gba:inset-x-0 gba:bottom-0 gba:h-px gba:bg-slate-700/25" />
    <div className="gba:pointer-events-none gba:absolute gba:bottom-0 gba:right-0 gba:h-24 gba:w-36 gba:bg-linear-to-tl gba:from-slate-700/18 gba:to-transparent" />
  </>
)

const AgentCardWorkerHeader: React.FC<{
  agent: FabricAgent
  displayName: string
  cardDescriptor: string
  workerPassId: string
  toolsInSkillsCount: number
  setupLabel: string
  readinessReasons: string[]
  ready: boolean
  selectable: boolean
  selected: boolean
  onToggleSelect?: (agent: FabricAgent) => void
}> = ({
  agent,
  displayName,
  cardDescriptor,
  workerPassId,
  toolsInSkillsCount,
  setupLabel,
  readinessReasons,
  ready,
  selectable,
  selected,
  onToggleSelect
}) => (
  <div className="gba:relative gba:overflow-hidden gba:p-4 gba:pb-3">
    <div className="gba:pointer-events-none gba:absolute gba:left-12 gba:top-2 gba:h-12 gba:w-36 gba:rotate-[-18deg] gba:rounded-full gba:bg-white/34 gba:blur-xl" />
    <div className="gba:pointer-events-none gba:absolute gba:bottom-0 gba:right-0 gba:h-px gba:w-44 gba:bg-linear-to-l gba:from-slate-500/80 gba:to-transparent" />
    <div className="gba:relative gba:flex gba:items-start gba:gap-3">
      {selectable && (
        <AgentCardSelectCheckbox
          agent={agent}
          displayName={displayName}
          selected={selected}
          isWorker
          onToggleSelect={onToggleSelect}
        />
      )}
      <AvatarFrame
        avatar={agent.avatar}
        displayName={displayName}
        className="gba:flex gba:h-16 gba:w-16 gba:shrink-0 gba:items-center gba:justify-center gba:overflow-hidden gba:rounded-2xl gba:border gba:border-white/80 gba:bg-white/65 gba:text-base gba:font-bold gba:text-slate-700 gba:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(15,23,42,0.18),0_12px_26px_-16px_rgba(15,23,42,0.85)] gba:ring-1 gba:ring-slate-500/25"
        imageClassName="gba:h-full gba:w-full gba:object-cover"
      />
      <div className="gba:min-w-0 gba:flex-1">
        <div className="gba:flex gba:items-start gba:gap-2">
          <div className="gba:min-w-0 gba:flex-1">
            <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-1.5">
              <span
                className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:border gba:border-slate-400/70 gba:bg-white/58 gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-slate-800 gba:shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                data-testid={`agent-worker-label-${agent.id}`}
              >
                <IdentificationCardIcon className="gba:h-3 gba:w-3" weight="duotone" />
                Worker ID
              </span>
              <span className="gba:rounded-full gba:border gba:border-slate-400/60 gba:bg-slate-300/70 gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-slate-700">
                #{workerPassId}
              </span>
            </div>
            <h3 className="gba:mt-2 gba:truncate gba:text-sm gba:font-semibold gba:text-slate-950">{displayName}</h3>
            <p className="gba:mt-0.5 gba:truncate gba:text-[11px] gba:font-medium gba:text-slate-600">
              {cardDescriptor}
            </p>
          </div>
          {!ready && <AgentNotReadyBadge agentId={agent.id} setupLabel={setupLabel} reasons={readinessReasons} />}
        </div>
        <AgentCardSkillsStats
          skillsCount={agent.skills_count ?? 0}
          toolsInSkillsCount={toolsInSkillsCount}
          className="gba:mt-2 gba:flex gba:flex-wrap gba:items-center gba:gap-x-3 gba:gap-y-1 gba:text-[11px] gba:font-medium gba:text-slate-600"
        />
      </div>
    </div>
  </div>
)

const AgentCardStandardHeader: React.FC<{
  agent: FabricAgent
  displayName: string
  cardDescriptor: string
  avatarClass: string
  toolsInSkillsCount: number
  setupLabel: string
  readinessReasons: string[]
  ready: boolean
  selectable: boolean
  selected: boolean
  onToggleSelect?: (agent: FabricAgent) => void
}> = ({
  agent,
  displayName,
  cardDescriptor,
  avatarClass,
  toolsInSkillsCount,
  setupLabel,
  readinessReasons,
  ready,
  selectable,
  selected,
  onToggleSelect
}) => (
  <div className="gba:p-3">
    <div className="gba:flex gba:items-start gba:gap-2.5">
      {selectable && (
        <AgentCardSelectCheckbox
          agent={agent}
          displayName={displayName}
          selected={selected}
          isWorker={false}
          onToggleSelect={onToggleSelect}
        />
      )}
      <AvatarFrame
        avatar={agent.avatar}
        displayName={displayName}
        className={`gba:flex gba:h-9 gba:w-9 gba:shrink-0 gba:items-center gba:justify-center gba:overflow-hidden gba:rounded-lg gba:border gba:text-xs gba:font-bold ${avatarClass}`}
        imageClassName="gba:h-full gba:w-full gba:object-cover"
      />
      <div className="gba:flex-1 gba:min-w-0">
        <div className="gba:flex gba:items-start gba:gap-2">
          <div className="gba:min-w-0 gba:flex-1">
            <h3 className="gba:truncate gba:text-sm gba:font-semibold gba:text-foreground">{displayName}</h3>
            <p className="gba:mt-0.5 gba:truncate gba:text-[11px] gba:font-medium gba:text-muted-foreground">
              {cardDescriptor}
            </p>
          </div>
          <div className="gba:flex gba:shrink-0 gba:flex-wrap gba:items-center gba:justify-end gba:gap-1">
            {!ready && <AgentNotReadyBadge agentId={agent.id} setupLabel={setupLabel} reasons={readinessReasons} />}
          </div>
        </div>
        <p className="gba:mt-1.5 gba:line-clamp-1 gba:text-xs gba:leading-relaxed gba:text-muted-foreground">
          {agent.description || 'No description available.'}
        </p>
        <AgentCardSkillsStats
          skillsCount={agent.skills_count ?? 0}
          toolsInSkillsCount={toolsInSkillsCount}
          className="gba:mt-2 gba:flex gba:flex-wrap gba:items-center gba:gap-x-3 gba:gap-y-1 gba:text-[11px] gba:font-medium gba:text-muted-foreground"
        />
      </div>
    </div>
  </div>
)

const AgentCardSkillChip: React.FC<{ skillId: string; tools: string[]; isWorker: boolean }> = ({
  skillId,
  tools,
  isWorker
}) => {
  const chipClass = workerToneClass(
    isWorker,
    'gba:border gba:border-slate-300/80 gba:bg-white/55 gba:text-slate-700 gba:shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]',
    'gba:bg-amber-50 gba:text-amber-700'
  )
  const toolCountClass = workerToneClass(
    isWorker,
    'gba:bg-slate-200/80 gba:text-slate-600',
    'gba:bg-amber-100 gba:text-amber-800'
  )
  const chip = (
    <span
      className={`gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:px-2.5 gba:py-0.5 gba:text-[11px] gba:font-medium ${chipClass}`}
    >
      <LightbulbIcon className="gba:h-3 gba:w-3 gba:shrink-0" />
      {skillId}
      {tools.length > 0 && (
        <span
          className={`gba:ml-0.5 gba:inline-flex gba:items-center gba:gap-0.5 gba:rounded-full gba:px-1.5 gba:text-[10px] ${toolCountClass}`}
        >
          <WrenchIcon className="gba:h-2.5 gba:w-2.5 gba:shrink-0" />
          {tools.length}
        </span>
      )}
    </span>
  )

  if (tools.length === 0) return <span>{chip}</span>

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="gba:cursor-default gba:border-none gba:bg-transparent gba:p-0">
          {chip}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <AgentCardTooltipLines
          lines={tools}
          lineClassName="gba:flex gba:items-center gba:gap-1 gba:text-xs"
          renderLine={tool => (
            <>
              <WrenchIcon className="gba:h-3 gba:w-3 gba:shrink-0" />
              {tool}
            </>
          )}
        />
      </TooltipContent>
    </Tooltip>
  )
}

const AgentCardSkillsSection: React.FC<{
  agent: FabricAgent
  isWorker: boolean
  skillIds: string[]
  visibleSkillIds: string[]
  hiddenSkillCount: number
}> = ({ agent, isWorker, skillIds, visibleSkillIds, hiddenSkillCount }) => {
  const paddingClass = workerToneClass(isWorker, 'gba:px-4', 'gba:px-3')
  const emptyChipClass = workerToneClass(
    isWorker,
    'gba:border gba:border-slate-300/80 gba:bg-white/55 gba:text-slate-600',
    'gba:bg-muted/70 gba:text-muted-foreground'
  )
  const moreChipClass = workerToneClass(
    isWorker,
    'gba:border gba:border-slate-300/70 gba:bg-white/45 gba:text-slate-600',
    'gba:bg-muted/70 gba:text-muted-foreground'
  )

  if (skillIds.length === 0) {
    return (
      <div className={`${paddingClass} gba:pb-3`}>
        <span
          className={`gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:px-2.5 gba:py-0.5 gba:text-[11px] gba:font-medium ${emptyChipClass}`}
        >
          <LightbulbIcon className="gba:h-3 gba:w-3" />
          No skills assigned
        </span>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className={`gba:flex gba:flex-wrap gba:items-center gba:gap-1.5 ${paddingClass} gba:pb-3`}>
        {visibleSkillIds.map(sid => (
          <AgentCardSkillChip
            key={sid}
            skillId={sid}
            tools={agent.skill_tools_by_id?.[sid] ?? []}
            isWorker={isWorker}
          />
        ))}
        {hiddenSkillCount > 0 && (
          <span
            className={`gba:inline-flex gba:items-center gba:rounded-full gba:px-2.5 gba:py-0.5 gba:text-[11px] gba:font-medium ${moreChipClass}`}
          >
            +{hiddenSkillCount} more
          </span>
        )}
      </div>
    </TooltipProvider>
  )
}

export const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  onConfigure,
  onArchive,
  isArchiving = false,
  selectable = false,
  selected = false,
  onToggleSelect
}) => {
  const displayName = agentDisplayLabel(agent)
  const canArchive = agent.source === 'prompt_odm' || agent.source === 'autonomous_agent'
  const isWorker = hasWorkforceDeployment(agent)
  const toolsInSkillsCount = countDistinctSkillTools(agent)
  const readiness = evaluateAgentReadiness({
    skillCount: agent.skills_count ?? 0,
    toolsInSkillsCount,
    systemPromptLength: agent.system_prompt_length
  })
  const skillIds = agent.skill_ids ?? []
  const visibleSkillIds = skillIds.slice(0, 2)
  const hiddenSkillCount = Math.max(0, skillIds.length - visibleSkillIds.length)
  const cardDescriptor = agent.specialty || agent.domain || (isWorker ? 'Governed worker' : 'Configurable agent')
  const workerPassId = agent.id.slice(0, 8).toUpperCase()
  const setupLabel = readiness.reasons[0] ?? 'Needs setup'
  const primaryActionLabel = resolvePrimaryActionLabel(readiness.ready, isWorker)
  const cardClass = resolveCardClass(isWorker, readiness.ready)
  const avatarClass = resolveAvatarClass(readiness.ready, isWorker)
  const configureButtonClass = resolveConfigureButtonClass(isWorker, readiness.ready)

  return (
    <div
      className={`gba:relative gba:flex gba:flex-col gba:overflow-hidden gba:rounded-xl gba:border gba:shadow-sm gba:transition-shadow gba:hover:shadow-md ${cardClass}`}
      data-testid={`agent-card-${agent.id}`}
    >
      {isWorker && <AgentCardWorkerDecorations />}
      {isWorker ? (
        <AgentCardWorkerHeader
          agent={agent}
          displayName={displayName}
          cardDescriptor={cardDescriptor}
          workerPassId={workerPassId}
          toolsInSkillsCount={toolsInSkillsCount}
          setupLabel={setupLabel}
          readinessReasons={readiness.reasons}
          ready={readiness.ready}
          selectable={selectable}
          selected={selected}
          onToggleSelect={onToggleSelect}
        />
      ) : (
        <AgentCardStandardHeader
          agent={agent}
          displayName={displayName}
          cardDescriptor={cardDescriptor}
          avatarClass={avatarClass}
          toolsInSkillsCount={toolsInSkillsCount}
          setupLabel={setupLabel}
          readinessReasons={readiness.reasons}
          ready={readiness.ready}
          selectable={selectable}
          selected={selected}
          onToggleSelect={onToggleSelect}
        />
      )}

      <AgentCardSkillsSection
        agent={agent}
        isWorker={isWorker}
        skillIds={skillIds}
        visibleSkillIds={visibleSkillIds}
        hiddenSkillCount={hiddenSkillCount}
      />

      <div
        className={`gba:relative gba:mt-auto gba:border-t ${isWorker ? 'gba:border-slate-300/70 gba:px-4 gba:bg-white/25' : 'gba:border-border/50 gba:px-3'} gba:py-2.5`}
      >
        <div className="gba:flex gba:items-center gba:gap-2">
          <Button
            variant="outline"
            size="sm"
            className={`gba:flex-1 ${configureButtonClass}`}
            onClick={() => onConfigure?.(agent)}
            data-testid={`agent-configure-${agent.id}`}
          >
            {primaryActionLabel}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`gba:px-2 ${
              isWorker
                ? 'gba:text-slate-500 gba:hover:bg-slate-200/70 gba:hover:text-slate-900'
                : 'gba:text-muted-foreground gba:hover:bg-destructive/10 gba:hover:text-destructive'
            }`}
            disabled={!canArchive || isArchiving}
            onClick={() => onArchive?.(agent)}
            data-testid={`agent-archive-${agent.id}`}
          >
            {isArchiving ? 'Archiving...' : 'Archive'}
          </Button>
        </div>
      </div>
    </div>
  )
}
