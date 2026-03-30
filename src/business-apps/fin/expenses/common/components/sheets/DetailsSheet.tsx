import React from 'react'
import { Sheet, SheetContent } from '@newwork/nw-design-system'
import ExpenseDetailsShell from '../details-panel/ExpenseDetailsShell'

export interface DetailsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  testId: string
  children: React.ReactNode
  onClose?: () => void
}

export const DetailsSheet = React.memo(function DetailsSheet({
  open,
  onOpenChange,
  title,
  testId,
  children,
  onClose
}: DetailsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} data-testid={testId}>
      <SheetContent side="right" className="gba:w-[600px] gba:sm:w-[600px] gba:max-w-none">
        <ExpenseDetailsShell title={title} onClose={onClose} dataTestIdPrefix={`${testId}-details`}>
          {children}
        </ExpenseDetailsShell>
      </SheetContent>
    </Sheet>
  )
})
