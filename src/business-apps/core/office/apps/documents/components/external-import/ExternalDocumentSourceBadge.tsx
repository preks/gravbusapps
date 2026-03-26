import React, { useCallback } from 'react'
import { Badge, Button, toast } from '@newwork/nw-design-system'
import { ExternalLink, Copy, Link2Off } from 'lucide-react'
import type { ExternalDocumentProvenance } from '../../types/externalUnstructuredConnector'

export interface ExternalDocumentSourceBadgeProps {
  provenance: ExternalDocumentProvenance
  onCreateEditableCopy?: () => void
  'data-testid'?: string
}

const CONNECTOR_LABELS: Record<string, string> = {
  confluence: 'Confluence',
  sharepoint: 'SharePoint',
  'google-drive': 'Google Drive',
  s3: 'S3',
  'wikipedia-docs-connector': 'Wikipedia'
}

export const ExternalDocumentSourceBadge: React.FC<ExternalDocumentSourceBadgeProps> = ({
  provenance,
  onCreateEditableCopy,
  'data-testid': testId = 'external-source-badge'
}) => {
  const sourceLabel = CONNECTOR_LABELS[provenance.connectorName.toLowerCase()] || provenance.connectorName

  const handleOpenSource = useCallback(() => {
    if (provenance.externalUrl) {
      window.open(provenance.externalUrl, '_blank', 'noopener,noreferrer')
    }
  }, [provenance.externalUrl])

  const handleCopy = useCallback(() => {
    if (!onCreateEditableCopy) return
    const confirmed = window.confirm(
      'Creating an editable copy will break the connection to the external source. ' +
        'The new document will no longer receive updates from the original. Continue?'
    )
    if (confirmed) {
      onCreateEditableCopy()
      toast.success('Editable copy created. The connection to the external source has been removed.')
    }
  }, [onCreateEditableCopy])

  return (
    <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap" data-testid={testId}>
      <Badge variant="secondary" className="gba:text-xs gba:gap-1">
        <ExternalLink className="gba:w-3 gba:h-3" />
        {sourceLabel}
        {provenance.isConnected && <span className="gba:text-success">●</span>}
        {!provenance.isConnected && <Link2Off className="gba:w-3 gba:h-3 gba:text-muted-foreground" />}
      </Badge>

      {provenance.externalUrl && (
        <Button
          variant="ghost"
          size="sm"
          className="gba:h-6 gba:text-xs"
          onClick={handleOpenSource}
          data-testid={`${testId}-open-source`}
        >
          <ExternalLink className="gba:w-3 gba:h-3 gba:mr-1" /> Open in source
        </Button>
      )}

      {onCreateEditableCopy && (
        <Button
          variant="ghost"
          size="sm"
          className="gba:h-6 gba:text-xs"
          onClick={handleCopy}
          data-testid={`${testId}-copy`}
        >
          <Copy className="gba:w-3 gba:h-3 gba:mr-1" /> Create editable copy
        </Button>
      )}
    </div>
  )
}
