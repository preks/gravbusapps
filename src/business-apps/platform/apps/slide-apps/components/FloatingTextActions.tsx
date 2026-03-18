// Enterprise-grade floating toolbar for text element actions.

import React, { useState, useEffect, RefObject } from 'react'
import { Button, Tooltip, TooltipContent, TooltipTrigger, cn } from '@newwork/nw-design-system'
import { Mic, Pencil } from 'lucide-react'
import type { TextElement } from './slideElements'

export interface FloatingTextActionsProps {
  element: TextElement
  canvasScale: number
  canvasRef: RefObject<HTMLDivElement>
  onVoiceClick: () => void
  onEditClick: () => void
  isVoiceSupported: boolean
  className?: string
  'data-testid'?: string
}

export const FloatingTextActions: React.FC<FloatingTextActionsProps> = ({
  element,
  canvasScale,
  canvasRef,
  onVoiceClick,
  onEditClick,
  isVoiceSupported,
  className,
  'data-testid': testId = 'floating-text-actions'
}) => {
  const [updateTrigger, setUpdateTrigger] = useState(0)

  // Re-render on scroll/resize to update position
  useEffect(() => {
    const handleUpdate = () => setUpdateTrigger(n => n + 1)
    window.addEventListener('resize', handleUpdate)
    window.addEventListener('scroll', handleUpdate, true)
    return () => {
      window.removeEventListener('resize', handleUpdate)
      window.removeEventListener('scroll', handleUpdate, true)
    }
  }, [])

  // Find the actual DOM element and get its bounding rect
  // This gives us the exact screen position accounting for all transforms
  const elementDom = canvasRef.current?.querySelector(`[data-element-id="${element.id}"]`)
  const elementRect = elementDom?.getBoundingClientRect()
  const canvasRect = canvasRef.current?.getBoundingClientRect()

  if (!elementRect || !canvasRect) return null

  // Position toolbar centered above the element
  const toolbarHeight = 40
  const margin = 8
  const screenX = elementRect.left + elementRect.width / 2
  const screenY = elementRect.top - toolbarHeight - margin

  // Avoid unused variable warning
  void updateTrigger
  void canvasScale

  return (
    <div
      className={cn(
        'gba:fixed gba:z-[100] gba:flex gba:items-center gba:gap-1',
        'gba:bg-background/95 gba:backdrop-blur-sm gba:shadow-lg gba:rounded-lg',
        'gba:border gba:border-border/50 gba:p-1',
        'gba:animate-in gba:fade-in gba:slide-in-from-bottom-2 gba:duration-200',
        'gba:pointer-events-auto',
        className
      )}
      style={{
        left: screenX,
        top: Math.max(canvasRect.top, screenY),
        transform: 'translateX(-50%)'
      }}
      data-testid={testId}
    >
      {isVoiceSupported && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onVoiceClick}
              className="gba:h-8 gba:px-3 gba:gap-1.5 hover:gba:bg-primary/10 hover:gba:text-primary gba:transition-colors"
              data-testid={`${testId}-voice`}
            >
              <Mic className="gba:w-4 gba:h-4" />
              <span className="gba:text-xs gba:font-medium">Voice</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="gba:text-xs">
            <p>Dictate text with your voice</p>
          </TooltipContent>
        </Tooltip>
      )}

      <div className="gba:w-px gba:h-5 gba:bg-border" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEditClick}
            className="gba:h-8 gba:px-3 gba:gap-1.5 hover:gba:bg-primary/10 hover:gba:text-primary gba:transition-colors"
            data-testid={`${testId}-edit`}
          >
            <Pencil className="gba:w-4 gba:h-4" />
            <span className="gba:text-xs gba:font-medium">Edit</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="gba:text-xs">
          <p>Edit text in expanded view</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

export default FloatingTextActions
