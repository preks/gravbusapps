'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { env } from '@/common/env/EnvUtils'
import { FileInfo } from '@/common/types/FileTypes'
import { buildFileUrl } from '@/common/utils/fileUtils'
import { fileClient } from '@/common/network/files/FileClient'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { InvestmentTaskFormData } from '@/common/data/investment/payloads/investmentRelationPayloads'
import { useUpdateInvestmentTaskEnvelope } from './hooks/useUpdateInvestmentTaskEnvelope'
import { useEnvelopeStatusCache } from './hooks/useEnvelopeStatusCache'
import useDocuSign from '@/common/integrations/docusign/useDocuSign'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Alert,
  AlertDescription,
  Spinner
} from '@newwork/nw-design-system'

type TaskDoc = {
  id: string
  name: string
  mimeType?: string
  version?: number
  envelopeStatus?: string
  fileInfo?: FileInfo
}

type SelectedSource = 'existing' | 'upload'

interface DocuSignSignatureModalProps {
  isOpen: boolean
  onClose: () => void
  accessToken?: string
  documents?: TaskDoc[]
  assignedUserId?: string
  emailOnly?: boolean
  onEnvelopeCreated?: (args: { envelopeId: string; selectedSource: SelectedSource; uploadedFile?: File }) => void
  businessAppContext?: BusinessAppContextProps
  taskContext?: {
    taskId: string
    taskFormData: InvestmentTaskFormData
  }
}

