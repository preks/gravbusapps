/**
 * Centralized utility for handling document clicks with proper preview/download behavior
 */

import { toast } from '@newwork/nw-design-system'
import { buildFileUrl } from '@/common/utils/fileUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { isPreviewableFile } from '@/common/utils/filePreview'

/**
 * Minimal document interface with fileInfo for click handling
 */
export interface DocumentWithFileInfo {
  id: string
  name?: string | null
  mimeType?: string | null
  fileInfo?: {
    path: string
    fileMetadata?: {
      mimeType?: string
    }
  } | null
}

/**
 * Optional configuration for document click behavior
 */
export interface DocumentClickOptions {
  /** Called after successful download/preview */
  onSuccess?: () => void
  /** Called if an error occurs */
  onError?: (error: Error) => void
  /** Whether to show toast messages (default: true) */
  showToast?: boolean
}

/**
 * Handle document click - preview or download based on file type
 *
 * Mimics browser's native file handling behavior:
 * - Images, videos, PDFs, text files: Open for preview in new tab
 * - Other files (Excel, Word, etc.): Download to user's device
 *
 * @param document - Document with fileInfo
 * @param accessToken - Optional access token for authenticated requests
 * @param options - Optional configuration
 *
 * @example
 * // Basic usage
 * await handleDocumentClick(document, accessToken)
 *
 * @example
 * // With custom callbacks
 * await handleDocumentClick(document, accessToken, {
 *   onSuccess: () => console.log('Document opened'),
 *   onError: (error) => console.error('Failed:', error),
 *   showToast: false
 * })
 */
export async function handleDocumentClick(
  document: DocumentWithFileInfo,
  accessToken?: string,
  options?: DocumentClickOptions
): Promise<void> {
  const { onSuccess, onError, showToast = true } = options || {}

  // Validate fileInfo exists
  if (!document.fileInfo) {
    if (showToast) {
      toast.warning(
        getTranslationFromI18nKeyAndLabel('document.toast.error.noFileAvailable', 'No file available to download')
      )
    }
    return
  }

  try {
    // Build file URL (authenticated if accessToken provided, otherwise unauthenticated)
    const fileUrl = accessToken ? await buildFileUrl(document.fileInfo, accessToken) : buildFileUrl(document.fileInfo)

    const downloadFilename = document.name || 'document'

    // Create link element for download/preview
    const link = globalThis.document.createElement('a')
    link.href = fileUrl
    link.target = '_blank'

    // Determine if file is previewable
    const mimeType = document.mimeType || document.fileInfo?.fileMetadata?.mimeType
    const canPreview = isPreviewableFile(mimeType)

    // Only set download attribute for non-previewable files
    // Browser will preview PDFs/images/videos, download everything else
    if (!canPreview) {
      link.download = downloadFilename
    }

    // Trigger click and cleanup
    globalThis.document.body.appendChild(link)
    link.click()
    link.remove()

    // Show appropriate success toast
    if (showToast) {
      const toastMessage = canPreview
        ? getTranslationFromI18nKeyAndLabel('document.toast.opening', 'Opening { $filename }').replace(
            '{ $filename }',
            downloadFilename
          )
        : getTranslationFromI18nKeyAndLabel('document.toast.downloading', 'Downloading { $filename }').replace(
            '{ $filename }',
            downloadFilename
          )

      toast.success(toastMessage)
    }

    // Call success callback if provided
    onSuccess?.()
  } catch (error) {
    console.error('Error handling document click:', error)

    if (showToast) {
      toast.error(
        getTranslationFromI18nKeyAndLabel('document.toast.error.downloadFailed', 'Failed to download document')
      )
    }

    // Call error callback if provided
    onError?.(error as Error)
  }
}
