/**
 * Lead Import View
 * Orchestrates the lead import flow: Upload → AI Analysis → Mapping → Conversion → Import
 */

import React from 'react'
import { PageLayout, Alert, AlertDescription } from '@newwork/nw-design-system'
import { XCircleIcon, SparkleIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useEntityImport, useEntityMappings } from '@/common/data/customer/agents/hooks'
import { FileUploadStep, MappingReviewStep, ConversionResultStep } from '@/common/data/customer/agents/components'
import { leadImportConfig } from './config/leadImportConfig'
import { ConvertedLead } from './types'

export interface LeadImportViewProps extends BusinessAppContextProps {
  onBack?: () => void
  'data-testid'?: string
}

export const LeadImportView: React.FC<LeadImportViewProps> = ({
  onBack,
  'data-testid': testId = 'lead-import-view',
  ...context
}) => {
  // Main import hook
  const {
    file,
    parsedData,
    agentResponse,
    convertedEntities: convertedLeads,
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
  } = useEntityImport<ConvertedLead>(context, leadImportConfig)

  // Mappings hook (initialized from agent response)
  const { mappings, setMappings, updateMapping, removeMapping, addMapping } = useEntityMappings(
    leadImportConfig.targetFields,
    agentResponse?.fieldMappings || []
  )

  // Sync mappings when agent response changes
  React.useEffect(() => {
    if (agentResponse) {
      setMappings(agentResponse.fieldMappings)
    }
  }, [agentResponse, setMappings])

  // Handle conversion with current mappings
  const handleConvert = () => {
    convertData(mappings)
  }

  return (
    <PageLayout
      headerIcon={SparkleIcon}
      headerTitle="Lead Import with AI Mapping"
      headerDescription="Upload a CSV file, let AI analyze and map the fields, then convert to CustomerLead format"
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
          targetFieldsConfig={leadImportConfig.targetFields}
          parsedDataCount={parsedData.length}
          entityType="leads"
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
          convertedEntities={convertedLeads}
          targetFieldsConfig={leadImportConfig.targetFields}
          entityType="lead"
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

export default LeadImportView
