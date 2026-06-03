import type { IcpScoringSelectionLabels } from '../components/IcpScoringSelectionDialog'
import type { IcpScoringTimeRange } from '../utils/icpScoringSelectionUtils'

type TranslateFn = (key: string, params?: Record<string, string | number>) => string

const TIME_RANGE_I18N_KEYS: Record<IcpScoringTimeRange, string> = {
  today: 'icp-scoring-selection-today',
  'last-week': 'icp-scoring-selection-last-week',
  'last-month': 'icp-scoring-selection-last-month',
  'last-quarter': 'icp-scoring-selection-last-quarter',
  'last-year': 'icp-scoring-selection-last-year'
}

export function createLeadIcpScoringSelectionLabels(t: TranslateFn): IcpScoringSelectionLabels {
  return {
    allEntities: t('icp-scoring-selection-all'),
    allUnscored: t('icp-scoring-selection-all-unscored'),
    latestPresetPlaceholder: t('icp-scoring-selection-latest'),
    lastCount: count => t('icp-scoring-selection-last-count', { count }),
    timeRange: range => t(TIME_RANGE_I18N_KEYS[range]),
    selectedCount: count => t('icp-scoring-selection-selected-count', { count }),
    unscoredSuffix: t('icp-scoring-selection-unscored-suffix'),
    searchPlaceholder: t('icp-scoring-selection-search-placeholder'),
    entitiesRequired: t('icp-scoring-selection-leads-required')
  }
}
