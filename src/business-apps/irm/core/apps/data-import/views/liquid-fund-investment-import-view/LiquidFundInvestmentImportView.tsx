/**
 * Liquid Fund Investment Import View
 * Orchestrates the liquid fund investment import flow: Upload → AI Analysis → Mapping → Conversion → Import
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
  const { mappings, setMappings, updateMapping, removeMapping, addMapping } = useEntityMappings(
    liquidFundInvestmentImportConfig.targetFields,
    agentResponse?.fieldMappings || []
  )

  // Sync mappings when agent response changes
  React.useEffect(() => {
    if (agentResponse) {
      setMappings(agentResponse.fieldMappings)
    }
  }, [agentResponse, setMappings])

  // Handle conversion with current mappings and transformation function
  const handleConvert = async () => {
    await baseConvertData(mappings, convertToNestedLiquidFundInvestment)
  }

  return (
    <PageLayout
      headerIcon={SparkleIcon}
      headerTitle={t('page-title')}
      headerDescription={t('page-description')}
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
          targetFieldsConfig={liquidFundInvestmentImportConfig.targetFields}
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
        <ConversionResultStep<ConvertedLiquidFundInvestment>
          convertedEntities={convertedLiquidFundInvestments}
          targetFieldsConfig={liquidFundInvestmentImportConfig.targetFields}
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

export default LiquidFundInvestmentImportView
