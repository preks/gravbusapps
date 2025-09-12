export { default as SearchableSelect } from "./SearchableSelect";
export { default as EmployeeSearchableSelect } from "./EmployeeSearchableSelect";
export { default as OwnerSelector } from "./OwnerSelector";
export { default as AccountSection } from "./AccountSection";
export { default as ContactSection } from "./ContactSection";
export { default as OpportunitySection } from "./OpportunitySection";

// Default export for wrapper compatibility
const components = {
  SearchableSelect,
  EmployeeSearchableSelect,
  OwnerSelector,
  AccountSection,
  ContactSection,
  OpportunitySection,
};

export default components as unknown as any;