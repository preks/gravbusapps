import React from 'react'
import { Badge } from '@newwork/nw-design-system'
import { FileTextIcon } from '@phosphor-icons/react'
import { resolveEntityLink } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'
import type { WorkspaceDocument } from '../../../types/enterpriseAgent'
import { DOC_TYPE_ICON, DOC_TYPE_LABEL, workspaceDocCardClassName } from './artifactIcons'

export const WorkspaceDocCard: React.FC<{
  doc: WorkspaceDocument
}> = ({ doc }) => {
  const Icon = DOC_TYPE_ICON[doc.type] ?? FileTextIcon
  const label = DOC_TYPE_LABEL[doc.type] ?? 'Document'
  const body = (
    <>
      <div className="gba:h-8 gba:w-8 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:shrink-0">
        <Icon className="gba:h-4 gba:w-4 gba:text-primary" />
      </div>
      <div className="gba:text-left gba:min-w-0 gba:flex-1">
        <span className="gba:text-xs gba:font-semibold gba:text-foreground gba:block gba:truncate">
          {label} created
        </span>
        <span className="gba:text-[10px] gba:text-muted-foreground gba:block">Click to view on canvas</span>
      </div>
      <Badge variant="secondary" className="gba:ml-auto gba:text-[10px] gba:shrink-0">
        View
      </Badge>
    </>
  )
  const isEntityProtocol = /^\w+:\/\//.test(doc.url) && !/^https?:\/\//i.test(doc.url)
  const resolvedHref = isEntityProtocol ? (resolveEntityLink(doc.url)?.url ?? doc.url) : doc.url
  return (
    <a
      href={resolvedHref}
      target="_blank"
      rel="noopener noreferrer"
      className={workspaceDocCardClassName}
      data-testid={`workspace-doc-card-${doc.id}`}
    >
      {body}
    </a>
  )
}
