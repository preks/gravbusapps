/**
 * Liquid Fund Investment Import View
 * Orchestrates the liquid fund investment import flow: Upload → AI Analysis → Mapping → Conversion → Import
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
import { liquidFundInvestmentImportConfig } from './config/liquidFundInvestmentImportConfig'
import { ConvertedLiquidFundInvestment } from './types/liquidFundInvestmentImportTypes'
import { convertToNestedLiquidFundInvestment } from './utils/convertToNestedStructure'
import translations from './_i18n'

export interface LiquidFundInvestmentImportViewProps extends BusinessAppContextProps {
  onBack?: () => void
  'data-testid'?: string
}

export const LiquidFundInvestmentImportView: React.FC<LiquidFundInvestmentImportViewProps> = ({
  onBack,
  'data-testid': testId = 'liquid-fund-investment-import-view',
  ...context
}) => {
  const { t } = useTranslation(translations)

  // Main import hook
  const {
    file,
    agentResponse,
    convertedEntities: convertedLiquidFundInvestments,
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
  } = useEntityImport<ConvertedLiquidFundInvestment>(context, liquidFundInvestmentImportConfig)

  // Mappings hook (initialized from agent response)
  const {
    mappings,
    setMappings,
    updateTargetFromUnmapped,
    removeMapping,
    addMapping,
    unmappedSourceFields,
    setUnmappedSourceFields
  } = useEntityMappings(liquidFundInvestmentImportConfig.targetFields, agentResponse?.fieldMappings || [])
  const investmentTypeDefaults = useInvestmentTypeDefaults(
    context.accessToken,
    liquidFundInvestmentImportConfig.investmentGroupCodeHint
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

    await baseConvertData(mappings, enforcedFieldsJson, convertToNestedLiquidFundInvestment)
  }

  return (
    <PageLayout
      headerIcon={SparkleIcon}
      headerTitle={t('liquid-fund-page-title')}
      headerDescription={t('liquid-fund-page-description')}
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
          targetFieldsConfig={liquidFundInvestmentImportConfig.targetFields}
          entityType={t('liquid-fund-entity-type')}
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
        <ConversionResultStep<ConvertedLiquidFundInvestment>
          convertedEntities={convertedLiquidFundInvestments}
          targetFieldsConfig={liquidFundInvestmentImportConfig.targetFields}
          entityType={t('liquid-fund-entity-type-singular')}
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

export default LiquidFundInvestmentImportView
