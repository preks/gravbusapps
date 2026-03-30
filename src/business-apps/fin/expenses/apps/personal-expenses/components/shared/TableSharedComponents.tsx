import React from 'react'
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { CurrencyStat } from '../../utils/tableUtils'

export { DetailsSheet } from '../../../../common/components/sheets/DetailsSheet'
export type { DetailsSheetProps } from '../../../../common/components/sheets/DetailsSheet'

export { PrintPreviewDialog } from '../../../../common/components/document-preview/PrintPreviewDialog'
export type { PrintPreviewDialogProps } from '../../../../common/components/document-preview/PrintPreviewDialog'

export { RowActionsWrapper, RowActionsIcon } from '../../../../common/components/table/RowActionComponents'
export type { RowActionsWrapperProps } from '../../../../common/components/table/RowActionComponents'

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
