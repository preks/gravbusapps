import React, { useEffect, useMemo, useState } from 'react'
import { PageLayout, useTranslation } from '@newwork/nw-design-system'
import { FunnelSimpleIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import leadScoringI18n from './_i18n'
import { LeadScoringBulkSection } from './components/LeadScoringBulkSection'
import { LeadScoringProfilesCard } from './components/LeadScoringProfilesCard'
import { LeadScoringSingleSection } from './components/LeadScoringSingleSection'
import { useBulkLeadScore } from './hooks/useBulkLeadScore'
import { useLeadScore } from './hooks/useLeadScore'
import { useLeadScoringProfiles } from './hooks/useLeadScoringProfiles'

type LeadScoringMode = 'single' | 'bulk' | 'both'
type LeadScoringVariant = 'page' | 'embedded'

export interface LeadScoringPageProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
  onBack?: () => void
  mode?: LeadScoringMode
  defaultMode?: Exclude<LeadScoringMode, 'both'>
  fixedLeadId?: string
  hideLeadIdInput?: boolean
  prefilledLeadIds?: string[]
  hideBulkLeadIdsInput?: boolean
  onScored?: () => void
  onBulkScored?: () => void
  variant?: LeadScoringVariant
}

function parseLeadIdsInput(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[\n,]+/)
        .map(item => item.trim())
        .filter(Boolean)
    )
  )
}

