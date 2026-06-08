import { ToggleLeftIcon, ToggleRightIcon } from '@phosphor-icons/react'

export const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="gba:flex gba:items-center gba:gap-3 gba:px-5 gba:pt-7 gba:pb-4">
    <span className="gba:flex gba:h-6 gba:w-6 gba:items-center gba:justify-center gba:rounded-md gba:bg-muted/60 gba:text-foreground/80 gba:[&>svg]:h-4.5 gba:[&>svg]:w-4.5 gba:[&>svg]:text-foreground/80">
      {icon}
    </span>
    <span className="gba:text-sm gba:uppercase gba:tracking-[0.14em] gba:font-bold gba:text-foreground/90">
      {title}
    </span>
  </div>
)

export const ToggleRow: React.FC<{
  label: string
  description: string
  enabled: boolean
  onToggle: () => void
  'data-testid'?: string
}> = ({ label, description, enabled, onToggle, 'data-testid': dataTestId }) => (
  <button
    type="button"
    onClick={onToggle}
    data-testid={dataTestId}
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
