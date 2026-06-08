/**
 * Common Opportunity Constants
 *
 * Shared constants and enums for opportunities across Customer and Investment relations
 */

/**
 * Opportunity Type
 * Indicates the nature of the business opportunity
 */
export enum DealType {
  NEW_BUSINESS = 'NEW_BUSINESS',
  EXISTING_BUSINESS = 'EXISTING_BUSINESS',
  RENEWAL = 'RENEWAL',
  UPSELL = 'UPSELL',
  CROSS_SELL = 'CROSS_SELL'
}
