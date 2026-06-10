import type { IcpScoringEntityConfig, IcpScoringEntityLabels } from '@/common/components/icp-scoring'

type TranslateFn = (key: string, params?: Record<string, string | number>) => string

export function createOpportunityIcpScoringEntityConfig(t: TranslateFn): IcpScoringEntityConfig {
  const labels: IcpScoringEntityLabels = {
    title: t('icp-scoring-opportunity-title'),
    description: t('icp-scoring-opportunity-description'),
    embeddedDescription: t('icp-scoring-opportunity-embedded-description'),
    singleMode: t('icp-scoring-opportunity-single-mode'),
    bulkMode: t('icp-scoring-opportunity-bulk-mode'),
    icpSelect: t('icp-scoring-icp-select'),
    icpPlaceholder: t('icp-scoring-icp-select-placeholder'),
    noProfilesTitle: t('icp-scoring-no-profiles-title'),
    noProfilesDescription: t('icp-scoring-no-profiles-description-opportunity'),
    profileLoadError: t('icp-scoring-profile-load-error'),
    singleEntityId: t('icp-scoring-opportunity-id'),
    singleEntityIdPlaceholder: t('icp-scoring-opportunity-id-placeholder'),
    singleValidationError: t('icp-scoring-opportunity-single-validation-error'),
    singleSuccess: t('icp-scoring-opportunity-single-success'),
    runSingle: t('icp-scoring-opportunity-run-single'),
    bulkEntityIds: t('icp-scoring-opportunity-ids'),
    bulkEntityIdsPlaceholder: t('icp-scoring-opportunity-ids-placeholder'),
    bulkEntityIdsHint: t('icp-scoring-opportunity-ids-hint'),
    prefilledEntityCountMessage: count => t('icp-scoring-opportunity-prefilled-count', { count }),
    bulkValidationError: t('icp-scoring-opportunity-bulk-validation-error'),
    bulkSuccess: t('icp-scoring-opportunity-bulk-success'),
    runBulk: t('icp-scoring-opportunity-run-bulk'),
    clear: t('icp-scoring-clear'),
    loading: t('icp-scoring-loading'),
    singleScoreErrorFallback: t('icp-scoring-opportunity-single-error'),
    bulkScoreErrorFallback: t('icp-scoring-opportunity-bulk-error'),
    authError: t('icp-scoring-auth-error')
  }

  return {
    entityType: 'opportunity',
    dataTestIdPrefix: 'icp-scoring-opportunity',
    labels,
    bulkEnabled: true
  }
}
