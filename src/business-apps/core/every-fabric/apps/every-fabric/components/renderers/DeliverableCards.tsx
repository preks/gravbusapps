import React, { useCallback, useState } from 'react'
import { Badge, toast } from '@newwork/nw-design-system'
import { DownloadSimpleIcon, FileTextIcon, PresentationIcon } from '@phosphor-icons/react'
import { resolveEntityLink } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'
import { useEnterpriseAgentClient } from '../../hooks/useEnterpriseAgentClient'

/** ui.kind sentinel emitted by tools that opt into deliverable_card rendering. */
export const DELIVERABLE_CARD_UI_KIND = 'deliverable_card' as const

/** A workspace-document deliverable (open in canvas / new tab). */
export interface WorkspaceDocumentDeliverable {
  kind: 'workspace_document'
  type?: string
  id: string
  title: string
  primaryAction: {
    label: string
    kind: 'open_href'
    href: string
  }
}

/** A session attachment download (PDF, etc.) — fetched with bearer auth. */
export interface SessionAttachmentDeliverable {
  kind: 'session_attachment'
  id: string
  name: string
  mimeType?: string
  primaryAction: {
    label: string
    kind: 'session_attachment_download'
  }
}

export type DeliverableItem = WorkspaceDocumentDeliverable | SessionAttachmentDeliverable

export interface DeliverableCardPayload {
  ui: { kind: typeof DELIVERABLE_CARD_UI_KIND; version?: number }
  deliverables: DeliverableItem[]
  agentSummary?: string
}

/** Best-effort detector. Accepts already-parsed objects or JSON strings. */
export function parseDeliverableCardPayload(result: unknown): DeliverableCardPayload | null {
  if (!result) return null
  let candidate: unknown = result
  if (typeof candidate === 'string') {
    try {
      candidate = JSON.parse(candidate)
    } catch {
      return null
    }
  }
  if (typeof candidate !== 'object' || candidate === null) return null
  const obj = candidate as Record<string, unknown>
  const ui = obj.ui as { kind?: unknown } | undefined
  if (!ui || ui.kind !== DELIVERABLE_CARD_UI_KIND) return null
  const items = obj.deliverables
  if (!Array.isArray(items) || items.length === 0) return null
  // Trust the shape after the ui.kind sentinel — server controls it.
  return obj as unknown as DeliverableCardPayload
}

const cardClassName =
  'gba:flex gba:items-center gba:gap-2.5 gba:px-3.5 gba:py-2.5 gba:rounded-xl gba:border gba:border-border gba:bg-card gba:hover:bg-accent/50 gba:transition-all gba:duration-200 gba:cursor-pointer gba:w-full gba:no-underline gba:group'

const DOC_TYPE_ICON: Record<string, React.FC<{ className?: string }>> = {
  document: FileTextIcon,
  slides: PresentationIcon,
  note: FileTextIcon
}

const DOC_TYPE_LABEL: Record<string, string> = {
  document: 'Document',
  slides: 'Presentation',
  note: 'Note'
}

export const WorkspaceDocumentCard: React.FC<{
  doc: WorkspaceDocumentDeliverable
  accessToken?: string
}> = ({ doc }) => {
  const Icon = DOC_TYPE_ICON[doc.type ?? 'document'] ?? FileTextIcon
  const label = DOC_TYPE_LABEL[doc.type ?? 'document'] ?? 'Document'
  const href = doc.primaryAction.href
  const body = (
    <>
      <div className="gba:h-8 gba:w-8 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:shrink-0">
        <Icon className="gba:h-4 gba:w-4 gba:text-primary" />
      </div>
      <div className="gba:text-left gba:min-w-0 gba:flex-1">
        <span className="gba:text-xs gba:font-semibold gba:text-foreground gba:block gba:truncate">
          {label} created
        </span>
        <span className="gba:text-[10px] gba:text-muted-foreground gba:block gba:truncate">{doc.title}</span>
      </div>
      <Badge variant="secondary" className="gba:ml-auto gba:text-[10px] gba:shrink-0">
        {doc.primaryAction.label || 'Open'}
      </Badge>
    </>
  )
  const isEntityProtocol = /^\w+:\/\//.test(href) && !/^https?:\/\//i.test(href)
  const resolvedHref = isEntityProtocol ? (resolveEntityLink(href)?.url ?? href) : href
  return (
    <a
      href={resolvedHref}
      target="_blank"
      rel="noopener noreferrer"
      className={cardClassName}
      data-testid={`workspace-doc-card-${doc.id}`}
    >
      {body}
    </a>
  )
}

export const SessionAttachmentDownloadCard: React.FC<{
  item: SessionAttachmentDeliverable
  sessionId?: string
  accessToken?: string
}> = ({ item, sessionId, accessToken }) => {
  const client = useEnterpriseAgentClient(accessToken ?? '')
  const [downloading, setDownloading] = useState(false)
  const fileName = item.name || 'export.pdf'

  const handleDownload = useCallback(async () => {
    if (!sessionId || !item.id) {
      toast.error('File unavailable — missing session or attachment id.')
      return
    }
    setDownloading(true)
    try {
      const blob = await client.fetchAttachmentContent(sessionId, item.id)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = fileName
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'unknown error'
      toast.error(`Could not download file: ${detail}`)
    } finally {
      setDownloading(false)
    }
  }, [client, fileName, item.id, sessionId])

  return (
    <button
      type="button"
      onClick={() => void handleDownload()}
      disabled={!sessionId || !item.id || downloading}
      className="gba:flex gba:items-center gba:gap-2.5 gba:px-3.5 gba:py-2.5 gba:rounded-xl gba:border gba:border-border gba:bg-card gba:hover:bg-accent/50 gba:transition-all gba:duration-200 gba:cursor-pointer gba:w-full gba:text-left"
      data-testid={`pdf-export-card-${item.id}`}
    >
      <div className="gba:h-8 gba:w-8 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:shrink-0">
        <FileTextIcon className="gba:h-4 gba:w-4 gba:text-primary" />
      </div>
      <div className="gba:min-w-0 gba:flex-1">
        <span className="gba:text-xs gba:font-semibold gba:text-foreground gba:block gba:truncate">File ready</span>
        <span className="gba:text-[10px] gba:text-muted-foreground gba:block gba:truncate">{fileName}</span>
      </div>
      <Badge
        variant="secondary"
        className="gba:ml-auto gba:text-[10px] gba:shrink-0 gba:inline-flex gba:items-center gba:gap-1"
      >
        <DownloadSimpleIcon className="gba:h-3 gba:w-3" />
        {downloading ? '…' : item.primaryAction.label || 'Download'}
      </Badge>
    </button>
  )
}

export const DeliverableCardsList: React.FC<{
  items: DeliverableItem[]
  sessionId?: string
  accessToken?: string
}> = ({ items, sessionId, accessToken }) => {
  if (!items?.length) return null
  return (
    <div className="gba:space-y-2" data-testid="deliverable-cards-list">
      {items.map(item => {
        if (item.kind === 'workspace_document') {
          return <WorkspaceDocumentCard key={`doc-${item.id}`} doc={item} accessToken={accessToken} />
        }
        if (item.kind === 'session_attachment') {
          return (
            <SessionAttachmentDownloadCard
              key={`att-${item.id}`}
              item={item}
              sessionId={sessionId}
              accessToken={accessToken}
            />
          )
        }
        return null
      })}
    </div>
  )
}
