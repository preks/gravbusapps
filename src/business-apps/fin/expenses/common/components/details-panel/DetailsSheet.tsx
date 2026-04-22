import React from 'react'
import { Sheet, SheetContent } from '@newwork/nw-design-system'
import ExpenseDetailsShell from './ExpenseDetailsShell'

const DEFAULT_CONTENT_CLASS = 'gba:w-[600px] gba:sm:w-[600px] gba:max-w-none'

export interface DetailsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  testId: string
  children: React.ReactNode
  onClose?: () => void
  contentClassName?: string
}

export const DetailsSheet = React.memo(function DetailsSheet({
  open,
  onOpenChange,
  title,
  testId,
  children,
  onClose,
  contentClassName
}: DetailsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} data-testid={testId}>
      <SheetContent side="right" className={contentClassName ?? DEFAULT_CONTENT_CLASS}>
        <ExpenseDetailsShell title={title} onClose={onClose} dataTestIdPrefix={`${testId}-details`}>
          {children}
        </ExpenseDetailsShell>
      </SheetContent>
    </Sheet>
  )
})
