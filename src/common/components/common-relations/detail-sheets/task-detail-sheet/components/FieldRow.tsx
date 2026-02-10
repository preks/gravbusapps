'use client'

import React from 'react'
import { Icon as PhosphorIcon } from '@phosphor-icons/react'

export interface FieldRowProps {
  icon: PhosphorIcon
  label: string
  children: React.ReactNode
  testId?: string
  align?: 'start' | 'center'
}

/**
 * FieldRow - Reusable component for displaying field label and value rows
 * Used throughout TaskDetailSheet for consistent field formatting
 *
 * @param align - Controls vertical alignment: 'center' for single-line content (default), 'start' for multi-line content
 */
export const FieldRow: React.FC<FieldRowProps> = ({
  icon: IconComponent,
  label,
  children,
  testId,
  align = 'center'
}) => {
  const alignmentClass = align === 'start' ? 'gba:items-start' : 'gba:items-center'

  return (
    <div className={`gba:flex ${alignmentClass} gba:gap-3 gba:py-2`} data-testid={testId}>
      <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-[100px] gba:text-sm gba:text-muted-foreground gba:shrink-0">
        <IconComponent size={14} className="gba:text-muted-foreground" />
        <span>{label}</span>
      </div>
      <div className="gba:flex-1 gba:min-w-0">{children}</div>
    </div>
  )
}
