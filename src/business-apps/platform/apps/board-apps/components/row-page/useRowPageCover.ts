import { useState, useCallback, useEffect, useRef } from 'react'
import { uploadDocumentImage } from '@/business-apps/platform/apps/document-apps/services/DocumentImageUploadService'
import { fileClient } from '@/common/network/files/FileClient'

export const COVER_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
  'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
  'linear-gradient(135deg, #2b5876 0%, #4e4376 100%)'
] as const

function isFileServiceUrl(url: string): boolean {
  if (!url || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('linear-gradient')) return false
  try {
    const u = new URL(url, globalThis.location?.origin)
    return u.pathname.includes('/tenant/downloads/')
  } catch {
    return false
  }
}

function extractPath(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return url
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export interface UseRowPageCoverOptions {
  accessToken: string
  documentId: string | null
  onDirty: () => void
}

export function useRowPageCover({ accessToken, documentId, onDirty }: UseRowPageCoverOptions) {
  const [coverImage, setCoverImage] = useState<string | null>(null)
  const [displayCover, setDisplayCover] = useState<string | null>(null)
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const blobUrlRef = useRef<string | null>(null)
  const skipNextResolutionRef = useRef(false)

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  useEffect(() => {
    if (skipNextResolutionRef.current) {
      skipNextResolutionRef.current = false
      return
    }
    if (!coverImage) {
      setDisplayCover(null)
      return
    }
    if (!isFileServiceUrl(coverImage)) {
      setDisplayCover(coverImage)
      return
    }
    if (blobUrlRef.current) {
      setDisplayCover(blobUrlRef.current)
      return
    }
    let cancelled = false
    const path = extractPath(coverImage)
    fileClient
      .downloadFileByPath(path, accessToken)
      .then(blob => {
        if (cancelled) return
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
        const url = URL.createObjectURL(blob)
        blobUrlRef.current = url
        setDisplayCover(url)
      })
      .catch(async () => {
        if (cancelled) return
        try {
          const fetchUrl = coverImage.startsWith('http')
            ? coverImage
            : `${globalThis.location?.origin ?? ''}${coverImage}`
          const res = await fetch(fetchUrl, {
            headers: { Authorization: `Bearer ${accessToken}` }
          })
          if (!res.ok || cancelled) return
          const blob = await res.blob()
          if (cancelled) return
          if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
          const url = URL.createObjectURL(blob)
          blobUrlRef.current = url
          setDisplayCover(url)
        } catch {
          /* image unavailable */
        }
      })
    return () => {
      cancelled = true
    }
  }, [coverImage, accessToken])

  const setCover = useCallback(
    (value: string | null) => {
      setCoverImage(value)
      onDirty()
    },
    [onDirty]
  )

  const loadCover = useCallback((value: string | null) => {
    setCoverImage(value)
  }, [])

  const uploadCoverImage = useCallback(
    async (file: File) => {
      setIsUploadingCover(true)
      try {
        const { url } = await uploadDocumentImage(file, documentId, accessToken)
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
        const blobUrl = URL.createObjectURL(file)
        blobUrlRef.current = blobUrl
        setDisplayCover(blobUrl)
        skipNextResolutionRef.current = true
        setCoverImage(url)
        onDirty()
      } catch {
        try {
          const dataUrl = await readFileAsDataUrl(file)
          setCoverImage(dataUrl)
          setDisplayCover(dataUrl)
          onDirty()
        } catch {
          /* silent */
        }
      } finally {
        setIsUploadingCover(false)
      }
    },
    [documentId, accessToken, onDirty]
  )

  const pickCoverFile = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (file) void uploadCoverImage(file)
    }
    input.click()
  }, [uploadCoverImage])

  const removeCover = useCallback(() => {
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    blobUrlRef.current = null
    setCoverImage(null)
    setDisplayCover(null)
    onDirty()
  }, [onDirty])

  return { coverImage, displayCover, setCover, loadCover, pickCoverFile, removeCover, isUploadingCover }
}
