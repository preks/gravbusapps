import { DOCUMENT_REF } from '@/common/data/common/queries/documentFragments'

// TODO: folder missing in DOCUMENT_REF
export const COMMON_DOCUMENT_FIELDS = `
  ${DOCUMENT_REF}
  
  # Source and verification fields
  source
  verified
  verificationDate
  authenticated
  authenticationDate
  mandatory
  expirationDate
`
