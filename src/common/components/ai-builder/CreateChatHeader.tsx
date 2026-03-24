/**
 * Unified chat header for CREATE panels: bot avatar (optional clickable), title, subtitle, optional right slot, optional close.
 * Close button is built-in when onClose is set; apps should not add a custom close in rightSlot.
 */

import React from 'react'
import { Button, Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@newwork/nw-design-system'
import { Bot, PanelLeft, PanelLeftClose, X } from 'lucide-react'

export interface CreateChatHeaderProps {
  title: string
  subtitle?: string
  onAvatarClick?: () => void
  avatarTooltip?: string
  /** When onAvatarClick is set, pass true when panel is shown so icon shows "close" state. */
  avatarPanelOpen?: boolean
  rightSlot?: React.ReactNode
  /** When set, shows a close (X) button on the right side of the header. Use this instead of custom close in rightSlot. */
  onClose?: () => void
  className?: string
}

export const CreateChatHeader: React.FC<CreateChatHeaderProps> = ({
  title,
  subtitle,
  onAvatarClick,
  avatarTooltip,
  avatarPanelOpen = false,
  rightSlot,
  onClose,
  className = ''
}) => {
  const hasRight = rightSlot != null || onClose != null

  return (
    <div
      className={`gba:flex-shrink-0 gba:px-6 gba:py-3 gba:border-b gba:border-border gba:flex gba:items-center gba:justify-between gba:gap-3 ${className}`.trim()}
    >
      <div className="gba:flex gba:items-center gba:gap-3">
        {onAvatarClick ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="gba:w-8 gba:h-8 gba:cursor-pointer gba:group"
                  onClick={onAvatarClick}
                  aria-label={avatarTooltip}
                >
                  <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-gradient-to-br gba:from-purple-500 gba:to-blue-500 gba:flex gba:items-center gba:justify-center gba:group-hover:hidden">
                    <Bot className="gba:w-5 gba:h-5 gba:text-white" />
                  </div>
                  <div className="gba:hidden gba:group-hover:flex gba:w-8 gba:h-8 gba:items-center gba:justify-center gba:rounded-md gba:bg-muted hover:gba:bg-muted/80 gba:transition-colors">
                    {avatarPanelOpen ? (
                      <PanelLeftClose className="gba:w-4 gba:h-4 gba:text-foreground" />
                    ) : (
                      <PanelLeft className="gba:w-4 gba:h-4 gba:text-foreground" />
                    )}
                  </div>
                </button>
              </TooltipTrigger>
              {avatarTooltip ? <TooltipContent>{avatarTooltip}</TooltipContent> : null}
            </Tooltip>
          </TooltipProvider>
        ) : (
          <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-gradient-to-br gba:from-purple-500 gba:to-blue-500 gba:flex gba:items-center gba:justify-center">
            <Bot className="gba:w-5 gba:h-5 gba:text-white" />
          </div>
        )}
        <div>
          <h3 className="gba:text-sm gba:font-semibold">{title}</h3>
          {subtitle != null && <p className="gba:text-xs gba:text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {hasRight ? (
        <div className="gba:flex gba:items-center gba:gap-2">
          {rightSlot}
          {onClose ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="gba:h-8 gba:w-8"
              aria-label="Close"
            >
              <X className="gba:h-4 gba:w-4" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
