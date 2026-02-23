/**
 * EntityImportView (Shared)
 * Generic 3-step import view: Upload → Mapping → Result
 * Used by all entity import views across CRM and IRM modules.
 */

import React from 'react'
import { PageLayout, Alert, AlertDescription, useTranslation } from '@newwork/nw-design-system'
import { XCircleIcon, SparkleIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ImportConfig } from '@/common/components/common-relations/apps/data-import/types'
import { useEntityImport, useEntityMappings } from '@/common/components/common-relations/apps/data-import/hooks'
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
    handleFileChange,
    analyzeWithAgent,
    convertData,
    importToBackend,
    downloadJSON,
    reset
  } = useEntityImport(context, config)

  const { mappings, setMappings, updateMapping, removeMapping, addMapping } = useEntityMappings(
    config.targetFields,
    agentResponse?.fieldMappings || []
  )

  React.useEffect(() => {
    if (agentResponse) {
      setMappings(agentResponse.fieldMappings)
    }
  }, [agentResponse, setMappings])

  const handleConvert = async () => {
    await convertData(mappings)
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
        <Alert variant="destructive" className="gba:mb-4" data-testid={`${testId}-error`}>
          <XCircleIcon className="gba:w-4 gba:h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === 'upload' && (
        <FileUploadStep
          file={file}
          isLoading={isLoading}
          onFileChange={handleFileChange}
          onAnalyze={analyzeWithAgent}
          {...(enableCampaignSelection && {
            campaignId,
            onCampaignChange: (campaign: { id: string; name: string } | null) =>
              setCampaign(campaign?.id ?? null, campaign?.name),
            businessAppContext: context
          })}
          data-testid={`${testId}-upload-step`}
        />
      )}

      {step === 'mapping' && agentResponse && (
        <MappingReviewStep
          agentResponse={agentResponse}
          mappings={mappings}
          targetFieldsConfig={config.targetFields}
          entityType={entityType}
          isLoading={isLoading}
          onUpdateMapping={updateMapping}
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
