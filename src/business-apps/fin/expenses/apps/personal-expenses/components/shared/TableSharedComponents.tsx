import React from 'react'
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import personalTranslations from '../../_i18n'
import type { CurrencyStat } from '../../utils/tableUtils'

export { DetailsSheet } from '../../../../common/components/details-panel/DetailsSheet'
export type { DetailsSheetProps } from '../../../../common/components/details-panel/DetailsSheet'

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
  const { t } = useTranslation(personalTranslations)

  if (currencyStats.length === 0) return null
  return (
    <div className="gba:flex gba:items-center gba:gap-2" key="currency-dropdown">
      <Label className="gba:font-medium gba:shrink-0">{t('expense-items-currency-label')}:</Label>
      <Select value={selectedCurrencyCode} onValueChange={onCurrencyChange}>
        <SelectTrigger className="gba:w-[140px]" data-testid={`${testIdPrefix}-currency-select`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t('expense-items-currency-all')}</SelectItem>
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
