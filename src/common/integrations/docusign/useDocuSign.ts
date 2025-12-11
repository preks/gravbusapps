import { useCallback } from 'react'
import { FileInfo } from '@/common/types/FileTypes'
import { fileClient } from '@/common/network/files/FileClient'
import { buildFileUrl } from '@/common/utils/fileUtils'

export type CreateEnvelopeArgs = {
  signerEmail: string
  signerName: string
  documentBase64: string
  documentName: string
  documentExtension?: string
  returnUrl?: string
}

export const useDocuSign = (accessToken?: string) => {
  const checkAuth = useCallback(async () => {
    const headers: HeadersInit = {}
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }
    const res = await fetch('/api/docusign/auth/status', { headers })
    if (!res.ok) throw new Error('Failed to check DocuSign auth')
    return (await res.json()) as { authenticated: boolean; accountName?: string; accountId?: string }
  }, [accessToken])

  const startLoginFlow = useCallback(
    async (returnTo?: string) => {
      const target = encodeURIComponent(
        returnTo || window.location.pathname + window.location.search + window.location.hash
      )
      const headers: HeadersInit = { Accept: 'application/json', 'X-DocuSign-Client': 'spa' }
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }
      try {
        const response = await fetch(`/api/docusign/auth/login?returnTo=${target}`, {
          method: 'GET',
          redirect: 'manual',
          credentials: 'include',
          headers
        })
        const contentType = response.headers.get('Content-Type') || ''
        if (response.ok && contentType.includes('application/json')) {
          const data = await response.json().catch(() => null)
          if (data?.redirectUrl) {
            window.location.assign(data.redirectUrl)
            return
          }
          if (data?.error) {
            throw new Error(data.error)
          }
        }
        if (response.type === 'opaqueredirect') {
          window.location.assign(`/api/docusign/auth/login?returnTo=${target}`)
          return
        }
        const location = response.headers.get('Location')
        if (location) {
          window.location.assign(location)
          return
        }
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Failed to initiate DocuSign authentication')
      } catch (error) {
        throw error instanceof Error ? error : new Error('Failed to initiate DocuSign authentication')
      }
    },
    [accessToken]
  )

  const loginRedirect = useCallback(
    (returnTo?: string) => {
      return startLoginFlow(returnTo)
    },
    [startLoginFlow]
  )

  const logout = useCallback(async () => {
    const headers: HeadersInit = {}
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }
    try {
      const returnTo = encodeURIComponent(window.location.pathname + window.location.search + window.location.hash)
      const response = await fetch(`/api/docusign/auth/logout?returnTo=${returnTo}`, {
        method: 'POST',
        redirect: 'manual',
        credentials: 'include',
        headers
      })
      if (response.type === 'opaqueredirect') {
        window.location.assign('/api/docusign/auth/logout')
        return
      }
      const location = response.headers.get('Location')
      if (location) {
        window.location.assign(location)
        return
      }
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Failed to logout from DocuSign')
      }
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to logout from DocuSign')
    }
  }, [accessToken])

  const createEnvelope = useCallback(
    async (args: CreateEnvelopeArgs) => {
      const payload = {
        signerEmail: args.signerEmail,
        signerName: args.signerName,
        documentBase64: args.documentBase64,
        documentName: args.documentName,
        documentExtension: args.documentExtension || 'pdf',
        returnUrl:
          args.returnUrl ||
          window.location.origin + window.location.pathname + window.location.search + window.location.hash
      }
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }
      const res = await fetch('/api/docusign/envelope/create-embedded-signing', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok || !data?.success) {
        const requiresAuth = data?.requiresAuth
        const message = requiresAuth ? 'AUTH_REQUIRED' : data?.error || data?.details || 'Envelope creation failed'
        throw new Error(message)
      }
      return data as { success: true; envelopeId: string; redirectUrl: string }
    },
    [accessToken]
  )

  const getStatus = useCallback(
    async (envelopeId: string) => {
      const headers: HeadersInit = {}
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }
      const res = await fetch(`/api/docusign/envelope/status/${encodeURIComponent(envelopeId)}`, { headers })
      if (!res.ok) throw new Error('Failed to fetch envelope status')
      return (await res.json()) as {
        envelopeId: string
        status: string
        statusDateTime?: string
        completedDateTime?: string
        emailSubject?: string
      }
    },
    [accessToken]
  )

  const fetchFileBlob = useCallback(
    async (info: FileInfo) => {
      if (info?.path && accessToken) {
        try {
          return await fileClient.downloadFileByPath(info.path, accessToken)
        } catch {
          // fallback below
        }
      }
      if (info?.path) {
        const url = buildFileUrl(info)
        const res = await fetch(url)
        if (!res.ok) throw new Error('Failed to fetch file blob')
        return await res.blob()
      }
      throw new Error('Invalid file info for blob fetch')
    },
    [accessToken]
  )

  const blobToBase64 = useCallback((blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = String(reader.result || '')
        const commaIdx = base64.indexOf(',')
        resolve(commaIdx >= 0 ? base64.substring(commaIdx + 1) : base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }, [])

  return {
    checkAuth,
    startLoginFlow,
    loginRedirect,
    logout,
    createEnvelope,
    getStatus,
    fetchFileBlob,
    blobToBase64
  }
}

export default useDocuSign
