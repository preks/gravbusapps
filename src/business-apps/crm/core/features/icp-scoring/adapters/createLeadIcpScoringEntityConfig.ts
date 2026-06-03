import type { IcpScoringEntityConfig, IcpScoringEntityLabels } from '@/common/components/icp-scoring'

type TranslateFn = (key: string, params?: Record<string, string | number>) => string

export function createLeadIcpScoringEntityConfig(t: TranslateFn): IcpScoringEntityConfig {
  const labels: IcpScoringEntityLabels = {
    title: t('icp-scoring-title'),
    description: t('icp-scoring-description'),
    embeddedDescription: t('icp-scoring-embedded-description'),
    singleMode: t('icp-scoring-single-mode'),
    bulkMode: t('icp-scoring-bulk-mode'),
    icpSelect: t('icp-scoring-icp-select'),
    icpPlaceholder: t('icp-scoring-icp-select-placeholder'),
    noProfilesTitle: t('icp-scoring-no-profiles-title'),
    noProfilesDescription: t('icp-scoring-no-profiles-description'),
    profileLoadError: t('icp-scoring-profile-load-error'),
    singleEntityId: t('icp-scoring-lead-id'),
    singleEntityIdPlaceholder: t('icp-scoring-lead-id-placeholder'),
    singleValidationError: t('icp-scoring-single-validation-error'),
    singleSuccess: t('icp-scoring-single-success'),
    runSingle: t('icp-scoring-run-single'),
    bulkEntityIds: t('icp-scoring-lead-ids'),
    bulkEntityIdsPlaceholder: t('icp-scoring-lead-ids-placeholder'),
    bulkEntityIdsHint: t('icp-scoring-lead-ids-hint'),
    prefilledEntityCountMessage: count => t('icp-scoring-prefilled-lead-count', { count }),
    bulkValidationError: t('icp-scoring-bulk-validation-error'),
    bulkSuccess: t('icp-scoring-bulk-success'),
    runBulk: t('icp-scoring-run-bulk'),
    clear: t('icp-scoring-clear'),
    loading: t('icp-scoring-loading'),
    singleScoreErrorFallback: t('icp-scoring-lead-single-error'),
    bulkScoreErrorFallback: t('icp-scoring-lead-bulk-error'),
    authError: t('icp-scoring-auth-error')
  }

  return {
    entityType: 'lead',
    dataTestIdPrefix: 'icp-scoring-lead',
    labels,
    bulkEnabled: true
  }
}
