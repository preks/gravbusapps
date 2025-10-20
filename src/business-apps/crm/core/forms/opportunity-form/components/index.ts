export { default as OpportunityFormComponent } from './OpportunityFormComponent'
export { default as OpportunityInformationSection } from './OpportunityInformationSection'
export { default as SalesInformationSection } from './SalesInformationSection'
export { default as RelationshipInformationSection } from './RelationshipInformationSection'
export { default as BusinessInformationSection } from './BusinessInformationSection'
export { default as AdditionalInformationSection } from './AdditionalInformationSection'

// Default export for wrapper compatibility
const components = {
  OpportunityFormComponent,
  OpportunityInformationSection,
  SalesInformationSection,
  RelationshipInformationSection,
  BusinessInformationSection,
  AdditionalInformationSection
}

export default components as unknown as any
