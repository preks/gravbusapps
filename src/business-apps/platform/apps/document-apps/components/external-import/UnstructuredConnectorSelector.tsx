import React from 'react'
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner
} from '@newwork/nw-design-system'
import { FileText, ArrowRight, CheckCircle2 } from 'lucide-react'
import { ConnectorLogo } from '@/business-apps/core/create/apps/newwork-connect/components/ConnectorLogo'
import type { UnstructuredConnectorSummary } from '../../types/externalUnstructuredConnector'

export interface SharedConnectionOption {
  id: string
  name: string
}

const connectorNameToProviderId: Record<string, string> = {
  'nw-connector-google-drive': 'data-bridge.google-drive',
  'nw-connector-confluence': 'data-bridge.confluence',
  'nw-connector-onedrive': 'data-bridge.onedrive',
  'nw-connector-sharepoint': 'data-bridge.sharepoint',
  'nw-connector-s3': 'data-bridge.s3',
  'nw-connector-notion': 'data-bridge.notion',
  'nw-connector-dropbox': 'data-bridge.dropbox',
  'nw-connector-box': 'data-bridge.box',
  'nw-connector-azure-blob': 'data-bridge.azure-blob',
  'nw-connector-gcs': 'data-bridge.gcs'
}

const connectorDisplayName: Record<string, string> = {
  'nw-connector-google-drive': 'Google Drive',
  'nw-connector-confluence': 'Confluence',
  'nw-connector-onedrive': 'OneDrive',
  'nw-connector-sharepoint': 'SharePoint',
  'nw-connector-s3': 'Amazon S3',
  'nw-connector-notion': 'Notion',
  'nw-connector-dropbox': 'Dropbox',
  'nw-connector-box': 'Box',
  'nw-connector-azure-blob': 'Azure Blob',
  'nw-connector-gcs': 'Google Cloud Storage'
}

export interface UnstructuredConnectorSelectorProps {
  connectors: UnstructuredConnectorSummary[]
  selectedId: string | null
  onSelect: (connector: UnstructuredConnectorSummary) => void
  connectionOptions?: SharedConnectionOption[]
  selectedConnectionId?: string | null
  onConnectionChange?: (connectionId: string | null) => void
  isLoadingConnections?: boolean
  connectionError?: string | null
  onNext: () => void
  isLoading: boolean
  error?: string | null
  'data-testid'?: string
}

export const UnstructuredConnectorSelector: React.FC<UnstructuredConnectorSelectorProps> = ({
  connectors,
  selectedId,
  onSelect,
  connectionOptions = [],
  selectedConnectionId = null,
  onConnectionChange,
  isLoadingConnections = false,
  connectionError = null,
  onNext,
  isLoading,
  error,
  'data-testid': testId = 'unstructured-connector-selector'
}) => {
  if (isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-12" data-testid={testId}>
        <Spinner size="md" />
        <span className="gba:ml-2 gba:text-sm gba:text-muted-foreground">Loading connectors...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:py-8 gba:text-center" data-testid={testId}>
        <p className="gba:text-sm gba:text-destructive">{error}</p>
      </div>
    )
  }

  if (!connectors.length) {
    return (
      <div className="gba:py-8 gba:text-center gba:space-y-2" data-testid={testId}>
        <FileText className="gba:w-8 gba:h-8 gba:mx-auto gba:text-muted-foreground" />
        <p className="gba:text-sm gba:text-muted-foreground">
          No document sources connected yet. Go to NEWWORK CONNECT to set up a connection (Google Drive, SharePoint,
          Confluence, S3, etc.) and enable &quot;Document Import&quot;.
        </p>
      </div>
    )
  }

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      <p className="gba:text-sm gba:text-muted-foreground">Choose a source to import files from.</p>

      <div className="gba:grid gba:grid-cols-1 gba:gap-3">
        {connectors.map(c => {
          const isSelected = selectedId === c.id
          const providerId = connectorNameToProviderId[c.name] || c.name
          const displayName = connectorDisplayName[c.name] || c.name

          return (
            <button
              key={c.id}
              type="button"
              className={`gba:relative gba:w-full gba:text-left gba:rounded-xl gba:border gba:p-4 gba:transition-all ${
                isSelected
                  ? 'gba:border-primary gba:bg-accent gba:ring-1 gba:ring-primary'
                  : 'gba:border-border gba:hover:border-primary/40 gba:hover:bg-accent/50'
              }`}
              onClick={() => onSelect(c)}
              data-testid={`${testId}-option-${c.id}`}
            >
              <div className="gba:flex gba:items-center gba:gap-3">
                <ConnectorLogo providerId={providerId} size="md" />
                <div className="gba:min-w-0 gba:flex-1">
                  <div className="gba:text-sm gba:font-semibold gba:truncate">{displayName}</div>
                  {c.description && (
                    <div className="gba:text-xs gba:text-muted-foreground gba:line-clamp-2 gba:mt-0.5">
                      {c.description}
                    </div>
                  )}
                </div>
                {isSelected && <CheckCircle2 className="gba:w-5 gba:h-5 gba:text-primary gba:shrink-0" />}
              </div>
            </button>
          )
        })}
      </div>

      {selectedId && onConnectionChange && (isLoadingConnections || connectionOptions.length > 0) ? (
        <div className="gba:space-y-2">
          <Label className="gba:text-xs">Shared connection</Label>
          <Select
            value={selectedConnectionId || '__none__'}
            onValueChange={value => onConnectionChange(value === '__none__' ? null : value)}
          >
            <SelectTrigger className="gba:h-9" data-testid={`${testId}-shared-connection`}>
              <SelectValue
                placeholder={isLoadingConnections ? 'Loading shared connections...' : 'Use connector defaults'}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Use connector defaults</SelectItem>
              {connectionOptions.map(option => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {connectionError ? (
            <div className="gba:text-xs gba:text-destructive" data-testid={`${testId}-shared-connection-error`}>
              {connectionError}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="gba:flex gba:justify-end gba:pt-2">
        <Button size="sm" onClick={onNext} disabled={!selectedId} data-testid={`${testId}-next`}>
          Preview <ArrowRight className="gba:w-3 gba:h-3 gba:ml-1" />
        </Button>
      </div>
    </div>
  )
}
