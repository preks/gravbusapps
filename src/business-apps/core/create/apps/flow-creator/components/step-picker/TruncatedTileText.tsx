import React, { useEffect, useRef, useState } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@newwork/nw-design-system'

interface TruncatedTileTextProps {
  text: string
  variant: 'title' | 'description'
  'data-testid'?: string
}

export const TruncatedTileText: React.FC<TruncatedTileTextProps> = ({ text, variant, 'data-testid': testId }) => {
  const ref = useRef<HTMLSpanElement>(null)
  const [isTruncated, setIsTruncated] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const updateTruncation = () => {
      setIsTruncated(element.scrollWidth > element.clientWidth)
    }

    updateTruncation()
    const observer = new ResizeObserver(updateTruncation)
    observer.observe(element)
    return () => observer.disconnect()
  }, [text])

  const className =
    variant === 'title'
      ? 'gba:block gba:w-full gba:truncate gba:text-xs gba:font-semibold gba:text-foreground'
      : 'gba:block gba:w-full gba:truncate gba:text-xs gba:text-muted-foreground'

  const label = (
    <span ref={ref} className={className} data-testid={testId}>
      {text}
    </span>
  )

  if (!isTruncated) return label

  return (
    <Tooltip>
      <TooltipTrigger asChild>{label}</TooltipTrigger>
      <TooltipContent side="top" className="gba:max-w-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}

interface TruncatedTileTextGroupProps {
  children: React.ReactNode
}

export const TruncatedTileTextGroup: React.FC<TruncatedTileTextGroupProps> = ({ children }) => (
  <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
)
