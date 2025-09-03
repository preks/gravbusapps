
import { CATALOG_ENTRY, AUDIT_FIELDS } from '@/common/network/graphql/commonFragments';
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments';

export const INVESTMENT_LEAD = `
        id
        code
        firstName
        lastName
        sensitive
        email
        phoneNumber
        position

        companyName
        companyEmail
        companyPhone
        companyWebsite

        description
        conversionDate
        annualNetColdRent
        addressLine
        postalCode
        locality
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
        country {
          ${CATALOG_ENTRY}
        }
        region {
          ${CATALOG_ENTRY}
        }
        
        # Employee relationship
        ownerEmployee {
          ${EMPLOYEE_REF}
        }
`;

export const INVESTMENT_LEAD_REF = `
    id
    code
    firstName
    lastName
    companyName
    email
    phoneNumber
`;

export const INVESTMENT_CONTACT_REF = `
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

export const INVESTMENT_CONTACT = `
    id
    code
    firstName
    lastName
    fullName
    type
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

export const INVESTMENT_ACCOUNT_REF = `
    id
    code
    name
    email
    phone
    foundationDate
    geographicPresence
    accountAnnualRevenueBand {
        ${CATALOG_ENTRY}
    }
    companySize {
        ${CATALOG_ENTRY}
    }
    industryClass {
        ${CATALOG_ENTRY}
    }
    ownerEmployee {
        ${EMPLOYEE_REF}
    }
`;

export const INVESTMENT_ACCOUNT = `
    id
    code
    name
    email
    phone
    foundationDate
    geographicPresence
    specialty
    mission
    liquidationDate
    website
    picture
    pictureThumbnail
    ${AUDIT_FIELDS}
    
    # Catalog relationships
    legalForm {
        ${CATALOG_ENTRY}
    }
    accountAnnualRevenueBand {
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

export const INVESTMENT_OPPORTUNITY_REF = `
    id
    code
    name
    dealType
    estimatedAmount
    closeDate
`;

export const INVESTMENT_OPPORTUNITY = `
    id
    code
    name
    estimatedAmount
    forecastedProfitAmount
    initialInvestmentAmount
    closeDate
    annualNetColdRent
    dealType
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

export const INVESTMENT_TASK = `
    id
    code
    name
    description
    startDate
    dueDate
    endDate
    taskTiming
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

    # User references
    creatorUserId
    assignedUserId
`;

export const INVESTMENT_ACTIVITY = `
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
    
    # Entity references
    account {
      ${INVESTMENT_ACCOUNT_REF}
    }
    contact {
      ${INVESTMENT_CONTACT_REF}
    }
    opportunity {
      ${INVESTMENT_OPPORTUNITY_REF}
    }
    lead {
      ${INVESTMENT_LEAD_REF}
    }
`;

export const INVESTMENT_NOTE = `
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

export const INVESTMENT_DOCUMENT = `
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
    folder
    ${AUDIT_FIELDS}
    
    # Catalog references
    documentGroup {
      ${CATALOG_ENTRY}
    }
    documentType {
      ${CATALOG_ENTRY}
    }
    # Entity references
    parentDocument {
      id
      name
      description
    }
`