import { useState } from 'react'
import { CaretDownIcon, CaretUpIcon } from '@phosphor-icons/react'

interface PanelCardProps {
  title: string
  badge?: number
  /** Compact one-line summary rendered in the header — visible even when the card is collapsed
   * (e.g. "3 of 5 steps", "12 events"). Helps the rail stay informative without expanding everything. */
  summary?: string
  extra?: React.ReactNode
  defaultOpen?: boolean
  /** When true, the card is rendered with reduced visual weight (faded border, transparent background,
   * dimmed title). Use for developer-only or auxiliary panels that should not draw the user's attention. */
  subdued?: boolean
  children: React.ReactNode
}

export const PanelCard: React.FC<PanelCardProps> = ({
  title,
  badge,
  summary,
  extra,
  defaultOpen = true,
  subdued = false,
  children
}) => {
  const [open, setOpen] = useState(defaultOpen)
  const slug = title.toLowerCase().replace(/\s+/g, '-')

  const containerClass = subdued
    ? 'gba:group gba:flex gba:min-h-0 gba:shrink-0 gba:flex-col gba:rounded-[1.25rem] sm:gba:rounded-[1.5rem] gba:border gba:border-muted gba:bg-transparent gba:overflow-hidden'
    : 'gba:group gba:flex gba:min-h-0 gba:shrink-0 gba:flex-col gba:rounded-[1.25rem] sm:gba:rounded-[1.5rem] gba:border gba:border-border/60 gba:bg-card gba:overflow-hidden gba:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-14px_rgba(15,23,42,0.10)] gba:transition-shadow gba:duration-200 gba:hover:shadow-[0_1px_2px_rgba(15,23,42,0.05),0_16px_36px_-16px_rgba(15,23,42,0.14)]'

  const headerWrapperClass = subdued
    ? 'gba:flex gba:min-h-0 gba:items-stretch gba:shrink-0'
    : 'gba:flex gba:min-h-0 gba:items-stretch gba:bg-gradient-to-b gba:from-muted/20 gba:to-transparent gba:shrink-0'

  const titleClass = subdued
    ? 'gba:shrink-0 gba:text-[11px] gba:font-medium gba:uppercase gba:tracking-[0.1em] gba:text-muted-foreground/60'
    : 'gba:shrink-0 gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-[0.1em] gba:text-foreground'

  return (
    <div className={containerClass}>
      <div className={headerWrapperClass}>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
          className="gba:flex gba:flex-1 gba:min-w-0 gba:items-center gba:justify-between gba:gap-3 gba:px-4 gba:py-3 sm:gba:py-3.5 gba:text-left gba:hover:bg-muted/15 gba:transition-colors"
          data-testid={`fabric-panel-card-${slug}`}
        >
          <div className="gba:flex gba:min-w-0 gba:flex-1 gba:items-center gba:gap-2">
            <span className={titleClass}>{title}</span>
            {badge !== undefined && badge > 0 && (
              <span className="gba:inline-flex gba:shrink-0 gba:items-center gba:justify-center gba:min-w-[20px] gba:h-[18px] gba:px-1.5 gba:rounded-full gba:text-[10px] gba:font-semibold gba:bg-foreground/10 gba:text-foreground/70">
                {badge}
              </span>
            )}
            {summary && (
              <span className="gba:hidden sm:gba:block gba:min-w-0 gba:flex-1 gba:truncate gba:text-[11px] gba:font-medium gba:text-muted-foreground/80">
                {summary}
              </span>
            )}
          </div>
          {open ? (
            <CaretUpIcon className="gba:h-3.5 gba:w-3.5 gba:shrink-0 gba:text-muted-foreground/70" aria-hidden />
          ) : (
            <CaretDownIcon className="gba:h-3.5 gba:w-3.5 gba:shrink-0 gba:text-muted-foreground/70" aria-hidden />
          )}
        </button>
        {extra != null && (
          <div className="gba:flex gba:shrink-0 gba:items-center gba:gap-1 gba:border-l gba:border-border/30 gba:px-2 sm:gba:px-2.5">
            {extra}
          </div>
        )}
      </div>
      {open && <div className="gba:border-t gba:border-border/40 gba:min-h-0 gba:flex gba:flex-col">{children}</div>}
    </div>
  )
}
