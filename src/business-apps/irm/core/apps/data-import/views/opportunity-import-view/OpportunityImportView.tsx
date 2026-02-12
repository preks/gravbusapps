/**
 * Opportunity Import View (IRM)
 * Orchestrates the opportunity import flow: Upload → AI Analysis → Mapping → Conversion → Import
 */

import React from 'react'
import { PageLayout, Alert, AlertDescription, useTranslation } from '@newwork/nw-design-system'
import { XCircleIcon, SparkleIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useEntityImport, useEntityMappings } from '@/common/components/common-relations/apps/data-import/hooks'
import {
  FileUploadStep,
  MappingReviewStep,
  ConversionResultStep
} from '@/common/components/common-relations/apps/data-import/components'
import { investmentOpportunityImportConfig } from '@/common/data/investment/types/investmentOpportunityImportConfig'
import { ConvertedOpportunity } from './types/opportunityImportTypes'
import translations from './_i18n'

export interface OpportunityImportViewProps extends BusinessAppContextProps {
  onBack?: () => void
  'data-testid'?: string
}

export const OpportunityImportView: React.FC<OpportunityImportViewProps> = ({
  onBack,
  'data-testid': testId = 'opportunity-import-view',
  ...context
}) => {
  const { t } = useTranslation(translations)

  // Main import hook
  const {
    file,
    agentResponse,
    convertedEntities: convertedOpportunities,
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
  } = useEntityImport<ConvertedOpportunity>(context, investmentOpportunityImportConfig)

  // Mappings hook (initialized from agent response)
  const { mappings, setMappings, updateMapping, removeMapping, addMapping } = useEntityMappings(
    investmentOpportunityImportConfig.targetFields,
    agentResponse?.fieldMappings || []
  )

  // Sync mappings when agent response changes
  React.useEffect(() => {
    if (agentResponse) {
      setMappings(agentResponse.fieldMappings)
    }
  }, [agentResponse, setMappings])

  // Handle conversion with current mappings
  const handleConvert = async () => {
    await convertData(mappings)
  }

  return (
    <PageLayout
      headerIcon={SparkleIcon}
      headerTitle={t('page-title')}
      headerDescription={t('page-description')}
      // @ts-expect-error - onBack is supported at runtime but not in type definitions
      onBack={onBack}
      data-testid={testId}
    >
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="gba:mb-4" data-testid={`${testId}-error`}>
          <XCircleIcon className="gba:w-4 gba:h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <FileUploadStep
          file={file}
          isLoading={isLoading}
          onFileChange={handleFileChange}
          onAnalyze={analyzeWithAgent}
          data-testid={`${testId}-upload-step`}
        />
      )}

      {/* Step 2: Mapping */}
      {step === 'mapping' && agentResponse && (
        <MappingReviewStep
          agentResponse={agentResponse}
          mappings={mappings}
          targetFieldsConfig={investmentOpportunityImportConfig.targetFields}
          entityType={t('entity-type')}
          isLoading={isLoading}
          onUpdateMapping={updateMapping}
          onRemoveMapping={removeMapping}
          onAddMapping={addMapping}
          onConvert={handleConvert}
          onReset={reset}
          data-testid={`${testId}-mapping-step`}
        />
      )}

      {/* Step 3: Result */}
      {step === 'result' && (
        <ConversionResultStep
          convertedEntities={convertedOpportunities}
          targetFieldsConfig={investmentOpportunityImportConfig.targetFields}
          entityType={t('entity-type-singular')}
          isLoading={isLoading}
          importResult={importResult}
          onDownloadJSON={downloadJSON}
          onImportToBackend={importToBackend}
          onReset={reset}
          data-testid={`${testId}-result-step`}
        />
      )}
    </PageLayout>
  )
}

export default OpportunityImportView
