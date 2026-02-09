/**
 * Document Icon Utilities
 *
 * Centralized logic for rendering file type icons with semantic colors.
 * Used across DocumentSection, TaskSection, ActivitySection, and NoteSection.
 */

import React from 'react'
import { File, FileText, FileSpreadsheet, FileImage, FileVideo, FileAudio, Archive, Code, Folder } from 'lucide-react'

interface DocumentIconProps {
  name?: string | null
  mimeType?: string | null
  isFolder?: boolean
  size?: number
  className?: string
}

/**
 * Get appropriate icon component with semantic color based on file type
 *
 * Detection strategy:
 * 1. Checks if item is a folder
 * 2. Analyzes both filename extension and MIME type for reliability
 * 3. Returns JSX element with icon and semantic color from design system
 *
 * @param name - File name (for extension detection)
 * @param mimeType - MIME type (for type detection)
 * @param isFolder - Whether the item is a folder
 * @param size - Icon size (default: 14)
 * @param className - Additional CSS classes
 * @returns JSX Element with appropriate icon and color
 */
export const getDocumentIcon = ({
  name,
  mimeType,
  isFolder = false,
  size = 14,
  className = ''
}: DocumentIconProps): JSX.Element => {
  const baseClass = className || 'gba:h-4 gba:w-4'

  // Folders
  if (isFolder) {
    return <Folder className={`${baseClass} gba:text-[var(--nw-warning)]`} size={size} />
  }

  const fileName = name?.toLowerCase() || ''
  const mime = mimeType?.toLowerCase() || ''

  // PDF files
  if (fileName.endsWith('.pdf') || mime.includes('pdf')) {
    return <FileText className={`${baseClass} gba:text-[var(--nw-destructive)]`} size={size} />
  }

  // Word documents
  if (
    fileName.endsWith('.doc') ||
    fileName.endsWith('.docx') ||
    mime.includes('msword') ||
    mime.includes('wordprocessingml')
  ) {
    return <FileText className={`${baseClass} gba:text-[var(--nw-info)]`} size={size} />
  }

  // Excel files
  if (
    fileName.endsWith('.xls') ||
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.csv') ||
    mime.includes('excel') ||
    mime.includes('spreadsheetml') ||
    mime.includes('csv')
  ) {
    return <FileSpreadsheet className={`${baseClass} gba:text-[var(--nw-success)]`} size={size} />
  }

  // PowerPoint files
  if (
    fileName.endsWith('.ppt') ||
    fileName.endsWith('.pptx') ||
    mime.includes('powerpoint') ||
    mime.includes('presentationml')
  ) {
    return <FileText className={`${baseClass} gba:text-[var(--nw-warning)]`} size={size} />
  }

  // Image files
  if (/\.(jpg|jpeg|png|gif|bmp|svg|webp)$/.test(fileName) || mime.startsWith('image/')) {
    return <FileImage className={`${baseClass} gba:text-[var(--nw-chart-5)]`} size={size} />
  }

  // Video files
  if (/\.(mp4|avi|mov|wmv|flv|webm|mkv)$/.test(fileName) || mime.startsWith('video/')) {
    return <FileVideo className={`${baseClass} gba:text-[var(--nw-chart-7)]`} size={size} />
  }

  // Audio files
  if (/\.(mp3|wav|flac|aac|ogg|wma)$/.test(fileName) || mime.startsWith('audio/')) {
    return <FileAudio className={`${baseClass} gba:text-[var(--nw-chart-2)]`} size={size} />
  }

  // Archive files
  if (/\.(zip|rar|7z|tar|gz|bz2)$/.test(fileName) || mime.includes('zip') || mime.includes('compressed')) {
    return <Archive className={`${baseClass} gba:text-[var(--nw-muted-foreground)]`} size={size} />
  }

  // Code files
  if (
    /\.(js|ts|jsx|tsx|html|css|scss|json|xml|sql|py|java|cpp|c|php|rb|go|rs)$/.test(fileName) ||
    mime.includes('javascript') ||
    mime.includes('json') ||
    mime.includes('xml')
  ) {
    return <Code className={`${baseClass} gba:text-[var(--nw-chart-3)]`} size={size} />
  }

  // Text files
  if (fileName.endsWith('.txt') || mime.includes('text/plain')) {
    return <FileText className={`${baseClass} gba:text-[var(--nw-muted-foreground)]`} size={size} />
  }

  // Default file icon
  return <File className={`${baseClass} gba:text-[var(--nw-muted-foreground)]`} size={size} />
}
