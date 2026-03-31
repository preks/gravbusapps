/**
 * Equity Investment Import View
 * Orchestrates the equity investment import flow: Upload → AI Analysis → Mapping → Conversion → Import
 */

import React from 'react'
import { PageLayout, useTranslation } from '@newwork/nw-design-system'
import { SparkleIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useEntityImport, useEntityMappings } from '@/common/components/common-relations/apps/data-import/hooks'
import {
  FileUploadStep,
  MappingReviewStep,
  ConversionResultStep,
  ImportErrorCard
} from '@/common/components/common-relations/apps/data-import/components'
import { equityInvestmentImportConfig } from './config/equityInvestmentImportConfig'
import { ConvertedEquityInvestment } from './types/equityInvestmentImportTypes'
import { convertToNestedEquityInvestment } from './utils/convertToNestedStructure'
import translations from './_i18n'

export interface EquityInvestmentImportViewProps extends BusinessAppContextProps {
  onBack?: () => void
  'data-testid'?: string
}

export const EquityInvestmentImportView: React.FC<EquityInvestmentImportViewProps> = ({
  onBack,
  'data-testid': testId = 'equity-investment-import-view',
  ...context
}) => {
  const { t } = useTranslation(translations)

  // Main import hook
  const {
    file,
    agentResponse,
    convertedEntities: convertedEquityInvestments,
    step,
    isLoading,
    error,
    importResult,
    handleFileChange,
    analyzeWithAgent,
    convertData: baseConvertData,
    importToBackend,
    downloadJSON,
    reset
  } = useEntityImport<ConvertedEquityInvestment>(context, equityInvestmentImportConfig)

  // Mappings hook (initialized from agent response)
  const {
    mappings,
    setMappings,
    updateTargetFromUnmapped,
    removeMapping,
    addMapping,
    unmappedSourceFields,
    setUnmappedSourceFields
  } = useEntityMappings(equityInvestmentImportConfig.targetFields, agentResponse?.fieldMappings || [])

  // Sync mappings and unmapped fields when agent response changes
  React.useEffect(() => {
    if (agentResponse) {
      setMappings(agentResponse.fieldMappings)
      setUnmappedSourceFields(agentResponse.unmappedSourceFields)
    }
  }, [agentResponse, setMappings, setUnmappedSourceFields])

  // Handle conversion with current mappings and transformation function
  const handleConvert = async () => {
    await baseConvertData(mappings, undefined, convertToNestedEquityInvestment)
  }

  return (
    <PageLayout
      headerIcon={SparkleIcon}
      headerTitle={t('equity-page-title')}
      headerDescription={t('equity-page-description')}
      onBack={onBack}
      data-testid={testId}
    >
      {error && <ImportErrorCard step={step} error={error} data-testid={`${testId}-error`} />}

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
          unmappedSourceFields={unmappedSourceFields}
          targetFieldsConfig={equityInvestmentImportConfig.targetFields}
          entityType={t('equity-entity-type')}
          isLoading={isLoading}
          onUpdateTargetFromUnmapped={updateTargetFromUnmapped}
          onRemoveMapping={removeMapping}
          onAddMapping={addMapping}
          onConvert={handleConvert}
          onReset={reset}
          data-testid={`${testId}-mapping-step`}
        />
      )}

      {/* Step 3: Result */}
      {step === 'result' && (
        <ConversionResultStep<ConvertedEquityInvestment>
          convertedEntities={convertedEquityInvestments}
          targetFieldsConfig={equityInvestmentImportConfig.targetFields}
          entityType={t('equity-entity-type-singular')}
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

export default EquityInvestmentImportView
