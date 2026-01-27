import React from 'react'
import { AVAILABLE_ABSENCE_TYPES } from './constants/absenceTypes'

interface AbsenceContextMenuProps {
  position: { x: number; y: number }
  onAbsenceTypeClick: (absenceTypeId: string, flowType: string) => void
}

/**
 * Context menu component for absence calendar
 * Displays available absence types that can be created via right-click
 */
export const AbsenceContextMenu: React.FC<AbsenceContextMenuProps> = ({ position, onAbsenceTypeClick }) => {
  return (
    <div
      className="gba:fixed gba:bg-popover gba:border gba:border-border gba:rounded-md gba:shadow-lg gba:z-[10000] gba:w-[180px] gba:py-1"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
      data-testid="absence-context-menu"
      onMouseDown={e => e.stopPropagation()}
    >
      {AVAILABLE_ABSENCE_TYPES.map(absenceType => (
        <div
          key={absenceType.id}
          className="gba:px-3 gba:py-2 gba:cursor-pointer gba:hover:bg-accent gba:text-sm gba:min-h-[2.5rem] gba:flex gba:items-center"
          onClick={() => onAbsenceTypeClick(absenceType.id, absenceType.flowType)}
          data-testid={`absence-type-${absenceType.id}`}
        >
          {absenceType.name}
        </div>
      ))}
    </div>
  )
}
