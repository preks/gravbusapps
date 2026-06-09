import type { KpiCardData } from '@newwork/nw-design-system'
import { formatCurrencyDisplay } from './formatCurrency'

/**
 * SectionKpiCards on expense request/plan record items tabs only.
 * KpiCard maps title → [data-slot=card-description], value → [data-slot=card-title].
 */
export const RECORD_EXPENSE_FIVE_KPI_CARDS_CLASSNAME = [
  'gba:min-w-0',
  'gba:!grid-cols-2',
  'gba:sm:!grid-cols-3',
  'gba:md:!grid-cols-4',
  'gba:lg:!grid-cols-5',
  'gba:[&_[data-slot=card]]:min-w-0',
  'gba:[&_[data-slot=card-description]]:min-w-0',
  'gba:[&_[data-slot=card-description]]:overflow-hidden',
  'gba:[&_[data-slot=card-description]]:line-clamp-2',
  'gba:[&_[data-slot=card-description]]:break-words',
  'gba:[&_[data-slot=card-description]]:leading-tight',
  'gba:[&_[data-slot=card-title]]:min-w-0',
  'gba:[&_[data-slot=card-title]]:overflow-hidden',
  'gba:[&_[data-slot=card-title]]:line-clamp-2',
  'gba:[&_[data-slot=card-title]]:break-words',
  'gba:[&_[data-slot=card-title]]:leading-tight'
].join(' ')

type RecordKpiAmountFields = Pick<KpiCardData, 'value'>

/** Same formatting as record table rows and footer (locale-aware amount + currency order). */
export function getRecordKpiAmountFields(amount: number, currencyCode?: string): RecordKpiAmountFields {
  return {
    value: formatCurrencyDisplay(amount, currencyCode)
  }
}
