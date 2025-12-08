const TERMINAL_ENVELOPE_STATUSES = new Set(['completed', 'declined', 'voided'])

export interface DocuSignDocumentLike {
  fileInfo?: Record<string, any>
  envelopeId?: string
  envelopeStatus?: string
}

export const isEnvelopeCompleted = (status?: string) => {
  if (!status) return false
  return TERMINAL_ENVELOPE_STATUSES.has(status.toLowerCase())
}

export const isEnvelopeActionable = (status?: string) => {
  if (!status) return true
  return !TERMINAL_ENVELOPE_STATUSES.has(status.toLowerCase())
}

export const getDocuSignButtonState = (documents: DocuSignDocumentLike[] = [], isAssignee: boolean) => {
  if (!documents.length) {
    return { hasSignableDocs: false, label: 'Request Signature' }
  }

  const docsWithEnvelope = documents.filter(doc => doc.envelopeId || (doc.fileInfo as any)?.docusignEnvelopeId)
  const actionableDocs = docsWithEnvelope.filter(doc => {
    if (!doc.envelopeStatus) return true
    return isEnvelopeActionable(doc.envelopeStatus)
  })
  const docsWithoutEnvelope = documents.filter(doc => !doc.envelopeId && !(doc.fileInfo as any)?.docusignEnvelopeId)

  if (actionableDocs.length > 0) {
    return {
      hasSignableDocs: true,
      label: isAssignee ? 'Resume signing' : 'View envelope'
    }
  }

  if (docsWithoutEnvelope.length > 0) {
    return {
      hasSignableDocs: true,
      label: isAssignee ? 'Sign' : 'Request Signature'
    }
  }

  return {
    hasSignableDocs: false,
    label: 'Request Signature'
  }
}
