import { DocumentNode } from '../types'
import { getEntityFilesPath, FileManagerEntityType } from '../types'

const mimeTypeExtensions: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xls',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'text/plain': 'txt'
}

export const getFileExtension = (doc: DocumentNode): string => {
  if (doc.name && doc.name.includes('.')) {
    const parts = doc.name.split('.')
    return parts[parts.length - 1]
  }
  if (doc.mimeType && mimeTypeExtensions[doc.mimeType]) {
    return mimeTypeExtensions[doc.mimeType]
  }
  return 'pdf'
}

export const buildDownloadUrl = (
  type: FileManagerEntityType,
  entityId: string,
  doc: DocumentNode,
  app: 'crm' | 'irm' = 'crm'
): string => {
  const base = getEntityFilesPath(type)
  const appPath = app === 'crm' ? 'crm' : 'irm'
  if (doc.file && doc.file.includes('.')) {
    return `/files/api/v1/public/downloads/${appPath}/${base}/${entityId}/documents/${doc.file}`
  }
  const ext = getFileExtension(doc)
  return `/files/api/v1/public/downloads/${appPath}/${base}/${entityId}/documents/${doc.file}.${ext}`
}
