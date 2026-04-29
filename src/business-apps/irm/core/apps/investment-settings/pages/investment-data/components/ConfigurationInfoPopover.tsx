import React from 'react'
import { Button, Popover, PopoverContent, PopoverTrigger } from '@newwork/nw-design-system'
import { InfoIcon } from '@phosphor-icons/react'

interface ConfigurationInfoPopoverProps {
  title: string
  description: string
  items?: string[]
  ariaLabel: string
  prefixDataTestId?: string
}

export const ConfigurationInfoPopover: React.FC<ConfigurationInfoPopoverProps> = ({
  title,
  description,
  items,
  ariaLabel,
  prefixDataTestId
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="gba:h-7 gba:w-7 gba:shrink-0 gba:text-muted-foreground"
          aria-label={ariaLabel}
          onClick={event => event.stopPropagation()}
          data-testid={prefixDataTestId}
        >
          <InfoIcon className="gba:h-4 gba:w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="gba:w-80 gba:space-y-3 gba:p-4">
        <div>
          <h4 className="gba:m-0 gba:text-sm gba:font-semibold">{title}</h4>
          <p className="gba:m-0 gba:mt-1 gba:text-sm gba:text-muted-foreground">{description}</p>
        </div>
        {items && items.length > 0 && (
          <ul className="gba:m-0 gba:list-disc gba:space-y-1 gba:pl-4 gba:text-sm gba:text-muted-foreground">
            {items.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
