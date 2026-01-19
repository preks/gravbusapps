import React from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@newwork/nw-design-system'
import { WarningCircleIcon } from '@phosphor-icons/react'

interface FieldErrorTooltipProps {
  error: string | undefined
}

export const FieldErrorTooltip: React.FC<FieldErrorTooltipProps> = ({ error }) => {
  if (!error) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <WarningCircleIcon
            className="gba:h-4 gba:w-4 gba:text-destructive gba:cursor-help gba:shrink-0"
            data-testid="field-error-tooltip-icon"
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>{error}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default FieldErrorTooltip
