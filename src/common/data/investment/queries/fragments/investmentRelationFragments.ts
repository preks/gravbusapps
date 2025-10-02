
import { CATALOG_ENTRY, AUDIT_FIELDS } from '@/common/network/graphql/commonFragments';
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments';
import { INVESTMENT_REF } from './investmentFragments';

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
        
        # Investment descriptive fields
        investmentName
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
        
        # Investment-specific fields
        stakePercentage
        marketValue
        initialInvestmentAmount
        buildingYear
        size
        sizeMeasurementUnit {
          ${CATALOG_ENTRY}
        }
        sizeMeasurementUnitRef
        forecastedProfitAmount
        requiredCapitalAmount
        loanAmount
        loanInterestRate
        
        # Investment relationships
        investmentGroup {
          ${CATALOG_ENTRY}
        }
        investmentType {
          ${CATALOG_ENTRY}
        }
        investmentRole {
          ${CATALOG_ENTRY}
        }
        investmentStakeType {
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
    academicTitle {
        ${CATALOG_ENTRY}
    }
    salutation {
        ${CATALOG_ENTRY}
    }
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

export const INVESTMENT_ADDRESS = `
    id
    addressType
    addressLine
    postalCode
    locality
    
    # Catalog relationships
    region {
        ${CATALOG_ENTRY}
    }
    country {
        ${CATALOG_ENTRY}
    }
`;

export const INVESTMENT_ACCOUNT_REF = `
    id
    code
    name
    email
    phone
    website
    foundationDate
    geographicPresence
    picture
    pictureThumbnail
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
    
    # Address relationships
    investmentAddress(where: { isDeleted: { _eq: false } }) {
        ${INVESTMENT_ADDRESS}
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
    
    # Investment descriptive fields
    investmentName
    ${AUDIT_FIELDS}
    
    # Investment-specific fields
    stakePercentage
    marketValue
    buildingYear
    size
    sizeMeasurementUnit {
      ${CATALOG_ENTRY}
    }
    sizeMeasurementUnitRef
    requiredCapitalAmount
    loanAmount
    loanInterestRate
    
    # Investment relationships
    investmentGroup {
      ${CATALOG_ENTRY}
    }
    investmentType {
      ${CATALOG_ENTRY}
    }
    investmentRole {
      ${CATALOG_ENTRY}
    }
    investmentStakeType {
      ${CATALOG_ENTRY}
    }
    
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
    
    # Account relationship
    account {
      ${INVESTMENT_ACCOUNT_REF}
    }
    
    # Contact relationships
    investmentOpportunityContact {
      id
      contactType
      contact {
        ${INVESTMENT_CONTACT_REF}
      }
    }

    # Stage conditions (embed current and historical statuses)
    opportunityStageConditions: investmentOpportunityStageCondition(where: { isDeleted: { _eq: false } }, orderBy: [{ createdAt: DESC }]) {
      id
      completed
      completedAt
      deadlineAt
      version
      configSnapshot
      completedByEmployee {
        id
        displayName
        firstName
        lastName
      }
      opportunityPipelineStageCondition {
        ${CATALOG_ENTRY}
      }
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
    taskTypeRef
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

    # Entity references
    investment {
      ${INVESTMENT_REF}
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
    investment {
      ${INVESTMENT_REF}
    }
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
    
    # Entity references
    investment {
      ${INVESTMENT_REF}
    }
`;

export const INVESTMENT_DOCUMENT = `
    id
    name
    description
    file
    fileInfo
    fileSize
    mimeType
    verified
    verificationDate
    authenticated
    authenticationDate
    mandatory
    expirationDate
    version
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
    investment {
      ${INVESTMENT_REF}
    }
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
`