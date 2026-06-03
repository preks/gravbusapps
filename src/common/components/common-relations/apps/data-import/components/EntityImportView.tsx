/**
 * EntityImportView (Shared core)
 *
 * Generic 3-step import shell (Upload → Mapping → Result) used by both the
 * CRM and IRM import wrappers. This component is intentionally
 * domain-agnostic: it knows only about the import state machine, never
 * about leads, campaigns, or investment types.
 *
 * Domain-specific behavior is injected via:
 *  - `submissionStrategy`: how the converted entities are POSTed to the
 *    backend, per-domain error normalization, per-domain record
 *    post-processing (e.g. IRM flattening).
 *  - `enableCampaignSelection`: toggles the CRM-only campaign picker.
 *
 * Enforced catalog selects (lead status/source/rating, investment type,
 * liquid fund type, …) are driven entirely by `ImportConfig.enforcedSelects`.
 * The set of configs is wrapped in a `react-hook-form` instance and a
 * `CatalogSelect.Provider`, then rendered as `CatalogSelect` dropdowns
 * inside `FileUploadStep`. Cascading (group → type → liquid fund type) is
 * handled natively by `CatalogSelect.parentField`.
 *
 * Prefer `CrmEntityImportView` / `IrmEntityImportView` over using this file
 * directly — they fill in the strategy slot with the correct defaults.
 */

import React from 'react'
import { Form, PageLayout, useTranslation } from '@newwork/nw-design-system'
import { SparkleIcon } from '@phosphor-icons/react'
import { useForm } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CatalogSelect } from '@/components/catalog-select'
import { ImportConfig } from '@/common/components/common-relations/apps/data-import/types'
import type { ImportAnalyzerContext } from '@/common/components/common-relations/apps/data-import/services'
import {
  useEntityImport,
  useEntityMappings,
  type ImportSubmissionStrategy
} from '@/common/components/common-relations/apps/data-import/hooks'
import { extractErrorMessage } from '@/common/components/common-relations/apps/data-import/hooks/useEntityImport/shared/errorHandling'
import {
  allEnforcedRequiredSatisfied,
  buildEnforcedSelectDefaults,
  buildEnforcedSelectMap,
  downloadImportTemplate,
  type EnforcedSelectValues
} from '@/common/components/common-relations/apps/data-import/utils'
import { FileUploadStep } from './FileUploadStep'
import { MappingReviewStep } from './MappingReviewStep'
import { ConversionResultStep } from './ConversionResultStep'
import { ImportErrorCard } from './ImportErrorCard'
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
  /** When true, shows the CRM campaign selection dropdown on the upload step */
  enableCampaignSelection?: boolean
  /**
   * Domain-specific submission strategy. REQUIRED: the core view never
   * decides which domain to target. Use `CrmEntityImportView` /
   * `IrmEntityImportView` unless you need to inject a custom strategy.
   */
  submissionStrategy: ImportSubmissionStrategy
  /**
   * Optional LLM-only context forwarded to Flowbot's `map-from-file`
   * endpoint when the user clicks "Analyze with AI". Currently used by
   * IRM to expose dynamic `additionalProperties.*` fields and the
   * InvestmentGroup `requiredSubtypeKey`. Never surfaced in the UI.
   */
  analyzerContext?: ImportAnalyzerContext
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
  submissionStrategy,
  analyzerContext,
  onBack,
  'data-testid': testId = 'entity-import-view',
  ...context
}) => {
  // Pre-register all step translation bundles so they are available before
  // each step mounts. Prevents raw keys on first render.
  const { t: tFileUpload } = useTranslation(fileUploadTranslations)
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
    extractionWarnings,
    handleFileChange,
    analyzeWithAgent,
    convertData,
    retryWithHardRepair,
    importToBackend,
    downloadJSON,
    reset
  } = useEntityImport(context, config, submissionStrategy, analyzerContext)

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

  const enforcedSelectConfigs = config.enforcedSelects
  const enforcedFormDefaults = React.useMemo(
    () => buildEnforcedSelectDefaults(enforcedSelectConfigs),
    [enforcedSelectConfigs]
  )
  const enforcedForm = useForm<EnforcedSelectValues>({ defaultValues: enforcedFormDefaults })
  const enforcedValues = enforcedForm.watch()
  const allRequiredEnforcedSatisfied = React.useMemo(
    () => allEnforcedRequiredSatisfied(enforcedSelectConfigs, enforcedValues),
    [enforcedSelectConfigs, enforcedValues]
  )

  React.useEffect(() => {
    if (agentResponse) {
      setMappings(agentResponse.fieldMappings)
      setUnmappedSourceFields(agentResponse.unmappedSourceFields)
    }
  }, [agentResponse, setMappings, setUnmappedSourceFields])

  const handleConvert = React.useCallback(async () => {
    const enforced = buildEnforcedSelectMap(enforcedSelectConfigs, enforcedForm.getValues())
    const enforcedFieldsJson = enforced ? JSON.stringify(enforced) : undefined
    await convertData(mappings, enforcedFieldsJson)
  }, [convertData, mappings, enforcedSelectConfigs, enforcedForm])

  const [isDownloadingTemplate, setIsDownloadingTemplate] = React.useState(false)
  const [downloadTemplateError, setDownloadTemplateError] = React.useState<string | null>(null)

  const handleDownloadTemplate = React.useCallback(async () => {
    setDownloadTemplateError(null)
    setIsDownloadingTemplate(true)
    try {
      await downloadImportTemplate({ config, analyzerContext })
    } catch (downloadError) {
      console.error('Import template download failed:', extractErrorMessage(downloadError))
      setDownloadTemplateError(tFileUpload('download-template-error'))
    } finally {
      setIsDownloadingTemplate(false)
    }
  }, [config, analyzerContext, tFileUpload])

  return (
    <PageLayout
      headerIcon={SparkleIcon}
      headerTitle={headerTitle}
      headerDescription={headerDescription}
      onBack={onBack}
      data-testid={testId}
    >
      {error && <ImportErrorCard step={step} error={error} data-testid={`${testId}-error`} />}

      {step === 'upload' && (
        <CatalogSelect.Provider {...context} form={enforcedForm}>
          <Form {...enforcedForm}>
            <FileUploadStep
              file={file}
              isLoading={isLoading}
              isDownloadingTemplate={isDownloadingTemplate}
              downloadTemplateError={downloadTemplateError}
              onFileChange={handleFileChange}
              onAnalyze={analyzeWithAgent}
              onDownloadTemplate={handleDownloadTemplate}
              {...(enableCampaignSelection && {
                campaignId,
                onCampaignChange: (campaign: { id: string; name: string } | null) =>
                  setCampaign(campaign?.id ?? null, campaign?.name),
                businessAppContext: context
              })}
              enforcedSelectConfigs={enforcedSelectConfigs}
              allRequiredEnforcedSatisfied={allRequiredEnforcedSatisfied}
              data-testid={`${testId}-upload-step`}
            />
          </Form>
        </CatalogSelect.Provider>
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
          config={config}
          businessAppContext={context}
          entityType={entityTypeSingular}
          isLoading={isLoading}
          importResult={importResult}
          campaignName={campaignName || undefined}
          extractionWarnings={extractionWarnings}
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
