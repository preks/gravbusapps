import React from 'react'
import { Badge, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@newwork/nw-design-system'
import { getContactTypeLabel } from '@/common/data/relations/constants/contactConstants'
import { getContactTypeIcon, getContactTypeColor, getContactTypeIconColor } from '@/common/utils/contactTypeUtils'

interface ContactTypeBadgeProps {
  contactType?: string
  className?: string
}

/**
 * Badge that displays contact type icon inline
 * Appears next to the account name in AccountSection
 *
 * Only shows for Contact Records in AccountSection
 * Shows contactType (e.g., Founder Contact, Primary Contact, Secondary Contact)
 */
export const ContactTypeBadge: React.FC<ContactTypeBadgeProps> = ({ contactType, className = '' }) => {
  if (!contactType) return null

  const contactTypeLabel = getContactTypeLabel(contactType)
  if (!contactTypeLabel) return null

  const IconComponent = getContactTypeIcon(contactType)
  const backgroundColor = getContactTypeColor(contactType)
  const iconColor = getContactTypeIconColor(contactType)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`gba:h-5 gba:w-5 gba:p-0 gba:flex gba:items-center gba:justify-center gba:rounded-full gba:shadow-sm gba:cursor-help gba:border-0 ${backgroundColor} ${className}`}
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
  )
}
