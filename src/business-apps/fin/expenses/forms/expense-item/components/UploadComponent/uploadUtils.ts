/**
 * Shared constants and pure helpers for receipt upload and validation.
 */

export const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.PDF', '.jpg', '.JPG', '.jpeg', '.JPEG', '.png', '.PNG']

export const ACCEPTED_FILE_TYPES = 'application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png,.PDF,.JPG,.JPEG,.PNG'

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']

export type FilePreviewKind = 'image' | 'pdf' | 'other'

/**
 * Returns whether the file extension is allowed for receipt upload.
 */
export function isAllowedFileType(file: File): boolean {
  const ext = `.${(file.name || '').split('.').pop() || ''}`
  return ALLOWED_FILE_EXTENSIONS.some(allowed => allowed.toLowerCase() === ext.toLowerCase())
}

/**
 * Classifies a file for preview: image (in-dialog), pdf (iframe), or other (new tab).
 */
export function getFilePreviewKind(file: File): FilePreviewKind {
  const type = (file.type || '').toLowerCase()
  const ext = (file.name || '').split('.').pop()?.toLowerCase() || ''
  if (type.includes('pdf') || ext === 'pdf') return 'pdf'
  if (type.startsWith('image/') || IMAGE_EXTENSIONS.includes(ext)) return 'image'
  return 'other'
}

/**
 * Builds an antd Upload file list item from a File.
 */
export function createUploadFileItem(
  file: File,
  uid?: string
): { uid: string; name: string; status: string; originFileObj: File } {
  return {
    uid: uid ?? `${Date.now()}${Math.random().toString(36).substring(2, 9)}`,
    name: file.name,
    status: 'done',
    originFileObj: file
  }
}
