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
      <div className="gba:px-2 gba:py-1 gba:w-fit gba:max-w-full gba:min-h-[24px]">
        <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
          <Badge variant={getReferenceTypeBadgeVariant(reference.type) as any} className="gba:text-xs gba:shrink-0">
            {referenceTypeName}
          </Badge>
          <span className="gba:text-sm gba:font-medium gba:truncate">{reference.name}</span>
        </div>
      </div>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="gba:cursor-pointer gba:hover:bg-accent gba:px-2 gba:py-1 gba:rounded gba:transition-colors gba:w-fit gba:max-w-full gba:min-h-[24px] gba:border-0 gba:bg-transparent gba:text-left"
          onClick={onReferenceClick}
          data-testid={`${dataTestId}-reference-link`}
        >
          <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
            <Badge variant={getReferenceTypeBadgeVariant(reference.type) as any} className="gba:text-xs gba:shrink-0">
              {referenceTypeName}
            </Badge>
            <span className="gba:text-sm gba:font-medium gba:truncate">{reference.name}</span>
            <ArrowSquareOutIcon size={12} className="gba:text-muted-foreground gba:shrink-0" />
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent>View {reference.type} record</TooltipContent>
    </Tooltip>
  )
}
