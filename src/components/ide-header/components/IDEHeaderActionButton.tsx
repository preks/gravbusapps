import React from 'react'
import {
  AiButton,
  Button,
  Kbd,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
  type HeaderActionConfig
} from '@newwork/nw-design-system'

const DEFAULT_POPOVER_CLASS = 'nw:w-80 nw:p-0 nw:overflow-hidden'

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  if (target.isContentEditable || target.closest('[contenteditable="true"]')) {
    return true
  }

  const tagName = target.tagName
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT'
}

function getPlatform(): 'mac' | 'windows' | 'linux' {
  if (globalThis.window === undefined) {
    return 'linux'
  }

  const platform = globalThis.window.navigator.platform.toLowerCase()
  const userAgent = globalThis.window.navigator.userAgent.toLowerCase()

  if (platform.includes('mac') || userAgent.includes('mac')) {
    return 'mac'
  }

  if (platform.includes('win') || userAgent.includes('win')) {
    return 'windows'
  }

  return 'linux'
}

function formatHotkey(hotkey: NonNullable<HeaderActionConfig['hotkey']>): string {
  const isMac = getPlatform() === 'mac'
  let formatted = ''

  if (hotkey.mod) {
    formatted += isMac ? '⌘' : 'Ctrl+'
  }
  if (hotkey.shift) {
    formatted += isMac ? '⇧' : 'Shift+'
  }
  if (hotkey.alt) {
    formatted += isMac ? '⌥' : 'Alt+'
  }

  formatted += hotkey.key.toUpperCase()
  return formatted
}

function matchesHotkey(event: KeyboardEvent, hotkey: NonNullable<HeaderActionConfig['hotkey']>): boolean {
  const isMac = getPlatform() === 'mac'

  if (event.key.toLowerCase() !== hotkey.key.toLowerCase()) {
    return false
  }

  const modPressed = isMac ? event.metaKey : event.ctrlKey
  const wrongModPressed = isMac ? event.ctrlKey : event.metaKey

  if (!!hotkey.mod !== modPressed || wrongModPressed) {
    return false
  }

  if (!!hotkey.shift !== event.shiftKey) {
    return false
  }

  if (!!hotkey.alt !== event.altKey) {
    return false
  }

  return true
}

export interface IDEHeaderActionButtonProps extends HeaderActionConfig {
  popoverClassName?: string
  popoverOpen?: boolean
  onPopoverOpenChange?: (open: boolean) => void
}

export const IDEHeaderActionButton = React.memo(function IDEHeaderActionButton({
  onClick,
  icon,
  label,
  hotkey,
  active,
  variant = 'default',
  className,
  popoverContent,
  forceMount,
  popoverClassName = DEFAULT_POPOVER_CLASS,
  popoverOpen: popoverOpenProp,
  onPopoverOpenChange
}: IDEHeaderActionButtonProps) {
  const [mounted, setMounted] = React.useState(false)
  const [internalPopoverOpen, setInternalPopoverOpen] = React.useState(false)
  const isPopoverControlled = popoverOpenProp !== undefined
  const popoverOpen = isPopoverControlled ? popoverOpenProp : internalPopoverOpen
  const setPopoverOpen = React.useCallback(
    (open: boolean) => {
      if (isPopoverControlled) {
        onPopoverOpenChange?.(open)
      } else {
        setInternalPopoverOpen(open)
      }
    },
    [isPopoverControlled, onPopoverOpenChange]
  )

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isActive = active ?? (popoverContent ? popoverOpen : false)

  React.useEffect(() => {
    if (!hotkey || !onClick) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || isEditableTarget(event.target) || !matchesHotkey(event, hotkey)) {
        return
      }

      event.preventDefault()
      onClick()
    }

    globalThis.window.addEventListener('keydown', handleKeyDown)
    return () => globalThis.window.removeEventListener('keydown', handleKeyDown)
  }, [hotkey, onClick])

  const ariaLabel = React.useMemo(() => {
    if (!hotkey || !mounted) {
      return label
    }

    return `${label} (${formatHotkey(hotkey)})`
  }, [hotkey, label, mounted])

  const tooltipContent = (
    <span className="nw:inline-flex nw:items-center nw:gap-1.5">
      {label}
      {hotkey && mounted && <Kbd>{formatHotkey(hotkey)}</Kbd>}
    </span>
  )

  const triggerButton =
    variant === 'ai' ? (
      <AiButton
        variant={isActive ? 'default' : 'secondary'}
        size="iconSm"
        onClick={onClick}
        aria-label={ariaLabel}
        active={isActive}
        showIcon={!icon}
        className={cn('nw:rounded-full', className)}
      >
        {icon}
      </AiButton>
    ) : (
      <Button
        variant="secondary"
        size="iconSm"
        onClick={onClick}
        aria-label={ariaLabel}
        className={cn(
          'nw:rounded-full',
          isActive && 'nw:bg-primary nw:text-primary-foreground nw:hover:bg-primary/85',
          className
        )}
      >
        {icon}
      </Button>
    )

  if (popoverContent) {
    return (
      <Tooltip>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
          </TooltipTrigger>
          <PopoverContent
            align="end"
            className={cn(
              popoverClassName,
              forceMount && [
                'nw:data-[state=open]:[--tw-enter-opacity:0]',
                'nw:data-[state=open]:[animation-fill-mode:backwards]',
                'nw:data-[state=closed]:[animation-fill-mode:forwards]',
                'nw:data-[state=closed]:hidden'
              ]
            )}
            forceMount={forceMount}
          >
            {popoverContent}
          </PopoverContent>
        </Popover>
        <TooltipContent side="bottom">{tooltipContent}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{triggerButton}</TooltipTrigger>
      <TooltipContent side="bottom">{tooltipContent}</TooltipContent>
    </Tooltip>
  )
})

IDEHeaderActionButton.displayName = 'IDEHeaderActionButton'

export const NOTIFICATIONS_POPOVER_CLASS = 'nw:w-96 nw:min-w-96 nw:max-w-96 nw:box-border nw:p-0 nw:overflow-hidden'
