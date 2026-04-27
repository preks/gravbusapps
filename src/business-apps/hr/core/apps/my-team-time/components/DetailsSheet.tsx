import React from 'react'
import { ScrollArea, Sheet, SheetContent, SheetHeader, SheetTitle } from '@newwork/nw-design-system'

interface DetailsSheetProps {
  title: string
  icon?: React.ReactNode
  open: boolean
  onClose: () => void
  children: React.ReactNode
  dataTestId?: string
}

export const DetailsSheet: React.FC<DetailsSheetProps> = ({
  title,
  icon,
  open,
  onClose,
  children,
  dataTestId = 'my-team-time-details-sheet'
}) => {
  return (
    <Sheet open={open} onOpenChange={nextOpen => !nextOpen && onClose()}>
      <SheetContent side="right" className="gba:flex gba:flex-col gba:p-0" data-testid={dataTestId}>
        <SheetHeader className="gba:border-b gba:border-border gba:px-6 gba:py-4 gba:pr-14">
          <SheetTitle className="gba:flex gba:items-center gba:gap-2 gba:text-left">
            {icon}
            <span>{title}</span>
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="gba:flex-1 gba:min-h-0">
          <div className="gba:px-6 gba:py-4">{children}</div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
