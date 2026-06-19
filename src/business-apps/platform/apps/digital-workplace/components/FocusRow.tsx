import React from 'react'
import { Badge, type BadgeProps } from '@newwork/nw-design-system'
import type { Icon } from '@phosphor-icons/react'

export interface FocusRowProps {
  /** Leading icon rendered in a tinted square. Ignored when `leading` is set. */
  glyph?: Icon
  /** Custom leading node (e.g. a sender avatar) shown instead of the glyph. */
  leading?: React.ReactNode
  title: string
  detail: string
  badgeLabel?: string
  badgeVariant?: BadgeProps['variant']
  onClick: () => void
  testId: string
  trailing?: React.ReactNode
}

/** Calm, borderless row used by the focus feed across all item types. */
const FocusRow: React.FC<FocusRowProps> = ({
  glyph: Glyph,
  leading,
  title,
  detail,
  badgeLabel,
  badgeVariant,
  onClick,
  testId,
  trailing
}) => (
  <div className="gba:flex gba:w-full gba:items-start gba:gap-2 gba:rounded-lg gba:px-2 gba:py-2 gba:transition-colors gba:hover:bg-accent">
    <button
      type="button"
      onClick={onClick}
      className="gba:flex gba:min-w-0 gba:flex-1 gba:items-start gba:gap-3 gba:text-left"
      data-testid={testId}
    >
      {leading ?? (
        <span className="gba:mt-0.5 gba:flex gba:size-8 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-md gba:bg-muted gba:text-muted-foreground">
          {Glyph ? <Glyph className="gba:size-4" /> : null}
        </span>
      )}
      <div className="gba:min-w-0 gba:flex-1">
        <div className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:min-w-0 gba:flex-1 gba:truncate gba:text-sm gba:font-medium gba:text-foreground">
            {title}
          </span>
          {badgeLabel ? (
            <Badge variant={badgeVariant} size="sm" className="gba:shrink-0">
              {badgeLabel}
            </Badge>
          ) : null}
        </div>
        <p className="gba:mt-0.5 gba:line-clamp-2 gba:text-xs gba:text-muted-foreground">{detail}</p>
      </div>
    </button>
    {trailing}
  </div>
)

export default FocusRow
export { FocusRow }
