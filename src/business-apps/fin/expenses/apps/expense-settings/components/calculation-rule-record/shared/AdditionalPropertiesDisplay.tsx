import React from 'react'
import { Badge, Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@newwork/nw-design-system'
import { InfoIcon } from '@phosphor-icons/react'
interface AdditionalPropertiesDisplayProps {
  additionalProperties?: Record<string, unknown>
  emptyLabel?: string
  tooltipTitle?: string
}

export const AdditionalPropertiesDisplay: React.FC<AdditionalPropertiesDisplayProps> = ({
  additionalProperties,
  emptyLabel = 'None',
  tooltipTitle = 'Additional Properties:'
}) => {
  if (!additionalProperties || Object.keys(additionalProperties).length === 0) {
    return <span className="gba:text-muted-foreground">{emptyLabel}</span>
  }

  const propertyCount = Object.keys(additionalProperties).length

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="gba:flex gba:items-center gba:gap-1 gba:cursor-help">
            <Badge variant="secondary">{propertyCount}</Badge>
            <Button variant="ghost" size="icon" className="gba:h-6 gba:w-6 gba:text-info">
              <InfoIcon className="gba:h-4 gba:w-4" />
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="gba:max-w-md gba:p-3 gba:bg-popover gba:text-popover-foreground">
          <div className="gba:font-medium gba:mb-2">{tooltipTitle}</div>
          <pre className="gba:text-xs gba:bg-background gba:text-foreground gba:p-2 gba:rounded gba:overflow-auto gba:max-h-64 gba:whitespace-pre-wrap gba:border">
            {JSON.stringify(additionalProperties, null, 2)}
          </pre>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
