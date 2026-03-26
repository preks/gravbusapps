import { SpinnerGap } from '@phosphor-icons/react'

export const BackgroundBadge = () => (
  <div
    className="gba:inline-flex gba:items-center gba:gap-1.5 gba:px-2.5 gba:py-1 gba:rounded-full gba:bg-muted gba:text-foreground gba:text-xs gba:font-medium"
    data-testid="enterprise-agent-background-badge"
  >
    <SpinnerGap className="gba:h-3 gba:w-3 gba:animate-spin" />
    Running in background
  </div>
)
