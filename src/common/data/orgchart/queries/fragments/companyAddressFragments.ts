/**
 * Company Address Fragment
 * GraphQL fragment for CompanyAddress fields
 */

import { CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'

/**
 * COMPANY_ADDRESS_FIELDS
 * Complete address fields for company addresses
 * addressLine is a jsonb field containing streetAddress, addressLine2, etc.
 */
export const COMPANY_ADDRESS_FIELDS = `
  id
  companyId
  addressLine
  addressType
  locality
  postalCode
  createdAt
  updatedAt
  isDeleted
  version
  
  region {
    ${CATALOG_ENTRY}
  }
  regionRef
  
  country {
    ${CATALOG_ENTRY}
  }
  countryRef
`
