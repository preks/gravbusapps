import { HeadCircuitIcon, XIcon } from '@phosphor-icons/react'
import type { SpecialistAgent } from '../../types/enterpriseAgent'

export interface SelectedAgentChipProps {
  agent: SpecialistAgent
  /** When provided, renders a clear (×) affordance. Omit for read-only chips. */
  onClear?: () => void
  /** 'workspace' is a touch more compact than the landing composer chip. */
  size?: 'landing' | 'workspace'
}

/**
 * "Assigned agent" chip shown in the composer. Mirrors the blue enterprise
 * expert chip rendered inside the chat (see `ExpertCallRenderer`): a sky pill
 * with a circular icon badge and an "Expert / Name" label. Clearable on the
 * landing composer; rendered read-only inside an active session (the
 * assignment is fixed for that session's lifetime).
 */
export const SelectedAgentChip: React.FC<SelectedAgentChipProps> = ({ agent, onClear, size = 'landing' }) => {
  const padding = size === 'workspace' ? 'gba:px-2 gba:py-0.5' : 'gba:px-2 gba:py-1'
  const base = `gba:inline-flex gba:max-w-full gba:shrink-0 gba:items-center gba:gap-1.5 gba:rounded-full gba:border gba:border-sky-500/15 gba:bg-sky-50/60 ${padding} gba:text-sky-800 gba:shadow-[0_1px_4px_rgba(14,165,233,0.08)] dark:gba:border-sky-400/15 dark:gba:bg-sky-950/25 dark:gba:text-sky-200`

  const inner = (
    <>
      <span className="gba:flex gba:h-5 gba:w-5 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:bg-white/85 gba:text-foreground/70 gba:ring-1 gba:ring-sky-500/10 dark:gba:bg-sky-950/60 dark:gba:text-foreground/70">
        <HeadCircuitIcon className="gba:h-3 gba:w-3" weight="regular" />
      </span>
      <span className="gba:min-w-0 gba:truncate gba:text-[11px] gba:font-semibold gba:leading-none">
        <span className="gba:text-muted-foreground/80">Agent</span>
        <span className="gba:mx-1 gba:text-sky-500/70">/</span>
        <span>{agent.display_name}</span>
      </span>
      {onClear && (
        <span className="gba:flex gba:h-4 gba:w-4 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:text-sky-600/70 gba:transition-colors gba:hover:bg-sky-500/15 gba:hover:text-sky-700 dark:gba:text-sky-300/70">
          <XIcon className="gba:h-3 gba:w-3" weight="bold" />
        </span>
      )}
    </>
  )

  if (onClear) {
    return (
      <button
        type="button"
        onClick={onClear}
        className={`${base} gba:transition-colors gba:hover:bg-sky-100/70 dark:gba:hover:bg-sky-900/40`}
        title={`Working with ${agent.display_name}`}
        data-testid="composer-selected-agent"
      >
        {inner}
      </button>
    )
  }

  return (
    <span
      className={`${base} gba:select-none`}
      title={`Working with ${agent.display_name}`}
      data-testid="composer-selected-agent"
    >
      {inner}
    </span>
  )
}
