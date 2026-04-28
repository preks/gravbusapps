import React from 'react'
import { Download, ExternalLink, Paperclip } from 'lucide-react'
import type { Link } from '@/common/data/flow/types/flowTemplate'
import { handleDocumentClick, type DocumentWithFileInfo } from '@/common/utils/documentClickHandler'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface LinksRendererProps {
  links: Link[]
  accessToken?: string
  testId?: string
}

function isDocumentLink(link: Link): boolean {
  const type = String(link?.type || '')
    .trim()
    .toLowerCase()
  return type === 'document' || type === 'file' || type === 'image' || type.startsWith('document:')
}

type StoredDocumentFileInfo = {
  path: string
  fileMetadata?: {
    mimeType?: string
  }
}

function toRelativeUrlPath(url: string): string {
  const raw = String(url || '').trim()
  if (!raw) return ''

  try {
    if (/^https?:\/\//i.test(raw)) {
      const parsed = new URL(raw)
      return `${parsed.pathname}${parsed.search}`
    }
  } catch {
    return raw
  }

  return raw
}

function toDocumentFilePath(url: string): string | null {
  const relativePath = toRelativeUrlPath(url)
  if (!relativePath) return null

  if (relativePath.startsWith('/files/')) {
    return relativePath.slice('/files'.length)
  }

  if (relativePath.startsWith('files/')) {
    return `/${relativePath.slice('files/'.length)}`
  }

  if (relativePath.startsWith('/api/v1/') || relativePath.startsWith('api/v1/')) {
    return relativePath.startsWith('/') ? relativePath : `/${relativePath}`
  }

  return null
}

function toStoredDocumentFileInfo(value: string): StoredDocumentFileInfo | null {
  const raw = String(value || '').trim()
  if (!raw) return null

  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && typeof parsed.path === 'string' && parsed.path.trim()) {
        return parsed as StoredDocumentFileInfo
      }
    } catch {
      return null
    }
  }

  const filePath = toDocumentFilePath(raw)
  if (!filePath) return null
  return { path: filePath }
}

function toDocumentHref(filePath: string): string | undefined {
  const normalizedPath = toDocumentFilePath(filePath)
  if (!normalizedPath) return undefined
  return `/files${normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`}`
}

function toDocument(link: Link): DocumentWithFileInfo | null {
  const storedFileInfo = toStoredDocumentFileInfo(String(link?.url || ''))
  const filePath = storedFileInfo?.path ? toDocumentFilePath(storedFileInfo.path) : null
  if (!filePath) return null

  return {
    id: String(link?.type || link?.url || link?.name || 'document-link'),
    name: String(link?.name || 'Attachment'),
    mimeType: storedFileInfo?.fileMetadata?.mimeType,
    fileInfo: {
      path: filePath,
      ...(storedFileInfo?.fileMetadata ? { fileMetadata: storedFileInfo.fileMetadata } : {})
    }
  }
}

export const LinksRenderer: React.FC<LinksRendererProps> = ({ links, accessToken, testId = 'links-renderer' }) => {
  if (!links || links.length === 0) {
    return null
  }

  return (
    <div
      className="gba:flex gba:flex-col gba:gap-3 gba:rounded-lg gba:border gba:border-border gba:bg-card gba:p-3"
      data-testid={`${testId}-links-card`}
    >
      <div className="gba:flex gba:items-center gba:gap-2">
        <Paperclip className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
        <span className="gba:text-sm gba:font-medium gba:text-foreground">
          {getTranslationFromI18nKeyAndLabel('flow.step.links', 'Links')}
        </span>
      </div>
      <div className="gba:space-y-2">
        {links.map((link, index) => (
          <a
            key={index}
            href={
              isDocumentLink(link)
                ? toDocumentHref(toStoredDocumentFileInfo(String(link?.url || ''))?.path || '') || undefined
                : String(link?.url || '').trim() || undefined
            }
            target="_blank"
            rel="noreferrer"
            className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:rounded-md gba:border gba:border-border gba:bg-muted gba:p-3 gba:text-left gba:no-underline gba:transition-colors gba:hover:bg-accent"
            data-testid={`${testId}-link-${index}`}
            onClick={async event => {
              if (!isDocumentLink(link) || !accessToken) return

              const document = toDocument(link)
              if (!document) return

              event.preventDefault()
              await handleDocumentClick(document, accessToken)
            }}
          >
            <div className="gba:flex gba:min-w-0 gba:items-center gba:gap-2">
              <Paperclip className="gba:h-4 gba:w-4 gba:flex-shrink-0 gba:text-muted-foreground" />
              <span className="gba:truncate gba:text-sm gba:text-foreground">{link.name || link.url}</span>
            </div>
            {isDocumentLink(link) ? (
              <Download className="gba:h-4 gba:w-4 gba:flex-shrink-0 gba:text-muted-foreground" />
            ) : (
              <ExternalLink className="gba:h-4 gba:w-4 gba:flex-shrink-0 gba:text-muted-foreground" />
            )}
          </a>
        ))}
      </div>
    </div>
  )
}
