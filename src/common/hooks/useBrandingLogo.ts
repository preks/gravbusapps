import { useCallback, useEffect, useRef, useState } from 'react'
import { env } from '@/common/env/EnvUtils'
import { fileClient } from '@/common/network/files/FileClient'

const BRANDING_APP_NAME = 'branding'
const BRANDING_WORDMARK_FILE_ID = 'default_wordmark.svg+xml'
const BRANDING_LOGOMARK_FILE_ID = 'default_logomark.svg+xml'
const PUBLIC_FILE_ACCESS = { accessScope: 'public' } as const

function resolveBrandingFolderPath(): string {
  const tenantKey = (env('NEXT_PUBLIC_TENANT_KEY') ?? '').trim().split('/').filter(Boolean).join('/')
  return `/${tenantKey}/logo`
}

interface BrandingLogoUrls {
  wordmarkUrl: string | null
  logomarkUrl: string | null
}

export function useBrandingLogo(accessToken: string | undefined): BrandingLogoUrls {
  const [wordmarkUrl, setWordmarkUrl] = useState<string | null>(null)
  const [logomarkUrl, setLogomarkUrl] = useState<string | null>(null)
  const currentWordmarkBlobUrl = useRef<string | null>(null)
  const currentLogomarkBlobUrl = useRef<string | null>(null)

  const loadLogos = useCallback(async () => {
    if (!accessToken) {
      setWordmarkUrl(null)
      setLogomarkUrl(null)
      return
    }

    fileClient.setAccessToken(accessToken)
    const folderPath = resolveBrandingFolderPath()

    try {
      const { files } = await fileClient.getAllFiles(PUBLIC_FILE_ACCESS, {
        appName: BRANDING_APP_NAME,
        folderPath
      })

      const hasWordmark = files.some(file => file.fileId === BRANDING_WORDMARK_FILE_ID)
      const hasLogomark = files.some(file => file.fileId === BRANDING_LOGOMARK_FILE_ID)

      if (hasWordmark) {
        const blob = await fileClient.getFile(
          { ...PUBLIC_FILE_ACCESS, fileId: BRANDING_WORDMARK_FILE_ID },
          { appName: BRANDING_APP_NAME, folderPath }
        )
        if (currentWordmarkBlobUrl.current) URL.revokeObjectURL(currentWordmarkBlobUrl.current)
        const objectUrl = URL.createObjectURL(blob)
        currentWordmarkBlobUrl.current = objectUrl
        setWordmarkUrl(objectUrl)
      } else {
        setWordmarkUrl(null)
      }

      if (hasLogomark) {
        const blob = await fileClient.getFile(
          { ...PUBLIC_FILE_ACCESS, fileId: BRANDING_LOGOMARK_FILE_ID },
          { appName: BRANDING_APP_NAME, folderPath }
        )
        if (currentLogomarkBlobUrl.current) URL.revokeObjectURL(currentLogomarkBlobUrl.current)
        const objectUrl = URL.createObjectURL(blob)
        currentLogomarkBlobUrl.current = objectUrl
        setLogomarkUrl(objectUrl)
      } else {
        setLogomarkUrl(null)
      }
    } catch {
      setWordmarkUrl(null)
      setLogomarkUrl(null)
    }
  }, [accessToken])

  useEffect(() => {
    loadLogos()
  }, [loadLogos])

  useEffect(() => {
    return () => {
      if (currentWordmarkBlobUrl.current) URL.revokeObjectURL(currentWordmarkBlobUrl.current)
      if (currentLogomarkBlobUrl.current) URL.revokeObjectURL(currentLogomarkBlobUrl.current)
    }
  }, [])

  return { wordmarkUrl, logomarkUrl }
}
