import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@newwork/nw-design-system'
import { FolderIcon, FileIcon, ArrowRightIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { OrganizationDecision } from '@/common/network/flowbot/FlowbotClient'
import type { FolderNode } from '@/common/components/common-relations/setting-pages/folder-templates/types'

interface OrganizePreviewProps {
  decisions: OrganizationDecision[]
  suggestedFolders: FolderNode[]
  warnings: string[]
  reasoning?: string
  dataTestId: string
}

function renderFolderTree(folders: FolderNode[], depth: number = 0): React.ReactNode {
  return (
    <ul className="gba:list-none gba:p-0 gba:m-0">
      {folders.map(folder => (
        <li key={`${depth}-${folder.name}`}>
          <div
            className="gba:flex gba:items-center gba:gap-2 gba:py-1.5 gba:text-sm"
            style={{ paddingLeft: `${depth * 16 + 4}px` }}
          >
            <FolderIcon weight="fill" className="gba:h-4 gba:w-4 gba:text-warning gba:shrink-0" />
            <span className="gba:font-medium">{folder.name}</span>
          </div>
          {folder.folders.length > 0 && renderFolderTree(folder.folders, depth + 1)}
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
  dataTestId
}) => {
  return (
    <div className="gba:space-y-4" data-testid={`${dataTestId}-preview`}>
      {reasoning && (
        <div className="gba:rounded-lg gba:bg-muted/50 gba:p-3 gba:text-sm gba:text-muted-foreground gba:italic">
          {reasoning}
        </div>
      )}

      {/* Proposed folder structure */}
      {suggestedFolders.length > 0 && (
        <Card>
          <CardHeader className="gba:pb-2">
            <CardTitle className="gba:text-sm gba:flex gba:items-center gba:gap-2">
              <FolderIcon weight="fill" className="gba:h-4 gba:w-4 gba:text-warning" />
              {getTranslationFromI18nKeyAndLabel('document.ai.organize.proposedStructure', 'Proposed Folder Structure')}
            </CardTitle>
          </CardHeader>
          <CardContent className="gba:pt-0">
            <div className="gba:border gba:rounded-md gba:py-1">{renderFolderTree(suggestedFolders)}</div>
          </CardContent>
        </Card>
      )}

      {/* File assignments */}
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
              {decisions.map(decision => (
                <div
                  key={decision.documentId}
                  className="gba:flex gba:items-center gba:gap-2 gba:rounded-md gba:border gba:p-2 gba:text-sm"
                  data-testid={`${dataTestId}-decision-${decision.documentId}`}
                >
                  <FileIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:shrink-0" />
                  <span className="gba:truncate gba:flex-1 gba:font-medium">{decision.documentName}</span>
                  <ArrowRightIcon className="gba:h-3 gba:w-3 gba:text-muted-foreground gba:shrink-0" />
                  <span className="gba:flex gba:items-center gba:gap-1 gba:text-muted-foreground gba:shrink-0">
                    <FolderIcon weight="fill" className="gba:h-3.5 gba:w-3.5 gba:text-warning" />
                    {decision.targetFolder}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="gba:rounded-lg gba:bg-warning/10 gba:p-3 gba:text-sm gba:text-warning-foreground">
          <ul className="gba:list-disc gba:ml-4 gba:space-y-1">
            {warnings.map((w, i) => (
              <li key={`warning-${i}-${w.slice(0, 20)}`}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
