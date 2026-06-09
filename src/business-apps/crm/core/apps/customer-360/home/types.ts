/**
 * Shared contracts for the Customer360 Home product surface.
 *
 * The Home shell (`Customer360Home`) owns portfolio data + navigation and
 * passes them to each home view via `Customer360HomeViewProps`. The ordered
 * `CUSTOMER_360_HOME_VIEWS` list is the shared sub-navigation contract — view
 * workers fill their own component but must NOT reorder or rename these ids.
 */

import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { CustomerSubjectType } from '../data/types'
import type { UseCustomerPortfolioResult } from '../data/portfolio/types'

export const CUSTOMER_360_HOME_VIEWS = [
  'cockpit',
  'worklist',
  'explorer',
  'inbound',
  'renewals',
  'analytics',
  'agent'
] as const

export type Customer360HomeViewKey = (typeof CUSTOMER_360_HOME_VIEWS)[number]

export const DEFAULT_HOME_VIEW: Customer360HomeViewKey = 'cockpit'

export interface Customer360HomeViewProps extends BusinessAppContextProps {
  portfolio: UseCustomerPortfolioResult
  /** Opens the 360° detail for a given customer (account or contact). */
  openCustomer: (type: CustomerSubjectType, id: string) => void
  /** Switches the active Home sub-view (used by cockpit CTAs). */
  onNavigateView: (view: Customer360HomeViewKey) => void
}
