/**
 * Customer Queries and Fragments
 * GraphQL queries and fragments for Customer Relations
 */

// Export all query files (legacy - for backward compatibility)
export * from './customerAccountQueries'
export * from './customerContactQueries'
export * from './customerLeadQueries'
export * from './customerOpportunityQueries'
export * from './customerTaskQueries'

// Export new query builders (preferred)
export * from './customerAccountQueries.new'
export * from './customerActivityQueries.new'
export * from './customerContactQueries.new'
export * from './customerDocumentQueries.new'
export * from './customerLeadQueries.new'
export * from './customerNoteQueries.new'
export * from './customerOpportunityQueries.new'
export * from './customerTaskQueries.new'
