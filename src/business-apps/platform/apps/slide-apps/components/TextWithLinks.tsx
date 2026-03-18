/**
 * TextWithLinks Component - Renders text content with clickable/highlighted links.
 */

import React, { useMemo, useState, useCallback } from 'react'
import { cn } from '@newwork/nw-design-system'
import type { TextLink } from './slideElements'
import { parseTextWithLinks, openLinkInNewTab } from '../utils/linkUtils'

export interface TextWithLinksProps {
  content: string
  links: TextLink[]
  style?: React.CSSProperties
  className?: string
  isEditing?: boolean
  isPresenting?: boolean
  onLinkClick?: (url: string, linkId: string, e: React.MouseEvent) => void
  'data-testid'?: string
}

interface LinkTooltipState {
  url: string
  x: number
  y: number
}

export const TextWithLinks: React.FC<TextWithLinksProps> = ({
  content,
  links,
  style,
  className,
  isEditing = false,
  isPresenting = false,
  onLinkClick,
  'data-testid': testId = 'text-with-links'
}) => {
  const [tooltip, setTooltip] = useState<LinkTooltipState | null>(null)

  const segments = useMemo(() => parseTextWithLinks(content, links || []), [content, links])

  const handleLinkClick = useCallback(
    (url: string, linkId: string, e: React.MouseEvent) => {
      if (isEditing) {
        e.preventDefault()
        e.stopPropagation()
        return
      }

      if (onLinkClick) {
        onLinkClick(url, linkId, e)
      } else if (isPresenting) {
        e.preventDefault()
        e.stopPropagation()
        openLinkInNewTab(url)
      }
    },
    [isEditing, isPresenting, onLinkClick]
  )

  const handleMouseEnter = useCallback(
    (url: string, e: React.MouseEvent) => {
      if (isPresenting && !isEditing) {
        const rect = (e.target as HTMLElement).getBoundingClientRect()
        setTooltip({
          url,
          x: rect.left + rect.width / 2,
          y: rect.top - 8
        })
      }
    },
    [isPresenting, isEditing]
  )

  const handleMouseLeave = useCallback(() => {
    setTooltip(null)
  }, [])

  if (segments.length === 0) {
    return (
      <span className={className} style={style} data-testid={testId}>
        {content}
      </span>
    )
  }

  return (
    <>
      <span className={className} style={style} data-testid={testId}>
        {segments.map((segment, index) => {
          if (segment.type === 'text') {
            return <span key={index}>{segment.content}</span>
          }

          const linkClassName = cn(
            'gba:underline gba:decoration-1 gba:underline-offset-2',
            isEditing
              ? 'gba:text-primary/80 gba:cursor-text'
              : 'gba:text-primary gba:cursor-pointer hover:gba:decoration-2'
          )

          return (
            <span
              key={index}
              className={linkClassName}
              onClick={e => handleLinkClick(segment.url!, segment.linkId!, e)}
              onMouseEnter={e => handleMouseEnter(segment.url!, e)}
              onMouseLeave={handleMouseLeave}
              data-testid={`${testId}-link-${index}`}
              data-link-id={segment.linkId}
              data-link-url={segment.url}
            >
              {segment.content}
            </span>
          )
        })}
      </span>

      {tooltip && (
        <div
          className={cn(
            'gba:fixed gba:z-[200] gba:px-3 gba:py-2 gba:rounded-lg',
            'gba:bg-popover gba:text-popover-foreground gba:shadow-lg gba:border',
            'gba:text-xs gba:max-w-xs gba:truncate',
            'gba:animate-in gba:fade-in gba:slide-in-from-bottom-1 gba:duration-150'
          )}
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)'
          }}
          data-testid={`${testId}-tooltip`}
        >
          <div className="gba:flex gba:items-center gba:gap-1.5">
            <span className="gba:text-muted-foreground">Click to open:</span>
            <span className="gba:text-primary gba:truncate">{tooltip.url}</span>
          </div>
        </div>
      )}
    </>
  )
}

export default TextWithLinks
