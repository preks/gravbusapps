/**
 * Shared utilities and components for HR Core review forms
 * Reduces code duplication and cognitive complexity
 */

export { useReviewFormData } from './useReviewFormData'
export type { FieldComparison, UseReviewFormDataParams, UseReviewFormDataReturn } from './useReviewFormData'

export { RenderComparisonField, RenderUnchangedField, RenderFieldSmart } from './ReviewFieldRenderer'
