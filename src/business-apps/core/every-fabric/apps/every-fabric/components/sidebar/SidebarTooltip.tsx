import React from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@newwork/nw-design-system'

interface SidebarTooltipProps {
  /** If true, suppresses the tooltip (used in expanded mode where labels are inline). */
  disabled?: boolean
  label: React.ReactNode
  /** Optional shortcut hint rendered below the label (e.g. "Ctrl+K"). */
  shortcut?: string
  children: React.ReactNode
}

/**
 * Small wrapper so collapsed-rail icons show a consistent "right-side" tooltip
 * without each call-site having to set up the provider boilerplate.
 */
export const SidebarTooltip: React.FC<SidebarTooltipProps> = ({ disabled = false, label, shortcut, children }) => {
  if (disabled) return <>{children}</>
  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side="right" className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:text-xs gba:font-medium">{label}</span>
          {shortcut ? (
            <span className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">{shortcut}</span>
          ) : null}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
