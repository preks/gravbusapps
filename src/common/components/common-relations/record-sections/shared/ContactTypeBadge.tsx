import React from 'react'
import { Badge, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@newwork/nw-design-system'
import { getContactTypeLabel } from '@/common/data/relations/constants/contactConstants'
import { getContactTypeIcon, getContactTypeColor, getContactTypeIconColor } from '@/common/utils/contactTypeUtils'

interface ContactTypeBadgeProps {
  contactType?: string
  className?: string
}

/**
 * Badge overlay that displays contact type icon in a small circular badge
 * Appears in top-left corner of avatar (position: absolute)
 */
export const ContactTypeBadge: React.FC<ContactTypeBadgeProps> = ({ contactType, className = '' }) => {
  if (!contactType) return null

  const contactTypeLabel = getContactTypeLabel(contactType)
  if (!contactTypeLabel) return null

  const IconComponent = getContactTypeIcon(contactType)
  const backgroundColor = getContactTypeColor(contactType)
  const iconColor = getContactTypeIconColor(contactType)

  return (
    <div className={`gba:absolute gba:top-0 gba:left-0 gba:z-10 ${className}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={`gba:h-5 gba:w-5 gba:p-0 gba:flex gba:items-center gba:justify-center gba:rounded-full gba:shadow-md gba:cursor-help gba:border-0 ${backgroundColor}`}
              data-testid="contact-type-badge"
            >
              {IconComponent && <IconComponent className={`gba:w-3 gba:h-3 ${iconColor}`} weight="fill" />}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" align="center">
            <p className="gba:text-sm">{contactTypeLabel}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
