import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'

// TODO: folder missing
export const DOCUMENT_REF = `
  id
  name
  description
  fileInfo
  ${AUDIT_FIELDS}
  
  # Parent document reference (for folder structure)
  parentDocumentId
  
  # Catalog references
  documentGroup {
    ${CATALOG_ENTRY}
  }
  documentGroupRef
  
  documentType {
    ${CATALOG_ENTRY}
  }
  documentTypeRef
`
