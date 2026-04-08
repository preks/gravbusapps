import type { ReactElement } from 'react'
import { ImageIcon, FilePdfIcon, FileDocIcon, FileXlsIcon, FileIcon } from '@phosphor-icons/react'

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']

export function getExpenseItemFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || ''
}

export function isExpenseItemImageFile(fileType: string, ext: string): boolean {
  return fileType.includes('image') || IMAGE_EXTENSIONS.includes(ext)
}

export function isExpenseItemPdfFile(fileType: string, ext: string): boolean {
  return fileType.includes('pdf') || ext === 'pdf'
}

export function renderExpenseItemFileIcon(fileType: string, ext: string): ReactElement {
  if (isExpenseItemPdfFile(fileType, ext)) {
    return <FilePdfIcon size={32} className="gba:text-red-500" />
  }
  if (isExpenseItemImageFile(fileType, ext)) {
    return <ImageIcon size={32} className="gba:text-blue-500" />
  }
  if (fileType.includes('word') || ['doc', 'docx'].includes(ext)) {
    return <FileDocIcon size={32} className="gba:text-blue-700" />
  }
  if (fileType.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext)) {
    return <FileXlsIcon size={32} className="gba:text-green-700" />
  }
  return <FileIcon size={32} className="gba:text-gray-500" />
}
