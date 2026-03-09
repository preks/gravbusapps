import React from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@newwork/nw-design-system'
import { getPhosphorIcon } from '@/common/utils/phosphorIconUtils'
import * as PhosphorIcons from '@phosphor-icons/react'

const phosphorIconKeySet: Set<string> = new Set(Object.keys(PhosphorIcons))
const phosphorIconKeySetLower: Map<string, string> = new Map(
  Object.keys(PhosphorIcons)
    .filter(key => /^[A-Z]/.test(key))
    .map(key => [key.toLowerCase(), key])
)

const isValidIconName = (iconName: string): boolean => {
  if (!iconName?.trim()) return false
  if (phosphorIconKeySet.has(iconName)) return true
  const nameWithoutIcon = iconName.replace(/Icon$/, '')
  if (phosphorIconKeySet.has(nameWithoutIcon)) return true
  return phosphorIconKeySetLower.has(iconName.toLowerCase())
}

const TruncatedText: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const textRef = React.useRef<HTMLSpanElement>(null)
  const [isTruncated, setIsTruncated] = React.useState(false)

  React.useLayoutEffect(() => {
    const checkTruncation = () => {
      if (textRef.current) {
        setIsTruncated(textRef.current.scrollWidth > textRef.current.clientWidth)
      }
    }

    checkTruncation()
    const currentElement = textRef.current
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' && currentElement ? new ResizeObserver(checkTruncation) : undefined

    if (resizeObserver && currentElement) {
      resizeObserver.observe(currentElement)
    }
    window.addEventListener('resize', checkTruncation)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', checkTruncation)
    }
  }, [text])

  const textSpan = (
    <span ref={textRef} className={`gba:block gba:truncate ${className || ''}`}>
      {text}
    </span>
  )

  if (!isTruncated) return textSpan

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{textSpan}</TooltipTrigger>
        <TooltipContent>
          <p>{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export const renderCatalogSelectOptionLabel = (
  text: string,
  icon: string | undefined,
  textClassName: string
): React.ReactNode => {
  const IconComponent = icon && isValidIconName(icon) ? getPhosphorIcon(icon) : null

  if (IconComponent) {
    return (
      <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0 gba:w-full">
        <IconComponent className="gba:w-4 gba:h-4 gba:flex-shrink-0" aria-label={text} />
        <TruncatedText text={text} className="gba:flex-1 gba:min-w-0" />
      </div>
    )
  }

  return <TruncatedText text={text} className={textClassName} />
}
