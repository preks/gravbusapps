/**
 * Tab names enum for expense request wizard
 */
export enum SCREEN_NAMES_ENUM {
  ITEMS_TAB = "items",
  CREATE_ITEM_TAB = "create_item",
  TRIPS_TAB = "trips",
  LOAD_TAB = "load",
  ALLOWANCE_TAB = "allowance",
  SUMMARY_TAB = "summary"
}


/**
 * Point type enum
 */
export const PointTypeEnum = {
    start: "START_POINT",
    destination: "DESTINATION_POINT",
    arrival: "REGION_ARRIVAL",
    end: "END_POINT",
    border: "REGION_ARRIVAL"
};

/**
 * Trip direction default values
 */
export const TripDirectionDefaultValue = {
    go: "GO",
    back: "BACK"
};