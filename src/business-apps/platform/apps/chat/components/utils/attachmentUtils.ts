import type { MessageAttachment } from '../MessageAttachments'

/**
 * Determine if an attachment can be previewed inline
 */
export const isPreviewable = (att: MessageAttachment): 'image' | 'pdf' | null => {
  const mime = att.type || att.mimeType || ''
  if (mime.startsWith('image/')) return 'image'
  const nameLower = (att.name || '').toLowerCase()
  if (mime === 'application/pdf' || nameLower.endsWith('.pdf')) return 'pdf'
  return null
}
