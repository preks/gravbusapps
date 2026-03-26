import { CursorClick } from '@phosphor-icons/react'

export const NoSessionSelected = () => (
  <div
    className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:text-center gba:px-6"
    data-testid="enterprise-agent-no-session"
  >
    <CursorClick className="gba:h-8 gba:w-8 gba:text-muted-foreground/40 gba:mb-3" />
    <p className="gba:text-sm gba:text-muted-foreground">Select a session from the sidebar</p>
  </div>
)
