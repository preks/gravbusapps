'use client'

import React from 'react'
import { Badge, Tooltip, TooltipContent, TooltipTrigger } from '@newwork/nw-design-system'
import { ArrowSquareOutIcon } from '@phosphor-icons/react'
import { TaskReference } from '../types'

export interface ReferenceFieldProps {
  reference?: TaskReference
  buildReferenceUrl?: (reference: TaskReference) => string
  dataTestId?: string
  onReferenceClick: () => void
  getReferenceTypeBadgeVariant: (type: string) => string
}

/**
 * ReferenceField - Displays task reference with badge and optional navigation
 * Shows the related entity (opportunity, account, lead, contact, investment)
 */
export const ReferenceField: React.FC<ReferenceFieldProps> = ({
  reference,
  buildReferenceUrl,
  dataTestId,
  onReferenceClick,
  getReferenceTypeBadgeVariant
}) => {
  if (!reference) {
    return <span className="gba:text-sm gba:text-muted-foreground">No reference</span>
  }

  const referenceTypeName = reference.type.charAt(0).toUpperCase() + reference.type.slice(1)

  if (!buildReferenceUrl) {
    return (
      <div className="gba:max-w-[280px] gba:flex gba:items-center gba:gap-2 gba:px-2 gba:py-1 gba:min-h-[24px] gba:min-w-0">
        <Badge variant={getReferenceTypeBadgeVariant(reference.type) as any} className="gba:text-xs gba:shrink-0">
          {referenceTypeName}
        </Badge>
        <span className="gba:flex-1 gba:min-w-0 gba:text-sm gba:font-medium gba:truncate">{reference.name}</span>
      </div>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="gba:max-w-[280px] gba:flex gba:items-center gba:gap-2 gba:cursor-pointer gba:hover:bg-accent gba:px-2 gba:py-1 gba:rounded gba:transition-colors gba:min-h-[24px] gba:border-0 gba:bg-transparent gba:text-left gba:min-w-0"
          onClick={onReferenceClick}
          data-testid={`${dataTestId}-reference-link`}
        >
          <Badge variant={getReferenceTypeBadgeVariant(reference.type) as any} className="gba:text-xs gba:shrink-0">
            {referenceTypeName}
          </Badge>
          <span className="gba:flex-1 gba:min-w-0 gba:text-sm gba:font-medium gba:truncate">{reference.name}</span>
          <ArrowSquareOutIcon size={12} className="gba:text-muted-foreground gba:shrink-0" />
        </button>
      </TooltipTrigger>
      <TooltipContent>View {reference.type} record</TooltipContent>
    </Tooltip>
  )
}
