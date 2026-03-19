import React from 'react'
import {
  Spinner,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Sheet,
  SheetContent,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import ExpenseDetailsShell from '../../../../common/components/details-panel/ExpenseDetailsShell'
import type { CurrencyStat } from '../../utils/tableUtils'

export interface CurrencyDropdownProps {
  currencyStats: CurrencyStat[]
  selectedCurrencyCode: string
  onCurrencyChange: (code: string) => void
  testIdPrefix: string
}

export const CurrencyDropdown = React.memo(function CurrencyDropdown({
  currencyStats,
  selectedCurrencyCode,
  onCurrencyChange,
  testIdPrefix
}: CurrencyDropdownProps) {
  if (currencyStats.length === 0) return null
  return (
    <div className="gba:flex gba:items-center gba:gap-2" key="currency-dropdown">
      <Label className="gba:font-medium gba:shrink-0">
        {getTranslationFromI18nKeyAndLabel(
          'lowcoder:create_expense_item.change_expense_item_container.current_currency_label',
          'Currency'
        )}
        :
      </Label>
      <Select value={selectedCurrencyCode} onValueChange={onCurrencyChange}>
        <SelectTrigger className="gba:w-[140px]" data-testid={`${testIdPrefix}-currency-select`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">
            {getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.all_currencies', 'All')}
          </SelectItem>
          {currencyStats.map(cs => (
            <SelectItem key={cs.ref} value={cs.code}>
              {cs.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
})

export interface PrintPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  loading: boolean
  pdfUrl: string
  testIdPrefix: string
}

export const PrintPreviewDialog = React.memo(function PrintPreviewDialog({
  open,
  onOpenChange,
  title,
  loading,
  pdfUrl,
  testIdPrefix
}: PrintPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gba:!w-[90vw] gba:!max-w-[90vw] gba:!p-0 gba:!rounded-md"
        style={{ height: '90vh' }}
        data-testid={`${testIdPrefix}-print-modal`}
      >
        <DialogHeader className="gba:p-4">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
            <Spinner />
          </div>
        ) : pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="gba:w-full gba:border-0"
            style={{ height: 'calc(90vh - 55px)' }}
            title="Print Preview"
            data-testid={`${testIdPrefix}-pdf-iframe`}
          />
        ) : (
          <div className="gba:text-center gba:p-8 gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.failed_to_load_pdf', 'Failed to load PDF')}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
})

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
      <SheetContent className="gba:w-[600px] gba:sm:w-[600px] gba:max-w-none">
        <ExpenseDetailsShell title={title} onClose={onClose}>
          {children}
        </ExpenseDetailsShell>
      </SheetContent>
    </Sheet>
  )
})

export interface RowActionsWrapperProps {
  children: React.ReactNode
}

export const RowActionsWrapper = React.memo(function RowActionsWrapper({ children }: RowActionsWrapperProps) {
  return (
    <button
      type="button"
      className="gba:flex gba:justify-end gba:gap-2 gba:border-0 gba:bg-transparent gba:p-0 gba:cursor-default"
      onClick={e => e.stopPropagation()}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') e.stopPropagation()
      }}
    >
      {children}
    </button>
  )
})

export const RowActionsIcon = React.memo(function RowActionsIcon() {
  return (
    <svg className="gba:h-4 gba:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
      />
    </svg>
  )
})
