export const DOCUMENT_SIGNATURE_UI_EVENT = 'document-editor:signature-ui'

export type DocumentSignatureUiMode = 'default' | 'crop'

export interface DocumentSignatureUiEventDetail {
  pos: number | null
  mode: DocumentSignatureUiMode
}

export function dispatchDocumentSignatureUiMode(detail: DocumentSignatureUiEventDetail) {
  globalThis.dispatchEvent(
    new CustomEvent<DocumentSignatureUiEventDetail>(DOCUMENT_SIGNATURE_UI_EVENT, {
      detail
    })
  )
}
