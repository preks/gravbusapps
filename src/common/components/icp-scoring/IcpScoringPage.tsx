import React, { useEffect, useMemo, useState } from 'react'
import { PageLayout } from '@newwork/nw-design-system'
import { GaugeIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { IcpScoringBulkSection } from './components/IcpScoringBulkSection'
import { IcpScoringOpportunityWeighingSection } from './components/IcpScoringOpportunityWeighingSection'
import { IcpScoringProfilesCard } from './components/IcpScoringProfilesCard'
import { IcpScoringSingleSection } from './components/IcpScoringSingleSection'
import { useBulkIcpScore } from './hooks/useBulkIcpScore'
import { useIcpScore } from './hooks/useIcpScore'
import { useIcpScoringProfiles } from './hooks/useIcpScoringProfiles'
import { useOpportunityIcpScoringWeighing } from './hooks/useOpportunityIcpScoringWeighing'
import type { BulkIcpScoreRequest, IcpScoreRequest } from './types/icpScoringTypes'
import {
  applyOpportunityModePayloadToBulkRequest,
  applyOpportunityModePayloadToSingleRequest
} from './utils/opportunityIcpScoringWeights'
import type { IcpScoringEntityConfig } from './types/icpScoringEntityConfig'

type IcpScoringMode = 'single' | 'bulk' | 'both'
type IcpScoringVariant = 'page' | 'embedded'

export interface IcpScoringPageProps extends BusinessAppContextProps {
  entityConfig: IcpScoringEntityConfig
  className?: string
  prefixDataTestId?: string
  onBack?: () => void
  mode?: IcpScoringMode
  defaultMode?: Exclude<IcpScoringMode, 'both'>
  fixedEntityId?: string
  hideEntityIdInput?: boolean
  prefilledEntityIds?: string[]
  hideBulkEntityIdsInput?: boolean
  onScored?: () => void
  onBulkScored?: () => void
  variant?: IcpScoringVariant
}

function parseEntityIdsInput(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[\n,]+/)
        .map(item => item.trim())
        .filter(Boolean)
    )
  )
}

function resolveEffectiveMode(requestedMode: IcpScoringMode, bulkEnabled: boolean): Exclude<IcpScoringMode, 'both'> {
  if (!bulkEnabled) {
    return 'single'
  }

  return requestedMode === 'bulk' ? 'bulk' : 'single'
}

