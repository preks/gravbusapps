import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'

// TODO: folder missing
export const DOCUMENT_REF = `
  ${AUDIT_FIELDS}
  description
  documentGroup {
    ${CATALOG_ENTRY}
  }
  documentGroupRef
  documentType {
    ${CATALOG_ENTRY}
  }
  documentTypeRef
  fileInfo
  folder
  id
  name
  parentDocumentId
`
