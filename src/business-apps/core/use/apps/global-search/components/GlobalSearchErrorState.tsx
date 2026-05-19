import React from 'react'

export interface GlobalSearchErrorStateProps {
  message: string
}

export const GlobalSearchErrorState: React.FC<GlobalSearchErrorStateProps> = ({ message }) => {
  return (
    <div className="gba:py-10 gba:text-center" data-testid="GlobalSearchErrorState">
      <p className="gba:text-sm gba:text-destructive">Search failed</p>
      <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">{message}</p>
    </div>
  )
}
