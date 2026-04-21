import { useState } from 'react'
import { CaretDownIcon, CaretUpIcon } from '@phosphor-icons/react'

interface PanelCardProps {
  title: string
  badge?: number
  extra?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}

export const PanelCard: React.FC<PanelCardProps> = ({ title, badge, extra, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen)
  const slug = title.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="gba:flex gba:min-h-0 gba:flex-col gba:rounded-[1.25rem] sm:gba:rounded-[1.5rem] gba:border gba:border-border/75 gba:bg-card/96 gba:backdrop-blur-sm gba:overflow-hidden gba:shadow-[0_4px_14px_rgba(15,23,42,0.03)]">
      <div className="gba:flex gba:min-h-0 gba:items-stretch gba:border-b gba:border-border/50 gba:shrink-0">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
          className="gba:flex gba:flex-1 gba:min-w-0 gba:items-center gba:justify-between gba:gap-2 gba:px-3.5 sm:gba:px-4 gba:py-2.5 sm:gba:py-3 gba:text-left gba:hover:bg-muted/15 gba:transition-colors"
          data-testid={`fabric-panel-card-${slug}`}
        >
          <div className="gba:flex gba:min-w-0 gba:items-center gba:gap-2">
            <span className="gba:text-xs gba:font-semibold gba:text-foreground gba:tracking-wide">{title}</span>
            {badge !== undefined && badge > 0 && (
              <span className="gba:inline-flex gba:shrink-0 gba:items-center gba:justify-center gba:min-w-[18px] gba:h-[18px] gba:px-1 gba:rounded-full gba:text-[10px] gba:font-semibold gba:bg-muted gba:text-muted-foreground">
                {badge}
              </span>
            )}
          </div>
          {open ? (
            <CaretUpIcon className="gba:h-3 gba:w-3 gba:shrink-0 gba:text-muted-foreground/60" aria-hidden />
          ) : (
            <CaretDownIcon className="gba:h-3 gba:w-3 gba:shrink-0 gba:text-muted-foreground/60" aria-hidden />
          )}
        </button>
        {extra != null && (
          <div className="gba:flex gba:shrink-0 gba:items-center gba:border-l gba:border-border/40 gba:px-3 sm:gba:px-3.5">
            {extra}
          </div>
        )}
      </div>
      {open && children}
    </div>
  )
}
