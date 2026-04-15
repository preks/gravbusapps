import { ToggleLeftIcon, ToggleRightIcon } from '@phosphor-icons/react'

export const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="gba:flex gba:items-center gba:gap-2 gba:px-5 gba:pt-5 gba:pb-2">
    {icon}
    <span className="gba:text-[10px] gba:uppercase gba:tracking-widest gba:font-semibold gba:text-muted-foreground/75">
      {title}
    </span>
  </div>
)

export const ToggleRow: React.FC<{
  label: string
  description: string
  enabled: boolean
  onToggle: () => void
}> = ({ label, description, enabled, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className="gba:flex gba:items-center gba:gap-3 gba:w-full gba:rounded-xl gba:px-4 gba:py-3 gba:text-left gba:hover:bg-muted/30 gba:transition-colors"
  >
    <div className="gba:flex-1 gba:min-w-0">
      <p className="gba:text-sm gba:font-medium gba:text-foreground">{label}</p>
      <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">{description}</p>
    </div>
    {enabled ? (
      <ToggleRightIcon className="gba:h-6 gba:w-6 gba:text-primary gba:shrink-0" weight="fill" />
    ) : (
      <ToggleLeftIcon className="gba:h-6 gba:w-6 gba:text-muted-foreground/50 gba:shrink-0" weight="fill" />
    )}
  </button>
)

export const MetricCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="gba:rounded-xl gba:border gba:border-border/60 gba:bg-muted/20 gba:p-3">
    <p className="gba:text-xs gba:text-muted-foreground">{label}</p>
    <p className="gba:text-lg gba:font-semibold gba:text-foreground gba:mt-1">{value}</p>
  </div>
)
