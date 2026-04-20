/**
 * EntityImportView (Shared)
 * Generic 3-step import view: Upload → Mapping → Result
 * Used by all entity import views across CRM and IRM modules.
 */

import React from 'react'
import { PageLayout, Card, CardContent, useTranslation } from '@newwork/nw-design-system'
import { XCircleIcon, SparkleIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ImportConfig } from '@/common/components/common-relations/apps/data-import/types'
import {
  useEntityImport,
  useEntityMappings,
  useLeadImportDefaults,
  useInvestmentTypeDefaults
} from '@/common/components/common-relations/apps/data-import/hooks'
import { FileUploadStep } from './FileUploadStep'
import { MappingReviewStep } from './MappingReviewStep'
import { ConversionResultStep } from './ConversionResultStep'
import fileUploadTranslations from './FileUploadStep/_i18n'
import mappingReviewTranslations from './MappingReviewStep/_i18n'
import conversionResultTranslations from './ConversionResultStep/_i18n'

export interface EntityImportViewProps extends BusinessAppContextProps {
  config: ImportConfig
  headerTitle: string
  headerDescription: string
  /** Plural label used in mapping and result steps, e.g. "leads" */
  entityType: string
  /** Singular label used in result step, e.g. "lead" */
  entityTypeSingular: string
  /** When true, shows the campaign selection dropdown on the upload step */
  enableCampaignSelection?: boolean
  onBack?: () => void
  'data-testid'?: string
}

export const EntityImportView: React.FC<EntityImportViewProps> = ({
  config,
  headerTitle,
  headerDescription,
  entityType,
  entityTypeSingular,
  enableCampaignSelection = false,
  onBack,
  'data-testid': testId = 'entity-import-view',
  ...context
}) => {
  // Pre-register all step translation bundles so they are available before each step mounts.
  // This ensures translations are in the global registry during the LocalizationProvider's
  // initial re-render cycle, preventing raw keys from showing on first render.
  useTranslation(fileUploadTranslations)
  useTranslation(mappingReviewTranslations)
  useTranslation(conversionResultTranslations)

  const {
    file,
    agentResponse,
    convertedEntities,
    campaignId,
    campaignName,
    setCampaign,
    step,
    isLoading,
    error,
    importResult,
    csvQuality,
    handleFileChange,
    analyzeWithAgent,
    convertData,
    retryWithHardRepair,
    importToBackend,
    downloadJSON,
    reset
  } = useEntityImport(context, config)

  const {
    mappings,
    setMappings,
    updateTargetFromUnmapped,
    removeMapping,
    addMapping,
    unmappedSourceFields,
    setUnmappedSourceFields
  } = useEntityMappings(
    config.targetFields,
    agentResponse?.fieldMappings || [],
    agentResponse?.unmappedSourceFields || []
  )

  React.useEffect(() => {
    if (agentResponse) {
      setMappings(agentResponse.fieldMappings)
      setUnmappedSourceFields(agentResponse.unmappedSourceFields)
    }
  }, [agentResponse, setMappings, setUnmappedSourceFields])

  // Lead-specific defaults (Status, Source, Rating) — only for lead entity type
  const isLeadImport = config.entityType === 'lead'
  const isInvestmentEntityImport = config.domain === 'investment' && config.entityType.endsWith('-investment')
  const leadDefaults = useLeadImportDefaults(context.accessToken, config.domain)
  const investmentTypeDefaults = useInvestmentTypeDefaults(context.accessToken)

  const handleAnalyze = React.useCallback(async () => {
    await analyzeWithAgent()
  }, [analyzeWithAgent])

  const handleConvert = async () => {
    let enforcedFieldsJson: string | undefined

    if (isLeadImport) {
      const enforced: Record<string, string> = {}
      if (leadDefaults.selectedStatus) enforced.leadStatusRef = leadDefaults.selectedStatus
      if (leadDefaults.selectedSource) enforced.leadSourceRef = leadDefaults.selectedSource
      if (leadDefaults.selectedRating) enforced.leadRatingRef = leadDefaults.selectedRating

      if (Object.keys(enforced).length > 0) {
        enforcedFieldsJson = JSON.stringify(enforced)
      }
    }

    if (isInvestmentEntityImport && investmentTypeDefaults.selectedType) {
      const currentEnforced = enforcedFieldsJson
        ? (JSON.parse(enforcedFieldsJson) as Record<string, string>)
        : ({} as Record<string, string>)
      currentEnforced['investment.investmentTypeRef'] = investmentTypeDefaults.selectedType
      enforcedFieldsJson = JSON.stringify(currentEnforced)
    }

    await convertData(mappings, enforcedFieldsJson)
  }

  return (
    <PageLayout
      headerIcon={SparkleIcon}
      headerTitle={headerTitle}
      headerDescription={headerDescription}
      onBack={onBack}
      data-testid={testId}
    >
      {error && (
        <Card className="gba:mb-6 gba:border-destructive-ring" data-testid={`${testId}-error`}>
          <CardContent className="gba:py-10">
            <div className="gba:flex gba:flex-col gba:items-center gba:text-center gba:gap-4">
              <div className="gba:flex gba:items-center gba:justify-center gba:w-16 gba:h-16 gba:rounded-full gba:bg-destructive-secondary">
                <XCircleIcon className="gba:w-8 gba:h-8 gba:text-destructive" weight="fill" />
              </div>
              <div className="gba:space-y-2">
                <p className="gba:font-semibold gba:text-base gba:text-destructive">Analysis Failed</p>
                <p className="gba:text-sm gba:text-muted-foreground">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'upload' && (
        <FileUploadStep
          file={file}
          isLoading={isLoading}
          onFileChange={handleFileChange}
          onAnalyze={handleAnalyze}
          {...(enableCampaignSelection && {
            campaignId,
            onCampaignChange: (campaign: { id: string; name: string } | null) =>
              setCampaign(campaign?.id ?? null, campaign?.name),
            businessAppContext: context
          })}
          {...(isLeadImport && { leadDefaults })}
          {...(isInvestmentEntityImport && { investmentTypeDefaults })}
          data-testid={`${testId}-upload-step`}
        />
      )}

      {step === 'mapping' && agentResponse && (
        <MappingReviewStep
          agentResponse={agentResponse}
          mappings={mappings}
          unmappedSourceFields={unmappedSourceFields}
          targetFieldsConfig={config.targetFields}
          entityType={entityType}
          isLoading={isLoading}
          onUpdateTargetFromUnmapped={updateTargetFromUnmapped}
          onRemoveMapping={removeMapping}
          onAddMapping={addMapping}
          onConvert={handleConvert}
          onReset={reset}
          data-testid={`${testId}-mapping-step`}
        />
      )}

      {step === 'result' && (
        <ConversionResultStep
          convertedEntities={convertedEntities}
          targetFieldsConfig={config.targetFields}
          entityType={entityTypeSingular}
          isLoading={isLoading}
          importResult={importResult}
          campaignName={campaignName || undefined}
          csvQuality={csvQuality}
          onHardRepair={retryWithHardRepair}
          onDownloadJSON={downloadJSON}
          onImportToBackend={importToBackend}
          onReset={reset}
          data-testid={`${testId}-result-step`}
        />
      )}
    </PageLayout>
  )
}

export default EntityImportView
