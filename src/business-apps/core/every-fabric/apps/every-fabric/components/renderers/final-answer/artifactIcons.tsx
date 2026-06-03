import React from 'react'
import {
  FileCodeIcon,
  FileCssIcon,
  FileHtmlIcon,
  FileIcon,
  FileJsIcon,
  FilePyIcon,
  FileTextIcon,
  PresentationIcon
} from '@phosphor-icons/react'
import type { WorkspaceDocument } from '../../../types/enterpriseAgent'

export const getArtifactIcon = (rendererType: string) => {
  const iconClass = 'gba:h-4 gba:w-4 gba:shrink-0'
  switch (rendererType) {
    case 'html':
      return <FileHtmlIcon className={`${iconClass} gba:text-orange-500`} />
    case 'markdown':
    case 'document':
      return <FileTextIcon className={`${iconClass} gba:text-blue-500`} />
    case 'css':
      return <FileCssIcon className={`${iconClass} gba:text-blue-400`} />
    case 'javascript':
    case 'typescript':
      return <FileJsIcon className={`${iconClass} gba:text-yellow-500`} />
    case 'python':
      return <FilePyIcon className={`${iconClass} gba:text-blue-600`} />
    case 'code':
      return <FileCodeIcon className={`${iconClass} gba:text-purple-500`} />
    default:
      return <FileIcon className={`${iconClass} gba:text-muted-foreground`} />
  }
}

export const DOC_TYPE_ICON: Record<WorkspaceDocument['type'], React.FC<{ className?: string }>> = {
  document: FileTextIcon,
  slides: PresentationIcon,
  note: FileTextIcon
}

export const DOC_TYPE_LABEL: Record<WorkspaceDocument['type'], string> = {
  document: 'Document',
  slides: 'Presentation',
  note: 'Note'
}

export const workspaceDocCardClassName =
  'gba:flex gba:items-center gba:gap-2.5 gba:px-3.5 gba:py-2.5 gba:rounded-xl gba:border gba:border-border gba:bg-card gba:hover:bg-accent/50 gba:transition-all gba:duration-200 gba:cursor-pointer gba:w-full gba:no-underline gba:group'
