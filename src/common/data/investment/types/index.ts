// Type exports for investment-related entities
// Clean structure with only core files

// Base types (GraphQL response matching)  
export * from './investmentBaseTypes';
export * from './investmentRelationBaseTypes';

// Enhanced types (with computed fields for UI)
export * from './investmentTypes';
export * from './investmentRelationTypes';

// Essential enums  
export * from './investmentEnums';

// Re-export common types for convenience
export type { CatalogEntry, EmployeeRef } from '@/common/network/graphql/commonTypes';