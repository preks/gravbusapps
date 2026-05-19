import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { MagnifyingGlassIcon } from '@phosphor-icons/react'

export interface GlobalSearchTriggerProps {
  onClick: () => void
}

export const GlobalSearchTrigger: React.FC<GlobalSearchTriggerProps> = ({ onClick }) => {
  return (
    <Button
      variant="outline"
      className="gba:w-[320px] gba:justify-between gba:text-muted-foreground"
      onClick={onClick}
      data-testid="GlobalSearchTrigger"
    >
      <span className="gba:flex gba:items-center gba:gap-2">
        <MagnifyingGlassIcon size={14} />
        Search in NEWWORK
      </span>
      <kbd className="gba:text-[10px] gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-muted">⌘K</kbd>
    </Button>
  )
}
