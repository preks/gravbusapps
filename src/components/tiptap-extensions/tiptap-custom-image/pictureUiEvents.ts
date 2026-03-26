export const DOCUMENT_IMAGE_UI_EVENT = 'document-editor:image-ui'

export type DocumentImageUiMode = 'default' | 'crop'

export interface DocumentImageUiEventDetail {
  pos: number | null
  mode: DocumentImageUiMode
}

export function dispatchDocumentImageUiMode(detail: DocumentImageUiEventDetail) {
  globalThis.dispatchEvent(
    new CustomEvent<DocumentImageUiEventDetail>(DOCUMENT_IMAGE_UI_EVENT, {
      detail
    })
  )
}
