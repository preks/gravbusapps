import { LocationData } from '../utils/types'

/**
 * Tab names enum for expense request wizard
 */
export enum SCREEN_NAMES_ENUM {
  ITEMS_TAB = 'ItemsScreen',
  CREATE_ITEM_TAB = 'CreateItemScreen',
  TRIPS_TAB = 'TripScreen',
  LOAD_TAB = 'LoadScreen',
  ALLOWANCE_TAB = 'AllowanceScreen',
  PAYMENT_TAB = 'PaymentScreen',
  SUMMARY_TAB = 'SummaryScreen'
}
/**
 * Point type enum
 */
export const PointTypeEnum = {
  start: 'START_POINT',
  destination: 'DESTINATION_POINT',
  arrival: 'REGION_ARRIVAL',
  end: 'END_POINT',
  border: 'REGION_ARRIVAL'
}

/**
 * Trip direction default values
 */
export const TripDirectionDefaultValue = {
  go: 'GO',
  back: 'BACK'
}

export const TRIP_REQUEST_TYPE = 'ExpenseRequestType:v1:TRIP'

export const ABSENCE_STATUS = 'APPROVED'

export const EXCLUDED_STATUSES = ['DISCARDED']

export const ADDRESS_TYPES_ENUM = {
  value: {
    PRIMARY: 'PRIMARY',
    SECONDARY: 'SECONDARY'
  }
}

export const defaultStartLocation: LocationData = {
  id: 'start-location',
  name: 'Start Location',
  isAbroad: false,
  location: '',
  departureDate: undefined,
  departureTime: undefined,
  isCollapsed: false,
  travelRegionRef: undefined
}

export const defaultEndLocation: LocationData = {
  id: 'end-location',
  name: 'End Location',
  isAbroad: false,
  location: '',
  departureDate: undefined,
  departureTime: undefined,
  isCollapsed: false,
  travelRegionRef: undefined
}

export const defaultDestination: LocationData = {
  id: 'destination-0',
  name: 'Destination',
  isAbroad: false,
  location: '',
  departureDate: undefined,
  departureTime: undefined,
  isCollapsed: false,
  travelRegionRef: undefined
}

export const DEDUCTIONS_TYPES_ENUM = {
  BREAKFAST: 'Breakfast Deduction',
  LUNCH: 'Lunch Deduction',
  DINNER: 'Dinner Deduction',
  OVERNIGHT: 'Overnight Allowance'
}

export const DEDUCTIONS_TYPES_ENUM_V2 = {
  BREAKFAST: 'BREAKFAST_DEDUCTION',
  LUNCH: 'LUNCH_DEDUCTION',
  DINNER: 'DINNER_DEDUCTION',
  OVERNIGHT: 'OVERNIGHT_DEDUCTION'
}

export const DEDUCTION_KEYS = {
  BREAKFAST: 'breakfast',
  LUNCH: 'lunch',
  DINNER: 'dinner',
  OVERNIGHT: 'overnight'
}

export const REQUEST_STATUS = {
  CREATED: 'CREATED'
} as const

export const DEFAULT_ITEM_LIST_LIMIT = 3
export const DEFAULT_CURRENCY_FALLBACK = 'RON' as const

export const SUMMARY_SCREEN_ITEM_LIST_LIMIT = 4
export const PLAN_SUMMARY_SCREEN_ITEM_LIST_LIMIT = 4
