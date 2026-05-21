import React from 'react'
import { Spinner } from '@newwork/nw-design-system'

export const GlobalSearchLoadingState: React.FC = () => {
  return (
    <div
      className="gba:flex gba:items-center gba:justify-center gba:py-10 gba:gap-2"
      data-testid="GlobalSearchLoadingState"
    >
      <Spinner size="sm" />
      <span className="gba:text-sm gba:text-muted-foreground">Searching...</span>
    </div>
  )
}
