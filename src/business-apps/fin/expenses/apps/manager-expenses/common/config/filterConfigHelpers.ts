import type { FilterConfiguration } from '@newwork/nw-design-system'
import { createNumberRangeFilterGroup } from '../../../../common/config/filterConfigHelpers'

export {
  createDateRangeConfig,
  createDateRangeFilterGroup,
  createFluentDateRangeFilterGroup,
  createFluentExpenseAmountRangeFilterGroup,
  createFluentTypeFilterGroup,
  createNumberRangeFilterGroup,
  createStatusFilterGroupWithLabel,
  createTypeFilterGroup
} from '../../../../common/config/filterConfigHelpers'

export function createExpenseAmountRangeFilterGroup(
  groupId: string,
  field: string,
  i18nKey: string,
  fallback: string
): FilterConfiguration['groups'][number] {
  return createNumberRangeFilterGroup(groupId, field, i18nKey, fallback)
}
