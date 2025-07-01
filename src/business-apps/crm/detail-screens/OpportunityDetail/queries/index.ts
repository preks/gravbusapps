export { default as getOpportunityByIdQuery } from './getOpportunityByIdQuery';

// Add default export to resolve the import issue
import getOpportunityByIdQueryOriginal from './getOpportunityByIdQuery';

// Default export that includes all named exports
export default {
  getOpportunityByIdQuery: getOpportunityByIdQueryOriginal
};
