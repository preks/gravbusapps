import React from 'react'
import { ArrowRightIcon } from '@phosphor-icons/react'

export interface ViewAllButtonProps {
  label: string
  onClick: () => void
  testId?: string
}

/** Quiet "View all" affordance shown under capped panel lists. */
const ViewAllButton: React.FC<ViewAllButtonProps> = ({ label, onClick, testId }) => (
  <button
    type="button"
    onClick={onClick}
    className="gba:group/viewall gba:mt-1 gba:flex gba:w-full gba:items-center gba:justify-center gba:gap-1 gba:rounded-lg gba:px-2 gba:py-1.5 gba:text-xs gba:font-medium gba:text-muted-foreground gba:transition-colors gba:hover:bg-accent gba:hover:text-foreground"
    data-testid={testId}
  >
    {label}
    <ArrowRightIcon className="gba:size-3.5 gba:transition-transform gba:group-hover/viewall:translate-x-0.5" />
  </button>
)

export default ViewAllButton
export { ViewAllButton }
