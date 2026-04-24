import { CaretRightIcon } from '@phosphor-icons/react'
import { SIDEBAR_SECTION_LABEL_CLASS } from './sidebarLayout.constants'

interface SidebarSectionHeaderProps {
  label: React.ReactNode
  /** Optional badge rendered on the right (e.g. "3" for active count). */
  badge?: React.ReactNode
  /**
   * When provided, the header becomes a button that toggles the section's
   * collapsed state. A caret is rendered before the label.
   */
  collapsible?: {
    isCollapsed: boolean
    onToggle: () => void
    /** Stable id for assistive tech — should match the panel's id. */
    controlsId: string
  }
}

export const SidebarSectionHeader: React.FC<SidebarSectionHeaderProps> = ({ label, badge, collapsible }) => {
  const contents = (
    <>
      <span className="gba:flex gba:items-center gba:gap-1.5 gba:min-w-0">
        {collapsible && (
          <CaretRightIcon
            className={`gba:h-3 gba:w-3 gba:shrink-0 gba:text-muted-foreground gba:transition-transform motion-reduce:gba:transition-none ${
              collapsible.isCollapsed ? '' : 'gba:rotate-90'
            }`}
            weight="bold"
            aria-hidden
          />
        )}
        <span className={SIDEBAR_SECTION_LABEL_CLASS}>{label}</span>
      </span>
      {badge ? (
        <span className="gba:inline-flex gba:items-center gba:justify-center gba:min-w-[1.25rem] gba:h-[1.25rem] gba:px-1.5 gba:rounded-full gba:bg-muted gba:text-[10px] gba:font-semibold gba:text-muted-foreground">
          {badge}
        </span>
      ) : null}
    </>
  )

  if (!collapsible) {
    return <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:pt-3 gba:pb-1.5">{contents}</div>
  }

  return (
    <button
      type="button"
      onClick={collapsible.onToggle}
      aria-expanded={!collapsible.isCollapsed}
      aria-controls={collapsible.controlsId}
      className="gba:flex gba:w-full gba:items-center gba:justify-between gba:px-3 gba:pt-3 gba:pb-1.5 gba:rounded-lg gba:transition-colors gba:hover:bg-muted/50 focus-visible:gba:outline-none focus-visible:gba:ring-2 focus-visible:gba:ring-foreground/25"
      data-testid={`sidebar-section-toggle-${collapsible.controlsId}`}
    >
      {contents}
    </button>
  )
}