export const DocuSignSignatureModal: React.FC<DocuSignSignatureModalProps> = ({
  isOpen,
  onClose,
  accessToken,
  documents = [],
  assignedUserId,
  emailOnly,
  onEnvelopeCreated,
  businessAppContext,
  taskContext
}) => {
  const { saveEnvelopeId } = useUpdateInvestmentTaskEnvelope(businessAppContext)
  const { statusMap, ensureStatus, statusVersion } = useEnvelopeStatusCache(accessToken)
  const { startLoginFlow, logout } = useDocuSign(accessToken)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [signerEmail, setSignerEmail] = useState<string>('')
  const [signerName, setSignerName] = useState<string>('')
  const [selectedSource, setSelectedSource] = useState<SelectedSource>('existing')
  const [selectedDocId, setSelectedDocId] = useState<string>(documents[0]?.id || '')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const userManagementClient = useRestClient(env('NEXT_PUBLIC_USER_MANAGEMENT_API') || '')
  const envelopeIdsKey = useMemo(() => {
    return documents
      .map(doc => (doc.fileInfo as any)?.docusignEnvelopeId)
      .filter(Boolean)
      .join('|')
  }, [documents])
  useEffect(() => {
    if (!isOpen) return
    if (!envelopeIdsKey) return
    envelopeIdsKey.split('|').forEach(id => {
      if (id) {
        ensureStatus(id)
      }
    })
  }, [isOpen, envelopeIdsKey, ensureStatus])
  // Reset selected document when modal opens or list changes
  useEffect(() => {
    if (!isOpen) return
    if (documents.length === 0) {
      setSelectedDocId('')
      return
    }
    const exists = documents.some(doc => doc.id === selectedDocId)
    if (!exists) {
      setSelectedDocId(documents[0].id)
    }
  }, [documents, selectedDocId, isOpen])

  // Auth status
  useEffect(() => {
    if (!isOpen) return
    ;(async () => {
      try {
        const headers: HeadersInit = {}
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`
        }
        const res = await fetch('/api/docusign/auth/status', { headers })
        const data = await res.json()
        setIsAuthenticated(Boolean(data.authenticated))
      } catch {
        setIsAuthenticated(false)
      }
    })()
  }, [isOpen, accessToken])

  // Autofill signer from assigned user
  useEffect(() => {
    if (!isOpen) return
    if (!assignedUserId || !accessToken) return
    ;(async () => {
      try {
        const profile = await userManagementClient.get<any>(`/users/${assignedUserId}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        if (profile?.email) setSignerEmail(profile.email)
        const name = profile?.name || [profile?.givenName, profile?.familyName].filter(Boolean).join(' ').trim()
        if (name) setSignerName(name)
      } catch {
        // ignore autofill errors, allow manual entry
      }
    })()
  }, [isOpen, assignedUserId, accessToken])

  const handleAuthRedirect = useCallback(async () => {
    try {
      await startLoginFlow()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start DocuSign authentication')
    }
  }, [startLoginFlow])

  const handleLogout = useCallback(async () => {
    try {
      await logout()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to logout from DocuSign')
    }
  }, [logout])

  const SUPPORTED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'png', 'jpg', 'jpeg']

  const getFileExtension = (name?: string) => (name || '').split('.').pop()?.toLowerCase() || ''

  const isSupportedDoc = (name?: string, mime?: string) => {
    const ext = getFileExtension(name)
    if (ext && SUPPORTED_EXTENSIONS.includes(ext)) {
      return true
    }
    const mimeValue = (mime || '').toLowerCase()
    return SUPPORTED_EXTENSIONS.some(token => mimeValue.includes(token))
  }

  const resolveDocumentExtension = (name?: string) => {
    const ext = getFileExtension(name)
    return ext && SUPPORTED_EXTENSIONS.includes(ext) ? ext : 'pdf'
  }

  const selectedDocument: TaskDoc | undefined = useMemo(
    () => documents.find(d => d.id === selectedDocId),
    [documents, selectedDocId]
  )
  const selectedDocEnvelopeId = selectedDocument?.fileInfo?.docusignEnvelopeId
  const selectedDocEnvelopeMode = selectedDocument?.fileInfo?.docusignEnvelopeMode
  const selectedDocStatus = useMemo(() => {
    if (!selectedDocEnvelopeId) return undefined
    const cacheStatus = statusMap[selectedDocEnvelopeId]?.status?.toLowerCase()
    return cacheStatus || selectedDocument?.envelopeStatus?.toLowerCase()
  }, [selectedDocEnvelopeId, statusMap, statusVersion, selectedDocument])
  useEffect(() => {
    if (!isOpen || !selectedDocEnvelopeId) return
    ensureStatus(selectedDocEnvelopeId)
  }, [isOpen, selectedDocEnvelopeId, ensureStatus])
  const currentUserId = businessAppContext?.userInfo?.id
  const isCurrentUserAssignee = Boolean(assignedUserId && currentUserId && assignedUserId === currentUserId)
  const canReuseEnvelope =
    selectedSource === 'existing' &&
    !emailOnly &&
    !!selectedDocEnvelopeId &&
    assignedUserId &&
    currentUserId &&
    assignedUserId === currentUserId &&
    selectedDocStatus !== 'completed' &&
    selectedDocEnvelopeMode !== 'email'
  const canPersistEnvelope = selectedSource === 'existing' && !!taskContext && !!selectedDocId
  const isSelectedDocCompleted = selectedDocStatus === 'completed'
  const primaryButtonLabel = useMemo(() => {
    if (selectedSource === 'existing') {
      if (selectedDocEnvelopeId) {
        if (isSelectedDocCompleted) return 'Signed'
        if (canReuseEnvelope) return 'Resume signing'
        return 'View envelope'
      }
      if (!emailOnly && isCurrentUserAssignee) {
        return 'Sign'
      }
      return 'Request Signature'
    }
    return 'Request Signature'
  }, [
    selectedSource,
    selectedDocEnvelopeId,
    isSelectedDocCompleted,
    canReuseEnvelope,
    emailOnly,
    isCurrentUserAssignee
  ])
  const { alertVariant, alertMessage } = useMemo(() => {
    if (selectedSource === 'existing') {
      if (selectedDocEnvelopeId) {
        if (isSelectedDocCompleted) {
          return {
            alertVariant: 'success' as const,
            alertMessage: 'This document has already been signed. No further action is required.'
          }
        }
        if (canReuseEnvelope) {
          return {
            alertVariant: 'info' as const,
            alertMessage: 'You will be redirected to DocuSign to continue signing this envelope and then returned here.'
          }
        }
        if (selectedDocEnvelopeMode === 'email') {
          return {
            alertVariant: 'info' as const,
            alertMessage: 'This request was sent via email. Please use the DocuSign email invitation to sign.'
          }
        }
        return {
          alertVariant: 'info' as const,
          alertMessage:
            'A signature request for this document is already in progress. We are waiting for the assignee to complete it.'
        }
      }
      return {
        alertVariant: 'info' as const,
        alertMessage:
          'The signer will be redirected to DocuSign to sign this attachment (PDF, Office, or image files) and then returned.'
      }
    }

    return {
      alertVariant: 'info' as const,
      alertMessage:
        'After you upload a supported document (PDF, Office, or image), the signer will be redirected to DocuSign to complete the signature.'
    }
  }, [selectedSource, selectedDocEnvelopeId, isSelectedDocCompleted, canReuseEnvelope, selectedDocEnvelopeMode])

  const fetchBlobFromFileInfo = async (info: FileInfo): Promise<Blob> => {
    // Prefer authenticated file fetch by fileId using FileClient.getFile
    if (accessToken && info?.fileId) {
      try {
        fileClient.setAccessToken(accessToken)
        return await fileClient.getFile({ accessScope: info.accessScope || 'tenant', fileId: info.fileId })
      } catch {
        // fallback to platform proxy if available
      }
    }
    // Fallback via platform proxy URL
    if (info?.path) {
      const url = buildFileUrl(info)
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch file blob')
      return await res.blob()
    }
    throw new Error('Invalid file info for blob fetch')
  }

  const blobToBase64 = (blob: Blob): Promise<string> => {
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
  }

  const createEnvelope = async (args: {
    signerEmail: string
    signerName: string
    documentBase64: string
    documentName: string
    documentExtension: string
  }) => {
    const returnUrl = window.location.origin + window.location.pathname + window.location.search + window.location.hash
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }
    const res = await fetch('/api/docusign/envelope/create-embedded-signing', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...args, returnUrl })
    })
    const data = await res.json()
    if (!res.ok || !data?.success) {
      const requiresAuth = data?.requiresAuth
      throw new Error(requiresAuth ? 'AUTH_REQUIRED' : data?.error || data?.details || 'Envelope creation failed')
    }
    return data as { success: boolean; envelopeId: string; redirectUrl: string }
  }

  const createRecipientView = async (envelopeId: string, signerEmailValue: string, signerNameValue: string) => {
    const returnUrl = window.location.origin + window.location.pathname + window.location.search + window.location.hash
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }
    const res = await fetch('/api/docusign/envelope/create-recipient-view', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        envelopeId,
        signerEmail: signerEmailValue,
        signerName: signerNameValue,
        returnUrl
      })
    })
    const data = await res.json()
    if (!res.ok || !data?.success) {
      const requiresAuth = data?.requiresAuth
      throw new Error(requiresAuth ? 'AUTH_REQUIRED' : data?.error || data?.details || 'Failed to open signing session')
    }
    return data as { success: boolean; redirectUrl: string }
  }

  const persistEnvelopeId = useCallback(
    async (newEnvelopeId: string, mode: 'embedded' | 'email') => {
      if (!canPersistEnvelope || !taskContext || !selectedDocId) return
      await saveEnvelopeId({
        taskId: taskContext.taskId,
        task: taskContext.taskFormData,
        documentId: selectedDocId,
        envelopeId: newEnvelopeId,
        envelopeMode: mode
      })
    },
    [canPersistEnvelope, saveEnvelopeId, selectedDocId, taskContext]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      if (!signerEmail || !signerName) {
        throw new Error('Please provide signer email and name')
      }

      if (canReuseEnvelope && selectedDocEnvelopeId) {
        const viewResult = await createRecipientView(selectedDocEnvelopeId, signerEmail, signerName)
        window.location.href = viewResult.redirectUrl
        return
      }

      let blob: Blob
      let fileName = ''
      let documentExtension = 'pdf'

      if (selectedSource === 'existing') {
        if (!selectedDocument) throw new Error('Please select a document')
        if (!isSupportedDoc(selectedDocument.name, selectedDocument.mimeType)) {
          throw new Error('Selected document must be a supported DocuSign format (PDF, Office, or image)')
        }
        if (!selectedDocument.fileInfo) throw new Error('Selected document has no file info')
        blob = await fetchBlobFromFileInfo(selectedDocument.fileInfo)
        fileName = selectedDocument.name
        documentExtension = resolveDocumentExtension(selectedDocument.name)
      } else {
        if (!uploadedFile) throw new Error('Please upload a supported document')
        if (!isSupportedDoc(uploadedFile.name, uploadedFile.type)) {
          throw new Error('Uploaded file must be a supported DocuSign format (PDF, Office, or image)')
        }
        blob = uploadedFile
        fileName = uploadedFile.name
        documentExtension = resolveDocumentExtension(uploadedFile.name)
      }

      const base64 = await blobToBase64(blob)

      if (selectedSource === 'existing' && selectedDocEnvelopeId && !canReuseEnvelope) {
        setError(
          selectedDocEnvelopeMode === 'email'
            ? 'This request was sent via DocuSign email. Please sign from the email invitation.'
            : 'A signature request for this document already exists. Please wait for the assignee to complete it.'
        )
        return
      }

      if (emailOnly) {
        const headers: HeadersInit = { 'Content-Type': 'application/json' }
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`
        }
        const res = await fetch('/api/docusign/envelope/create-email-signing', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            signerEmail,
            signerName,
            documentBase64: base64,
            documentName: fileName,
            documentExtension
          })
        })
        const data = await res.json()
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || data?.details || 'Failed to request email signing')
        }
        await persistEnvelopeId(data.envelopeId, 'email')
        onEnvelopeCreated?.({ envelopeId: data.envelopeId, selectedSource, uploadedFile: uploadedFile || undefined })
        onClose()
        return
      }

      const result = await createEnvelope({
        signerEmail,
        signerName,
        documentBase64: base64,
        documentName: fileName,
        documentExtension
      })

      await persistEnvelopeId(result.envelopeId, 'embedded')
      onEnvelopeCreated?.({ envelopeId: result.envelopeId, selectedSource, uploadedFile: uploadedFile || undefined })
      window.location.href = result.redirectUrl
    } catch (err: any) {
      if (err?.message === 'AUTH_REQUIRED') {
        setIsAuthenticated(false)
        setError('You need to authenticate with DocuSign first.')
      } else {
        setError(err?.message || 'Failed to start DocuSign signing')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => (!open ? onClose() : void 0)}>
      <DialogContent className="nw:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Request Electronic Signature</DialogTitle>
        </DialogHeader>

        {/* Auth status */}
        {isAuthenticated ? (
          <Alert className="nw:mb-3">
            <AlertDescription className="nw:flex nw:items-center nw:justify-between">
              <span>Authenticated with DocuSign</span>
              <Button variant="link" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </AlertDescription>
          </Alert>
        ) : isAuthenticated === false ? (
          <Alert className="nw:mb-3">
            <AlertDescription>
              You need to authenticate with DocuSign first.{' '}
              <Button variant="link" size="sm" onClick={handleAuthRedirect}>
                Click here to login
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {error && (
          <Alert variant="destructive" className="nw:mb-3">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="nw:space-y-5">
          <div className="nw:grid nw:grid-cols-1 nw:gap-6 nw:lg:grid-cols-2">
            <div>
              <div className="nw:text-sm nw:font-medium nw:mb-3">Signer Information</div>
              <div className="nw:space-y-3">
                <div className="nw:space-y-1.5">
                  <Label htmlFor="signerEmail">Signer Email *</Label>
                  <Input
                    id="signerEmail"
                    type="email"
                    required
                    value={signerEmail}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSignerEmail(event.target.value)}
                    placeholder="signer@example.com"
                  />
                </div>
                <div className="nw:space-y-1.5">
                  <Label htmlFor="signerName">Signer Name *</Label>
                  <Input
                    id="signerName"
                    type="text"
                    required
                    value={signerName}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSignerName(event.target.value)}
                    placeholder="John Doe"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="nw:text-sm nw:font-medium nw:mb-3">Document Source</div>
              <div className="nw:flex nw:items-center nw:gap-6 nw:mb-3">
                <div className="nw:flex nw:items-center nw:gap-2">
                  <RadioGroup
                    value={selectedSource}
                    onValueChange={(value: SelectedSource | string) => setSelectedSource(value as SelectedSource)}
                  >
                    <div className="nw:flex nw:items-center nw:gap-2">
                      <RadioGroupItem value="existing" id="source-existing" />
                      <Label htmlFor="source-existing">Existing attachment</Label>
                    </div>
                    <div className="nw:flex nw:items-center nw:gap-2">
                      <RadioGroupItem value="upload" id="source-upload" />
                      <Label htmlFor="source-upload">Upload document</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {selectedSource === 'existing' ? (
                <div className="nw:space-y-2 nw:max-h-56 nw:overflow-y-auto nw:border nw:border-input nw:rounded-md nw:p-2">
                  {documents && documents.length > 0 ? (
                    <RadioGroup value={selectedDocId} onValueChange={(value: string) => setSelectedDocId(value)}>
                      {documents.map(doc => (
                        <div key={doc.id} className="nw:flex nw:items-center nw:gap-3 nw:p-2 nw:rounded">
                          <RadioGroupItem value={doc.id} id={`doc-${doc.id}`} />
                          <div className="nw:flex-1 nw:min-w-0">
                            <Label htmlFor={`doc-${doc.id}`} className="nw:truncate nw:font-medium">
                              {doc.name}
                            </Label>
                            {!isSupportedDoc(doc.name, doc.mimeType) && (
                              <div className="nw:text-xs nw:text-destructive">
                                Unsupported file. Allowed: PDF, Office, or image formats.
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <div className="nw:text-sm nw:text-muted-foreground">No attachments available</div>
                  )}
                </div>
              ) : (
                <div className="nw:space-y-1.5">
                  <Input
                    type="file"
                    accept="application/pdf"
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      setUploadedFile(event.target.files?.[0] || null)
                    }
                  />
                  {uploadedFile && !isSupportedDoc(uploadedFile.name, uploadedFile.type) && (
                    <div className="nw:text-xs nw:text-destructive">
                      Uploaded file must be PDF, Office, or image format
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <Alert variant={alertVariant} className="gba:mt-3">
            <AlertDescription>{alertMessage}</AlertDescription>
          </Alert>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading ||
                isAuthenticated === false ||
                !signerEmail ||
                !signerName ||
                (selectedSource === 'existing'
                  ? !selectedDocId || (selectedDocEnvelopeId ? isSelectedDocCompleted : false)
                  : !uploadedFile) ||
                (selectedSource === 'existing' && selectedDocEnvelopeId && !canReuseEnvelope)
              }
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" className="nw:mr-2" />
                  Processing...
                </>
              ) : (
                primaryButtonLabel
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default DocuSignSignatureModal