export const LeadScoringPage: React.FC<LeadScoringPageProps> = ({
  accessToken,
  className,
  prefixDataTestId,
  onBack,
  mode = 'both',
  defaultMode = 'single',
  fixedLeadId,
  hideLeadIdInput = false,
  prefilledLeadIds = [],
  hideBulkLeadIdsInput = false,
  onScored,
  onBulkScored,
  variant = 'page'
}) => {
  const { t } = useTranslation(leadScoringI18n)
  const {
    data: singleResult,
    loading: singleLoading,
    error: singleError,
    runScore,
    reset: resetSingle
  } = useLeadScore(accessToken)
  const {
    data: bulkResult,
    loading: bulkLoading,
    error: bulkError,
    runBulkScore,
    reset: resetBulk
  } = useBulkLeadScore(accessToken)
  const { profileOptions, profilesLoading, profilesError } = useLeadScoringProfiles(
    accessToken,
    t('lead-scoring-profile-load-error')
  )

  const [activeMode, setActiveMode] = useState<Exclude<LeadScoringMode, 'both'>>(mode === 'bulk' ? 'bulk' : defaultMode)
  const [icpId, setIcpId] = useState('')
  const [singleLeadId, setSingleLeadId] = useState(fixedLeadId ?? '')
  const [bulkLeadIds, setBulkLeadIds] = useState(prefilledLeadIds.join('\n'))
  const [singleValidationError, setSingleValidationError] = useState<string | null>(null)
  const [bulkValidationError, setBulkValidationError] = useState<string | null>(null)

  const testId = `${prefixDataTestId ?? 'lead-scoring'}-page`

  useEffect(() => {
    if (fixedLeadId) {
      setSingleLeadId(fixedLeadId)
    }
  }, [fixedLeadId])

  useEffect(() => {
    if (prefilledLeadIds.length > 0) {
      setBulkLeadIds(prefilledLeadIds.join('\n'))
    }
  }, [prefilledLeadIds])

  const activeSection = mode === 'both' ? activeMode : mode
  const effectiveBulkLeadIds = useMemo(
    () => (prefilledLeadIds.length > 0 ? prefilledLeadIds : parseLeadIdsInput(bulkLeadIds)),
    [prefilledLeadIds, bulkLeadIds]
  )
  const requestedLeadCount = effectiveBulkLeadIds.length

  const handleSingleSubmit = async () => {
    if (!icpId.trim() || !singleLeadId.trim()) {
      setSingleValidationError(t('lead-scoring-single-validation-error'))
      return
    }

    setSingleValidationError(null)
    const result = await runScore({
      entity_type: 'lead',
      icp_id: icpId.trim(),
      entity_id: singleLeadId.trim()
    })

    if (result) {
      onScored?.()
    }
  }

  const handleBulkSubmit = async () => {
    const leadIds = effectiveBulkLeadIds
    if (!icpId.trim() || leadIds.length === 0) {
      setBulkValidationError(t('lead-scoring-bulk-validation-error'))
      return
    }

    setBulkValidationError(null)
    const result = await runBulkScore({
      entity_type: 'lead',
      icp_id: icpId.trim(),
      entity_ids: leadIds
    })

    if (result) {
      onBulkScored?.()
    }
  }

  const content = (
    <div className="gba:space-y-6" data-testid={testId}>
      <LeadScoringProfilesCard
        testId={testId}
        mode={mode}
        activeMode={activeMode}
        variant={variant}
        icpId={icpId}
        onIcpIdChange={setIcpId}
        profileOptions={profileOptions}
        profilesLoading={profilesLoading}
        profilesError={profilesError}
        onActiveModeChange={setActiveMode}
        labels={{
          title: t('lead-scoring-title'),
          pageDescription: t('lead-scoring-description'),
          embeddedDescription: t('lead-scoring-embedded-description'),
          singleMode: t('lead-scoring-single-mode'),
          bulkMode: t('lead-scoring-bulk-mode'),
          icpSelect: t('lead-scoring-icp-select'),
          loading: t('lead-scoring-loading'),
          icpPlaceholder: t('lead-scoring-icp-select-placeholder'),
          noProfilesTitle: t('lead-scoring-no-profiles-title'),
          noProfilesDescription: t('lead-scoring-no-profiles-description')
        }}
      />

      {activeSection === 'single' ? (
        <LeadScoringSingleSection
          testId={testId}
          hideLeadIdInput={hideLeadIdInput}
          singleLeadId={singleLeadId}
          onSingleLeadIdChange={setSingleLeadId}
          singleValidationError={singleValidationError}
          singleError={singleError}
          singleLoading={singleLoading}
          singleResult={singleResult}
          onSubmit={handleSingleSubmit}
          onReset={resetSingle}
          labels={{
            title: t('lead-scoring-single-mode'),
            leadId: t('lead-scoring-lead-id'),
            leadIdPlaceholder: t('lead-scoring-lead-id-placeholder'),
            loading: t('lead-scoring-loading'),
            runSingle: t('lead-scoring-run-single'),
            clear: t('lead-scoring-clear'),
            success: t('lead-scoring-single-success')
          }}
        />
      ) : (
        <LeadScoringBulkSection
          testId={testId}
          hideBulkLeadIdsInput={hideBulkLeadIdsInput}
          hasPrefilledLeadIds={prefilledLeadIds.length > 0}
          bulkLeadIds={bulkLeadIds}
          onBulkLeadIdsChange={setBulkLeadIds}
          bulkValidationError={bulkValidationError}
          bulkError={bulkError}
          bulkLoading={bulkLoading}
          bulkResult={bulkResult}
          onSubmit={handleBulkSubmit}
          onReset={resetBulk}
          labels={{
            title: t('lead-scoring-bulk-mode'),
            prefilledLeadCountMessage: t('lead-scoring-prefilled-lead-count', { count: requestedLeadCount }),
            leadIds: t('lead-scoring-lead-ids'),
            leadIdsPlaceholder: t('lead-scoring-lead-ids-placeholder'),
            leadIdsHint: t('lead-scoring-lead-ids-hint'),
            loading: t('lead-scoring-loading'),
            runBulk: t('lead-scoring-run-bulk'),
            clear: t('lead-scoring-clear'),
            success: t('lead-scoring-bulk-success')
          }}
        />
      )}
    </div>
  )

  if (variant === 'embedded') {
    return <div className={className}>{content}</div>
  }

  return (
    <PageLayout
      className={className}
      headerPhosphorIcon={{
        icon: FunnelSimpleIcon,
        variant: 'info',
        size: 'lg',
        label: t('lead-scoring-title')
      }}
      headerTitle={t('lead-scoring-title')}
      headerDescription={t('lead-scoring-description')}
      onBack={onBack}
      data-testid={testId}
    >
      {content}
    </PageLayout>
  )
}

export default LeadScoringPage
