/**
 * Account Import View
 * Orchestrates the account import flow: Upload → AI Analysis → Mapping → Conversion → Import
 */

import React from 'react'
import { PageLayout, Alert, AlertDescription } from '@newwork/nw-design-system'
import { XCircleIcon, SparkleIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useEntityImport, useEntityMappings } from '@/common/data/customer/agents/hooks'
import { FileUploadStep, MappingReviewStep, ConversionResultStep } from '@/common/data/customer/agents/components'
import { accountImportConfig } from './config/accountImportConfig'
import { ConvertedAccount } from './types'

export interface AccountImportViewProps extends BusinessAppContextProps {
  onBack?: () => void
  'data-testid'?: string
}

export const AccountImportView: React.FC<AccountImportViewProps> = ({
  onBack,
  'data-testid': testId = 'account-import-view',
  ...context
}) => {
  // Main import hook
  const {
    file,
    parsedData,
    agentResponse,
    convertedEntities: convertedAccounts,
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
  } = useEntityImport<ConvertedAccount>(context, accountImportConfig)

  // Mappings hook (initialized from agent response)
  const { mappings, setMappings, updateMapping, removeMapping, addMapping } = useEntityMappings(
    accountImportConfig.targetFields,
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
      headerTitle="Account Import with AI Mapping"
      headerDescription="Upload a CSV file, let AI analyze and map the fields, then convert to Account format"
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
          targetFieldsConfig={accountImportConfig.targetFields}
          parsedDataCount={parsedData.length}
          entityType="accounts"
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
          convertedEntities={convertedAccounts}
          targetFieldsConfig={accountImportConfig.targetFields}
          entityType="account"
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

export default AccountImportView
