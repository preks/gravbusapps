import { cn } from '@newwork/nw-design-system'
import { headerFooterSidebarPreventBlur } from './headerFooterSidebarPreventBlur'

export interface HeaderFooterPageNumberGridCellProps {
  region: 'header' | 'footer'
  alignment: 'left' | 'center' | 'right'
  testId: string
  onClick: () => void
}

const alignClass: Record<'left' | 'center' | 'right', string> = {
  left: 'gba:justify-start',
  center: 'gba:justify-center',
  right: 'gba:justify-end'
}

export function HeaderFooterPageNumberGridCell({
  region,
  alignment,
  testId,
  onClick
}: Readonly<HeaderFooterPageNumberGridCellProps>) {
  const isHeader = region === 'header'

  return (
    <button
      type="button"
      className={cn(
        'gba:flex gba:w-full gba:min-h-12 gba:flex-col gba:rounded-md gba:border gba:border-border gba:bg-muted/20 gba:p-1',
        'hover:gba:bg-muted/50 focus-visible:gba:outline-none focus-visible:gba:ring-2 focus-visible:gba:ring-ring'
      )}
      onMouseDown={headerFooterSidebarPreventBlur}
      onClick={onClick}
      data-testid={testId}
    >
      <div className="gba:flex gba:h-8 gba:w-full gba:flex-col gba:justify-between gba:overflow-hidden gba:rounded-sm gba:border gba:border-border/60 gba:bg-background">
        <div
          className={cn(
            'gba:flex gba:h-3 gba:w-full gba:items-center gba:px-0.5 gba:text-xs gba:leading-none gba:text-muted-foreground',
            isHeader ? 'gba:bg-muted' : 'gba:bg-transparent'
          )}
        >
          {isHeader && (
            <span className={cn('gba:flex gba:w-full', alignClass[alignment])} aria-hidden>
              1
            </span>
          )}
        </div>
        <div className="gba:flex-1 gba:min-h-0" />
        <div
          className={cn(
            'gba:flex gba:h-3 gba:w-full gba:items-center gba:px-0.5 gba:text-xs gba:leading-none gba:text-muted-foreground',
            !isHeader ? 'gba:bg-muted' : 'gba:bg-transparent'
          )}
        >
          {!isHeader && (
            <span className={cn('gba:flex gba:w-full', alignClass[alignment])} aria-hidden>
              1
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
