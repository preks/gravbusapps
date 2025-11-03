import { CATALOG_ENTRY, AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'

// ==========================================
// CRM ACCOUNT FRAGMENTS
// ==========================================

export const CUSTOMER_ACCOUNT_REF = `
    id
    code
    name
    pictureThumbnailUrl
    annualRevenue {
      ${CATALOG_ENTRY}
    }
`

export const CUSTOMER_ACCOUNT = `
    id
    code
    name
    ${AUDIT_FIELDS}
    
    # Catalog relationships
    annualRevenue {
      ${CATALOG_ENTRY}
    }
    
    # Employee relationship
    ownerEmployee {
      ${EMPLOYEE_REF}
    }
`

// ==========================================
// CRM CONTACT FRAGMENTS
// ==========================================

export const CUSTOMER_CONTACT_REF = `
    id
    code
    firstName
    lastName
    email
`

export const CUSTOMER_CONTACT = `
    id
    code
    firstName
    lastName
    email
    birthDate
    ${AUDIT_FIELDS}
    
    # Catalog relationships
    academicTitle {
      ${CATALOG_ENTRY}
    }
    language {
      ${CATALOG_ENTRY}
    }
    
    # Employee relationship
    ownerEmployee {
      ${EMPLOYEE_REF}
    }
`

// ==========================================
// CRM OPPORTUNITY FRAGMENTS
// ==========================================

export const CUSTOMER_OPPORTUNITY_REF = `
    id
    code
    name
`

export const CUSTOMER_OPPORTUNITY = `
    id
    code
    name
    estimatedAmount
    winningChance
    closeDate
    ${AUDIT_FIELDS}
    
    # Catalog relationships
    currency { ${CATALOG_ENTRY} }
    salesPipeline { ${CATALOG_ENTRY} }
    salesPipelineStage { ${CATALOG_ENTRY} }
    opportunityStatus { ${CATALOG_ENTRY} }
    
    # Employee relationship
    ownerEmployee {
      ${EMPLOYEE_REF}
    }
    
    # Direct scalar stage/status
    stage
    status
`

// ==========================================
// CRM LEAD FRAGMENTS
// ==========================================

export const CUSTOMER_LEAD_REF = `
    id
    code
    firstName
    lastName
    email
`

export const CUSTOMER_LEAD = `
    id
    code
    firstName
    lastName
    email
    phoneNumber
    position
    companyName
    companyEmail
    companyPhone
    companyWebsite
    description
    conversionDate
    ${AUDIT_FIELDS}
    
    # Catalog relationships
    academicTitle {
      ${CATALOG_ENTRY}
    }
    leadRating {
      ${CATALOG_ENTRY}
    }
    leadStatus {
      ${CATALOG_ENTRY}
    }
    leadSource {
      ${CATALOG_ENTRY}
    }
    
    # Employee relationship
    ownerEmployee {
      ${EMPLOYEE_REF}
    }
`

// ==========================================
// CRM RELATED ENTITIES (TASK / ACTIVITY / NOTE / DOCUMENT)
// ==========================================

export const CUSTOMER_TASK = `
    id
    version
    additionalProperties
    code
    name
    description
    comment
    startDate
    dueDate
    endDate
    templateStartDate
    ${AUDIT_FIELDS}
    
    # Reference fields
    typeRef
    priorityRef
    statusRef
    timingType
    
    # User references
    creatorUserId
    assignedUserId
    
    # Employee references
    creatorEmployee {
      ${EMPLOYEE_REF}
    }
    assignedEmployee {
      ${EMPLOYEE_REF}
    }
    
    # Task template reference
    salesTaskTemplate {
      id
      code
      name
    }
    
    # Documents
    documents(where: { isDeleted: { _eq: false } }) {
      id
      name
      file
      fileInfo
      mimeType
      fileSize
    }
`

export const CUSTOMER_SALES_ACTIVITY = `
    id
    title
    description
    occurredAt
    completedAt
    ${AUDIT_FIELDS}
    
    # Catalog references
    activityType {
      ${CATALOG_ENTRY}
    }
    
    # Employee references
    ownerEmployee {
      ${EMPLOYEE_REF}
    }
    
    # Documents
    documents(where: { isDeleted: { _eq: false } }) {
      id
      name
      file
      fileInfo
      mimeType
      fileSize
    }
`

export const CUSTOMER_CRM_DOCUMENT = `
    id
    name
    description
    file
    fileSize
    mimeType
    verified
    verificationDate
    authenticated
    authenticationDate
    mandatory
    expirationDate
    ${AUDIT_FIELDS}
    
    # Catalog references
    documentGroup {
      ${CATALOG_ENTRY}
    }
    documentType {
      ${CATALOG_ENTRY}
    }
`

export const CUSTOMER_CRM_NOTE = `
    id
    title
    text
    reminderDate
    ${AUDIT_FIELDS}
    
    # Employee references
    authorEmployee {
      ${EMPLOYEE_REF}
    }
    
    # Documents relationship
    documents(where: { isDeleted: { _eq: false } }) {
      ${CUSTOMER_CRM_DOCUMENT}
    }
`
