import React from 'react'
import { Badge } from '@newwork/nw-design-system'

interface EntityLinkChipProps {
  entityId: string
  entityType: string
  displayName?: string
  onClick?: () => void
}

export const EntityLinkChip: React.FC<EntityLinkChipProps> = ({ entityId, entityType, displayName, onClick }) => {
  const getEntityIcon = () => {
    switch (entityType) {
      case 'employee':
        return '👤'
      case 'lead':
        return '⚡'
      case 'contact':
        return '👥'
      case 'opportunity':
        return '💰'
      case 'company':
      case 'account':
        return '🏢'
      case 'expense':
        return '💳'
      default:
        return '📄'
    }
  }

  return (
    <Badge
      variant="default"
      className={`gba:inline-flex gba:items-center gba:gap-1 gba:text-xs ${onClick ? 'gba:cursor-pointer hover:gba:bg-primary-secondary' : ''}`}
      onClick={onClick}
      data-testid={`entity-link-chip-${entityType}-${entityId}`}
    >
      <span>{getEntityIcon()}</span>
      <span>{displayName || entityId}</span>
    </Badge>
  )
}

export default EntityLinkChip
