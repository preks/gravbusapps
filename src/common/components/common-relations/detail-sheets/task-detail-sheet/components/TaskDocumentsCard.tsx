'use client'

import React from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { ArrowSquareOutIcon } from '@phosphor-icons/react'
import { TaskDocument } from '../types'
import { getDocumentIcon } from '@/common/utils/documentIconUtils'
import type { EnvelopeStatusRecord } from '@/common/components/docusign/hooks/useEnvelopeStatusCache'

export interface TaskDocumentsCardProps {
  documents: (TaskDocument & { envelopeId?: string; envelopeStatus?: string })[]
  statusMap: Record<string, EnvelopeStatusRecord>
  dataTestId?: string
  onDocumentClick: (doc: TaskDocument, e: React.MouseEvent) => void
  onCheckEnvelopeStatus: (envelopeId: string) => void
  showDocuSignEnvelopeStatus?: boolean
}

/**
 * TaskDocumentsCard - Displays task documents with DocuSign envelope status
 */
export const TaskDocumentsCard: React.FC<TaskDocumentsCardProps> = ({
  documents,
  statusMap,
  dataTestId = 'TaskDetailSheet',
  onDocumentClick,
  onCheckEnvelopeStatus,
  showDocuSignEnvelopeStatus = true
}) => {
  if (documents.length === 0) {
    return null
  }

  return (
    <Card data-testid={`${dataTestId}-documents-card`}>
      <CardHeader className="gba:pb-3">
        <CardTitle className="gba:text-base gba:font-medium gba:text-muted-foreground">
          Documents ({documents.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:space-y-2">
          {documents.map(doc => {
            const envelopeId = doc.envelopeId || (doc.fileInfo as any)?.docusignEnvelopeId
            const displayStatus = envelopeId ? statusMap[envelopeId]?.status || doc.envelopeStatus || 'unknown' : null
            return (
              <button
                type="button"
                key={doc.id}
                onClick={e => onDocumentClick(doc, e)}
                className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:p-3 gba:text-left gba:bg-muted gba:rounded-lg gba:hover:bg-accent gba:transition-colors gba:group"
                data-testid={`${dataTestId}-document-${doc.id}`}
              >
                <div className="gba:flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:bg-background gba:rounded gba:shrink-0">
                  {getDocumentIcon({ name: doc.name, mimeType: doc.mimeType, size: 14 })}
                </div>
                <div className="gba:flex-1 gba:min-w-0">
                  <div className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{doc.name}</div>
                  {doc.mimeType && (
                    <div className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">{doc.mimeType}</div>
                  )}
                  {showDocuSignEnvelopeStatus && envelopeId ? (
                    <div className="gba:mt-1 gba:flex gba:items-center gba:gap-2">
                      <span className="gba:text-xs gba:text-muted-foreground">DocuSign:</span>
                      <span className="gba:text-xs gba:font-medium">{displayStatus}</span>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation()
                          if (envelopeId) {
                            onCheckEnvelopeStatus(envelopeId)
                          }
                        }}
                      >
                        Check status
                      </Button>
                    </div>
                  ) : null}
                </div>
                <ArrowSquareOutIcon
                  size={16}
                  className="gba:text-muted-foreground gba:shrink-0 gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity"
                />
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