export const IcpScoringPage: React.FC<IcpScoringPageProps> = ({
  accessToken,
  entityConfig,
  className,
  prefixDataTestId,
  onBack,
  mode: requestedMode = 'both',
  defaultMode = 'single',
  fixedEntityId,
  hideEntityIdInput = false,
  prefilledEntityIds = [],
  hideBulkEntityIdsInput = false,
  onScored,
  onBulkScored,
  variant = 'page'
}) => {
  const { labels, entityType, dataTestIdPrefix } = entityConfig
  const isOpportunityScoring = entityType === 'opportunity'
  const bulkEnabled = entityConfig.bulkEnabled !== false
  const mode: IcpScoringMode = bulkEnabled ? requestedMode : 'single'
  const singleOpportunityWeighing = useOpportunityIcpScoringWeighing()
  const bulkOpportunityWeighing = useOpportunityIcpScoringWeighing({ allowOptionalWeights: true })

  const {
    data: singleResult,
    loading: singleLoading,
    error: singleError,
    runScore,
    reset: resetSingle
  } = useIcpScore(accessToken, labels.singleScoreErrorFallback, labels.authError)
  const {
    data: bulkResult,
    loading: bulkLoading,
    error: bulkError,
    runBulkScore,
    reset: resetBulk
  } = useBulkIcpScore(accessToken, labels.bulkScoreErrorFallback, labels.authError)
  const { profileOptions, profilesLoading, profilesError } = useIcpScoringProfiles(accessToken, labels.profileLoadError)

  const [activeMode, setActiveMode] = useState<Exclude<IcpScoringMode, 'both'>>(() =>
    resolveEffectiveMode(mode === 'both' ? defaultMode : mode, bulkEnabled)
  )
  const [icpId, setIcpId] = useState('')
  const [singleEntityId, setSingleEntityId] = useState(fixedEntityId ?? '')
  const [bulkEntityIds, setBulkEntityIds] = useState(prefilledEntityIds.join('\n'))
  const [singleValidationError, setSingleValidationError] = useState<string | null>(null)
  const [bulkValidationError, setBulkValidationError] = useState<string | null>(null)

  const testId = `${prefixDataTestId ?? dataTestIdPrefix}-page`

  useEffect(() => {
    if (fixedEntityId) {
      setSingleEntityId(fixedEntityId)
    }
  }, [fixedEntityId])

  useEffect(() => {
    if (prefilledEntityIds.length > 0) {
      setBulkEntityIds(prefilledEntityIds.join('\n'))
    }
  }, [prefilledEntityIds])

  const activeSection = mode === 'both' ? activeMode : resolveEffectiveMode(mode, bulkEnabled)
  const effectiveBulkEntityIds = useMemo(
    () => (prefilledEntityIds.length > 0 ? prefilledEntityIds : parseEntityIdsInput(bulkEntityIds)),
    [prefilledEntityIds, bulkEntityIds]
  )
  const requestedEntityCount = effectiveBulkEntityIds.length

  const handleSingleSubmit = async () => {
    if (!icpId.trim() || !singleEntityId.trim()) {
      setSingleValidationError(labels.singleValidationError)
      return
    }

    setSingleValidationError(null)

    let request: IcpScoreRequest
    if (isOpportunityScoring) {
      const modePayload = singleOpportunityWeighing.buildModePayload()
      if (!modePayload) {
        return
      }

      request = applyOpportunityModePayloadToSingleRequest(
        {
          entity_type: 'opportunity',
          icp_id: icpId.trim(),
          entity_id: singleEntityId.trim()
        },
        modePayload
      )
    } else {
      request = {
        entity_type: 'lead',
        icp_id: icpId.trim(),
        entity_id: singleEntityId.trim()
      }
    }

    const result = await runScore(request)

    if (result) {
      onScored?.()
    }
  }

  const handleBulkSubmit = async () => {
    const entityIds = effectiveBulkEntityIds
    if (!icpId.trim() || entityIds.length === 0) {
      setBulkValidationError(labels.bulkValidationError)
      return
    }

    setBulkValidationError(null)

    let request: BulkIcpScoreRequest
    if (isOpportunityScoring) {
      const modePayload = bulkOpportunityWeighing.buildModePayload()
      if (!modePayload) {
        return
      }

      request = applyOpportunityModePayloadToBulkRequest(
        {
          entity_type: 'opportunity',
          icp_id: icpId.trim(),
          entity_ids: entityIds
        },
        modePayload
      )
    } else {
      request = {
        entity_type: 'lead',
        icp_id: icpId.trim(),
        entity_ids: entityIds
      }
    }

    const result = await runBulkScore(request)

    if (result) {
      onBulkScored?.()
    }
  }

  const content = (
    <div className="gba:space-y-6" data-testid={testId}>
      <IcpScoringProfilesCard
        testId={testId}
        mode={mode}
        activeMode={activeSection}
        variant={variant}
        icpId={icpId}
        onIcpIdChange={setIcpId}
        profileOptions={profileOptions}
        profilesLoading={profilesLoading}
        profilesError={profilesError}
        onActiveModeChange={setActiveMode}
        labels={{
          title: labels.title,
          pageDescription: labels.description,
          embeddedDescription: labels.embeddedDescription,
          singleMode: labels.singleMode,
          bulkMode: labels.bulkMode,
          icpSelect: labels.icpSelect,
          loading: labels.loading,
          icpPlaceholder: labels.icpPlaceholder,
          noProfilesTitle: labels.noProfilesTitle,
          noProfilesDescription: labels.noProfilesDescription
        }}
      />

      {isOpportunityScoring && activeSection === 'single' ? (
        <IcpScoringOpportunityWeighingSection
          testIdPrefix={testId}
          weightInputs={singleOpportunityWeighing.weightInputs}
          onWeightInputChange={singleOpportunityWeighing.setWeightInput}
          weightsValidationErrorKey={singleOpportunityWeighing.weightsValidationErrorKey}
        />
      ) : null}

      {isOpportunityScoring && activeSection === 'bulk' ? (
        <IcpScoringOpportunityWeighingSection
          testIdPrefix={testId}
          weightInputs={bulkOpportunityWeighing.weightInputs}
          onWeightInputChange={bulkOpportunityWeighing.setWeightInput}
          weightsValidationErrorKey={bulkOpportunityWeighing.weightsValidationErrorKey}
        />
      ) : null}

      {activeSection === 'single' ? (
        <IcpScoringSingleSection
          testId={testId}
          hideEntityIdInput={hideEntityIdInput}
          singleEntityId={singleEntityId}
          onSingleEntityIdChange={setSingleEntityId}
          singleValidationError={singleValidationError}
          singleError={singleError}
          singleLoading={singleLoading}
          singleResult={singleResult}
          onSubmit={handleSingleSubmit}
          onReset={resetSingle}
          labels={{
            title: labels.singleMode,
            entityId: labels.singleEntityId,
            entityIdPlaceholder: labels.singleEntityIdPlaceholder,
            loading: labels.loading,
            runSingle: labels.runSingle,
            clear: labels.clear,
            success: labels.singleSuccess
          }}
        />
      ) : (
        <IcpScoringBulkSection
          testId={testId}
          hideBulkEntityIdsInput={hideBulkEntityIdsInput}
          hasPrefilledEntityIds={prefilledEntityIds.length > 0}
          bulkEntityIds={bulkEntityIds}
          onBulkEntityIdsChange={setBulkEntityIds}
          bulkValidationError={bulkValidationError}
          bulkError={bulkError}
          bulkLoading={bulkLoading}
          bulkResult={bulkResult}
          onSubmit={handleBulkSubmit}
          onReset={resetBulk}
          labels={{
            title: labels.bulkMode,
            prefilledEntityCountMessage: labels.prefilledEntityCountMessage(requestedEntityCount),
            entityIds: labels.bulkEntityIds,
            entityIdsPlaceholder: labels.bulkEntityIdsPlaceholder,
            entityIdsHint: labels.bulkEntityIdsHint,
            loading: labels.loading,
            runBulk: labels.runBulk,
            clear: labels.clear,
            success: labels.bulkSuccess
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
        icon: GaugeIcon,
        variant: 'info',
        size: 'lg',
        label: labels.title
      }}
      headerTitle={labels.title}
      headerDescription={labels.description}
      onBack={onBack}
      data-testid={testId}
    >
      {content}
    </PageLayout>
  )
}

export default IcpScoringPage
