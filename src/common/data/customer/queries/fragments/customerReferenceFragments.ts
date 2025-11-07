import { CATALOG_ENTRY, AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { COMMON_ACTIVITY_FIELDS } from '@/common/data/relations/queries/commonActivityFragments'
import { COMMON_LEAD_FIELDS } from '@/common/data/relations/queries/commonLeadFragments'
import { COMMON_ACCOUNT_FIELDS } from '@/common/data/relations/queries/commonAccountFragments'
import { COMMON_CONTACT_FIELDS } from '@/common/data/relations/queries/commonContactFragments'
import {
  COMMON_OPPORTUNITY_FIELDS,
  COMMON_OPPORTUNITY_STAGE_CONDITION_REF
} from '@/common/data/relations/queries/commonOpportunityFragments'
import { COMMON_TASK_FIELDS, COMMON_TASK_TEMPLATE_FIELDS } from '@/common/data/relations/queries/commonTaskFragments'
import { COMMON_DOCUMENT_FIELDS } from '@/common/data/relations/queries/commonDocumentFragments'
import { COMMON_NOTE_FIELDS } from '@/common/data/relations/queries/commonNoteFragments'

/**
 * ============================================================================
 * CUSTOMER_ACCOUNT_REF
 * ============================================================================
 * Customer Account Reference Fragment
 * Extends COMMON_ACCOUNT_FIELDS with CRM-specific scalar fields
 * NO entity relations (no arrays like tasks, documents, etc.)
 */
export const CUSTOMER_ACCOUNT_REF = `
  ${COMMON_ACCOUNT_FIELDS}
  
  # Base fields for mapping (CRM-specific wrong names)
  annualRevenue {
    ${CATALOG_ENTRY}
  }
  annualRevenueRef
  industry {
    ${CATALOG_ENTRY}
  }
  industryRef
  numberOfEmployees {
    ${CATALOG_ENTRY}
  }
  numberOfEmployeesRef
  pictureUrl
  pictureThumbnailUrl
  salesCampaignId
`

/**
 * ============================================================================
 * CUSTOMER_CONTACT_REF
 * ============================================================================
 */
export const CUSTOMER_CONTACT_REF = `
  ${COMMON_CONTACT_FIELDS}
  contactType
  jobTitle
  pictureUrl
  pictureThumbnailUrl
`

/**
 * ============================================================================
 * CUSTOMER_LEAD_REF
 * ============================================================================
 * Customer Lead Reference Fragment
 * Lightweight reference for CRM Leads (for use in other entities)
 */
export const CUSTOMER_LEAD_REF = `
  ${COMMON_LEAD_FIELDS}
  
  # Base fields for mapping
  annualRevenue {
    ${CATALOG_ENTRY}
  }
  annualRevenueRef
  city
  industry {
    ${CATALOG_ENTRY}
  }
  industryRef
  numberOfEmployees {
    ${CATALOG_ENTRY}
  }
  numberOfEmployeesRef
  source {
    ${CATALOG_ENTRY}
  }
  sourceRef
`

/**
 * ============================================================================
 * CUSTOMER_OPPORTUNITY_REF
 * ============================================================================
 * Customer Opportunity Reference Fragment
 * Extends COMMON_OPPORTUNITY_FIELDS with CRM-specific scalar fields
 * NO entity relations (no arrays like tasks, documents, etc.)
 */
export const CUSTOMER_OPPORTUNITY_REF = `
  ${COMMON_OPPORTUNITY_FIELDS}
  
  # Base fields for mapping (CRM-specific wrong names)
  salesCampaignId
  salesPipeline {
    ${CATALOG_ENTRY}
  }
  salesPipelineRef
  salesPipelineStage {
    ${CATALOG_ENTRY}
  }
  salesPipelineStageRef
`

/**
 * ============================================================================
 * CUSTOMER_OPPORTUNITY_STAGE_CONDITION_REF
 * ============================================================================
 * Customer Opportunity Stage Condition Reference Fragment
 * Extends COMMON_OPPORTUNITY_STAGE_CONDITION_REF with CRM-specific scalar fields
 * NO entity relations
 */
export const CUSTOMER_OPPORTUNITY_STAGE_CONDITION_REF = `
  ${COMMON_OPPORTUNITY_STAGE_CONDITION_REF}
  
  # Base fields for mapping (CRM-specific wrong names)
  opportunityId
  salesPipelineStageCondition {
    ${CATALOG_ENTRY}
  }
  salesPipelineStageConditionRef
  salesTaskId
`

/**
 * ============================================================================
 * CUSTOMER_TASK_REF
 * ============================================================================
 * TODO: tmingType -> taskTiming, type/typeRef -> taskType/taskTypeRef, salesTaskTemplate/salesTaskTemplateId -> taskTemplate/taskTemplateId
 */
export const CUSTOMER_TASK_REF = `
  ${COMMON_TASK_FIELDS}

  # TODO
  timingType
  type {
    ${CATALOG_ENTRY}
  }
  typeRef
  priority {
    ${CATALOG_ENTRY}
  }
  priorityRef
  status {
    ${CATALOG_ENTRY}
  }
  statusRef
`

/**
 * ============================================================================
 * CUSTOMER_TASK_TEMPLATE_REF
 * ============================================================================
 */
export const CUSTOMER_TASK_TEMPLATE_REF = `
  ${COMMON_TASK_TEMPLATE_FIELDS}
`

/**
 * ============================================================================
 * CUSTOMER_TASK_COMMENT_REF
 * ============================================================================
 * TODO: missing
 */

/**
 * ============================================================================
 * CUSTOMER_ACTIVITY_REF
 * ============================================================================
 */
export const CUSTOMER_ACTIVITY_REF = `
  ${COMMON_ACTIVITY_FIELDS}
`

/**
 * ============================================================================
 * CUSTOMER_DOCUMENT_REF
 * ============================================================================
 * TODO: folder missing
 */
export const CUSTOMER_DOCUMENT_REF = `
  ${COMMON_DOCUMENT_FIELDS}
`

/**
 * ============================================================================
 * CUSTOMER_NOTE_REF
 * ============================================================================
 * TODO: noteTitle/noteText -> title/text
 */
export const CUSTOMER_NOTE_REF = `
  ${COMMON_NOTE_FIELDS}

  # TODO
  noteTitle
  noteText
`

/**
 * ============================================================================
 * CUSTOMER_CAMPAIGN_REF
 * ============================================================================
 * Customer Campaign Reference Fragment
 * CRM-specific campaign fragments (SalesCampaign)
 */
export const CUSTOMER_CAMPAIGN_REF = `
  id
  name
  description
  endDate
`

/**
 * ============================================================================
 * CUSTOMER_ADDRESS_REF
 * ============================================================================
 * Customer Address Reference Fragment
 * CRM uses "city" instead of "locality"
 */
export const CUSTOMER_ADDRESS_REF = `
  id
  addressType
  addressLine
  city
  postalCode
  ${AUDIT_FIELDS}
  region {
    ${CATALOG_ENTRY}
  }
  regionRef
  country {
    ${CATALOG_ENTRY}
  }
  countryRef
`
