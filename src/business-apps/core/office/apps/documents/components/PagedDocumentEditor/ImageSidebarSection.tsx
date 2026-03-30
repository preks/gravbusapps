import type { ReactNode } from 'react'
import { cn } from '@newwork/nw-design-system'

export interface ImageSidebarSectionProps {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
  'data-testid'?: string
}

export function ImageSidebarSection({
  title,
  action,
  children,
  className,
  'data-testid': testId
}: Readonly<ImageSidebarSectionProps>) {
  return (
    <section
      className={cn('gba:rounded-xl gba:border gba:border-border/50 gba:bg-muted/20 gba:p-4 gba:space-y-3', className)}
      data-testid={testId}
    >
      <div className="gba:flex gba:flex-wrap gba:items-start gba:justify-between gba:gap-x-3 gba:gap-y-2">
        <h4 className="gba:min-w-0 gba:flex-1 gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wider gba:text-muted-foreground">
          {title}
        </h4>
        {action ? (
          <div className="gba:flex gba:shrink-0 gba:flex-wrap gba:items-center gba:justify-end gba:gap-1.5">
            {action}
          </div>
        ) : null}
      </div>
      {children}
    </section>
  )
}
