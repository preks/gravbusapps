import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { Badge } from '@newwork/nw-design-system'
import { FileTextIcon } from '@phosphor-icons/react'
import { resolveEntityLink } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'
import type { WorkspaceDocument } from '../../../types/enterpriseAgent'
import translations from '../../../_i18n'
import { DOC_TYPE_ICON, workspaceDocCardClassName } from './artifactIcons'

const DOC_TYPE_KEY: Record<WorkspaceDocument['type'], string> = {
  document: 'renderer-doc-type-document',
  slides: 'renderer-doc-type-slides',
  note: 'renderer-doc-type-note'
}

export const WorkspaceDocCard: React.FC<{
  doc: WorkspaceDocument
}> = ({ doc }) => {
  const { t } = useTranslation(translations)
  const Icon = DOC_TYPE_ICON[doc.type] ?? FileTextIcon
  const typeLabel = t(DOC_TYPE_KEY[doc.type] ?? 'renderer-doc-type-document')
  const body = (
    <>
      <div className="gba:h-8 gba:w-8 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:shrink-0">
        <Icon className="gba:h-4 gba:w-4 gba:text-primary" />
      </div>
      <div className="gba:text-left gba:min-w-0 gba:flex-1">
        <span className="gba:text-xs gba:font-semibold gba:text-foreground gba:block gba:truncate">
          {t('renderer-doc-created', { type: typeLabel })}
        </span>
        <span className="gba:text-[10px] gba:text-muted-foreground gba:block">{t('renderer-doc-view-canvas')}</span>
      </div>
      <Badge variant="secondary" className="gba:ml-auto gba:text-[10px] gba:shrink-0">
        {t('renderer-doc-view')}
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
