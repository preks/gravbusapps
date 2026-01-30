/**
 * Contact Import View
 * Orchestrates the contact import flow: Upload → AI Analysis → Mapping → Conversion → Import
 */

import React from 'react'
import { PageLayout, Alert, AlertDescription } from '@newwork/nw-design-system'
import { XCircleIcon, SparkleIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useEntityImport, useEntityMappings } from '@/common/components/common-relations/apps/data-import/hooks'
import {
  FileUploadStep,
  MappingReviewStep,
  ConversionResultStep
} from '@/common/components/common-relations/apps/data-import/components'
import { contactImportConfig } from './config/contactImportConfig'
import { ConvertedContact } from './types/contactImportTypes'

export interface ContactImportViewProps extends BusinessAppContextProps {
  onBack?: () => void
  'data-testid'?: string
}

export const ContactImportView: React.FC<ContactImportViewProps> = ({
  onBack,
  'data-testid': testId = 'contact-import-view',
  ...context
}) => {
  // Main import hook
  const {
    file,
    parsedData,
    agentResponse,
    convertedEntities: convertedContacts,
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
  } = useEntityImport<ConvertedContact>(context, contactImportConfig)

  // Mappings hook (initialized from agent response)
  const { mappings, setMappings, updateMapping, removeMapping, addMapping } = useEntityMappings(
    contactImportConfig.targetFields,
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
      headerTitle="Investment Contact Import with AI Mapping"
      headerDescription="Upload a CSV file, let AI analyze and map the fields, then convert to InvestmentContact format"
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
          targetFieldsConfig={contactImportConfig.targetFields}
          parsedDataCount={parsedData.length}
          entityType="contacts"
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
          convertedEntities={convertedContacts}
          targetFieldsConfig={contactImportConfig.targetFields}
          entityType="contact"
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

export default ContactImportView
