/**
 * Common Contact Constants
 *
 * Shared constants and enums for contacts across Customer and Investment relations
 */

/**
 * Contact Type
 * Indicates the type/role of the contact
 */
export enum ContactType {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
  BILLING = 'BILLING',
  TECHNICAL = 'TECHNICAL',
  DECISION_MAKER = 'DECISION_MAKER',
  OTHER = 'OTHER'
}
