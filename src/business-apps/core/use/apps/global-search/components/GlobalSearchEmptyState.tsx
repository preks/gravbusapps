import React from 'react'

export interface GlobalSearchEmptyStateProps {
  query: string
}

export const GlobalSearchEmptyState: React.FC<GlobalSearchEmptyStateProps> = ({ query }) => {
  return (
    <div className="gba:py-12 gba:text-center" data-testid="GlobalSearchEmptyState">
      <p className="gba:text-sm gba:font-medium">No results found</p>
      <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
        {query.trim().length > 0 ? `Try another term instead of "${query}"` : 'Start typing to search'}
      </p>
    </div>
  )
}
