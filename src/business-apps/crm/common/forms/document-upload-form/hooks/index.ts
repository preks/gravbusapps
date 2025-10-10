export { useDocumentCatalogs } from './useDocumentCatalogs'
export type { DocumentGroup, DocumentType, UseDocumentCatalogsReturn } from './useDocumentCatalogs'

// Default export for wrapper compatibility
const hooks = {
  useDocumentCatalogs
}

export default hooks as unknown as any
