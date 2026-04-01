import React from 'react'
import { CheckIcon } from '@phosphor-icons/react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@newwork/nw-design-system'

export function TruncatedCalendarTitle({ rowId, title }: { rowId: string; title: string }) {
  const ref = React.useRef<HTMLParagraphElement>(null)
  const [isTruncated, setIsTruncated] = React.useState(false)

  const measure = React.useCallback(() => {
    const el = ref.current
    if (!el) {
      return
    }
    setIsTruncated(el.scrollWidth > el.clientWidth)
  }, [])

  React.useLayoutEffect(() => {
    measure()
  }, [title, measure])

  React.useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') {
      return undefined
    }
    const ro = new ResizeObserver(() => {
      measure()
    })
    ro.observe(el)
    return () => {
      ro.disconnect()
    }
  }, [measure])

  const className = 'gba:truncate gba:text-sm gba:font-medium gba:leading-5 gba:text-foreground gba:m-0'

  if (!isTruncated) {
    return (
      <p ref={ref} className={className} data-testid={`calendar-visibility-title-${rowId}`}>
        {title}
      </p>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <p ref={ref} className={className} data-testid={`calendar-visibility-title-${rowId}`}>
          {title}
        </p>
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="gba:max-w-xs gba:z-50">
        {title}
      </TooltipContent>
    </Tooltip>
  )
}

interface CalendarVisibilityRowProps {
  rowId: string
  title: string
  subtitle?: React.ReactNode
  checked: boolean
  onToggle: (checked: boolean) => void
  color: string
  menu?: React.ReactNode
  /** Overrides default `calendar-visibility-toggle-${rowId}` for stable selectors */
  toggleDataTestId?: string
}

export const CalendarVisibilityRow: React.FC<CalendarVisibilityRowProps> = ({
  rowId,
  title,
  subtitle,
  checked,
  onToggle,
  color,
  menu,
  toggleDataTestId
}) => {
  return (
    <div className="gba:min-w-0 gba:rounded-md gba:px-1.5 gba:py-0.5 hover:gba:bg-muted/40">
      <div
        className={
          subtitle
            ? 'gba:grid gba:min-w-0 gba:grid-cols-[auto_minmax(0,1fr)_auto] gba:items-start gba:gap-x-2.5'
            : 'gba:grid gba:min-w-0 gba:grid-cols-[auto_minmax(0,1fr)_auto] gba:items-center gba:gap-x-2.5'
        }
      >
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          aria-label={title}
          onClick={() => onToggle(!checked)}
          className={
            subtitle
              ? 'gba:mt-0.5 gba:flex gba:h-4.5 gba:w-4.5 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-sm gba:border gba:transition-opacity focus-visible:gba:outline-none focus-visible:gba:ring-2 focus-visible:gba:ring-ring focus-visible:gba:ring-offset-2'
              : 'gba:flex gba:h-4.5 gba:w-4.5 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-sm gba:border gba:transition-opacity focus-visible:gba:outline-none focus-visible:gba:ring-2 focus-visible:gba:ring-ring focus-visible:gba:ring-offset-2'
          }
          style={{
            backgroundColor: checked ? color : 'transparent',
            borderColor: color
          }}
          data-testid={toggleDataTestId ?? `calendar-visibility-toggle-${rowId}`}
        >
          {checked ? <CheckIcon className="gba:h-3 gba:w-3 gba:text-white" weight="bold" /> : null}
        </button>

        <div className="gba:min-w-0 gba:overflow-hidden">
          <TruncatedCalendarTitle rowId={rowId} title={title} />
          {subtitle ? (
            <div className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
              {subtitle}
            </div>
          ) : null}
        </div>

        {menu ? <div className="gba:flex gba:shrink-0 gba:items-center">{menu}</div> : <div />}
      </div>
    </div>
  )
}
