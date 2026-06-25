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
  allEnforcedDirectFieldsRequiredSatisfied,
  buildEnforcedDirectFieldDefaults,
  buildEnforcedDirectFieldMap,
  buildEnforcedSelectDefaults,
  buildEnforcedSelectMap,
  downloadImportTemplate,
  type EnforcedDirectFieldValues,
  type EnforcedSelectValues
} from '@/common/components/common-relations/apps/data-import/utils'
import { FileUploadStep } from './FileUploadStep'
import { MappingReviewStep } from './MappingReviewStep'
import { ConversionResultStep } from './ConversionResultStep'
import { OwnershipAssociationStep } from './OwnershipAssociationStep'
import { ImportErrorCard } from './ImportErrorCard'
import fileUploadTranslations from './FileUploadStep/_i18n'
import mappingReviewTranslations from './MappingReviewStep/_i18n'
import conversionResultTranslations from './ConversionResultStep/_i18n'
import ownershipAssociationTranslations from './OwnershipAssociationStep/_i18n'

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
  /** When true, requires an investment company group before Analyze (IRM company import) */
  enableInvestmentCompanyGroupSelection?: boolean
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
  /**
   * Additional enforced fields to merge with catalog-based enforced
   * selects during conversion. Used for GraphQL entity-based selects
   * (like InvestmentCompanyGroup) that can't use CatalogSelect.
   */
  additionalEnforcedFields?: Record<string, string>
  /** Slot for custom select components rendered on the upload step */
  customSelectsSlot?: React.ReactNode
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
  enableInvestmentCompanyGroupSelection = false,
  submissionStrategy,
  analyzerContext,
  additionalEnforcedFields,
  customSelectsSlot,
  onBack,
  'data-testid': testId = 'entity-import-view',
  ...context
}) => {
  // Pre-register all step translation bundles so they are available before
  // each step mounts. Prevents raw keys on first render.
  const { t: tFileUpload } = useTranslation(fileUploadTranslations)
  useTranslation(mappingReviewTranslations)
  useTranslation(conversionResultTranslations)
  useTranslation(ownershipAssociationTranslations)

  const {
    file,
    agentResponse,
    convertedEntities,
    campaignId,
    campaignName,
    setCampaign,
    investmentCompanyGroupId,
    setInvestmentCompanyGroup,
    step,
    isLoading,
    error,
    importResult,
    csvQuality,
    extractionWarnings,
    ownershipUpdates,
    executiveUpdates,
    stakeholderUpdates,
    ownershipFile,
    ownershipExtractionWarnings,
    ownershipImportResult,
    deferOwnershipSubmission,
    handleFileChange,
    analyzeWithAgent,
    convertData,
    retryWithHardRepair,
    importToBackend,
    goToOwnershipStep,
    skipOwnershipStep,
    setOwnershipFile,
    usePreviousFileForOwnership,
    extractOwnershipFromFile,
    importOwnershipToBackend,
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
  const enforcedDirectFieldConfigs = config.enforcedDirectFields
  const enforcedFormDefaults = React.useMemo(
    () => ({
      ...buildEnforcedSelectDefaults(enforcedSelectConfigs),
      ...buildEnforcedDirectFieldDefaults(enforcedDirectFieldConfigs)
    }),
    [enforcedSelectConfigs, enforcedDirectFieldConfigs]
  )
  const enforcedForm = useForm<EnforcedSelectValues & EnforcedDirectFieldValues>({
    defaultValues: enforcedFormDefaults
  })
  const enforcedValues = enforcedForm.watch()
  const allRequiredEnforcedSatisfied = React.useMemo(
    () =>
      allEnforcedRequiredSatisfied(enforcedSelectConfigs, enforcedValues) &&
      allEnforcedDirectFieldsRequiredSatisfied(enforcedDirectFieldConfigs, enforcedValues),
    [enforcedSelectConfigs, enforcedDirectFieldConfigs, enforcedValues]
  )

  const canProceedFromUpload = allRequiredEnforcedSatisfied

  React.useEffect(() => {
    if (agentResponse) {
      setMappings(agentResponse.fieldMappings)
      setUnmappedSourceFields(agentResponse.unmappedSourceFields)
    }
  }, [agentResponse, setMappings, setUnmappedSourceFields])

  const handleConvert = React.useCallback(async () => {
    const values = enforcedForm.getValues()
    const catalogEnforced = buildEnforcedSelectMap(enforcedSelectConfigs, values)
    const enforcedDirectFields = buildEnforcedDirectFieldMap(enforcedDirectFieldConfigs, values)
    const mergedEnforced = {
      ...catalogEnforced,
      ...enforcedDirectFields,
      ...additionalEnforcedFields
    }
    const hasEnforcedFields = Object.keys(mergedEnforced).length > 0
    const enforcedFieldsJson = hasEnforcedFields ? JSON.stringify(mergedEnforced) : undefined
    await convertData(mappings, enforcedFieldsJson)
  }, [convertData, mappings, enforcedSelectConfigs, enforcedDirectFieldConfigs, enforcedForm, additionalEnforcedFields])

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
              {...(enableInvestmentCompanyGroupSelection && {
                investmentCompanyGroupId: investmentCompanyGroupId || null,
                onInvestmentCompanyGroupChange: (group: { id: string; name: string } | null) =>
                  setInvestmentCompanyGroup(group?.id ?? null),
                businessAppContext: context
              })}
              enforcedSelectConfigs={enforcedSelectConfigs}
              enforcedDirectFieldConfigs={enforcedDirectFieldConfigs}
              allRequiredEnforcedSatisfied={canProceedFromUpload}
              customSelectsSlot={customSelectsSlot}
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
          relationshipColumnHints={config.relationshipColumnHints}
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
          entityTypePlural={entityType}
          isLoading={isLoading}
          importResult={importResult}
          campaignName={campaignName || undefined}
          extractionWarnings={extractionWarnings}
          ownershipUpdates={ownershipUpdates}
          executiveUpdates={executiveUpdates}
          stakeholderUpdates={stakeholderUpdates}
          csvQuality={csvQuality}
          deferOwnershipSubmission={deferOwnershipSubmission}
          onHardRepair={retryWithHardRepair}
          onDownloadJSON={downloadJSON}
          onImportToBackend={importToBackend}
          onContinueToOwnership={goToOwnershipStep}
          onSkipOwnership={skipOwnershipStep}
          onReset={reset}
          data-testid={`${testId}-result-step`}
        />
      )}

      {step === 'ownership' && deferOwnershipSubmission && (
        <OwnershipAssociationStep
          config={config}
          ownershipFile={ownershipFile}
          ownershipUpdates={ownershipUpdates}
          ownershipExtractionWarnings={ownershipExtractionWarnings}
          ownershipImportResult={ownershipImportResult}
          hasPreviousFile={Boolean(file)}
          isLoading={isLoading}
          onOwnershipFileChange={setOwnershipFile}
          onUsePreviousFile={usePreviousFileForOwnership}
          onExtract={extractOwnershipFromFile}
          onImportOwnership={importOwnershipToBackend}
          onSkip={skipOwnershipStep}
          onDone={reset}
          data-testid={`${testId}-ownership-step`}
        />
      )}
    </PageLayout>
  )
}

export default EntityImportView
