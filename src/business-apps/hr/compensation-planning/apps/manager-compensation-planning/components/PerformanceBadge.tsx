import React from 'react'
import { Badge } from '@newwork/nw-design-system'

interface PerformanceBadgeProps {
  rating: string | null
  numericRating: number | null
}

function getBadgeVariant(numeric: number | null): 'success' | 'destructive' | 'warning' | 'secondary' | 'outline' {
  if (numeric == null) return 'secondary'
  if (numeric >= 4) return 'success'
  if (numeric >= 3) return 'outline'
  if (numeric >= 2) return 'warning'
  return 'destructive'
}

export const PerformanceBadge: React.FC<PerformanceBadgeProps> = ({ rating, numericRating }) => {
  if (!rating) {
    return <span className="gba:text-xs gba:text-muted-foreground">No evaluation</span>
  }

  return (
    <Badge variant={getBadgeVariant(numericRating)}>
      {numericRating != null && `${numericRating} · `}
      {rating}
    </Badge>
  )
}
