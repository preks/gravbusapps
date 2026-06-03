// Small uppercase label used as a group header in the sidebar (e.g.
// "WORKSPACE", "ACTIVE SESSION"). Hidden in collapsed mode where the
// rail icons speak for themselves.

interface SidebarSectionLabelProps {
  label: string
  isCollapsed: boolean
  testId?: string
}

export const SidebarSectionLabel: React.FC<SidebarSectionLabelProps> = ({ label, isCollapsed, testId }) => {
  if (isCollapsed) {
    return <div className="gba:mx-3 gba:my-1.5 gba:border-t gba:border-border/40" />
  }

  return (
    <div className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:pt-3 gba:pb-1" data-testid={testId}>
      <span className="gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-[0.16em] gba:text-muted-foreground/80">
        {label}
      </span>
      <div className="gba:flex-1 gba:border-t gba:border-border/40" />
    </div>
  )
}
