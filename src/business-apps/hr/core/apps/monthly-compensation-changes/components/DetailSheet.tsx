import { ScrollArea, Sheet, SheetContent, SheetHeader, SheetTitle } from '@newwork/nw-design-system'

interface DetailSheetProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly title: string
  readonly children: React.ReactNode
}

export function DetailSheet({ open, onClose, title, children }: DetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <SheetContent side="right" className="gba:w-full sm:gba:max-w-xl gba:flex gba:flex-col gba:p-0">
        <SheetHeader className="gba:border-b gba:border-border gba:px-6 gba:py-4 gba:pr-14">
          <SheetTitle className="gba:text-left">{title}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="gba:flex-1 gba:min-h-0">
          <div className="gba:space-y-4 gba:px-6 gba:py-4">{children}</div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
