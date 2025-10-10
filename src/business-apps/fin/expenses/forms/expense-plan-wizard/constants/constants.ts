export {
  PointTypeEnum,
  TripDirectionDefaultValue,
  ABSENCE_STATUS,
  EXCLUDED_STATUSES,
  ADDRESS_TYPES_ENUM,
  defaultStartLocation,
  defaultEndLocation,
  defaultDestination,
  DEFAULT_ITEM_LIST_LIMIT,
  REQUEST_STATUS,
  DEFAULT_CURRENCY_FALLBACK
} from '../../expense-request-wizard/constants/constants'
/**
 * Tab names enum for expense plan wizard
 */
export enum SCREEN_NAMES_ENUM {
  ITEMS_TAB = 'ItemsScreen',
  CREATE_ITEM_TAB = 'CreateItemScreen',
  TRIPS_TAB = 'TripScreen',
  LOAD_TAB = 'LoadScreen',
  PAYMENT_TAB = 'PaymentScreen',
  SUMMARY_TAB = 'SummaryScreen'
}

export const TRIP_REQUEST_TYPE = 'ExpenseRequestType:v1:TRIP'

export enum EXPENSE_STATUS {
  APPROVED = 'APPROVED',
  VERIFIED = 'VERIFIED',
  BOOKED = 'BOOKED',
  TRANSFERRED = 'TRANSFERRED',
  PAID = 'PAID',
  CREATED = 'CREATED',
  REJECTED = 'REJECTED'
}
