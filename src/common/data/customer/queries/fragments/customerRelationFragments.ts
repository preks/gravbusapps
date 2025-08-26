import { CATALOG_ENTRY, AUDIT_FIELDS } from '@/common/network/graphql/commonFragments';
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments';

// ==========================================
// CRM ACCOUNT FRAGMENTS
// ==========================================

export const CUSTOMER_ACCOUNT_REF = `
    id
    code
    name
    email
    phone
    website
    picture
    pictureThumbnail
    annualRevenue {
      ${CATALOG_ENTRY}
    }
`;

export const CUSTOMER_ACCOUNT = `
    id
    code
    name
    email
    phone
    foundationDate
    liquidationDate
    website
    picture
    pictureThumbnail
    mission
    geographicPresence
    specialty
    ${AUDIT_FIELDS}
    
    # Catalog relationships
    legalForm {
      ${CATALOG_ENTRY}
    }
    annualRevenue {
      ${CATALOG_ENTRY}
    }
    companySize {
      ${CATALOG_ENTRY}
    }
    industryClass {
      ${CATALOG_ENTRY}
    }
    
    # Employee relationship
    ownerEmployee {
      ${EMPLOYEE_REF}
    }
`;

// ==========================================
// CRM CONTACT FRAGMENTS
// ==========================================

export const CUSTOMER_CONTACT_REF = `
    id
    code
    firstName
    lastName
    fullName
    email
    phone
    department
    jobPosition
    picture
    pictureThumbnail
`;

export const CUSTOMER_CONTACT = `
    id
    code
    firstName
    lastName
    fullName
    email
    phone
    birthDate
    department
    description
    jobPosition
    picture
    pictureThumbnail
    ${AUDIT_FIELDS}
    
    # Catalog relationships
    academicTitle {
      ${CATALOG_ENTRY}
    }
    salutation {
      ${CATALOG_ENTRY}
    }
    language {
      ${CATALOG_ENTRY}
    }
    
    # Employee relationship
    ownerEmployee {
      ${EMPLOYEE_REF}
    }
`;

// ==========================================
// CRM OPPORTUNITY FRAGMENTS
// ==========================================

export const CUSTOMER_OPPORTUNITY_REF = `
    id
    code
    name
`;

export const CUSTOMER_OPPORTUNITY = `
    id
    code
    name
    closeDate
    ${AUDIT_FIELDS}
    
    # Catalog relationships
    currency {
      ${CATALOG_ENTRY}
    }
    opportunityPipeline {
      ${CATALOG_ENTRY}
    }
    opportunityPipelineStage {
      ${CATALOG_ENTRY}
    }
    opportunityStatus {
      ${CATALOG_ENTRY}
    }
    
    # Employee relationship
    ownerEmployee {
      ${EMPLOYEE_REF}
    }
`;

// ==========================================
// CRM LEAD FRAGMENTS
// ==========================================

export const CUSTOMER_LEAD_REF = `
    id
    code
    firstName
    lastName
    email
`;

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
    salutation {
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
    industryClass {
      ${CATALOG_ENTRY}
    }
    companySize {
      ${CATALOG_ENTRY}
    }
    
    # Employee relationship
    ownerEmployee {
      ${EMPLOYEE_REF}
    }
`;

// ==========================================
// CRM RELATED ENTITIES (TASK / ACTIVITY / NOTE / DOCUMENT)
// ==========================================

export const CUSTOMER_TASK = `
    id
    code
    name
    description
    comment
    startDate
    dueDate
    endDate
    ${AUDIT_FIELDS}
    
    # Catalog references
    taskType {
      ${CATALOG_ENTRY}
    }
    taskPriority {
      ${CATALOG_ENTRY}
    }
    taskStatus {
      ${CATALOG_ENTRY}
    }
    
    # Employee references
    creatorEmployee {
      ${EMPLOYEE_REF}
    }
    assignedEmployee {
      ${EMPLOYEE_REF}
    }
`;

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
`;

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
`;

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
`;
