import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@newwork/nw-design-system'
import { FolderIcon, FileIcon, ArrowRightIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { TemplateTreeNode, OrganizationDecision, ResponseWarning } from '@/common/network/flowbot/FlowbotClient'
import type { DocumentItem } from '../types'

interface OrganizePreviewProps {
  decisions: OrganizationDecision[]
  suggestedFolders: TemplateTreeNode[]
  warnings: ResponseWarning[]
  reasoning?: string
  fileDocuments: DocumentItem[]
  dataTestId: string
}

function getConfidenceBadge(confidence: number): { label: string; variant: 'default' | 'secondary' | 'destructive' } {
  if (confidence >= 0.85) {
    return {
      label: getTranslationFromI18nKeyAndLabel('document.ai.organize.confidenceHigh', 'High'),
      variant: 'default'
    }
  }
  if (confidence >= 0.6) {
    return {
      label: getTranslationFromI18nKeyAndLabel('document.ai.organize.confidenceMedium', 'Medium'),
      variant: 'secondary'
    }
  }
  return {
    label: getTranslationFromI18nKeyAndLabel('document.ai.organize.confidenceLow', 'Low'),
    variant: 'destructive'
  }
}

function renderTemplateTree(nodes: TemplateTreeNode[]): React.ReactNode {
  return (
    <ul className="gba:list-none gba:p-0 gba:m-0">
      {nodes.map(node => (
        <li key={node.path} className="gba:mt-1 gba:min-w-0 first:gba:mt-0">
          <div className="gba:flex gba:min-w-0 gba:items-center gba:gap-2 gba:py-1.5 gba:text-sm gba:pl-1">
            <FolderIcon weight="fill" className="gba:h-4 gba:w-4 gba:text-warning gba:shrink-0" />
            <span className="gba:min-w-0 gba:flex-1 gba:truncate gba:font-medium">{node.name}</span>
          </div>
          {node.children.length > 0 && <div className="gba:pl-4">{renderTemplateTree(node.children)}</div>}
        </li>
      ))}
    </ul>
  )
}

export const OrganizePreview: React.FC<OrganizePreviewProps> = ({
  decisions,
  suggestedFolders,
  warnings,
  reasoning,
  fileDocuments,
  dataTestId
}) => {
  const docNameMap = new Map(fileDocuments.map(d => [d.id, d.name || 'Untitled']))

  return (
    <div className="gba:space-y-4" data-testid={`${dataTestId}-preview`}>
      {reasoning && (
        <div className="gba:rounded-lg gba:bg-muted/50 gba:p-3 gba:text-sm gba:text-muted-foreground gba:italic">
          {reasoning}
        </div>
      )}

      {suggestedFolders.length > 0 && (
        <Card>
          <CardHeader className="gba:pb-2">
            <CardTitle className="gba:text-sm gba:flex gba:items-center gba:gap-2">
              <FolderIcon weight="fill" className="gba:h-4 gba:w-4 gba:text-warning" />
              {getTranslationFromI18nKeyAndLabel('document.ai.organize.proposedStructure', 'Proposed Folder Structure')}
            </CardTitle>
          </CardHeader>
          <CardContent className="gba:pt-0">
            <div className="gba:border gba:rounded-md gba:py-1">{renderTemplateTree(suggestedFolders)}</div>
          </CardContent>
        </Card>
      )}

      {decisions.length > 0 && (
        <Card>
          <CardHeader className="gba:pb-2">
            <CardTitle className="gba:text-sm gba:flex gba:items-center gba:gap-2">
              <FileIcon className="gba:h-4 gba:w-4 gba:text-primary" />
              {getTranslationFromI18nKeyAndLabel('document.ai.organize.fileAssignments', 'File Assignments')}
              <Badge variant="secondary" className="gba:ml-auto">
                {decisions.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="gba:pt-0">
            <div className="gba:space-y-2 gba:max-h-48 gba:overflow-y-auto">
              {decisions.map(decision => {
                const badge = getConfidenceBadge(decision.confidence ?? 0)
                return (
                  <div
                    key={decision.document_id}
                    className="gba:flex gba:min-w-0 gba:items-center gba:gap-2 gba:rounded-md gba:border gba:p-2 gba:text-sm"
                    data-testid={`${dataTestId}-decision-${decision.document_id}`}
                  >
                    <FileIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:shrink-0" />
                    <span className="gba:min-w-0 gba:flex-1 gba:truncate gba:font-medium">
                      {docNameMap.get(decision.document_id) || decision.document_id}
                    </span>
                    <ArrowRightIcon className="gba:h-3 gba:w-3 gba:text-muted-foreground gba:shrink-0" />
                    <span className="gba:flex gba:min-w-0 gba:flex-1 gba:items-center gba:gap-1 gba:text-muted-foreground">
                      <FolderIcon weight="fill" className="gba:h-3.5 gba:w-3.5 gba:text-warning" />
                      <span className="gba:min-w-0 gba:truncate">{decision.target_folder_path}</span>
                    </span>
                    <Badge variant={badge.variant} className="gba:shrink-0 gba:text-xs">
                      {badge.label}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {warnings.length > 0 && (
        <div className="gba:rounded-lg gba:bg-warning/10 gba:p-3 gba:text-sm gba:text-warning-foreground">
          <ul className="gba:list-disc gba:ml-4 gba:space-y-1">
            {warnings.map((w, i) => (
              <li key={`warning-${i}-${w.code}`}>{w.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
