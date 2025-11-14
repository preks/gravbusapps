// Account payloads
export { CustomerAccountFormData, buildCustomerAccountPayload } from './customerAccountPayloads'

// Lead payloads
export { CustomerLeadFormData, buildCustomerLeadPayload } from './customerLeadPayloads'

// Contact payloads
export { CustomerContactFormData, buildCustomerContactPayload } from './customerContactPayloads'

// Opportunity payloads
export {
  CustomerOpportunityFormData,
  buildCustomerOpportunityPayload,
  buildCustomerOpportunityContacts
} from './customerOpportunityPayloads'

// Relation payloads (Task, Activity, Note)
export * from './customerRelationPayloads'
