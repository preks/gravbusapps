interface MeshStatusPillProps {
  agentCount: number
  toolCount: number
}

export const MeshStatusPill: React.FC<MeshStatusPillProps> = ({ agentCount, toolCount }) => {
  return (
    <span
      className="gba:inline-flex gba:items-center gba:gap-2 gba:rounded-full gba:bg-emerald-500/10 gba:px-3 gba:py-1.5 gba:text-[12px] gba:font-medium gba:text-emerald-700 dark:gba:text-emerald-400"
      data-testid="mesh-status-pill"
    >
      <span className="gba:relative gba:flex gba:h-2 gba:w-2 gba:items-center gba:justify-center" aria-hidden>
        <span className="gba:absolute gba:inline-flex gba:h-full gba:w-full gba:rounded-full gba:bg-emerald-500/40 gba:animate-ping" />
        <span className="gba:relative gba:inline-flex gba:h-2 gba:w-2 gba:rounded-full gba:bg-emerald-500" />
      </span>
      <span>
        {agentCount} agent{agentCount === 1 ? '' : 's'} online · {toolCount} tool{toolCount === 1 ? '' : 's'} reachable
      </span>
    </span>
  )
}
