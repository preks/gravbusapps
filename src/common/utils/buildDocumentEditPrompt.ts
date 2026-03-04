interface BuildDocumentEditAdditionInfoOptions {
  documentId: string
  documentTitle?: string
  selectedText?: string
  selectedHtml?: string
  fullDocumentHtml?: string
}

/**
 * Builds hidden payload sent to Flowbot via `addition_info`.
 *
 * This data is intended for model/tool grounding and should not be shown in the
 * user-visible chat message.
 */
export function buildDocumentEditAdditionInfo(options: BuildDocumentEditAdditionInfoOptions): string {
  const title = options.documentTitle?.trim() || 'Untitled Document'
  const selectedText = options.selectedText?.trim() || ''
  const selectedHtml = options.selectedHtml?.trim() || ''
  const fullDocumentHtml = options.fullDocumentHtml?.trim() || ''

  const payload = {
    type: 'document_edit',
    document: {
      id: options.documentId,
      title
    },
    selection: {
      modeHint: selectedText ? 'selection' : 'document',
      selectedText,
      selectedHtml
    },
    content: {
      fullDocumentHtml
    }
  }

  return JSON.stringify(payload)
}
