import React, { useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import { PiPlus } from 'react-icons/pi'

interface HoverAddButtonProps {
  afterOrder: number
  onAdd: (afterOrder: number) => void
  isVisible?: boolean
  isEditMode?: boolean
}

const HoverAddButton: React.FC<HoverAddButtonProps> = ({ afterOrder, onAdd, isVisible = false }) => {
  const [isHovered, setIsHovered] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAdd(afterOrder)
  }

  return (
    <div
      className="gba:relative gba:w-full gba:h-2 gba:group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`hover-add-button-${afterOrder}`}
    >
      {/* Hover detection area */}
      <div className="gba:absolute gba:inset-0 gba:z-10" />

      {/* Hover line */}
      <div
        className={`gba:absolute gba:top-1/2 gba:left-0 gba:right-0 gba:h-px gba:bg-primary gba:transition-opacity gba:duration-200 ${
          isHovered || isVisible ? 'gba:opacity-100' : 'gba:opacity-0'
        }`}
      />

      {/* Add button */}
      <div
        className={`gba:absolute gba:top-1/2 gba:left-1/2 gba:transform gba:-translate-x-1/2 gba:-translate-y-1/2 gba:transition-all gba:duration-200 gba:z-20 ${
          isHovered || isVisible ? 'gba:opacity-100 gba:scale-100' : 'gba:opacity-0 gba:scale-75'
        }`}
      >
        <Button
          variant="default"
          size="sm"
          onClick={handleClick}
          className="gba:w-6 gba:h-6 gba:rounded-full gba:p-0 gba:border-2 gba:border-background gba:bg-primary gba:text-primary-foreground gba:hover:bg-primary/90 gba:flex gba:items-center gba:justify-center"
          title={`Add assignment after position ${afterOrder}`}
          data-testid={`hover-add-button-add-btn-${afterOrder}`}
        >
          <PiPlus className="gba:text-xs" />
        </Button>
      </div>
    </div>
  )
}

export default HoverAddButton
