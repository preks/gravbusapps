import { useState, useCallback, useEffect, useRef } from 'react'
import { getFilePreviewKind } from './uploadUtils'

export interface ReceiptFileListItem {
  originFileObj?: File
}

export interface UseReceiptPreviewResult {
  previewOpen: boolean
  previewImage: string
  pdfPreviewOpen: boolean
  pdfPreviewUrl: string
  openReceiptPreview: () => void
  closeImagePreview: () => void
  closePdfPreview: () => void
}

function revokeUrl(ref: React.MutableRefObject<string | null>) {
  if (ref.current) {
    URL.revokeObjectURL(ref.current)
    ref.current = null
  }
}

/**
 * Hook to manage receipt preview state and object URL lifecycle.
 * Previews the first file in the list as image or PDF dialog, or opens in new tab for other types.
 */
export function useReceiptPreview(fileList: ReceiptFileListItem[]): UseReceiptPreviewResult {
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewImage, setPreviewImage] = useState('')
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('')
  const urlRef = useRef<string | null>(null)

  const closeImagePreview = useCallback(() => {
    setPreviewOpen(false)
    setPreviewImage('')
    revokeUrl(urlRef)
  }, [])

  const closePdfPreview = useCallback(() => {
    setPdfPreviewOpen(false)
    setPdfPreviewUrl('')
    revokeUrl(urlRef)
  }, [])

  const openReceiptPreview = useCallback(() => {
    const file = fileList[0]?.originFileObj
    if (!file || !(file instanceof File)) return

    const url = URL.createObjectURL(file)
    urlRef.current = url
    const kind = getFilePreviewKind(file)

    if (kind === 'pdf') {
      setPdfPreviewUrl(url)
      setPdfPreviewOpen(true)
    } else if (kind === 'image') {
      setPreviewImage(url)
      setPreviewOpen(true)
    } else {
      window.open(url, '_blank')
      revokeUrl(urlRef)
    }
  }, [fileList])

  useEffect(() => {
    return () => revokeUrl(urlRef)
  }, [])

  return {
    previewOpen,
    previewImage,
    pdfPreviewOpen,
    pdfPreviewUrl,
    openReceiptPreview,
    closeImagePreview,
    closePdfPreview
  }
}
