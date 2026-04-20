/**
 * Real Estate Investment Import View
 * Orchestrates the real estate investment import flow: Upload → AI Analysis → Mapping → Conversion → Import
 */

import React from 'react'
import { PageLayout, useTranslation } from '@newwork/nw-design-system'
import { SparkleIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useEntityImport,
  useEntityMappings,
  useInvestmentTypeDefaults
} from '@/common/components/common-relations/apps/data-import/hooks'
import {
  FileUploadStep,
  MappingReviewStep,
  ConversionResultStep
} from '@/common/components/common-relations/apps/data-import/components'
import { ImportErrorCard } from '@/common/components/common-relations/apps/data-import/components/ImportErrorCard'
import { realEstateInvestmentImportConfig } from './config/realEstateInvestmentImportConfig'
import { ConvertedRealEstateInvestment } from './types/realEstateInvestmentImportTypes'
import { convertToNestedRealEstateInvestment } from './utils/convertToNestedStructure'
import translations from './_i18n'

export interface RealEstateInvestmentImportViewProps extends BusinessAppContextProps {
  onBack?: () => void
  'data-testid'?: string
}

export const RealEstateInvestmentImportView: React.FC<RealEstateInvestmentImportViewProps> = ({
  onBack,
  'data-testid': testId = 'real-estate-investment-import-view',
  ...context
}) => {
  const { t } = useTranslation(translations)

  // Main import hook
  const {
    file,
    agentResponse,
    convertedEntities: convertedRealEstateInvestments,
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
  } = useEntityImport<ConvertedRealEstateInvestment>(context, realEstateInvestmentImportConfig)

  // Mappings hook (initialized from agent response)
  const {
    mappings,
    setMappings,
    updateTargetFromUnmapped,
    removeMapping,
    addMapping,
    unmappedSourceFields,
    setUnmappedSourceFields
  } = useEntityMappings(realEstateInvestmentImportConfig.targetFields, agentResponse?.fieldMappings || [])
  const investmentTypeDefaults = useInvestmentTypeDefaults(
    context.accessToken,
    realEstateInvestmentImportConfig.investmentGroupCodeHint
  )

  // Sync mappings and unmapped fields when agent response changes
  React.useEffect(() => {
    if (agentResponse) {
      setMappings(agentResponse.fieldMappings)
      setUnmappedSourceFields(agentResponse.unmappedSourceFields)
    }
  }, [agentResponse, setMappings, setUnmappedSourceFields])

  // Handle conversion with current mappings and transformation function
  const handleConvert = async () => {
    const enforcedFieldsJson = investmentTypeDefaults.selectedType
      ? JSON.stringify({ 'investment.investmentTypeRef': investmentTypeDefaults.selectedType })
      : undefined

    await baseConvertData(mappings, enforcedFieldsJson, convertToNestedRealEstateInvestment)
  }

  return (
    <PageLayout
      headerIcon={SparkleIcon}
      headerTitle={t('real-estate-page-title')}
      headerDescription={t('real-estate-page-description')}
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
          investmentTypeDefaults={investmentTypeDefaults}
          data-testid={`${testId}-upload-step`}
        />
      )}

      {/* Step 2: Mapping */}
      {step === 'mapping' && agentResponse && (
        <MappingReviewStep
          agentResponse={agentResponse}
          mappings={mappings}
          unmappedSourceFields={unmappedSourceFields}
          targetFieldsConfig={realEstateInvestmentImportConfig.targetFields}
          entityType={t('real-estate-entity-type')}
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
        <ConversionResultStep<ConvertedRealEstateInvestment>
          convertedEntities={convertedRealEstateInvestments}
          targetFieldsConfig={realEstateInvestmentImportConfig.targetFields}
          entityType={t('real-estate-entity-type-singular')}
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

export default RealEstateInvestmentImportView
